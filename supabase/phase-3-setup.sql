-- ZIESORRA — Phase 3 database setup
-- No schema changes. This only prepares read/write access and
-- standard assessment components for the Input Nilai screen.

-- 1. Client permissions
grant select on public.subjects to anon, authenticated;
grant select on public.assessment_components to anon, authenticated;
grant select on public.students to anon, authenticated;
grant select on public.student_enrollments to anon, authenticated;
grant select, insert, update on public.grades to anon, authenticated;
grant select on public.tahfidz_materials to anon, authenticated;

-- 2. Public read policies needed by the no-login teacher flow
drop policy if exists "public_read_active_subjects" on public.subjects;
create policy "public_read_active_subjects"
on public.subjects
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "public_read_active_components" on public.assessment_components;
create policy "public_read_active_components"
on public.assessment_components
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "public_read_active_students" on public.students;
create policy "public_read_active_students"
on public.students
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "public_read_active_enrollments" on public.student_enrollments;
create policy "public_read_active_enrollments"
on public.student_enrollments
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "public_read_active_tahfidz_materials" on public.tahfidz_materials;
create policy "public_read_active_tahfidz_materials"
on public.tahfidz_materials
for select
to anon, authenticated
using (is_active = true);

-- 3. Grade access for the current no-login teacher flow.
-- Scores are constrained by the table's existing 0–100 check.
drop policy if exists "public_read_grades" on public.grades;
create policy "public_read_grades"
on public.grades
for select
to anon, authenticated
using (true);

drop policy if exists "public_insert_grades" on public.grades;
create policy "public_insert_grades"
on public.grades
for insert
to anon, authenticated
with check (score >= 0 and score <= 100);

drop policy if exists "public_update_grades" on public.grades;
create policy "public_update_grades"
on public.grades
for update
to anon, authenticated
using (true)
with check (score >= 0 and score <= 100);

-- 4. Standard components for all active classes/active academic years.
-- Fiqih Ibadah is intentionally excluded because its report structure
-- has not yet been defined.
insert into public.assessment_components
  (academic_year_id, class_id, subject_id, name, assessment_type, sequence)
select
  ay.id,
  c.id,
  s.id,
  v.name,
  'standard',
  v.sequence
from public.academic_years ay
cross join public.classes c
cross join public.subjects s
cross join (
  values
    ('Sumatif 1', 1),
    ('Sumatif 2', 2),
    ('Sumatif 3', 3),
    ('STS', 4),
    ('SAS', 5)
) as v(name, sequence)
where ay.is_active = true
  and c.is_active = true
  and s.is_active = true
  and s.subject_type <> 'quran'
  and s.name <> 'Fiqih Ibadah'
  and not exists (
    select 1
    from public.assessment_components ac
    where ac.academic_year_id = ay.id
      and ac.class_id = c.id
      and ac.subject_id = s.id
      and ac.name = v.name
  );

-- 5. Al-Qur’an: Qira’ah and Kitabah use the standard five components.
insert into public.assessment_components
  (academic_year_id, class_id, subject_id, name, assessment_type, sequence)
select
  ay.id,
  c.id,
  s.id,
  v.name,
  'standard',
  v.sequence
from public.academic_years ay
cross join public.classes c
cross join public.subjects s
cross join (
  values
    ('Qira’ah - Sumatif 1', 1),
    ('Qira’ah - Sumatif 2', 2),
    ('Qira’ah - Sumatif 3', 3),
    ('Qira’ah - STS', 4),
    ('Qira’ah - SAS', 5),
    ('Kitabah - Sumatif 1', 6),
    ('Kitabah - Sumatif 2', 7),
    ('Kitabah - Sumatif 3', 8),
    ('Kitabah - STS', 9),
    ('Kitabah - SAS', 10)
) as v(name, sequence)
where ay.is_active = true
  and c.is_active = true
  and s.is_active = true
  and s.subject_type = 'quran'
  and not exists (
    select 1
    from public.assessment_components ac
    where ac.academic_year_id = ay.id
      and ac.class_id = c.id
      and ac.subject_id = s.id
      and ac.name = v.name
  );

-- 6. Al-Qur’an Tahfidz is one dynamic component.
-- Its surah/ayat ranges are stored separately in tahfidz_materials.
insert into public.assessment_components
  (academic_year_id, class_id, subject_id, name, assessment_type, sequence)
select
  ay.id,
  c.id,
  s.id,
  'Tahfidz',
  'tahfidz',
  1
from public.academic_years ay
cross join public.classes c
cross join public.subjects s
where ay.is_active = true
  and c.is_active = true
  and s.is_active = true
  and s.subject_type = 'quran'
  and not exists (
    select 1
    from public.assessment_components ac
    where ac.academic_year_id = ay.id
      and ac.class_id = c.id
      and ac.subject_id = s.id
      and ac.name = 'Tahfidz'
  );

-- 7. Tajwid follows the standard five components.
-- The general step above already creates these for Tajwid.

-- 8. SECURITY GUARD: keep this legacy setup script safe if it is rerun
-- after security-rls-policies.sql. Teacher access now requires an authenticated
-- anonymous-auth session with a valid teacher access code. Do not restore public
-- reads/writes on student and grade tables.
drop policy if exists "public_read_active_subjects" on public.subjects;
drop policy if exists "public_read_active_components" on public.assessment_components;
drop policy if exists "public_read_active_students" on public.students;
drop policy if exists "public_read_active_enrollments" on public.student_enrollments;
drop policy if exists "public_read_active_tahfidz_materials" on public.tahfidz_materials;
drop policy if exists "public_read_grades" on public.grades;
drop policy if exists "public_insert_grades" on public.grades;
drop policy if exists "public_update_grades" on public.grades;

revoke all on public.students, public.student_enrollments, public.subjects,
  public.assessment_components, public.tahfidz_materials, public.grades
  from anon;

grant select on public.subjects, public.assessment_components, public.students,
  public.student_enrollments, public.tahfidz_materials to authenticated;
grant select, insert, update on public.grades to authenticated;
