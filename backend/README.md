# CYF Backend

API NestJS para el panel de CYF Contadores. Expone endpoints versionados bajo `/api/v1`.

## Inicio local

```bash
pnpm install
cp .env.example .env
pnpm start:dev
```

La verificacion de disponibilidad es `GET /api/v1/health`. Las solicitudes manuales estan en `health.http` y `auth.http`.

## Autenticacion local

Nest emite un access token JWT y conserva el refresh token en una cookie HTTP-only. Para probar login, el perfil debe tener `email` y `password_hash` en PostgreSQL.

La migracion `prisma/manual-migrations/20260723_01_local_auth.sql` copia los correos de Supabase Auth, pero no migra contrasenas. Los usuarios existentes deben crear o restablecer una contrasena local mediante un flujo seguro antes de abandonar Supabase Auth.

Para frontend y API en sitios distintos, configura `AUTH_COOKIE_SAME_SITE=none` y `AUTH_COOKIE_SECURE=true`.

### Inicializar el primer administrador

Aplica primero la migracion local de auth y usa variables de entorno temporales. El comando solo permite configurar un perfil existente con rol `ADMIN`, cifra la contrasena con Argon2 y revoca sus sesiones previas.

```bash
pnpm db:apply:local-auth
LOCAL_ADMIN_EMAIL=admin@example.com LOCAL_ADMIN_PASSWORD='use-a-long-unique-password' pnpm auth:bootstrap-admin
```

No guardes la contrasena en `.env`, `auth.http` ni en el historial compartido del shell. Para un equipo real, el siguiente paso es implementar invitaciones o restablecimiento de contrasena con enlaces de un solo uso enviados por correo.

## Verificacion

```bash
pnpm test
pnpm test:e2e
pnpm build
```
