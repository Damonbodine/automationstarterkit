-- Executive Assistant AI - Seed Data (for testing)
-- Migration: 003_seed_data.sql
-- Created: January 2025
--
-- This creates sample data for development and testing
-- ONLY run this in development environments, NOT in production

-- Note: This assumes you have a test user authenticated via Supabase Auth
-- The user_id should match the authenticated user's UUID

-- Insert a test user (you'll need to replace this UUID with your actual auth user ID)
-- In production, users are created via NextAuth/Supabase Auth
-- INSERT INTO users (id, email, name, plan_tier)
-- VALUES (
--   'replace-with-your-auth-user-id',
--   'test@example.com',
--   'Test User',
--   'pro'
-- );

-- Example: If your auth user ID is known, you can create test data
-- For now, we'll create a function to generate seed data for the current user

CREATE OR REPLACE FUNCTION seed_test_data_for_user(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
  test_email_id UUID;
  test_project_id UUID;
BEGIN
  -- Insert test project
  INSERT INTO projects (
    user_id, name, client_name, status, start_date, budget
  ) VALUES (
    target_user_id,
    'Acme Corp Website Redesign',
    'Acme Corporation',
    'active',
    CURRENT_DATE,
    50000.00
  ) RETURNING id INTO test_project_id;

  -- Insert test email
  INSERT INTO email_messages (
    user_id,
    gmail_id,
    thread_id,
    subject,
    from_email,
    from_name,
    to_email,
    body_plain,
    snippet,
    has_attachments,
    received_at
  ) VALUES (
    target_user_id,
    'test-email-001',
    'thread-001',
    'Website Redesign Project - Scope Request',
    'client@acmecorp.com',
    'Jane Client',
    'user@example.com',
    'Hi, we need a comprehensive website redesign. Can you provide a scope of work?',
    'Hi, we need a comprehensive website redesign...',
    false,
    NOW() - INTERVAL '2 hours'
  ) RETURNING id INTO test_email_id;

  -- Insert test classification
  INSERT INTO email_classifications (
    email_id,
    category,
    priority,
    sentiment,
    tags,
    assigned_agents,
    confidence_score
  ) VALUES (
    test_email_id,
    'client_request',
    'high',
    'action_required',
    ARRAY['website', 'redesign', 'scope'],
    ARRAY['sow_generator', 'task_extractor'],
    0.95
  );

  -- Insert test task
  INSERT INTO tasks (
    user_id,
    project_id,
    email_id,
    title,
    description,
    status,
    priority,
    due_date
  ) VALUES (
    target_user_id,
    test_project_id,
    test_email_id,
    'Create SOW for Acme Corp Website Redesign',
    'Generate comprehensive scope of work document',
    'pending',
    'high',
    NOW() + INTERVAL '2 days'
  );

  -- Insert test agent log
  INSERT INTO agent_logs (
    user_id,
    email_id,
    agent_type,
    action,
    input_data,
    output_data,
    success,
    execution_time_ms
  ) VALUES (
    target_user_id,
    test_email_id,
    'task_extractor',
    'extract_tasks',
    '{"email_subject": "Website Redesign Project - Scope Request"}'::jsonb,
    '{"tasks_created": 1}'::jsonb,
    true,
    1234
  );

  -- Insert email sync state
  INSERT INTO email_sync_state (
    user_id,
    last_sync_at,
    sync_status,
    total_emails_synced
  ) VALUES (
    target_user_id,
    NOW() - INTERVAL '1 hour',
    'active',
    1
  ) ON CONFLICT (user_id) DO UPDATE
    SET last_sync_at = EXCLUDED.last_sync_at,
        total_emails_synced = EXCLUDED.total_emails_synced;

  RAISE NOTICE 'Test data created successfully for user %', target_user_id;
END;
$$ LANGUAGE plpgsql;

-- Usage:
-- After you sign in and get your user ID, run:
-- SELECT seed_test_data_for_user('your-user-id-here');

COMMENT ON FUNCTION seed_test_data_for_user IS 'Creates sample data for testing. Usage: SELECT seed_test_data_for_user(''your-user-id'');';
