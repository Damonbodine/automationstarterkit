# Infrastructure Setup Guide - Getting Started

## 🚀 Quick Start: Infrastructure Agent Day 1 Tasks

This guide will help you (or the Infrastructure Agent) provision all required services for the Executive Assistant AI Platform.

---

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Credit card for service billing
- [ ] GitHub account with admin access to repository
- [ ] Google account for Google Cloud Platform
- [ ] Email address for service notifications
- [ ] Domain name (optional but recommended: example.com)

**Estimated Total Setup Time:** 4-6 hours
**Estimated Monthly Cost (MVP):** $233-393/month

---

## Step-by-Step Setup (Day 1)

### 1. Create Supabase Project (30 minutes)

**Go to:** https://supabase.com/dashboard

**Steps:**
1. Click "New Project"
2. **Project Name:** `exec-assistant-ai-prod`
3. **Database Password:** Generate strong password (save in password manager!)
4. **Region:** Choose closest to your users (e.g., `us-east-1`)
5. **Pricing Plan:** Start with Free tier (can upgrade later)
6. Click "Create new project"

**Wait for provisioning (2-3 minutes)**

**Save These Credentials:**
```bash
# Copy from Project Settings → API
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Copy from Project Settings → Database
DATABASE_URL=postgresql://postgres:password@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
```

**Enable Point-in-Time Recovery:**
- Go to Project Settings → Database
- Enable "Point in Time Recovery" (7 day retention)
- Enable "Daily Backups"

**✅ Deliverable:** Save credentials to `.env.local` (template below)

---

### 2. Create Google Cloud Project (45 minutes)

**Go to:** https://console.cloud.google.com/

#### 2.1 Create Project

1. Click "Select a project" → "New Project"
2. **Project Name:** `exec-assistant-ai-prod`
3. **Organization:** Your organization (or No organization)
4. Click "Create"

#### 2.2 Enable Billing

1. Go to Billing → Link a Billing Account
2. Add credit card
3. Set budget alerts:
   - 80% of budget: Email alert
   - 90% of budget: Email alert
   - 100% of budget: Email alert
4. **Recommended Budget:** $200/month to start

#### 2.3 Enable Required APIs

**Go to:** APIs & Services → Library

**Enable these APIs:**
- ✅ Gmail API
- ✅ Google Drive API
- ✅ Google Docs API
- ✅ Google Sheets API
- ✅ Google Calendar API
- ✅ Cloud Pub/Sub API
- ✅ Cloud Storage API
- ✅ Cloud Vision API

**Quick command (if using gcloud CLI):**
```bash
gcloud services enable gmail.googleapis.com \
  drive.googleapis.com \
  docs.googleapis.com \
  sheets.googleapis.com \
  calendar-json.googleapis.com \
  pubsub.googleapis.com \
  storage-api.googleapis.com \
  vision.googleapis.com
```

#### 2.4 Create OAuth 2.0 Credentials ⚠️ CRITICAL

**Go to:** APIs & Services → Credentials → Create Credentials → OAuth client ID

**First time:** You'll need to configure OAuth consent screen

**OAuth Consent Screen:**
1. Click "Configure Consent Screen"
2. **User Type:** External (unless you have Google Workspace)
3. Click "Create"

**App Information:**
- **App name:** Executive Assistant AI
- **User support email:** your-email@example.com
- **Developer contact:** your-email@example.com
- **App logo:** (Optional - can add later)

**Scopes:** Click "Add or Remove Scopes"
- ✅ `openid`
- ✅ `email`
- ✅ `profile`
- ✅ `https://www.googleapis.com/auth/gmail.readonly`
- ✅ `https://www.googleapis.com/auth/gmail.modify`
- ✅ `https://www.googleapis.com/auth/drive.file`
- ✅ `https://www.googleapis.com/auth/documents`
- ✅ `https://www.googleapis.com/auth/spreadsheets`
- ✅ `https://www.googleapis.com/auth/calendar`

**Test Users:** Add your email for testing
- Click "Add Users"
- Enter your email address
- Click "Save and Continue"

**Publishing Status:** Leave as "Testing" for now
- In Testing mode, only test users can sign in
- Submit for verification before public launch (takes 1-2 weeks)

**Now create OAuth Client:**
1. Go back to Credentials → Create Credentials → OAuth client ID
2. **Application type:** Web application
3. **Name:** Executive Assistant AI - Production
4. **Authorized JavaScript origins:**
   - `http://localhost:3000` (development)
   - `https://your-domain.com` (production - add later)
5. **Authorized redirect URIs:**
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-domain.com/api/auth/callback/google` (add later)
6. Click "Create"

**Save Credentials:**
```bash
GOOGLE_CLIENT_ID=xxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
```

#### 2.5 Create Service Account (for server-side operations)

**Go to:** IAM & Admin → Service Accounts → Create Service Account

1. **Service account name:** `backend-service-account`
2. **Description:** Server-side operations for backend
3. Click "Create and Continue"

**Grant Roles:**
- Cloud Storage → Storage Object Admin
- Cloud Vision → Cloud Vision API User
- Pub/Sub → Pub/Sub Publisher
- Pub/Sub → Pub/Sub Subscriber

**Create Key:**
1. Click on created service account
2. Keys → Add Key → Create New Key
3. **Key type:** JSON
4. Click "Create" (downloads JSON file)

**Save Service Account:**
```bash
# Base64 encode the JSON file for environment variable
cat service-account-key.json | base64 > service-account-base64.txt

# Add to .env.local
GOOGLE_APPLICATION_CREDENTIALS_BASE64=[contents of service-account-base64.txt]
```

**⚠️ SECURITY:** Never commit service account JSON to Git!

---

### 3. Create Cloud Storage Bucket (15 minutes)

**Go to:** Cloud Storage → Buckets → Create Bucket

1. **Name:** `exec-assistant-ai-documents`
2. **Location type:** Multi-region (US or EU based on users)
3. **Storage class:** Standard
4. **Access control:** Uniform (recommended)
5. **Protection tools:**
   - ✅ Enable versioning
   - ✅ Set retention policy: 90 days
6. Click "Create"

**Set Lifecycle Rule:**
1. Click on bucket → Lifecycle
2. Add Rule → Delete
3. **Condition:** Age > 90 days AND isLive = false (only old versions)
4. Click "Create"

**Save Bucket Name:**
```bash
GCS_BUCKET_NAME=exec-assistant-ai-documents
```

---

### 4. Set Up Cloud Pub/Sub (20 minutes)

**Go to:** Pub/Sub → Topics → Create Topic

#### Create Topic
1. **Topic ID:** `gmail-notifications`
2. **Encryption:** Google-managed key
3. **Message retention:** 7 days
4. Click "Create"

#### Create Subscription
1. Click on topic → "Create Subscription"
2. **Subscription ID:** `gmail-notifications-sub`
3. **Delivery type:** Push
4. **Endpoint URL:** `https://your-domain.com/api/webhooks/gmail` (add after Vercel deployment)
5. **Acknowledgement deadline:** 60 seconds
6. **Message retention:** 7 days
7. **Dead letter topic:** Create new topic `gmail-notifications-dead-letter`
8. **Max delivery attempts:** 5
9. Click "Create"

**Note:** You'll update the endpoint URL after deploying to Vercel (Day 4)

**Save Pub/Sub Info:**
```bash
PUBSUB_TOPIC=gmail-notifications
PUBSUB_SUBSCRIPTION=gmail-notifications-sub
GOOGLE_CLOUD_PROJECT=exec-assistant-ai-prod
```

---

### 5. Create Vercel Project (20 minutes)

**Go to:** https://vercel.com/dashboard

1. Click "Add New..." → Project
2. **Import Git Repository:**
   - Connect your GitHub account
   - Select repository: `yourusername/automation`
   - Click "Import"

**Configure Project:**
- **Framework Preset:** Next.js (auto-detected)
- **Root Directory:** `./ocr-app` (adjust if needed)
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

**Environment Variables:** (We'll add these in Day 4)
- Click "Environment Variables" → "Add Later"

**Deploy Settings:**
- **Production Branch:** `main`
- **Automatic Deployments:** ✅ Enabled

Click "Deploy" (initial deployment)

**Save Vercel Info:**
```bash
VERCEL_PROJECT_ID=xxxxxxxxxxxxx
VERCEL_TEAM_ID=xxxxxxxxxxxxx
NEXTAUTH_URL=https://your-project.vercel.app
```

**Configure Custom Domain (Optional but Recommended):**
1. Go to Project Settings → Domains
2. Add your domain: `app.example.com`
3. Follow DNS configuration instructions
4. Wait for SSL certificate (automatic, ~5 minutes)

---

### 6. Create Upstash Redis (15 minutes)

**Go to:** https://console.upstash.com/

1. Create account / Sign in
2. Click "Create Database"

**Database Configuration:**
- **Name:** `exec-assistant-ai-queue`
- **Type:** Regional (for single region) or Global (for multi-region)
- **Region:** Choose closest to Vercel deployment
- **TLS:** ✅ Enabled (required)
- **Eviction:** `allkeys-lru` (recommended for queues)

Click "Create"

**Copy Credentials:**
```bash
REDIS_URL=redis://default:xxxxxxxxxxxxx@us1-example-12345.upstash.io:6379
UPSTASH_REDIS_REST_URL=https://us1-example-12345.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxxxxxxxxxx
```

---

### 7. Set Up Sentry (Error Tracking) (20 minutes)

**Go to:** https://sentry.io/

1. Create account / Sign in
2. Create Organization: `exec-assistant-ai`
3. Create Projects:

**Project 1: Frontend**
- **Platform:** Next.js
- **Project Name:** `frontend-nextjs`
- Copy DSN

**Project 2: Backend**
- **Platform:** Next.js (API Routes)
- **Project Name:** `backend-api`
- Copy DSN

**Project 3: Workers**
- **Platform:** Node.js
- **Project Name:** `background-workers`
- Copy DSN

**Configure Alerts:**
1. Go to Alerts → Create Alert
2. **Alert Type:** Issues
3. **Conditions:**
   - Error rate > 5% in 5 minutes
   - New issue appears
4. **Actions:** Send notification to email

**Save Sentry DSNs:**
```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxxxxxxxxx@sentry.io/xxxxxxxxxxxxx
SENTRY_AUTH_TOKEN=xxxxxxxxxxxxx
SENTRY_PROJECT=frontend-nextjs
SENTRY_ORG=exec-assistant-ai
```

---

### 8. Create Anthropic API Key (10 minutes)

**Go to:** https://console.anthropic.com/

1. Create account / Sign in
2. Go to API Keys
3. Click "Create Key"
4. **Name:** `exec-assistant-ai-prod`
5. Copy API key (only shown once!)

**Set Spending Limits:**
1. Go to Billing
2. Set monthly budget limit: $500
3. Set alerts at 80%, 90%, 100%

**Save API Key:**
```bash
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
```

---

## Day 1 Complete! 🎉

### Credentials Summary

Create this file: `/Users/damonbodine/automation/ocr-app/.env.local`

```bash
# Database (Supabase)
DATABASE_URL=postgresql://postgres:password@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=[Generate with: openssl rand -base64 32]

# Google OAuth
GOOGLE_CLIENT_ID=xxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx

# Google Cloud
GOOGLE_CLOUD_PROJECT=exec-assistant-ai-prod
GOOGLE_APPLICATION_CREDENTIALS_BASE64=[base64 encoded service account JSON]
GCS_BUCKET_NAME=exec-assistant-ai-documents

# Pub/Sub
PUBSUB_TOPIC=gmail-notifications
PUBSUB_SUBSCRIPTION=gmail-notifications-sub

# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# Redis (Upstash)
REDIS_URL=redis://default:xxxxxxxxxxxxx@us1-example-12345.upstash.io:6379
UPSTASH_REDIS_REST_URL=https://us1-example-12345.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxxxxxxxxxx

# Sentry (Error Tracking)
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxxxxxxxxx@sentry.io/xxxxxxxxxxxxx
SENTRY_AUTH_TOKEN=xxxxxxxxxxxxx
SENTRY_PROJECT=frontend-nextjs
SENTRY_ORG=exec-assistant-ai

# Vercel (Added automatically in Vercel dashboard)
VERCEL_PROJECT_ID=xxxxxxxxxxxxx
VERCEL_TEAM_ID=xxxxxxxxxxxxx

# Encryption (Generate with: openssl rand -hex 32)
ENCRYPTION_KEY=[32-byte hex key for token encryption]
```

**⚠️ SECURITY CHECKLIST:**
- [ ] `.env.local` is in `.gitignore`
- [ ] Never commit credentials to Git
- [ ] Store backup in password manager (1Password, LastPass)
- [ ] Share credentials securely with team (if applicable)
- [ ] Set calendar reminder to rotate keys in 90 days

---

## Day 2 Handoffs

### To Database Agent
**Provide:**
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Action Required:**
Database Agent can now deploy migrations and generate TypeScript types.

### Documentation Checklist
- [ ] All services documented in PROJECT-DASHBOARD.md
- [ ] Credentials securely stored
- [ ] Budget alerts configured
- [ ] Monitoring dashboards bookmarked
- [ ] Emergency contact information documented

---

## Troubleshooting

### Issue: Google OAuth "This app isn't verified"
**Solution:** This is normal during development. Click "Advanced" → "Go to [app name] (unsafe)" for testing. Submit for verification before public launch.

### Issue: Supabase connection timeout
**Solution:** Check IP allowlist in Supabase dashboard → Settings → Database → Connection Pooling

### Issue: Vercel build fails
**Solution:** Ensure all environment variables are set in Vercel dashboard → Settings → Environment Variables

### Issue: Redis connection error
**Solution:** Verify TLS is enabled in connection string. Upstash requires TLS.

---

## Next Steps

**Day 2:**
- Configure Pub/Sub webhook endpoint (after Vercel deployment)
- Set up CI/CD pipeline (GitHub Actions)
- Configure monitoring dashboards
- Handoff credentials to Database Agent

**Day 3:**
- Set up staging environment
- Configure backup strategy
- Handoff Google Cloud credentials to Integration Agent

**Day 4:**
- Handoff Redis URL to Backend Agent
- Deploy environment variables to Vercel
- Test all service connections

**Day 5:**
- Complete CI/CD pipeline
- Verify deployment working end-to-end
- Conduct infrastructure review with Project Manager

---

## Cost Monitoring

**Set up these alerts:**
- Supabase: Email at 80% of free tier limits
- Google Cloud: Budget alerts at 80%, 90%, 100%
- Anthropic: Billing alerts at $100, $200, $400
- Vercel: Usage alerts (included in Pro tier)
- Upstash: Email at 80% of free tier limits

**Monthly Cost Dashboard:**
Track actual vs. estimated costs in a spreadsheet or Notion.

---

## Support Contacts

**Supabase:** support@supabase.io
**Google Cloud:** https://cloud.google.com/support
**Vercel:** https://vercel.com/support
**Upstash:** support@upstash.com
**Anthropic:** support@anthropic.com
**Sentry:** support@sentry.io

**Project Manager (Emergency):** your-email@example.com

---

**Infrastructure Setup Status:** ✅ Complete
**Ready for:** Database Agent to deploy migrations
**Timeline:** On track for Week 1 goals

Let's build! 🚀
