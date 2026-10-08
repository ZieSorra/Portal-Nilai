-- ZIESORRA — Phase Admin
-- Admin-only write access for master data. No schema changes.

grant select, insert, update on public.academic_years to authenticated;
grant select, insert, update on public.classes to authenticated;
grant select, insert, update on public.students to authenticated;
grant select, insert, update on public.student_enrollments to authenticated;

drop policy if exists "admin_insert_academic_years" on public.academic_years;
create policy "admin_insert_academic_years"
on public.academic_years for insert to authenticated
with check (auth.email() = 'hendaltezza@gmail.com');

drop policy if exists "admin_update_academic_years" on public.academic_years;
create policy "admin_update_academic_years"
on public.academic_years for update to authenticated
using (auth.email() = 'hendaltezza@gmail.com')
with check (auth.email() = 'hendaltezza@gmail.com');

drop policy if exists "admin_insert_classes" on public.classes;
create policy "admin_insert_classes"
on public.classes for insert to authenticated
with check (auth.email() = 'hendaltezza@gmail.com');

drop policy if exists "admin_update_classes" on public.classes;
create policy "admin_update_classes"
on public.classes for update to authenticated
using (auth.email() = 'hendaltezza@gmail.com')
with check (auth.email() = 'hendaltezza@gmail.com');

drop policy if exists "admin_insert_students" on public.students;
create policy "admin_insert_students"
on public.students for insert to authenticated
with check (auth.email() = 'hendaltezza@gmail.com');

drop policy if exists "admin_update_students" on public.students;
create policy "admin_update_students"
on public.students for update to authenticated
using (auth.email() = 'hendaltezza@gmail.com')
with check (auth.email() = 'hendaltezza@gmail.com');

drop policy if exists "admin_insert_enrollments" on public.student_enrollments;
create policy "admin_insert_enrollments"
on public.student_enrollments for insert to authenticated
with check (auth.email() = 'hendaltezza@gmail.com');

drop policy if exists "admin_update_enrollments" on public.student_enrollments;
create policy "admin_update_enrollments"
on public.student_enrollments for update to authenticated
using (auth.email() = 'hendaltezza@gmail.com')
with check (auth.email() = 'hendaltezza@gmail.com');


-- Admin must be able to read all master rows, including inactive rows.
-- This is required by the Admin master-data screens.
drop policy if exists "admin_select_academic_years" on public.academic_years;
create policy "admin_select_academic_years"
on public.academic_years
for select
to authenticated
using (auth.email() = 'hendaltezza@gmail.com');

drop policy if exists "admin_select_classes" on public.classes;
create policy "admin_select_classes"
on public.classes
for select
to authenticated
using (auth.email() = 'hendaltezza@gmail.com');

drop policy if exists "admin_select_students" on public.students;
create policy "admin_select_students"
on public.students
for select
to authenticated
using (auth.email() = 'hendaltezza@gmail.com');

drop policy if exists "admin_select_enrollments" on public.student_enrollments;
create policy "admin_select_enrollments"
on public.student_enrollments
for select
to authenticated
using (auth.email() = 'hendaltezza@gmail.com');



-- Admin-only assessment component master management.
-- Generic component master is limited to standard components.
-- Tahfidz and Fiqih have their own dedicated admin screens.
grant select, insert, update on public.assessment_components to authenticated;

drop policy if exists "admin_select_assessment_components" on public.assessment_components;
create policy "admin_select_assessment_components"
on public.assessment_components
for select
to authenticated
using (auth.email() = 'hendaltezza@gmail.com');

drop policy if exists "admin_insert_standard_assessment_components" on public.assessment_components;
create policy "admin_insert_standard_assessment_components"
on public.assessment_components
for insert
to authenticated
with check (
  auth.email() = 'hendaltezza@gmail.com'
  and assessment_type = 'standard'
  and exists (
    select 1
    from public.subjects s
    where s.id = subject_id
      and s.name <> 'Fiqih Ibadah'
  )
);

drop policy if exists "admin_update_standard_assessment_components" on public.assessment_components;
create policy "admin_update_standard_assessment_components"
on public.assessment_components
for update
to authenticated
using (
  auth.email() = 'hendaltezza@gmail.com'
  and assessment_type = 'standard'
  and exists (
    select 1
    from public.subjects s
    where s.id = subject_id
      and s.name <> 'Fiqih Ibadah'
  )
)
with check (
  auth.email() = 'hendaltezza@gmail.com'
  and assessment_type = 'standard'
  and exists (
    select 1
    from public.subjects s
    where s.id = subject_id
      and s.name <> 'Fiqih Ibadah'
  )
);


-- Admin-only subject master management.
grant insert, update on public.subjects to authenticated;

drop policy if exists "admin_insert_subjects" on public.subjects;
create policy "admin_insert_subjects"
on public.subjects
for insert
to authenticated
with check (auth.email() = 'hendaltezza@gmail.com');

drop policy if exists "admin_update_subjects" on public.subjects;
create policy "admin_update_subjects"
on public.subjects
for update
to authenticated
using (auth.email() = 'hendaltezza@gmail.com')
with check (auth.email() = 'hendaltezza@gmail.com');

drop policy if exists "admin_select_subjects" on public.subjects;
create policy "admin_select_subjects"
on public.subjects
for select
to authenticated
using (auth.email() = 'hendaltezza@gmail.com');


-- Admin-only hard delete for master rows.
-- PostgreSQL foreign-key constraints still protect records that are in use.
grant delete on public.academic_years to authenticated;
grant delete on public.classes to authenticated;
grant delete on public.students to authenticated;
grant delete on public.subjects to authenticated;

drop policy if exists "admin_delete_academic_years" on public.academic_years;
create policy "admin_delete_academic_years"
on public.academic_years for delete to authenticated
using (auth.email() = 'hendaltezza@gmail.com');

drop policy if exists "admin_delete_classes" on public.classes;
create policy "admin_delete_classes"
on public.classes for delete to authenticated
using (auth.email() = 'hendaltezza@gmail.com');

drop policy if exists "admin_delete_students" on public.students;
create policy "admin_delete_students"
on public.students for delete to authenticated
using (auth.email() = 'hendaltezza@gmail.com');

drop policy if exists "admin_delete_subjects" on public.subjects;
create policy "admin_delete_subjects"
on public.subjects for delete to authenticated
using (auth.email() = 'hendaltezza@gmail.com');
