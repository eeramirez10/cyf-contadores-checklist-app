# Demo jerarquica con Auth + RLS

Aplicacion de checklist mensual para contabilidad con permisos reales por rol:

1. `ADMIN`: ve todo y es el unico que puede quitar checks.
2. `LEADER`: ve su grupo y puede marcar checks.
3. `MEMBER`: ve solo sus clientes y puede marcar checks.
4. `CLIENTE`: no entra al sistema.

## Stack

1. Next.js 16 + TypeScript
2. Supabase Auth
3. Supabase Postgres + RLS
4. Supabase Realtime (checklist)

## Ejecutar local

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).
La raiz redirige a [http://localhost:3000/login](http://localhost:3000/login).

## Rutas del panel

1. `/login` (vista separada de autenticacion)
2. `/panel/dashboard`
3. `/panel/indicadores`
4. `/panel/jerarquia`
5. `/panel/clientes`
6. `/panel/plantillas`
7. `/panel/usuario` (tambien accesible desde el avatar del header)

## Configurar Supabase

1. Copia variables:

```bash
cp .env.example .env.local
```

2. Agrega en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` se obtiene en Supabase Dashboard -> `Project Settings` -> `API` -> `service_role` (solo servidor, no se expone al navegador).

3. En Supabase SQL Editor ejecuta [schema.sql](/Users/erick/Documents/dev/Clientes/demo/supabase/schema.sql).

## Flujo de alta recomendado

1. En la app crea usuarios con `Registro` (Auth).
2. En SQL Editor asigna roles:

```sql
update public.profiles
set role = 'ADMIN'
where id = (select id from auth.users where email = 'admin@empresa.com');

update public.profiles
set role = 'LEADER'
where id = (select id from auth.users where email = 'lider@empresa.com');
```

3. Crea grupo y liga integrantes:

```sql
insert into public.groups (name, leader_id)
values ('Grupo Luis', (select id from auth.users where email = 'lider@empresa.com'));

update public.profiles
set group_id = (select id from public.groups where name = 'Grupo Luis'),
    leader_id = (select id from auth.users where email = 'lider@empresa.com')
where id = (select id from auth.users where email = 'integrante@empresa.com');
```

4. Inicia sesion con cada rol y valida visibilidad.

## Reglas de permisos implementadas

1. RLS por rol y jerarquia para `profiles`, `groups`, `clients`, `client_activities`, `checklist_entries`.
2. Trigger `prevent_illegal_uncheck`: si un check ya estaba en `true`, solo `ADMIN` puede pasarlo a `false`.
3. Historial mensual ilimitado en `checklist_entries.month`.
4. Buscador global de clientes dentro del alcance permitido por RLS.
5. Alta de cliente via `POST /api/clients/create` (servidor con `service_role`) para evitar bloqueos de RLS en el flujo de creacion, conservando validacion de jerarquia de roles.
