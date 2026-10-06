# Phase 2 Supabase Queries

Frontend context requires:
- active academic years from `academic_years`
- active classes from `classes`
- class availability based on `student_enrollments`

Recommended read-only queries:

```sql
select id, name
from academic_years
where is_active = true
order by name desc;
```

```sql
select id, name
from classes
where is_active = true
order by name;
```

For a selected academic year and class, verify enrollment:

```sql
select count(*) as student_count
from student_enrollments
where academic_year_id = '<YEAR_ID>'
  and class_id = '<CLASS_ID>'
  and is_active = true;
```

Do not add schema changes in Phase 2.
