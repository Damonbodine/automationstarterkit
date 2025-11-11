-- Executive Assistant AI - Row Level Security Policies
-- Migration: 002_row_level_security.sql
-- Created: January 2025
--
-- This ensures users can only access their own data (multi-tenant isolation)

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_of_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sync_state ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's ID from JWT
-- Note: Supabase provides auth.uid() function, we'll use that instead
-- If auth.uid() is not available, we create a public schema function

-- Users table policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- Email messages policies
CREATE POLICY "Users can view their own emails"
  ON email_messages FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own emails"
  ON email_messages FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own emails"
  ON email_messages FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own emails"
  ON email_messages FOR DELETE
  USING (user_id = auth.uid());

-- Email classifications policies
CREATE POLICY "Users can view classifications of their emails"
  ON email_classifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM email_messages
      WHERE email_messages.id = email_classifications.email_id
      AND email_messages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert classifications for their emails"
  ON email_classifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM email_messages
      WHERE email_messages.id = email_classifications.email_id
      AND email_messages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update classifications of their emails"
  ON email_classifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM email_messages
      WHERE email_messages.id = email_classifications.email_id
      AND email_messages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete classifications of their emails"
  ON email_classifications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM email_messages
      WHERE email_messages.id = email_classifications.email_id
      AND email_messages.user_id = auth.uid()
    )
  );

-- Documents policies
CREATE POLICY "Users can view their own documents"
  ON documents FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own documents"
  ON documents FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own documents"
  ON documents FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  USING (user_id = auth.uid());

-- Projects policies
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own projects"
  ON projects FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (user_id = auth.uid());

-- Tasks policies
CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (user_id = auth.uid());

-- Scope of works policies
CREATE POLICY "Users can view their own SOWs"
  ON scope_of_works FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own SOWs"
  ON scope_of_works FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own SOWs"
  ON scope_of_works FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own SOWs"
  ON scope_of_works FOR DELETE
  USING (user_id = auth.uid());

-- Agent logs policies
CREATE POLICY "Users can view their own agent logs"
  ON agent_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own agent logs"
  ON agent_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Email sync state policies
CREATE POLICY "Users can view their own sync state"
  ON email_sync_state FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own sync state"
  ON email_sync_state FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sync state"
  ON email_sync_state FOR UPDATE
  USING (user_id = auth.uid());

-- Grant permissions to authenticated users
-- Supabase uses the 'authenticated' role for logged-in users

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Service role bypass (for server-side operations)
-- The service role can bypass RLS for admin operations

ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE email_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE email_classifications FORCE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE scope_of_works FORCE ROW LEVEL SECURITY;
ALTER TABLE agent_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE email_sync_state FORCE ROW LEVEL SECURITY;
