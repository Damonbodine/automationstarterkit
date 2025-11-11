import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/db/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import { User, Mail, RefreshCw, Settings as SettingsIcon } from 'lucide-react';

async function getUserSettings(userId: string) {
  const supabase = getSupabaseServerClient();

  // Get user info
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  // Get email sync state
  const { data: syncState } = await supabase
    .from('email_sync_state')
    .select('*')
    .eq('user_id', userId)
    .single();

  return {
    user: user || null,
    syncState: syncState || null,
  };
}

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const { user, syncState } = await getUserSettings(session.user.id);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage your account and preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <Card className="dark:border-gray-800 dark:bg-gray-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {session.user.name || 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{session.user.email}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Plan
                </label>
                <Badge variant="primary">Free Tier</Badge>
              </div>
              {user?.created_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Member since
                  </label>
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {new Date(user.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gmail Sync Settings */}
          <Card className="dark:border-gray-800 dark:bg-gray-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Gmail Sync
              </CardTitle>
              <CardDescription>
                Manage email synchronization with your Gmail account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {syncState ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Status
                      </label>
                      <div className="flex items-center gap-2">
                        <Badge variant={syncState.sync_status === 'error' ? 'danger' : 'success'}>
                          {syncState.sync_status || 'active'}
                        </Badge>
                        {syncState.error_message && (
                          <span className="text-xs text-red-600 dark:text-red-400">{syncState.error_message}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Last Sync
                      </label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {syncState.last_sync_at
                          ? formatDate(syncState.last_sync_at)
                          : 'Never'}
                      </p>
                    </div>
                  </div>
                  {(syncState as any).last_history_id && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        History ID
                      </label>
                      <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
                        {(syncState as any).last_history_id}
                      </p>
                    </div>
                  )}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                    <form action="/api/emails/sync" method="POST" className="flex flex-wrap items-center gap-2">
                      <Button type="submit" className="w-full sm:w-auto">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync Now
                      </Button>
                    </form>
                    <form action="/api/emails/sync" method="POST" className="flex items-center gap-2">
                      <input type="hidden" name="fullSync" value="true" />
                      <Button type="submit" variant="outline" className="w-full sm:w-auto">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Full Sync (slow)
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <Mail className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Gmail sync not yet initialized
                  </p>
                  <form action="/api/emails/sync" method="POST">
                    <Button type="submit">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Initialize Sync
                    </Button>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card className="dark:border-gray-800 dark:bg-gray-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Preferences
              </CardTitle>
              <CardDescription>Customize your experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Auto-classify emails
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Automatically classify new emails with AI
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Extract tasks automatically
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    AI will extract action items from emails
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Email notifications
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Get notified for urgent emails
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200 dark:border-red-900 dark:bg-gray-950">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Clear all data
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Delete all emails, documents, and tasks
                    </p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Clear Data
                  </Button>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Delete account
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Permanently delete your account
                    </p>
                  </div>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
