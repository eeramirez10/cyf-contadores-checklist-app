import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { DefaultEventsMap, Namespace, Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { PermissionsService } from '../permissions/permissions.service';

type SocketUser = { id: string; role: string };
type IndicatorsSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  { user?: SocketUser }
>;

const readSocketToken = (auth: unknown): string | null => {
  if (!auth || typeof auth !== 'object') {
    return null;
  }
  const token = (auth as { token?: unknown }).token;
  return typeof token === 'string' ? token : null;
};

@Injectable()
@WebSocketGateway({ namespace: 'indicators' })
export class IndicatorsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly auth: AuthService,
    private readonly permissions: PermissionsService,
    config: ConfigService,
  ) {
    this.cors = {
      origin: config.get<string[]>('app.corsOrigins') ?? [],
      credentials: true,
    };
  }

  private readonly cors: { origin: string[]; credentials: boolean };

  afterInit(server: Server | Namespace): void {
    // A namespaced Nest gateway receives a Namespace, which exposes the root IO server.
    const rootServer = 'engine' in server ? server : server.server;
    rootServer.engine.opts.cors = this.cors;
  }

  async handleConnection(client: IndicatorsSocket) {
    try {
      const token = readSocketToken(client.handshake.auth);
      if (!token) {
        throw new Error('Unauthorized');
      }
      client.data.user = await this.auth.validateAccessToken(token);
    } catch {
      client.disconnect();
    }
  }

  @SubscribeMessage('indicators:subscribe')
  async subscribe(
    @ConnectedSocket() client: IndicatorsSocket,
    @MessageBody() body: { clientId?: string },
  ) {
    const user = client.data.user;
    if (!user || !body.clientId) {
      return;
    }
    try {
      await this.permissions.canAccessClient(user, body.clientId);
      await client.join(`client:${body.clientId}`);
    } catch {
      client.emit('indicators:error', {
        message: 'Sin permisos para esta empresa',
      });
    }
  }

  emitUpdated(clientId: string, month: string) {
    this.server
      .to(`client:${clientId}`)
      .emit('indicators:updated', { clientId, month });
  }
}
