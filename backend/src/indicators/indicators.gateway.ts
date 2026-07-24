import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody, OnGatewayConnection } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../database/prisma.service';

type SocketUser = { id: string; role: string };
@Injectable()
@WebSocketGateway({ namespace: 'indicators', cors: { origin: true, credentials: true } })
export class IndicatorsGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  constructor(private readonly auth: AuthService, private readonly prisma: PrismaService) {}
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (typeof token !== 'string') throw new Error('Unauthorized');
      client.data.user = await this.auth.validateAccessToken(token);
    } catch { client.disconnect(); }
  }
  @SubscribeMessage('indicators:subscribe')
  async subscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { clientId?: string }) {
    const user = client.data.user as SocketUser | undefined;
    if (!user || !body.clientId) return;
    const company = await this.prisma.clients.findUnique({ where: { id: body.clientId }, select: { member_id: true } });
    if (company && (user.role === 'ADMIN' || company.member_id === user.id)) client.join(`client:${body.clientId}`);
  }
  emitUpdated(clientId: string, month: string) { this.server.to(`client:${clientId}`).emit('indicators:updated', { clientId, month }); }
}
