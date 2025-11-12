#!/bin/bash
# ==============================================================================
# Infrastructure Setup Verification Script
# ==============================================================================
# This script checks which services have been configured
# Usage: ./scripts/check-setup.sh
# ==============================================================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Executive Assistant AI - Infrastructure Status Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Load .env.local if it exists
if [ -f "ocr-app/.env.local" ]; then
    source ocr-app/.env.local 2>/dev/null || true
fi

check_var() {
    local var_name=$1
    local var_value="${!var_name}"
    local service_name=$2

    if [ -z "$var_value" ] || [[ "$var_value" == *"xxxxx"* ]] || [[ "$var_value" == *"your-"* ]]; then
        echo -e "${RED}✗${NC} $service_name - ${YELLOW}Not configured${NC}"
        return 1
    else
        echo -e "${GREEN}✓${NC} $service_name - ${GREEN}Configured${NC}"
        return 0
    fi
}

total_checks=0
passed_checks=0

# Supabase
echo -e "${BLUE}━━ Database (Supabase) ━━${NC}"
check_var "NEXT_PUBLIC_SUPABASE_URL" "Supabase URL" && ((passed_checks++))
((total_checks++))
check_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "Supabase Anon Key" && ((passed_checks++))
((total_checks++))
check_var "SUPABASE_SERVICE_ROLE_KEY" "Supabase Service Role Key" && ((passed_checks++))
((total_checks++))
check_var "DATABASE_URL" "Database Connection String" && ((passed_checks++))
((total_checks++))
echo ""

# NextAuth
echo -e "${BLUE}━━ Authentication (NextAuth) ━━${NC}"
check_var "NEXTAUTH_URL" "NextAuth URL" && ((passed_checks++))
((total_checks++))
check_var "NEXTAUTH_SECRET" "NextAuth Secret" && ((passed_checks++))
((total_checks++))
echo ""

# Google Cloud
echo -e "${BLUE}━━ Google Cloud Platform ━━${NC}"
check_var "GOOGLE_CLOUD_PROJECT" "Google Cloud Project ID" && ((passed_checks++))
((total_checks++))
check_var "GOOGLE_CLIENT_ID" "Google OAuth Client ID" && ((passed_checks++))
((total_checks++))
check_var "GOOGLE_CLIENT_SECRET" "Google OAuth Client Secret" && ((passed_checks++))
((total_checks++))
check_var "GOOGLE_APPLICATION_CREDENTIALS_BASE64" "Google Service Account" && ((passed_checks++))
((total_checks++))
check_var "GCS_BUCKET_NAME" "Cloud Storage Bucket" && ((passed_checks++))
((total_checks++))
echo ""

# Pub/Sub
echo -e "${BLUE}━━ Pub/Sub (Gmail Notifications) ━━${NC}"
check_var "PUBSUB_TOPIC" "Pub/Sub Topic" && ((passed_checks++))
((total_checks++))
check_var "PUBSUB_SUBSCRIPTION" "Pub/Sub Subscription" && ((passed_checks++))
((total_checks++))
echo ""

# Anthropic
echo -e "${BLUE}━━ AI (Anthropic Claude) ━━${NC}"
check_var "ANTHROPIC_API_KEY" "Anthropic API Key" && ((passed_checks++))
((total_checks++))
echo ""

# Redis
echo -e "${BLUE}━━ Queue System (Upstash Redis) ━━${NC}"
check_var "REDIS_URL" "Redis URL" && ((passed_checks++))
((total_checks++))
check_var "UPSTASH_REDIS_REST_URL" "Upstash REST URL" && ((passed_checks++))
((total_checks++))
check_var "UPSTASH_REDIS_REST_TOKEN" "Upstash REST Token" && ((passed_checks++))
((total_checks++))
echo ""

# Sentry (optional)
echo -e "${BLUE}━━ Error Tracking (Sentry) - Optional ━━${NC}"
check_var "NEXT_PUBLIC_SENTRY_DSN" "Sentry DSN" && ((passed_checks++)) || echo -e "${YELLOW}ℹ${NC} Sentry is optional but recommended"
((total_checks++))
echo ""

# Security
echo -e "${BLUE}━━ Security ━━${NC}"
check_var "ENCRYPTION_KEY" "Encryption Key" && ((passed_checks++))
((total_checks++))
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
percentage=$((passed_checks * 100 / total_checks))

if [ $passed_checks -eq $total_checks ]; then
    echo -e "${GREEN}✅ All checks passed! ($passed_checks/$total_checks)${NC}"
    echo -e "${GREEN}Your infrastructure is fully configured and ready!${NC}"
elif [ $passed_checks -ge $((total_checks * 80 / 100)) ]; then
    echo -e "${YELLOW}⚠️  Almost there! ($passed_checks/$total_checks - $percentage%)${NC}"
    echo -e "${YELLOW}A few more items need configuration.${NC}"
else
    echo -e "${RED}❌ Setup incomplete ($passed_checks/$total_checks - $percentage%)${NC}"
    echo -e "${RED}Please complete the infrastructure setup.${NC}"
fi

echo ""
echo "Next steps:"
if [ ! -f "ocr-app/.env.local" ]; then
    echo "  1. Copy .env.local.example to .env.local:"
    echo "     cp ocr-app/.env.local.example ocr-app/.env.local"
    echo ""
fi
echo "  2. Follow the INFRASTRUCTURE-SETUP-GUIDE.md"
echo "  3. Generate secrets: ./scripts/generate-secrets.sh"
echo "  4. Run this check again: ./scripts/check-setup.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
