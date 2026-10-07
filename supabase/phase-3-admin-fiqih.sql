-- ZIESORRA Phase 3 — Admin Fiqih Ibadah
-- Fiqih uses dynamic assessment components.
-- Example: "Sumatif 1 — Thaharah"
-- No new material table is required.

grant insert, update on public.assessment_components to authenticated;

drop policy if exists "admin_insert_fiqih_components" on public.assessment_components;
create policy "admin_insert_fiqih_components"
on public.assessment_components
for insert
to authenticated
with check (
  auth.email() = 'hendaltezza@gmail.com'
  and exists (
    select 1
    from public.subjects s
    where s.id = subject_id
      and s.name = 'Fiqih Ibadah'
  )
);

drop policy if exists "admin_update_fiqih_components" on public.assessment_components;
create policy "admin_update_fiqih_components"
on public.assessment_components
for update
to authenticated
using (
  auth.email() = 'hendaltezza@gmail.com'
  and exists (
    select 1
    from public.subjects s
    where s.id = subject_id
      and s.name = 'Fiqih Ibadah'
  )
)
with check (
  auth.email() = 'hendaltezza@gmail.com'
  and exists (
    select 1
    from public.subjects s
    where s.id = subject_id
      and s.name = 'Fiqih Ibadah'
  )
);
