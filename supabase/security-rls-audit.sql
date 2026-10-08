-- ZIESORRA Security & RLS Audit
create extension if not exists pgcrypto;

create table if not exists public.teacher_access_credentials (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  access_code_hash text not null,
  access_code_hint text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year_id, class_id)
);

create table if not exists public.teacher_access_sessions (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  semester text not null check (semester in ('Ganjil','Genap')),
  class_id uuid not null references public.classes(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (auth_user_id, academic_year_id, semester, class_id)
);

create index if not exists idx_teacher_access_sessions_user
on public.teacher_access_sessions(auth_user_id, expires_at);

create index if not exists idx_teacher_access_sessions_context
on public.teacher_access_sessions(academic_year_id, semester, class_id, expires_at);

alter table public.teacher_access_credentials enable row level security;
alter table public.teacher_access_sessions enable row level security;

revoke all on public.teacher_access_credentials from anon, authenticated;
revoke all on public.teacher_access_sessions from anon, authenticated;
grant select on public.teacher_access_credentials to authenticated;

drop policy if exists "admin_select_teacher_access_credentials" on public.teacher_access_credentials;
create policy "admin_select_teacher_access_credentials"
on public.teacher_access_credentials
for select to authenticated
using (auth.email() = 'hendaltezza@gmail.com');

create or replace function public.admin_set_teacher_access_code(
  p_academic_year_id uuid,
  p_class_id uuid,
  p_access_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text := upper(trim(p_access_code));
begin
  if auth.email() <> 'hendaltezza@gmail.com' then
    raise exception 'UNAUTHORIZED';
  end if;
  if v_code !~ '^[A-Z0-9]{8}$' then
    raise exception 'Kode akses harus terdiri dari 8 karakter A-Z/0-9.';
  end if;

  insert into public.teacher_access_credentials
    (academic_year_id, class_id, access_code_hash, access_code_hint, is_active)
  values
    (p_academic_year_id, p_class_id,
     extensions.crypt(v_code, extensions.gen_salt('bf')),
     right(v_code, 4), true)
  on conflict (academic_year_id, class_id)
  do update set
    access_code_hash = excluded.access_code_hash,
    access_code_hint = excluded.access_code_hint,
    is_active = true,
    updated_at = now();

  return jsonb_build_object('success', true, 'hint', right(v_code, 4));
end;
$$;

create or replace function public.admin_toggle_teacher_access(
  p_academic_year_id uuid,
  p_class_id uuid,
  p_is_active boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.email() <> 'hendaltezza@gmail.com' then
    raise exception 'UNAUTHORIZED';
  end if;
  update public.teacher_access_credentials
  set is_active = p_is_active, updated_at = now()
  where academic_year_id = p_academic_year_id and class_id = p_class_id;
  return found;
end;
$$;

create or replace function public.activate_teacher_access(
  p_academic_year_id uuid,
  p_semester text,
  p_class_id uuid,
  p_access_code text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_user uuid := auth.uid();
begin
  if v_user is null then return false; end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is not true then
    return false;
  end if;

  select access_code_hash into v_hash
  from public.teacher_access_credentials
  where academic_year_id = p_academic_year_id
    and class_id = p_class_id
    and is_active = true;

  if v_hash is null then return false; end if;
  if extensions.crypt(upper(trim(p_access_code)), v_hash) <> v_hash then return false; end if;

  insert into public.teacher_access_sessions
    (auth_user_id, academic_year_id, semester, class_id, expires_at, last_seen_at)
  values
    (v_user, p_academic_year_id, p_semester, p_class_id,
     now() + interval '12 hours', now())
  on conflict (auth_user_id, academic_year_id, semester, class_id)
  do update set expires_at = now() + interval '12 hours', last_seen_at = now();

  return true;
end;
$$;

create or replace function public.has_teacher_access(
  p_academic_year_id uuid,
  p_semester text,
  p_class_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.teacher_access_sessions
    where auth_user_id = auth.uid()
      and academic_year_id = p_academic_year_id
      and semester = p_semester
      and class_id = p_class_id
      and expires_at > now()
  );
$$;

grant execute on function public.admin_set_teacher_access_code(uuid, uuid, text) to authenticated;
grant execute on function public.admin_toggle_teacher_access(uuid, uuid, boolean) to authenticated;
grant execute on function public.activate_teacher_access(uuid, text, uuid, text) to authenticated;
grant execute on function public.has_teacher_access(uuid, text, uuid) to authenticated;
