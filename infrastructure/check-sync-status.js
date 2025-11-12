const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './ocr-app/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSyncStatus() {
  console.log('Checking auto-sync configuration...\n');

  // Check if tables exist and get preferences
  try {
    const { data: prefs, error } = await supabase
      .from('user_sync_preferences')
      .select('*');

    if (error) {
      console.error('Error querying user_sync_preferences:', error.message);
      console.log('\n⚠️  Migration 007 may not have been run yet.');
      console.log('Run: cd /Users/damonbodine/automation && supabase db push\n');
      return;
    }

    console.log(`✓ Found ${prefs.length} user sync preference(s)\n`);

    if (prefs.length === 0) {
      console.log('⚠️  No sync preferences found. Users may not have been migrated.');

      // Get all users
      const { data: users } = await supabase.from('users').select('id, email');
      console.log(`\nFound ${users?.length || 0} user(s) in the system`);

      if (users && users.length > 0) {
        console.log('\nCreating default preferences for existing users...');
        for (const user of users) {
          const { error: insertError } = await supabase
            .from('user_sync_preferences')
            .insert({
              user_id: user.id,
              sync_strategy: 'hybrid',
              auto_sync_enabled: false,
              polling_interval_minutes: 15,
              polling_enabled: true,
              webhook_enabled: false,
            });

          if (insertError) {
            console.log(`  ✗ Failed for ${user.email}: ${insertError.message}`);
          } else {
            console.log(`  ✓ Created for ${user.email}`);
          }
        }
      }
    } else {
      console.log('Current sync preferences:');
      for (const pref of prefs) {
        const { data: user } = await supabase
          .from('users')
          .select('email')
          .eq('id', pref.user_id)
          .single();

        console.log(`\n  User: ${user?.email || pref.user_id}`);
        console.log(`  - Auto-sync enabled: ${pref.auto_sync_enabled}`);
        console.log(`  - Strategy: ${pref.sync_strategy}`);
        console.log(`  - Polling enabled: ${pref.polling_enabled}`);
        console.log(`  - Polling interval: ${pref.polling_interval_minutes} minutes`);
        console.log(`  - Webhook enabled: ${pref.webhook_enabled}`);
      }

      const enabledCount = prefs.filter(p => p.auto_sync_enabled).length;
      console.log(`\n📊 Summary: ${enabledCount}/${prefs.length} users have auto-sync enabled`);

      if (enabledCount === 0) {
        console.log('\n💡 To enable auto-sync for a user:');
        console.log('   1. Visit http://localhost:3000/settings/sync');
        console.log('   2. Toggle "Enable automatic email syncing"');
        console.log('   3. Select a sync strategy (hybrid recommended)');
        console.log('   4. Click "Save Settings"');
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkSyncStatus().then(() => process.exit(0));
