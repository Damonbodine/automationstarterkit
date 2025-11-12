#!/bin/bash
# ==============================================================================
# Generate Cryptographically Secure Secrets
# ==============================================================================
# This script generates secure secrets for the Executive Assistant AI platform
# Usage: ./scripts/generate-secrets.sh
# ==============================================================================

set -e

echo "🔐 Generating secure secrets for Executive Assistant AI..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# NEXTAUTH_SECRET (base64, 32 bytes)
echo -e "${BLUE}NEXTAUTH_SECRET${NC} (for NextAuth.js authentication):"
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "$NEXTAUTH_SECRET"
echo ""

# ENCRYPTION_KEY (hex, 32 bytes = 64 hex characters)
echo -e "${BLUE}ENCRYPTION_KEY${NC} (for encrypting OAuth tokens):"
ENCRYPTION_KEY=$(openssl rand -hex 32)
echo "$ENCRYPTION_KEY"
echo ""

# Optional: Generate a password for Supabase
echo -e "${BLUE}SUPABASE_DB_PASSWORD${NC} (suggested strong password):"
SUPABASE_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-24)
echo "$SUPABASE_PASSWORD"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ Secrets generated successfully!${NC}"
echo ""
echo "Add these to your .env.local file:"
echo ""
echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo ""
echo "⚠️  IMPORTANT: Store these securely and never commit to Git!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
