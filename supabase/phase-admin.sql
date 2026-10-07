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
