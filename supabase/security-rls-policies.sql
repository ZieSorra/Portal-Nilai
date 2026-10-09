-- ZIESORRA Security & RLS Audit — scoped policies
revoke all on public.students, public.student_enrollments, public.subjects,
  public.assessment_components, public.tahfidz_materials, public.grades,
  public.grade_input_locks, public.report_settings, public.homeroom_teachers from anon;

revoke execute on function public.is_grade_input_frozen(uuid, text) from anon;

grant select on public.report_settings, public.homeroom_teachers to authenticated;

-- teacher_access_sessions is queried by teacher-scoped RLS policies.
-- Keep the table itself private: authenticated users can only see their own
-- session rows (plus the admin account can inspect all rows).
grant select on public.teacher_access_sessions to authenticated;

-- Teacher-scoped policies are recreated below.
-- Drop them first so this audit script is safe to run repeatedly.
drop policy if exists "teacher_read_own_access_sessions" on public.teacher_access_sessions;
drop policy if exists "teacher_read_students" on public.students;
drop policy if exists "teacher_read_enrollments" on public.student_enrollments;
drop policy if exists "teacher_read_subjects" on public.subjects;
drop policy if exists "teacher_read_assessment_components" on public.assessment_components;
drop policy if exists "teacher_read_tahfidz_materials" on public.tahfidz_materials;
drop policy if exists "teacher_read_grades" on public.grades;
drop policy if exists "teacher_insert_grades" on public.grades;
drop policy if exists "teacher_update_grades" on public.grades;
drop policy if exists "teacher_read_grade_input_locks" on public.grade_input_locks;
drop policy if exists "teacher_read_report_settings" on public.report_settings;
drop policy if exists "teacher_read_homeroom_teachers" on public.homeroom_teachers;

drop policy if exists "teacher_read_own_access_sessions" on public.teacher_access_sessions;
create policy "teacher_read_own_access_sessions"
on public.teacher_access_sessions
for select to authenticated
using (
  auth.email() = 'hendaltezza@gmail.com'
  or auth.uid() = auth_user_id
);

grant select on public.students, public.student_enrollments, public.subjects,
  public.assessment_components, public.tahfidz_materials, public.grades,
  public.grade_input_locks to authenticated;
grant insert, update on public.grades to authenticated;

drop policy if exists "public_read_active_students" on public.students;
drop policy if exists "public_read_active_enrollments" on public.student_enrollments;
drop policy if exists "public_read_active_subjects" on public.subjects;
drop policy if exists "public_read_active_assessment_components" on public.assessment_components;
drop policy if exists "public_read_active_tahfidz_materials" on public.tahfidz_materials;
drop policy if exists "public_read_grades" on public.grades;
drop policy if exists "public_insert_grades" on public.grades;
drop policy if exists "public_update_grades" on public.grades;
drop policy if exists "public_read_grade_input_locks" on public.grade_input_locks;

create policy "teacher_read_students"
on public.students for select to authenticated
using (
  auth.email() = 'hendaltezza@gmail.com'
  or exists (
    select 1 from public.student_enrollments se
    join public.teacher_access_sessions tas
      on tas.auth_user_id = auth.uid()
     and tas.academic_year_id = se.academic_year_id
     and tas.class_id = se.class_id
     and tas.expires_at > now()
    where se.student_id = students.id and se.is_active = true
  )
);

create policy "teacher_read_enrollments"
on public.student_enrollments for select to authenticated
using (
  auth.email() = 'hendaltezza@gmail.com'
  or exists (
    select 1 from public.teacher_access_sessions tas
    where tas.auth_user_id = auth.uid()
      and tas.academic_year_id = student_enrollments.academic_year_id
      and tas.class_id = student_enrollments.class_id
      and tas.expires_at > now()
  )
);

create policy "teacher_read_subjects"
on public.subjects for select to authenticated
using (
  auth.email() = 'hendaltezza@gmail.com'
  or exists (
    select 1 from public.teacher_access_sessions tas
    where tas.auth_user_id = auth.uid() and tas.expires_at > now()
  )
);

create policy "teacher_read_assessment_components"
on public.assessment_components for select to authenticated
using (
  auth.email() = 'hendaltezza@gmail.com'
  or exists (
    select 1 from public.teacher_access_sessions tas
    where tas.auth_user_id = auth.uid()
      and tas.academic_year_id = assessment_components.academic_year_id
      and tas.class_id = assessment_components.class_id
      and tas.expires_at > now()
  )
);

create policy "teacher_read_tahfidz_materials"
on public.tahfidz_materials for select to authenticated
using (
  auth.email() = 'hendaltezza@gmail.com'
  or exists (
    select 1
    from public.assessment_components ac
    join public.teacher_access_sessions tas
      on tas.auth_user_id = auth.uid()
     and tas.academic_year_id = ac.academic_year_id
     and tas.class_id = ac.class_id
     and tas.expires_at > now()
    where ac.id = tahfidz_materials.assessment_component_id
  )
);

create policy "teacher_read_grades"
on public.grades for select to authenticated
using (
  auth.email() = 'hendaltezza@gmail.com'
  or exists (
    select 1
    from public.student_enrollments se
    join public.teacher_access_sessions tas
      on tas.auth_user_id = auth.uid()
     and tas.academic_year_id = se.academic_year_id
     and tas.class_id = se.class_id
     and tas.semester = grades.semester
     and tas.expires_at > now()
    where se.id = grades.enrollment_id
  )
);

create policy "teacher_insert_grades"
on public.grades for insert to authenticated
with check (
  score between 0 and 100
  and (
    auth.email() = 'hendaltezza@gmail.com'
    or exists (
      select 1
      from public.student_enrollments se
      join public.teacher_access_sessions tas
        on tas.auth_user_id = auth.uid()
       and tas.academic_year_id = se.academic_year_id
       and tas.class_id = se.class_id
       and tas.semester = grades.semester
       and tas.expires_at > now()
      where se.id = grades.enrollment_id
    )
  )
  and exists (
    select 1
    from public.assessment_components ac
    join public.student_enrollments se
      on se.academic_year_id = ac.academic_year_id
     and se.class_id = ac.class_id
    where ac.id = grades.assessment_component_id
      and se.id = grades.enrollment_id
  )
  and not public.is_grade_input_frozen(grades.enrollment_id, grades.semester)
);

create policy "teacher_update_grades"
on public.grades for update to authenticated
using (
  auth.email() = 'hendaltezza@gmail.com'
  or exists (
    select 1
    from public.student_enrollments se
    join public.teacher_access_sessions tas
      on tas.auth_user_id = auth.uid()
     and tas.academic_year_id = se.academic_year_id
     and tas.class_id = se.class_id
     and tas.semester = grades.semester
     and tas.expires_at > now()
    where se.id = grades.enrollment_id
  )
)
with check (
  score between 0 and 100
  and (
    auth.email() = 'hendaltezza@gmail.com'
    or exists (
      select 1
      from public.student_enrollments se
      join public.teacher_access_sessions tas
        on tas.auth_user_id = auth.uid()
       and tas.academic_year_id = se.academic_year_id
       and tas.class_id = se.class_id
       and tas.semester = grades.semester
       and tas.expires_at > now()
      where se.id = grades.enrollment_id
    )
  )
  and exists (
    select 1
    from public.assessment_components ac
    join public.student_enrollments se
      on se.academic_year_id = ac.academic_year_id
     and se.class_id = ac.class_id
    where ac.id = grades.assessment_component_id
      and se.id = grades.enrollment_id
  )
  and not public.is_grade_input_frozen(grades.enrollment_id, grades.semester)
);

create policy "teacher_read_grade_input_locks"
on public.grade_input_locks for select to authenticated
using (
  auth.email() = 'hendaltezza@gmail.com'
  or exists (
    select 1 from public.teacher_access_sessions tas
    where tas.auth_user_id = auth.uid()
      and tas.academic_year_id = grade_input_locks.academic_year_id
      and tas.class_id = grade_input_locks.class_id
      and tas.semester = grade_input_locks.semester
      and tas.expires_at > now()
  )
);

drop policy if exists "public_read_report_settings" on public.report_settings;
drop policy if exists "public_read_homeroom_teachers" on public.homeroom_teachers;

create policy "teacher_read_report_settings"
on public.report_settings for select to authenticated
using (
  auth.email() = 'hendaltezza@gmail.com'
  or exists (
    select 1 from public.teacher_access_sessions tas
    where tas.auth_user_id = auth.uid() and tas.expires_at > now()
  )
);

create policy "teacher_read_homeroom_teachers"
on public.homeroom_teachers for select to authenticated
using (
  auth.email() = 'hendaltezza@gmail.com'
  or exists (
    select 1 from public.teacher_access_sessions tas
    where tas.auth_user_id = auth.uid()
      and tas.academic_year_id = homeroom_teachers.academic_year_id
      and tas.class_id = homeroom_teachers.class_id
      and tas.expires_at > now()
  )
);
