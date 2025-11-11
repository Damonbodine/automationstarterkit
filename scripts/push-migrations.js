#!/usr/bin/env node

/**
 * Push migrations 006 and 007 to Supabase
 * Uses the Supabase service role key to execute SQL migrations
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../ocr-app/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSqlFile(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\n📄 Processing: ${fileName}`);

  try {
    const sql = fs.readFileSync(filePath, 'utf8');

    // Use the Supabase REST API to execute raw SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      // Try alternative approach using pg_meta
      const { data, error } = await supabase.rpc('exec', { sql });

      if (error) {
        throw new Error(`Failed to execute migration: ${error.message}`);
      }

      console.log(`✅ ${fileName} - Applied successfully`);
      return true;
    }

    console.log(`✅ ${fileName} - Applied successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${fileName} - Failed:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Pushing migrations to Supabase...');
  console.log(`   Project: ${supabaseUrl}`);

  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  const migrations = [
    path.join(migrationsDir, '006_add_milestones.sql'),
    path.join(migrationsDir, '007_add_auto_sync_infrastructure.sql')
  ];

  let success = true;
  for (const migration of migrations) {
    if (!fs.existsSync(migration)) {
      console.error(`❌ Migration file not found: ${migration}`);
      success = false;
      continue;
    }

    const result = await executeSqlFile(migration);
    if (!result) {
      success = false;
    }
  }

  if (success) {
    console.log('\n✨ All migrations applied successfully!');
    process.exit(0);
  } else {
    console.log('\n❌ Some migrations failed');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
