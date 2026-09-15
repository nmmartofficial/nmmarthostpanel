Supabase sync instructions

1) Security first — do NOT paste or commit keys here. The publishable/anon key is client-only; for DB/schema work you need a Postgres connection string or the service_role (keep it secret).

2) Options to sync:
- Recommended (Supabase CLI):
  - Install Supabase CLI: `npm install -g supabase` or see https://supabase.com/docs/guides/cli
  - Run `supabase login` and `supabase link` to connect your project.
  - Use `supabase db remote set <POSTGRES_URL>` then `supabase db push` to apply migrations.

- Direct (psql):
  - Set `SUPABASE_DB_URL` in your environment to your Postgres connection string (format: `postgres://user:password@host:port/dbname`).
  - Run the provided PowerShell script from repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync_supabase.ps1
```

3) Files added:
- [scripts/sync_supabase.ps1](scripts/sync_supabase.ps1) : PowerShell script that applies `supabase/final_complete_schema.sql` and `supabase/migrations/*.sql` using `psql`.
- [.env.example](.env.example) : Template for environment variables (do not commit real values).
- [README_SUPABASE_SYNC.md](README_SUPABASE_SYNC.md) : This file.

4) If you want, I can:
- Update project to load `SUPABASE_*` from env automatically.
- Create a GitHub Actions workflow to run safe, read-only checks (won't run migrations without secrets).

If you'd like me to proceed with any of those, tell me which and confirm you will provide secrets only locally (not pasted here).