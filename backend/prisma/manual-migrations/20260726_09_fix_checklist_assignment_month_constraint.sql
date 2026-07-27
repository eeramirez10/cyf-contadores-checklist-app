alter table public.checklist_assignments
  drop constraint if exists checklist_assignments_month_check;

alter table public.checklist_assignments
  add constraint checklist_assignments_month_check
  check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
