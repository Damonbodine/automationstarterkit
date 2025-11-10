# Supabase Setup Guide
## Executive Assistant AI Database

This directory contains all database migrations and setup instructions for the Executive Assistant AI platform.

---

## Quick Start

### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in the details:
   - **Name**: `executive-assistant-ai` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users (e.g., `us-west-1`)
   - **Pricing Plan**: Free tier is fine for development
4. Click "Create new project"
5. Wait 2-3 minutes for project provisioning

### 2. Get Your Connection Details

Once your project is ready:

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **API** tab
3. Copy the following values:

```bash
# Project URL
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co

# Anon/Public Key (for client-side)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (for server-side - keep secret!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. Go to **Database** tab in settings
5. Copy the **Connection String** (we'll use the pooled connection):

```bash
# Direct connection (for migrations)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres

# Pooled connection (for application - recommended)
DATABASE_URL_POOLED=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

### 3. Add Environment Variables

Add these to your Next.js app's `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database (pooled connection for better performance)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres

# Existing vars (keep these)
GOOGLE_APPLICATION_CREDENTIALS=...
ANTHROPIC_API_KEY=...
```

---

## Running Migrations

### Option 1: Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the sidebar
3. Click **New Query**
4. Copy and paste the contents of each migration file **in order**:
   - `001_initial_schema.sql`
   - `002_row_level_security.sql`
   - `003_seed_data.sql` (optional, for testing)
5. Click **Run** for each migration
6. Verify success (you should see "Success. No rows returned")

### Option 2: Supabase CLI (Advanced)

Install Supabase CLI:

```bash
npm install -g supabase
```

Login to Supabase:

```bash
supabase login
```

Link to your project:

```bash
cd /Users/damonbodine/automation
supabase link --project-ref YOUR_PROJECT_REF
```

Run migrations:

```bash
supabase db push
```

### Option 3: Direct PostgreSQL Connection

If you prefer using `psql`:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres" \
  -f supabase/migrations/001_initial_schema.sql

psql "postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres" \
  -f supabase/migrations/002_row_level_security.sql

psql "postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres" \
  -f supabase/migrations/003_seed_data.sql
```

---

## Verifying Setup

After running migrations, verify the tables were created:

### Via Supabase Dashboard

1. Go to **Table Editor** in sidebar
2. You should see these tables:
   - `users`
   - `email_messages`
   - `email_classifications`
   - `documents`
   - `projects`
   - `tasks`
   - `scope_of_works`
   - `agent_logs`
   - `email_sync_state`

### Via SQL Query

Run this in the SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see all 9 tables listed.

### Check RLS Policies

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

You should see policies for each table ensuring users can only access their own data.

---

## Creating Test Data

Once you've signed in to your app and have a user ID:

1. Get your user ID from the `auth.users` table:

```sql
SELECT id, email FROM auth.users;
```

2. Run the seed function:

```sql
SELECT seed_test_data_for_user('your-user-id-here');
```

This will create:
- 1 test project
- 1 test email
- 1 test classification
- 1 test task
- 1 test agent log
- Email sync state

---

## Database Schema Overview

### Tables

1. **users** - User accounts with Google OAuth tokens (encrypted)
2. **email_messages** - Synced emails from Gmail
3. **email_classifications** - AI classifications (category, priority, sentiment)
4. **documents** - Files with OCR results (PDFs, images)
5. **projects** - User projects linked to emails/tasks
6. **tasks** - Action items (auto-extracted or manual)
7. **scope_of_works** - Generated SOW documents
8. **agent_logs** - Audit trail of AI agent actions
9. **email_sync_state** - Gmail sync state for incremental sync

### Enums

- `plan_tier`: free, pro, team, enterprise
- `email_category`: client_request, invoice, contract, project_update, general, other
- `priority_level`: urgent, high, medium, low
- `sentiment_type`: positive, neutral, negative, action_required
- `project_status`: active, paused, completed, archived
- `task_status`: pending, in_progress, completed, cancelled
- `sow_status`: draft, pending_approval, approved, sent
- `sync_status`: active, paused, error

### Key Relationships

```
users (1) → (many) email_messages
email_messages (1) → (1) email_classifications
email_messages (1) → (many) documents
users (1) → (many) projects
projects (1) → (many) tasks
email_messages (1) → (many) tasks
users (1) → (many) agent_logs
```

---

## Row Level Security (RLS)

All tables have RLS enabled to ensure multi-tenant data isolation:

- Users can only see/modify their own data
- Policies enforce `user_id = auth.user_id()` checks
- Service role can bypass RLS for admin operations
- Foreign key checks ensure users can't link to other users' data

---

## Indexes

Performance-optimized indexes are created for:

- User lookups (email, google_user_id)
- Email queries (user_id, received_at, is_read, thread_id)
- Full-text search (subject, body, OCR text)
- Classification filters (category, priority, sentiment)
- Task queries (status, due_date, priority)
- Agent logs (agent_type, created_at)

---

## Token Encryption

Google OAuth tokens are stored in the `users` table:

- `google_access_token`
- `google_refresh_token`

**TODO**: Implement encryption before production:

```sql
-- Example using pgcrypto
UPDATE users
SET google_access_token = pgp_sym_encrypt(google_access_token, 'encryption-key');
```

For production, use application-level encryption with a proper key management system (e.g., AWS KMS, Google Cloud KMS).

---

## Backup & Recovery

### Automated Backups

Supabase provides automatic daily backups on paid plans. For free tier:

1. Go to **Database** → **Backups**
2. Click **Enable Point-in-Time Recovery** (requires Pro plan)

### Manual Backup

```bash
# Dump entire database
pg_dump "postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres" \
  > backup_$(date +%Y%m%d).sql

# Restore from backup
psql "postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres" \
  < backup_20250115.sql
```

---

## Monitoring

### Via Supabase Dashboard

1. **Database** → **Query Performance** - Slow queries, index usage
2. **Database** → **Connections** - Active connections, connection pooling
3. **Database** → **Usage** - Disk space, bandwidth

### Custom Monitoring Queries

Check table sizes:

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

Check slow queries:

```sql
SELECT
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Troubleshooting

### Migration Fails

**Error**: `relation already exists`

- This means the migration was already run
- Check existing tables: `\dt` in psql
- If needed, drop tables and re-run: `DROP TABLE IF EXISTS table_name CASCADE;`

### RLS Blocking Queries

**Error**: `new row violates row-level security policy`

- Make sure you're authenticated
- Check that `auth.user_id()` returns your user ID
- For server-side operations, use the service role key

### Connection Issues

**Error**: `Connection refused` or `timeout`

- Check your database password is correct
- Verify the connection string format
- Try the pooled connection URL instead
- Check Supabase project is not paused (free tier auto-pauses after inactivity)

### Performance Issues

- Check indexes are created: `\di` in psql
- Analyze query plans: `EXPLAIN ANALYZE SELECT ...`
- Enable query performance monitoring in Supabase dashboard
- Consider upgrading to Pro plan for better resources

---

## Next Steps

After setting up the database:

1. ✅ Database schema created
2. ✅ RLS policies enabled
3. ✅ Indexes optimized
4. ⏳ Install Supabase client in Next.js app
5. ⏳ Set up NextAuth.js with Supabase adapter
6. ⏳ Create API routes to interact with database
7. ⏳ Implement Gmail sync functionality
8. ⏳ Build AI classification system

Proceed to Phase 1.2 in the PRD: **NextAuth.js with Google OAuth**

---

## Useful Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [NextAuth.js with Supabase](https://authjs.dev/reference/adapter/supabase)

---

## Support

If you encounter issues:

1. Check the [Supabase Discord](https://discord.supabase.com)
2. Review [GitHub Issues](https://github.com/supabase/supabase/issues)
3. Supabase Dashboard → Support (Pro plan and above)
