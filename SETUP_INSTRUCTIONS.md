# Executive Assistant AI - Setup Instructions

## What's Been Created

### 1. PRD (Product Requirements Document)
📄 **Location**: `/PRD.md`
- Comprehensive 200+ page product spec
- 9 development phases
- Complete database schema design
- 7 AI agents specification
- Technical architecture
- Success metrics and timeline

### 2. Database Migrations
📁 **Location**: `/supabase/migrations/`

Files created:
- `001_initial_schema.sql` - All tables, indexes, triggers
- `002_row_level_security.sql` - Multi-tenant data isolation
- `003_seed_data.sql` - Test data generator
- `README.md` - Comprehensive setup guide

### 3. Environment Configuration
📄 **Location**: `/ocr-app/.env.local.example`
- Template for all required environment variables
- Copy this to `.env.local` and fill in your values

---

## Your Next Steps

### Step 1: Create Supabase Project (5 minutes)

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: `executive-assistant-ai`
   - **Database Password**: Generate strong password (save it!)
   - **Region**: `us-west-1` (or closest to you)
5. Click "Create new project"
6. Wait 2-3 minutes for provisioning

### Step 2: Get Your Credentials (5 minutes)

Once project is ready:

1. Go to **Project Settings** → **API**
2. Copy these values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

3. Go to **Project Settings** → **Database**
4. Copy the **Pooled Connection String**:
   - `DATABASE_URL` (starts with `postgresql://postgres.`)

### Step 3: Run Migrations (10 minutes)

**Easiest Method - Supabase Dashboard:**

1. Open your Supabase project
2. Click **SQL Editor** in sidebar
3. Click **New Query**
4. Open `/supabase/migrations/001_initial_schema.sql`
5. Copy all contents, paste into SQL Editor
6. Click **Run** (Ctrl+Enter)
7. Wait for "Success. No rows returned"
8. Repeat for `002_row_level_security.sql`
9. (Optional) Repeat for `003_seed_data.sql`

**Verify:**
1. Click **Table Editor** in sidebar
2. You should see 9 tables: users, email_messages, email_classifications, documents, projects, tasks, scope_of_works, agent_logs, email_sync_state

### Step 4: Configure Environment Variables (5 minutes)

1. Copy the example file:
   ```bash
   cd /Users/damonbodine/automation/ocr-app
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and fill in:
   - Supabase credentials (from Step 2)
   - Keep existing Google Cloud credentials path
   - Keep existing Anthropic API key
   - Add placeholder values for NextAuth (we'll set these up later)

### Step 5: Review PRD (15-30 minutes)

Read through `/PRD.md` and consider:

1. **Open Questions** (page bottom) - We need to decide:
   - Agent approval workflow (auto-execute vs require approval)
   - Data retention policy
   - Which integrations beyond Google Workspace

2. **Priorities** - Confirm the feature priorities make sense for your use case

3. **Timeline** - 10-week timeline realistic for your availability?

---

## What's Next (After Setup)

Once Supabase is configured:

### Phase 1.2: NextAuth.js Setup
- Install NextAuth.js and Supabase adapter
- Configure Google OAuth
- Create auth routes
- Test sign-in flow

### Phase 1.3: Migrate OCR
- Move existing OCR functionality to new architecture
- Integrate with `documents` table
- Test PDF and image processing

### Phase 2: Gmail Integration
- Set up Gmail API client
- Implement webhook system
- Build email sync

---

## Files Structure

```
/Users/damonbodine/automation/
├── PRD.md                          # Product Requirements Document
├── SETUP_INSTRUCTIONS.md           # This file
├── DOCUMENTATION.md                # Original OCR documentation
├── supabase/
│   ├── README.md                   # Detailed Supabase guide
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_row_level_security.sql
│       └── 003_seed_data.sql
├── ocr-app/                        # Next.js application
│   ├── .env.local.example          # Environment variables template
│   └── src/
│       └── app/
│           ├── api/
│           │   ├── upload/         # Existing OCR routes
│           │   └── status/
│           └── page.tsx            # Main page
├── gcloud-keys.json                # Google Cloud credentials
└── .env                            # Claude API key

```

---

## Quick Reference

### Supabase Dashboard URLs

After creating your project, bookmark these:

- **Home**: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
- **Table Editor**: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF/editor`
- **SQL Editor**: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF/sql`
- **API Settings**: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF/settings/api`

### Database Info

- **Tables**: 9 tables (users, emails, projects, tasks, etc.)
- **Indexes**: 30+ performance-optimized indexes
- **RLS Policies**: 36 policies for multi-tenant security
- **Full-text Search**: Enabled on emails and documents

### Environment Variables Needed

**Now:**
- Supabase credentials (3 values)
- Database URL (1 value)

**Later (Phase 1.2):**
- Google OAuth client ID & secret
- NextAuth secret

**Later (Phase 2):**
- Gmail Pub/Sub topic & subscription
- Redis URL (Upstash)

---

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Detailed Setup**: See `/supabase/README.md`
- **PRD**: See `/PRD.md`
- **Schema Diagrams**: In PRD Technical Architecture section

---

## Status Checklist

Current progress:

- [x] PRD created and documented
- [x] Database schema designed
- [x] SQL migrations written
- [x] RLS policies configured
- [x] Environment template created
- [ ] **→ YOU ARE HERE: Create Supabase project**
- [ ] Run migrations
- [ ] Configure environment variables
- [ ] Install dependencies
- [ ] Set up NextAuth
- [ ] Implement Gmail integration
- [ ] Build AI classification
- [ ] Create agents
- [ ] Build UI

---

## Questions?

If you get stuck:

1. Check `/supabase/README.md` for detailed troubleshooting
2. Review the PRD for architecture details
3. Ask me for help with any specific step

**Ready to create your Supabase project?** Follow Step 1 above and let me know once you have your credentials!
