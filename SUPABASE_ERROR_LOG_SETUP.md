# Supabase `error_log` Table Setup

To use the Active Bug Monitor, create this table in your Supabase project:

## SQL for Table Creation

```sql
CREATE TABLE IF NOT EXISTS error_log (
  id BIGINT PRIMARY KEY,
  error_message TEXT NOT NULL,
  error_context TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT,
  user_role TEXT
);

-- Optional: Add index for faster querying
CREATE INDEX IF NOT EXISTS idx_error_log_timestamp ON error_log(timestamp DESC);
```

## Table Columns

| Column Name | Type | Description |
|-------------|------|-------------|
| `id` | BIGINT | Unique timestamp-based ID for the error entry |
| `error_message` | TEXT | Actual error message from the app |
| `error_context` | TEXT | Where the error occurred (e.g., "Save Failed (ItemMaster)") |
| `timestamp` | TIMESTAMPTZ | When the error happened |
| `user_id` | TEXT | ID of the user who encountered the error (or "anonymous") |
| `user_role` | TEXT | Role of the user (e.g., "super_admin", "billing_staff") |
