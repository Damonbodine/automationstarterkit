'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface SyncPreferences {
  sync_strategy: 'webhook' | 'polling' | 'hybrid';
  auto_sync_enabled: boolean;
  polling_interval_minutes: number;
  polling_enabled: boolean;
  webhook_enabled: boolean;
}

interface WatchStatus {
  enabled: boolean;
  exists: boolean;
  expiresAt?: string;
  hoursUntilExpiration?: number;
  needsRenewal?: boolean;
  lastError?: string;
}

export default function SyncSettingsPage() {
  const { data: session, status } = useSession();
  const [preferences, setPreferences] = useState<SyncPreferences | null>(null);
  const [watchStatus, setWatchStatus] = useState<WatchStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch current settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sync-settings');
      const data = await response.json();

      if (response.ok) {
        setPreferences(data.preferences);
        setWatchStatus(data.watch);
      } else {
        throw new Error(data.error || 'Failed to fetch settings');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({ type: 'error', text: 'Failed to load sync settings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchSettings();
    }
  }, [status]);

  // Save preferences
  const handleSavePreferences = async () => {
    if (!preferences) return;

    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch('/api/sync-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        // Refresh to get updated watch status
        setTimeout(() => fetchSettings(), 1000);
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  // Start watch
  const handleStartWatch = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch('/api/sync-settings/watch/start', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Gmail watch started successfully!' });
        fetchSettings();
      } else {
        throw new Error(data.error || 'Failed to start watch');
      }
    } catch (error) {
      console.error('Error starting watch:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to start watch',
      });
    } finally {
      setSaving(false);
    }
  };

  // Stop watch
  const handleStopWatch = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch('/api/sync-settings/watch/stop', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Gmail watch stopped successfully!' });
        fetchSettings();
      } else {
        throw new Error(data.error || 'Failed to stop watch');
      }
    } catch (error) {
      console.error('Error stopping watch:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to stop watch',
      });
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Sync Settings</h1>
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="container mx-auto p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Sync Settings</h1>
          <p>Please sign in to configure sync settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Email Sync Settings</h1>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {preferences && (
          <div className="space-y-6">
            {/* Auto-Sync Toggle */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Automatic Sync</h2>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={preferences.auto_sync_enabled}
                  onChange={(e) =>
                    setPreferences({ ...preferences, auto_sync_enabled: e.target.checked })
                  }
                  className="w-5 h-5"
                />
                <span className="text-gray-700">
                  Enable automatic email syncing
                </span>
              </label>
              <p className="text-sm text-gray-500 mt-2">
                When enabled, your emails will automatically sync in the background based on the strategy below.
              </p>
            </div>

            {/* Sync Strategy */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Sync Strategy</h2>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="strategy"
                    value="webhook"
                    checked={preferences.sync_strategy === 'webhook'}
                    onChange={(e) =>
                      setPreferences({ ...preferences, sync_strategy: 'webhook' })
                    }
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium">Webhooks Only</div>
                    <div className="text-sm text-gray-500">
                      Real-time notifications from Gmail (most efficient)
                    </div>
                  </div>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="strategy"
                    value="polling"
                    checked={preferences.sync_strategy === 'polling'}
                    onChange={(e) =>
                      setPreferences({ ...preferences, sync_strategy: 'polling' })
                    }
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium">Polling Only</div>
                    <div className="text-sm text-gray-500">
                      Check for new emails on a schedule (simple and reliable)
                    </div>
                  </div>
                </label>

                <label className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="strategy"
                    value="hybrid"
                    checked={preferences.sync_strategy === 'hybrid'}
                    onChange={(e) =>
                      setPreferences({ ...preferences, sync_strategy: 'hybrid' })
                    }
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium">Hybrid (Recommended)</div>
                    <div className="text-sm text-gray-500">
                      Webhooks with polling fallback for maximum reliability
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Polling Interval */}
            {(preferences.sync_strategy === 'polling' || preferences.sync_strategy === 'hybrid') && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Polling Interval</h2>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={preferences.polling_interval_minutes}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        polling_interval_minutes: parseInt(e.target.value) || 15,
                      })
                    }
                    className="w-24 px-3 py-2 border rounded"
                  />
                  <span className="text-gray-700">minutes</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  How often to check for new emails (between 5 and 1440 minutes)
                </p>
              </div>
            )}

            {/* Watch Status */}
            {(preferences.sync_strategy === 'webhook' || preferences.sync_strategy === 'hybrid') && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Gmail Watch Status</h2>
                {watchStatus && watchStatus.exists ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`w-3 h-3 rounded-full ${
                          watchStatus.enabled ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      <span className="font-medium">
                        {watchStatus.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {watchStatus.enabled && watchStatus.expiresAt && (
                      <div className="text-sm text-gray-600">
                        <div>Expires: {new Date(watchStatus.expiresAt).toLocaleString()}</div>
                        <div>
                          ({watchStatus.hoursUntilExpiration?.toFixed(1)} hours remaining)
                        </div>
                        {watchStatus.needsRenewal && (
                          <div className="text-amber-600 font-medium mt-2">
                            Watch needs renewal soon!
                          </div>
                        )}
                      </div>
                    )}
                    {watchStatus.lastError && (
                      <div className="text-sm text-red-600">
                        Error: {watchStatus.lastError}
                      </div>
                    )}
                    <div className="flex space-x-3">
                      {!watchStatus.enabled && (
                        <button
                          onClick={handleStartWatch}
                          disabled={saving}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Start Watch
                        </button>
                      )}
                      {watchStatus.enabled && (
                        <button
                          onClick={handleStopWatch}
                          disabled={saving}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          Stop Watch
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-gray-600">No active watch subscription</p>
                    <button
                      onClick={handleStartWatch}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Start Watch
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSavePreferences}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
