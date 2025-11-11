-- Executive Assistant AI - Automatic Email Sync Infrastructure
-- Migration: 007_add_auto_sync_infrastructure.sql
-- Created: January 2025
--
-- Adds infrastructure for automatic email syncing via webhooks and polling

-- Create enum for sync strategies
CREATE TYPE sync_strategy AS ENUM ('webhook', 'polling', 'hybrid');

-- Gmail watch subscriptions table
-- Tracks active Gmail push notification subscriptions
CREATE TABLE gmail_watch_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Watch details
  watch_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  watch_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  pubsub_topic TEXT NOT NULL,

  -- Status tracking
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_renewed_at TIMESTAMP WITH TIME ZONE,
  renewal_attempt_count INTEGER DEFAULT 0,
  last_error TEXT,
  last_notification_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one active watch per user
  CONSTRAINT unique_active_watch_per_user UNIQUE (user_id)
);

-- User sync preferences table
-- Configures automatic sync behavior per user/client
CREATE TABLE user_sync_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Sync strategy configuration
  sync_strategy sync_strategy NOT NULL DEFAULT 'hybrid',
  auto_sync_enabled BOOLEAN NOT NULL DEFAULT false,

  -- Polling configuration
  polling_interval_minutes INTEGER DEFAULT 15,
  polling_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Webhook configuration
  webhook_enabled BOOLEAN NOT NULL DEFAULT false,

  -- Client-specific settings (for multi-client deployments)
  client_id TEXT,
  custom_config JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One preference record per user
  CONSTRAINT unique_preference_per_user UNIQUE (user_id),

  -- Validation constraints
  CONSTRAINT valid_polling_interval CHECK (polling_interval_minutes >= 5 AND polling_interval_minutes <= 1440)
);

-- Indexes for performance
CREATE INDEX idx_gmail_watch_user_id ON gmail_watch_subscriptions(user_id);
CREATE INDEX idx_gmail_watch_expires_at ON gmail_watch_subscriptions(watch_expires_at) WHERE is_active = true;
CREATE INDEX idx_gmail_watch_active ON gmail_watch_subscriptions(is_active);

CREATE INDEX idx_sync_preferences_user_id ON user_sync_preferences(user_id);
CREATE INDEX idx_sync_preferences_auto_sync ON user_sync_preferences(auto_sync_enabled) WHERE auto_sync_enabled = true;
CREATE INDEX idx_sync_preferences_client_id ON user_sync_preferences(client_id) WHERE client_id IS NOT NULL;

-- Enable RLS on new tables
ALTER TABLE gmail_watch_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sync_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gmail_watch_subscriptions
CREATE POLICY "Users can view their own watch subscriptions"
  ON gmail_watch_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own watch subscriptions"
  ON gmail_watch_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own watch subscriptions"
  ON gmail_watch_subscriptions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own watch subscriptions"
  ON gmail_watch_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for user_sync_preferences
CREATE POLICY "Users can view their own sync preferences"
  ON user_sync_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own sync preferences"
  ON user_sync_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sync preferences"
  ON user_sync_preferences FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own sync preferences"
  ON user_sync_preferences FOR DELETE
  USING (user_id = auth.uid());

-- Force RLS (service role can bypass)
ALTER TABLE gmail_watch_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE user_sync_preferences FORCE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON gmail_watch_subscriptions TO authenticated;
GRANT ALL ON user_sync_preferences TO authenticated;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_gmail_watch_subscriptions_updated_at
  BEFORE UPDATE ON gmail_watch_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sync_preferences_updated_at
  BEFORE UPDATE ON user_sync_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create default sync preferences for existing users
INSERT INTO user_sync_preferences (user_id, sync_strategy, auto_sync_enabled, polling_interval_minutes)
SELECT
  id,
  'hybrid'::sync_strategy,
  false, -- Start with auto-sync disabled by default
  15 -- Default to 15 minute polling
FROM users
ON CONFLICT (user_id) DO NOTHING;
