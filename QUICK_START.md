# 🚀 Quick Start - Supabase Setup

## Option 1: Automated Setup (Recommended)

I've created a script that will guide you through the entire process interactively!

### Run this command:

```bash
cd /Users/damonbodine/automation
./scripts/setup-supabase.sh
```

The script will:
1. ✅ Check/install Supabase CLI
2. 📋 Guide you to create the project (you'll open browser)
3. 🔑 Collect your credentials
4. 📝 Auto-generate `.env.local` with all values
5. 🗄️ Run all database migrations
6. ✅ Verify everything is set up correctly

**Just follow the prompts!**

---

## Option 2: Manual Setup

If you prefer to do it manually:

### Step 1: Create Project (5 min)

1. Open: https://supabase.com
2. Click **"New Project"**
3. Fill in:
   - **Name**: `executive-assistant-ai`
   - **Database Password**: Generate strong password (save it!)
   - **Region**: `us-west-1`
   - **Plan**: Free
4. Click **"Create new project"**
5. Wait 2-3 minutes

### Step 2: Get Credentials (2 min)

1. Click **Settings** (gear icon) → **API**
2. Copy these 3 values:
   - **Project URL**
   - **anon/public key**
   - **service_role key**
3. Click **Database** tab
4. Copy the **Connection string** (use the POOLED one)

### Step 3: Run Migrations (5 min)

**Easiest way:**

1. Go to your Supabase dashboard → **SQL Editor**
2. Click **"New Query"**
3. Open `/Users/damonbodine/automation/supabase/migrations/001_initial_schema.sql`
4. Copy all contents → Paste into SQL Editor
5. Click **"Run"** (or Ctrl+Enter)
6. Repeat for `002_row_level_security.sql`
7. (Optional) Repeat for `003_seed_data.sql`

**Verify:** Click **Table Editor** - you should see 9 tables

### Step 4: Update .env.local (2 min)

1. Copy the example:
   ```bash
   cd /Users/damonbodine/automation/ocr-app
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and fill in your Supabase credentials

3. Generate secrets:
   ```bash
   # NextAuth secret
   openssl rand -base64 32

   # Encryption key
   openssl rand -hex 32
   ```

---

## What's Next?

After Supabase is set up, we'll:

1. ✅ Configure Google OAuth credentials
2. ✅ Install dependencies (`npm install`)
3. ✅ Set up NextAuth.js
4. ✅ Test authentication flow
5. ✅ Start building the Gmail integration

---

## Need Help?

- **Detailed guide**: `/supabase/README.md`
- **PRD**: `/PRD.md`
- **Setup instructions**: `/SETUP_INSTRUCTIONS.md`

Just let me know if you get stuck!
