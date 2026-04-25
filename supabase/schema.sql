create extension if not exists pgcrypto;

drop table if exists public.checklist_entries cascade;
drop table if exists public.client_activities cascade;
drop table if exists public.clients cascade;
drop table if exists public.activity_templates cascade;
drop table if exists public.profiles cascade;
drop table if exists public.groups cascade;
drop type if exists public.user_role cascade;

create type public.user_role as enum ('ADMIN', 'LEADER', 'MEMBER');

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  leader_id uuid null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role public.user_role not null default 'MEMBER',
  group_id uuid null references public.groups(id) on delete set null,
  leader_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.groups
  add constraint groups_leader_id_fkey
  foreign key (leader_id) references public.profiles(id) on delete set null;

create table public.activity_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  area text not null check (area in ('VENTAS', 'PRODUCCION')),
  default_weight numeric(5,2) not null check (default_weight > 0 and default_weight <= 100),
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid null references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  member_id uuid not null references public.profiles(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.client_activities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  template_id uuid not null references public.activity_templates(id) on delete restrict,
  name text not null,
  area text not null check (area in ('VENTAS', 'PRODUCCION')),
  weight numeric(5,2) not null check (weight > 0 and weight <= 100),
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (client_id, template_id)
);

create table public.checklist_entries (
  id uuid primary key default gen_random_uuid(),
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  client_id uuid not null references public.clients(id) on delete cascade,
  template_id uuid not null references public.activity_templates(id) on delete restrict,
  completed boolean not null default false,
  completed_at timestamptz null,
  completed_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month, client_id, template_id)
);

alter table public.checklist_entries replica identity full;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'ADMIN';
$$;

create or replace function public.is_leader()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'LEADER';
$$;

create or replace function public.can_access_member(target_member uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when auth.uid() is null then false
      when public.is_admin() then true
      when target_member = auth.uid() then true
      when exists (
        select 1
        from public.profiles me
        join public.profiles target on target.id = target_member
        where me.id = auth.uid()
          and me.role = 'LEADER'
          and (
            target.leader_id = auth.uid()
            or (
              me.group_id is not null
              and target.group_id = me.group_id
            )
          )
      ) then true
      else false
    end;
$$;

create or replace function public.can_manage_member(target_member uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when auth.uid() is null then false
      when public.is_admin() then true
      when target_member = auth.uid() then true
      when exists (
        select 1
        from public.profiles me
        join public.profiles target on target.id = target_member
        where me.id = auth.uid()
          and me.role = 'LEADER'
          and (
            target.leader_id = auth.uid()
            or (
              me.group_id is not null
              and target.group_id = me.group_id
            )
          )
      ) then true
      else false
    end;
$$;

create or replace function public.can_access_client(target_client uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clients c
    where c.id = target_client
      and public.can_access_member(c.member_id)
  );
$$;

create or replace function public.can_manage_client(target_client uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clients c
    where c.id = target_client
      and public.can_manage_member(c.member_id)
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'Usuario'),
    'MEMBER'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_illegal_uncheck()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.completed = true and new.completed = false and not public.is_admin() then
    raise exception 'Solo ADMIN puede quitar checks ya marcados.' using errcode = '42501';
  end if;

  if new.completed = true then
    if new.completed_at is null then
      new.completed_at = now();
    end if;
    if new.completed_by is null then
      new.completed_by = auth.uid();
    end if;
  else
    new.completed_at = null;
    new.completed_by = null;
  end if;

  return new;
end;
$$;

create or replace function public.create_client_with_templates(
  p_name text,
  p_member_id uuid,
  p_template_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me public.profiles%rowtype;
  v_target public.profiles%rowtype;
  v_client_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  select * into v_me
  from public.profiles
  where id = auth.uid();

  if v_me.id is null then
    raise exception 'Perfil no encontrado' using errcode = '42501';
  end if;

  select * into v_target
  from public.profiles
  where id = p_member_id;

  if v_target.id is null then
    raise exception 'Responsable no encontrado' using errcode = '23503';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'Nombre de cliente vacio' using errcode = '22023';
  end if;

  if p_template_ids is null or array_length(p_template_ids, 1) is null then
    raise exception 'Sin plantillas seleccionadas' using errcode = '22023';
  end if;

  if not (
    v_me.role = 'ADMIN'
    or v_me.id = p_member_id
    or (
      v_me.role = 'LEADER'
      and (
        v_target.leader_id = v_me.id
        or (v_me.group_id is not null and v_target.group_id = v_me.group_id)
      )
    )
  ) then
    raise exception 'Sin permisos para crear cliente con ese responsable' using errcode = '42501';
  end if;

  insert into public.clients (name, member_id, is_active)
  values (trim(p_name), p_member_id, true)
  returning id into v_client_id;

  insert into public.client_activities (
    client_id,
    template_id,
    name,
    area,
    weight,
    display_order,
    is_active
  )
  select
    v_client_id,
    t.id,
    t.name,
    t.area,
    t.default_weight,
    row_number() over (order by t.display_order, t.name),
    t.is_active
  from public.activity_templates t
  where t.id = any(p_template_ids);

  return v_client_id;
end;
$$;

drop trigger if exists checklist_entries_set_updated_at on public.checklist_entries;
create trigger checklist_entries_set_updated_at
before update on public.checklist_entries
for each row
execute function public.set_updated_at();

drop trigger if exists checklist_entries_protect_uncheck on public.checklist_entries;
create trigger checklist_entries_protect_uncheck
before update on public.checklist_entries
for each row
execute function public.prevent_illegal_uncheck();

alter table public.groups enable row level security;
alter table public.profiles enable row level security;
alter table public.activity_templates enable row level security;
alter table public.clients enable row level security;
alter table public.client_activities enable row level security;
alter table public.checklist_entries enable row level security;

create policy groups_select_scope on public.groups
for select
using (
  public.is_admin()
  or leader_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.group_id = groups.id
  )
);

create policy groups_admin_write on public.groups
for all
using (public.is_admin())
with check (public.is_admin());

create policy profiles_select_scope on public.profiles
for select
using (public.can_access_member(id));

create policy profiles_insert_self_or_admin on public.profiles
for insert
with check (auth.uid() = id or public.is_admin());

create policy profiles_admin_update on public.profiles
for update
using (public.is_admin())
with check (public.is_admin());

create policy profiles_admin_delete on public.profiles
for delete
using (public.is_admin());

create policy templates_select_authenticated on public.activity_templates
for select
using (auth.uid() is not null);

create policy templates_insert_authenticated on public.activity_templates
for insert
with check (auth.uid() is not null and created_by = auth.uid());

create policy templates_update_owner_or_admin on public.activity_templates
for update
using (public.is_admin() or created_by = auth.uid())
with check (public.is_admin() or created_by = auth.uid());

create policy templates_delete_owner_or_admin on public.activity_templates
for delete
using (public.is_admin() or created_by = auth.uid());

create policy clients_select_scope on public.clients
for select
using (public.can_access_client(id));

create policy clients_insert_scope on public.clients
for insert
with check (
  auth.uid() is not null
  and (
    public.is_admin()
    or member_id = auth.uid()
    or exists (
      select 1
      from public.profiles me
      join public.profiles target on target.id = member_id
      where me.id = auth.uid()
        and me.role = 'LEADER'
        and (
          target.leader_id = auth.uid()
          or (
            me.group_id is not null
            and target.group_id = me.group_id
          )
        )
    )
  )
);

create policy clients_update_scope on public.clients
for update
using (public.can_manage_client(id))
with check (public.can_manage_member(member_id));

create policy clients_delete_scope on public.clients
for delete
using (public.can_manage_client(id));

create policy client_activities_select_scope on public.client_activities
for select
using (public.can_access_client(client_id));

create policy client_activities_insert_scope on public.client_activities
for insert
with check (public.can_manage_client(client_id));

create policy client_activities_update_scope on public.client_activities
for update
using (public.can_manage_client(client_id))
with check (public.can_manage_client(client_id));

create policy client_activities_delete_scope on public.client_activities
for delete
using (public.can_manage_client(client_id));

create policy checklist_select_scope on public.checklist_entries
for select
using (public.can_access_client(client_id));

create policy checklist_insert_scope on public.checklist_entries
for insert
with check (public.can_manage_client(client_id));

create policy checklist_update_scope on public.checklist_entries
for update
using (public.can_manage_client(client_id))
with check (public.can_manage_client(client_id));

create policy checklist_delete_admin on public.checklist_entries
for delete
using (public.is_admin());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.activity_templates to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.client_activities to authenticated;
grant select, insert, update, delete on public.checklist_entries to authenticated;
grant execute on function public.create_client_with_templates(text, uuid, uuid[]) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'checklist_entries'
  ) then
    alter publication supabase_realtime add table public.checklist_entries;
  end if;
end $$;

insert into public.activity_templates (name, area, default_weight, display_order, is_active, created_by)
select
  seed.name,
  seed.area,
  seed.default_weight,
  seed.display_order,
  true,
  (select id from public.profiles where role = 'ADMIN' order by created_at asc limit 1)
from (
  values
    ('Estado de cuenta', 'VENTAS', 10, 1),
    ('Contabilidad', 'VENTAS', 10, 2),
    ('Pendientes', 'VENTAS', 8, 3),
    ('Conciliacion bancaria', 'VENTAS', 12, 4),
    ('Revision estados financieros', 'PRODUCCION', 14, 5),
    ('Revision deudores', 'PRODUCCION', 10, 6),
    ('Revision acreedores', 'PRODUCCION', 8, 7),
    ('Cancelacion impuestos', 'PRODUCCION', 10, 8),
    ('Determinacion impuestos', 'PRODUCCION', 10, 9),
    ('Cumplimiento obligaciones', 'PRODUCCION', 8, 10)
) as seed(name, area, default_weight, display_order)
on conflict (name) do nothing;

-- Ejemplo para promover usuarios a roles:
-- update public.profiles set role = 'ADMIN' where id = (select id from auth.users where email = 'admin@empresa.com');
-- update public.profiles set role = 'LEADER' where id = (select id from auth.users where email = 'lider@empresa.com');
-- insert into public.groups (name, leader_id) values ('Grupo Luis', (select id from auth.users where email = 'lider@empresa.com'));
-- update public.profiles
-- set group_id = (select id from public.groups where name = 'Grupo Luis'),
--     leader_id = (select id from auth.users where email = 'lider@empresa.com')
-- where id = (select id from auth.users where email = 'integrante@empresa.com');
