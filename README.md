# Ziesorra Portal Nilai

Portal input nilai sekolah berbasis web.

## Phase 2 — Entry & Access

Phase 2 focuses only on:
- Teacher context selection: Tahun Ajaran, Semester, Kelas
- Admin password access entry point
- Welcome page
- Session context
- Placeholder navigation for Input Nilai, Leger, and Cetak Rapor

Database: Supabase
Repository: GitHub


## Required database updates before operational use

GitHub Pages deployment publishes only the web files. It does **not** execute SQL against Supabase. Before using the current access-control and academic-year fixes, run these existing SQL scripts in the Supabase SQL Editor, in this order:

1. `supabase/phase-admin.sql`
2. `supabase/security-rls-audit.sql`
3. `supabase/security-rls-policies.sql`

These scripts update existing functions and row-level security policies; they do not add a new application phase or replace the agreed roadmap. Confirm each script completes successfully before using the portal with real student data.
