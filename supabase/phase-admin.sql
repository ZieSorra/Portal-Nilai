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


-- Freeze input nilai per tahun ajaran + semester + kelas.
create table if not exists public.grade_input_locks (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  semester text not null check (semester in ('Ganjil','Genap')),
  class_id uuid not null references public.classes(id) on delete restrict,
  is_frozen boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year_id, semester, class_id)
);

create or replace function public.update_grade_input_lock_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists grade_input_locks_updated_at on public.grade_input_locks;
create trigger grade_input_locks_updated_at
before update on public.grade_input_locks
for each row execute function public.update_grade_input_lock_updated_at();

grant select on public.grade_input_locks to anon, authenticated;
grant insert, update, delete on public.grade_input_locks to authenticated;

drop policy if exists "public_read_grade_input_locks" on public.grade_input_locks;
create policy "public_read_grade_input_locks"
on public.grade_input_locks
for select
to anon, authenticated
using (true);

drop policy if exists "admin_insert_grade_input_locks" on public.grade_input_locks;
create policy "admin_insert_grade_input_locks"
on public.grade_input_locks
for insert to authenticated
with check (auth.email() = 'hendaltezza@gmail.com');

drop policy if exists "admin_update_grade_input_locks" on public.grade_input_locks;
create policy "admin_update_grade_input_locks"
on public.grade_input_locks
for update to authenticated
using (auth.email() = 'hendaltezza@gmail.com')
with check (auth.email() = 'hendaltezza@gmail.com');

drop policy if exists "admin_delete_grade_input_locks" on public.grade_input_locks;
create policy "admin_delete_grade_input_locks"
on public.grade_input_locks
for delete to authenticated
using (auth.email() = 'hendaltezza@gmail.com');

-- Database-level freeze check. This protects both manual save and imports.
create or replace function public.is_grade_input_frozen(
  p_enrollment_id uuid,
  p_semester text
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.student_enrollments se
    join public.grade_input_locks l
      on l.academic_year_id = se.academic_year_id
     and l.class_id = se.class_id
     and l.semester = p_semester
     and l.is_frozen = true
    where se.id = p_enrollment_id
  );
$$;

grant execute on function public.is_grade_input_frozen(uuid, text) to anon, authenticated;

drop policy if exists "public_insert_grades" on public.grades;
create policy "public_insert_grades"
on public.grades
for insert
to anon, authenticated
with check (
  score >= 0
  and score <= 100
  and not public.is_grade_input_frozen(enrollment_id, semester)
);

drop policy if exists "public_update_grades" on public.grades;
create policy "public_update_grades"
on public.grades
for update
to anon, authenticated
using (not public.is_grade_input_frozen(enrollment_id, semester))
with check (
  score >= 0
  and score <= 100
  and not public.is_grade_input_frozen(enrollment_id, semester)
);

-- Hard delete for assessment components/materials is allowed only to the admin.
grant delete on public.assessment_components to authenticated;
grant delete on public.tahfidz_materials to authenticated;

drop policy if exists "admin_delete_assessment_components" on public.assessment_components;
create policy "admin_delete_assessment_components"
on public.assessment_components
for delete to authenticated
using (auth.email() = 'hendaltezza@gmail.com');

drop policy if exists "admin_delete_tahfidz_materials" on public.tahfidz_materials;
create policy "admin_delete_tahfidz_materials"
on public.tahfidz_materials
for delete to authenticated
using (auth.email() = 'hendaltezza@gmail.com');

-- 9. SECURITY GUARD: this legacy admin migration must not reopen public grade access
-- after security-rls-policies.sql has scoped all records to teacher sessions/admin.
drop policy if exists "public_read_grade_input_locks" on public.grade_input_locks;
drop policy if exists "public_insert_grades" on public.grades;
drop policy if exists "public_update_grades" on public.grades;

revoke all on public.students, public.student_enrollments, public.subjects,
  public.assessment_components, public.tahfidz_materials, public.grades,
  public.grade_input_locks, public.report_settings, public.homeroom_teachers
  from anon;
revoke execute on function public.is_grade_input_frozen(uuid, text) from anon;

grant select on public.grade_input_locks to authenticated;
grant select on public.students, public.student_enrollments, public.subjects,
  public.assessment_components, public.tahfidz_materials, public.grades
  to authenticated;
grant insert, update on public.grades to authenticated;
