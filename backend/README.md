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

## Verificacion

```bash
pnpm test
pnpm test:e2e
pnpm build
```
