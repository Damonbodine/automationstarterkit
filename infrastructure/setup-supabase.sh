#!/bin/bash

# ==============================================================================
# Supabase Project Setup Script
# ==============================================================================
# This script helps you set up your Supabase project for Executive Assistant AI
# ==============================================================================

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     Executive Assistant AI - Supabase Setup Helper            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check if Supabase CLI is installed
echo -e "${BLUE}Step 1: Checking for Supabase CLI...${NC}"
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}Supabase CLI not found. Installing...${NC}"
    npm install -g supabase
    echo -e "${GREEN}✓ Supabase CLI installed${NC}"
else
    echo -e "${GREEN}✓ Supabase CLI already installed${NC}"
fi
echo ""

# Step 2: Guide user to create project
echo -e "${BLUE}Step 2: Create Supabase Project${NC}"
echo -e "${YELLOW}Please follow these steps:${NC}"
echo ""
echo "1. Open your browser and go to: https://supabase.com"
echo "2. Sign up or log in to your account"
echo "3. Click 'New Project'"
echo "4. Fill in the details:"
echo "   - Name: executive-assistant-ai"
echo "   - Database Password: (generate a strong password)"
echo "   - Region: us-west-1 (or closest to you)"
echo "   - Plan: Free (for now)"
echo "5. Click 'Create new project'"
echo "6. Wait 2-3 minutes for project to be provisioned"
echo ""
read -p "Press ENTER when your project is ready..."
echo ""

# Step 3: Get credentials
echo -e "${BLUE}Step 3: Get Your Credentials${NC}"
echo ""
echo "Now, let's get your Supabase credentials:"
echo ""
echo "1. In Supabase Dashboard, click 'Project Settings' (gear icon)"
echo "2. Click 'API' tab"
echo ""

read -p "Enter your Project URL (https://xxxxx.supabase.co): " SUPABASE_URL
read -p "Enter your Anon/Public Key: " SUPABASE_ANON_KEY
read -p "Enter your Service Role Key: " SUPABASE_SERVICE_ROLE_KEY
echo ""

echo "3. Now click 'Database' tab in settings"
echo ""
read -p "Enter your Database Password: " DB_PASSWORD
read -p "Enter your Project Reference (from connection string): " PROJECT_REF
echo ""

# Construct DATABASE_URL
DATABASE_URL="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# Step 4: Create .env.local file
echo -e "${BLUE}Step 4: Creating .env.local file...${NC}"
ENV_FILE="/Users/damonbodine/automation/ocr-app/.env.local"

# Read existing .env if it exists to preserve some values
ANTHROPIC_KEY=""
if [ -f "/Users/damonbodine/automation/.env" ]; then
    ANTHROPIC_KEY=$(grep "ANTHROPIC_API_KEY" /Users/damonbodine/automation/.env | cut -d '=' -f2)
fi

# Generate NextAuth secret
NEXTAUTH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Create .env.local
cat > "$ENV_FILE" <<EOF
# ==============================================================================
# Executive Assistant AI - Environment Variables
# ==============================================================================
# AUTO-GENERATED: $(date)
# ==============================================================================

# ------------------------------------------------------------------------------
# Database - Supabase
# ------------------------------------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
DATABASE_URL=${DATABASE_URL}

# ------------------------------------------------------------------------------
# NextAuth.js - Authentication
# ------------------------------------------------------------------------------
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# ------------------------------------------------------------------------------
# Google Cloud Platform
# ------------------------------------------------------------------------------
GOOGLE_CLOUD_PROJECT=possible-point-477719-n3
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret

# Service Account (existing)
GOOGLE_APPLICATION_CREDENTIALS=/Users/damonbodine/automation/gcloud-keys.json

# Cloud Storage Bucket (existing)
GCS_BUCKET_NAME=possible-point-477719-n3-pdfs

# ------------------------------------------------------------------------------
# Pub/Sub - Gmail Notifications
# ------------------------------------------------------------------------------
PUBSUB_TOPIC=gmail-notifications
PUBSUB_SUBSCRIPTION=gmail-notifications-sub

# ------------------------------------------------------------------------------
# Anthropic - Claude API
# ------------------------------------------------------------------------------
ANTHROPIC_API_KEY=${ANTHROPIC_KEY}

# ------------------------------------------------------------------------------
# Redis - Upstash (to be configured)
# ------------------------------------------------------------------------------
REDIS_URL=redis://default:xxxxx@us1-example-12345.upstash.io:6379
UPSTASH_REDIS_REST_URL=https://us1-example-12345.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx

# ------------------------------------------------------------------------------
# Encryption & Security
# ------------------------------------------------------------------------------
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# ------------------------------------------------------------------------------
# Application Settings
# ------------------------------------------------------------------------------
NODE_ENV=development
LOG_LEVEL=info
GMAIL_API_RATE_LIMIT=10
EOF

echo -e "${GREEN}✓ .env.local created at: ${ENV_FILE}${NC}"
echo ""

# Step 5: Run migrations
echo -e "${BLUE}Step 5: Running Database Migrations${NC}"
echo ""
echo "We'll now run the SQL migrations to create all tables."
echo ""

MIGRATIONS_DIR="/Users/damonbodine/automation/supabase/migrations"

for migration in "$MIGRATIONS_DIR"/*.sql; do
    filename=$(basename "$migration")
    echo -e "${YELLOW}Running: ${filename}${NC}"

    # Use psql if available, otherwise show instructions
    if command -v psql &> /dev/null; then
        # Extract direct connection URL
        DIRECT_URL="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"
        psql "$DIRECT_URL" -f "$migration" -q
        echo -e "${GREEN}✓ ${filename} completed${NC}"
    else
        echo -e "${YELLOW}psql not found. Please run manually:${NC}"
        echo "1. Go to: ${SUPABASE_URL}/project/${PROJECT_REF}/sql"
        echo "2. Click 'New Query'"
        echo "3. Copy contents of: ${migration}"
        echo "4. Click 'Run'"
        echo ""
        read -p "Press ENTER when you've run ${filename}..."
    fi
done

echo ""
echo -e "${GREEN}✓ All migrations completed${NC}"
echo ""

# Step 6: Verify setup
echo -e "${BLUE}Step 6: Verifying Setup${NC}"
echo ""
echo "Let's verify everything is set up correctly..."
echo ""

# Check if tables exist
if command -v psql &> /dev/null; then
    DIRECT_URL="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

    echo "Checking tables..."
    TABLE_COUNT=$(psql "$DIRECT_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)

    if [ "$TABLE_COUNT" -eq "9" ]; then
        echo -e "${GREEN}✓ All 9 tables created successfully${NC}"
    else
        echo -e "${RED}✗ Expected 9 tables, found ${TABLE_COUNT}${NC}"
        echo "Please check the migrations manually."
    fi
else
    echo "Please verify manually in Supabase Dashboard → Table Editor"
    echo "You should see 9 tables: users, email_messages, email_classifications, documents, projects, tasks, scope_of_works, agent_logs, email_sync_state"
fi

echo ""

# Step 7: Next steps
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Supabase setup complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Configure Google OAuth (we'll do this next)"
echo "2. Install dependencies in Next.js app"
echo "3. Set up NextAuth.js"
echo "4. Test authentication"
echo ""
echo -e "${YELLOW}Important Files:${NC}"
echo "- Environment: ${ENV_FILE}"
echo "- Migrations: ${MIGRATIONS_DIR}"
echo "- Documentation: /Users/damonbodine/automation/supabase/README.md"
echo ""
echo -e "${GREEN}Your Supabase dashboard:${NC} ${SUPABASE_URL}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
