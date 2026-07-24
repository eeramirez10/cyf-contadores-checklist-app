# CYF Frontend

Panel Next.js 16 para el checklist mensual de CYF Contadores. La aplicacion usa la API NestJS para autenticacion, datos de negocio, documentos e indicadores en tiempo real.

## Inicio local

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Configura `NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1` o la URL HTTPS de la API expuesta por ngrok. El frontend se ejecuta en `http://localhost:3001`.

## Arquitectura

- Autenticacion local: JWT de acceso en memoria y refresh token HTTP-only.
- Datos: NestJS usa Prisma sobre PostgreSQL. La base puede continuar hospedada en Supabase, sin usar Supabase Auth, SDK ni Realtime.
- Tiempo real: Socket.IO conecta al namespace `/indicators` y se suscribe solo a empresas autorizadas.
- Documentos: carga y almacenamiento local gestionados por NestJS; las URLs publicas requieren `PUBLIC_BASE_URL` configurada en el backend.

## Verificacion

```bash
pnpm lint
pnpm build
```
