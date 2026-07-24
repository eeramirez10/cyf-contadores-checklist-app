# Prisma

This directory is intentionally not modeled by hand. The existing Supabase
PostgreSQL schema is the source of truth until the database access migration is
complete.

1. Add the Supabase transaction-mode pooler URL to `DATABASE_URL` and the
   session-mode pooler URL to `DIRECT_URL` in `backend/.env`.
2. Run `pnpm prisma:pull` to introspect the existing database. This command is
   read-only, but it updates `schema.prisma` locally.
3. Run `pnpm prisma:generate` to generate the typed client.
4. Commit the generated `schema.prisma` before introducing application changes.

The schema includes `auth` because `public.profiles` references `auth.users`.
Supabase manages the `auth` models: treat them as read-only and never include
them in Prisma migrations.

Do not run `prisma:migrate:dev` against the existing Supabase database until
the introspected schema has been reviewed and baselined.
