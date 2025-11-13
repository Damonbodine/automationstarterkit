# Data Model

> Consolidated from `docs/00-database-schema.md`. Types also in `src/types/database.ts`.

- Users, Email Messages, Email Classifications, Documents, Projects, Tasks, Scope of Works, Agent Logs, Email Sync State
- Enums: email_category, priority_level, sentiment_type, project_status, task_status, sow_status, sync_status, plan_tier
- RLS: Users only access their own rows across tables

