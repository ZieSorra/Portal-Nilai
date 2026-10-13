-- Safe admin student deletion.
-- Removes enrollments only when no grade history exists, so existing grades are never deleted.
create or replace function public.admin_delete_student(p_student_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.email() is distinct from 'hendaltezza@gmail.com' then
    raise exception 'UNAUTHORIZED' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.students s where s.id = p_student_id
  ) then
    raise exception 'STUDENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.student_enrollments se
    join public.grades g on g.enrollment_id = se.id
    where se.student_id = p_student_id
  ) then
    raise exception 'STUDENT_HAS_GRADES' using errcode = '23503';
  end if;

  delete from public.student_enrollments
  where student_id = p_student_id;

  delete from public.students
  where id = p_student_id;

  return true;
end;
$$;

revoke all on function public.admin_delete_student(uuid) from public, anon;
grant execute on function public.admin_delete_student(uuid) to authenticated;

notify pgrst, 'reload schema';
