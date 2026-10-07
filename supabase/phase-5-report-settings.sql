-- Phase 5: Report identity settings
-- Run this once in Supabase SQL Editor.

create table if not exists public.report_settings (
  id boolean primary key default true,
  principal_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint report_settings_singleton check (id = true)
);

insert into public.report_settings (id, principal_name)
values (true, '')
on conflict (id) do nothing;

create table if not exists public.homeroom_teachers (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year_id, class_id)
);

create index if not exists idx_homeroom_teachers_year_class
on public.homeroom_teachers(academic_year_id, class_id);

create or replace function public.update_report_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_report_settings_updated_at on public.report_settings;
create trigger trg_report_settings_updated_at
before update on public.report_settings
for each row execute function public.update_report_settings_updated_at();

drop trigger if exists trg_homeroom_teachers_updated_at on public.homeroom_teachers;
create trigger trg_homeroom_teachers_updated_at
before update on public.homeroom_teachers
for each row execute function public.update_report_settings_updated_at();

alter table public.report_settings enable row level security;
alter table public.homeroom_teachers enable row level security;

grant select on public.report_settings to anon, authenticated;
grant select on public.homeroom_teachers to anon, authenticated;
grant insert, update, delete on public.report_settings to authenticated;
grant insert, update, delete on public.homeroom_teachers to authenticated;

drop policy if exists "public_read_report_settings" on public.report_settings;
create policy "public_read_report_settings"
on public.report_settings for select
to anon, authenticated
using (true);

drop policy if exists "admin_write_report_settings" on public.report_settings;
create policy "admin_write_report_settings"
on public.report_settings for all
to authenticated
using (auth.email() = 'hendaltezza@gmail.com')
with check (auth.email() = 'hendaltezza@gmail.com');

drop policy if exists "public_read_homeroom_teachers" on public.homeroom_teachers;
create policy "public_read_homeroom_teachers"
on public.homeroom_teachers for select
to anon, authenticated
using (true);

drop policy if exists "admin_write_homeroom_teachers" on public.homeroom_teachers;
create policy "admin_write_homeroom_teachers"
on public.homeroom_teachers for all
to authenticated
using (auth.email() = 'hendaltezza@gmail.com')
with check (auth.email() = 'hendaltezza@gmail.com');
