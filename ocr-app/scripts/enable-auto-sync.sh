#!/bin/bash

# Script to enable auto-sync for the currently logged-in user
# Usage: ./scripts/enable-auto-sync.sh

echo "Enabling auto-sync via API..."
echo "Make sure you're logged in at http://localhost:3000"
echo ""

# You'll need to get your session cookie from the browser
# Or just visit http://localhost:3000/settings/sync and enable it there

echo "To enable auto-sync:"
echo "1. Visit http://localhost:3000/settings/sync"
echo "2. Toggle 'Enable automatic email syncing' ON"
echo "3. Select sync strategy (hybrid recommended)"
echo "4. Set polling interval (15 minutes recommended)"
echo "5. Click 'Save Settings'"
echo ""
echo "Or check current status at: http://localhost:3000/api/sync-settings/debug"
