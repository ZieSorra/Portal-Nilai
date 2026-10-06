-- ZIESORRA Phase 3 — Admin Tahfidz write access
-- Admin account used by the frontend:
-- admin@ziesorra.com
--
-- Run this once in Supabase SQL Editor after creating that Auth user.

grant insert, update on public.tahfidz_materials to authenticated;

drop policy if exists "admin_insert_tahfidz_materials" on public.tahfidz_materials;
create policy "admin_insert_tahfidz_materials"
on public.tahfidz_materials
for insert
to authenticated
with check (auth.email() = 'admin@ziesorra.com');

drop policy if exists "admin_update_tahfidz_materials" on public.tahfidz_materials;
create policy "admin_update_tahfidz_materials"
on public.tahfidz_materials
for update
to authenticated
using (auth.email() = 'admin@ziesorra.com')
with check (auth.email() = 'admin@ziesorra.com');
