create table if not exists public.checklist_assignments (
  id uuid primary key default gen_random_uuid(),
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  client_id uuid not null references public.clients(id) on delete cascade,
  template_id uuid not null references public.activity_templates(id),
  assignee_id uuid not null references public.profiles(id),
  assigned_by uuid references public.profiles(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month, client_id, template_id)
);

create index if not exists checklist_assignments_assignee_month_active_idx
  on public.checklist_assignments (assignee_id, month, is_active);
