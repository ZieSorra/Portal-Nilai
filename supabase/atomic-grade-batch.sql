-- Atomic batch write for manual grade entry and spreadsheet import.
-- SECURITY INVOKER is intentional: existing table grants and RLS policies remain enforced.
create or replace function public.save_grade_batch(p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row jsonb;
  v_grade_id uuid;
  v_score numeric;
  v_saved integer := 0;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'Data nilai harus berupa daftar.';
  end if;

  if jsonb_array_length(p_rows) < 1 or jsonb_array_length(p_rows) > 500 then
    raise exception 'Jumlah nilai harus antara 1 dan 500.';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    if jsonb_typeof(v_row) is distinct from 'object' then
      raise exception 'Format baris nilai tidak valid.';
    end if;

    if nullif(v_row->>'score', '') is null then
      raise exception 'Nilai siswa tidak boleh kosong.';
    end if;

    v_score := (v_row->>'score')::numeric;
    if v_score < 0 or v_score > 100 then
      raise exception 'Nilai harus berada di antara 0 dan 100.';
    end if;

    if nullif(v_row->>'id', '') is not null then
      update public.grades
      set score = v_score
      where id = (v_row->>'id')::uuid
      returning id into v_grade_id;

      if not found then
        raise exception 'Nilai tidak diperbarui. Periksa akses kelas, status siswa, dan penguncian nilai.';
      end if;
    else
      insert into public.grades (
        enrollment_id,
        semester,
        subject_id,
        assessment_component_id,
        tahfidz_material_id,
        score
      ) values (
        (v_row->>'enrollment_id')::uuid,
        v_row->>'semester',
        (v_row->>'subject_id')::uuid,
        (v_row->>'assessment_component_id')::uuid,
        nullif(v_row->>'tahfidz_material_id', '')::uuid,
        v_score
      );
    end if;

    v_saved := v_saved + 1;
  end loop;

  return v_saved;
end;
$$;

revoke all on function public.save_grade_batch(jsonb) from public, anon;
grant execute on function public.save_grade_batch(jsonb) to authenticated;

notify pgrst, 'reload schema';
