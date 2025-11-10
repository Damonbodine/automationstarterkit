-- Executive Assistant AI - Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Created: January 2025

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom Types (Enums)

CREATE TYPE plan_tier AS ENUM ('free', 'pro', 'team', 'enterprise');

CREATE TYPE email_category AS ENUM (
  'client_request',
  'invoice',
  'contract',
  'project_update',
  'general',
  'other'
);

CREATE TYPE priority_level AS ENUM ('urgent', 'high', 'medium', 'low');

CREATE TYPE sentiment_type AS ENUM (
  'positive',
  'neutral',
  'negative',
  'action_required'
);

CREATE TYPE project_status AS ENUM (
  'active',
  'paused',
  'completed',
  'archived'
);

CREATE TYPE task_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE sow_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'sent'
);

CREATE TYPE sync_status AS ENUM ('active', 'paused', 'error');

-- Table: users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  google_user_id TEXT UNIQUE,
  google_access_token TEXT, -- Will be encrypted
  google_refresh_token TEXT, -- Will be encrypted
  preferences JSONB DEFAULT '{}'::jsonb,
  plan_tier plan_tier DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: email_messages
CREATE TABLE email_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gmail_id TEXT NOT NULL,
  thread_id TEXT,
  subject TEXT,
  from_email TEXT,
  from_name TEXT,
  to_email TEXT,
  cc_emails TEXT[],
  bcc_emails TEXT[],
  body_plain TEXT,
  body_html TEXT,
  snippet TEXT, -- Short preview
  has_attachments BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  labels TEXT[],
  received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, gmail_id)
);

-- Table: email_classifications
CREATE TABLE email_classifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_id UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
  category email_category,
  priority priority_level,
  sentiment sentiment_type,
  tags TEXT[],
  assigned_agents TEXT[],
  confidence_score DECIMAL(3, 2), -- 0.00 to 1.00
  user_feedback TEXT, -- User can mark as correct/incorrect
  classified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email_id)
);

-- Table: documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_id UUID REFERENCES email_messages(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  file_type TEXT,
  file_size_bytes INTEGER,
  gcs_url TEXT, -- Google Cloud Storage URL
  gcs_bucket TEXT,
  gcs_path TEXT,
  ocr_text TEXT,
  ocr_metadata JSONB, -- OCR confidence, language, etc.
  ocr_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  client_email TEXT,
  status project_status DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  budget DECIMAL(12, 2),
  budget_currency TEXT DEFAULT 'USD',
  google_sheet_id TEXT,
  google_folder_id TEXT,
  google_doc_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  email_id UUID REFERENCES email_messages(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'pending',
  priority priority_level DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  assigned_to TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: scope_of_works
CREATE TABLE scope_of_works (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_id UUID REFERENCES email_messages(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  google_doc_id TEXT,
  google_doc_url TEXT,
  status sow_status DEFAULT 'draft',
  approved_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: agent_logs
CREATE TABLE agent_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_id UUID REFERENCES email_messages(id) ON DELETE SET NULL,
  agent_type TEXT NOT NULL,
  action TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: email_sync_state
CREATE TABLE email_sync_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_history_id TEXT,
  sync_status sync_status DEFAULT 'active',
  error_message TEXT,
  total_emails_synced INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_user_id ON users(google_user_id);

-- Email messages
CREATE INDEX idx_email_messages_user_id ON email_messages(user_id);
CREATE INDEX idx_email_messages_gmail_id ON email_messages(gmail_id);
CREATE INDEX idx_email_messages_thread_id ON email_messages(thread_id);
CREATE INDEX idx_email_messages_received_at ON email_messages(received_at DESC);
CREATE INDEX idx_email_messages_user_received ON email_messages(user_id, received_at DESC);
CREATE INDEX idx_email_messages_is_read ON email_messages(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_email_messages_from_email ON email_messages(from_email);
CREATE INDEX idx_email_messages_subject_search ON email_messages USING gin(to_tsvector('english', subject));
CREATE INDEX idx_email_messages_body_search ON email_messages USING gin(to_tsvector('english', body_plain));

-- Email classifications
CREATE INDEX idx_email_classifications_email_id ON email_classifications(email_id);
CREATE INDEX idx_email_classifications_category ON email_classifications(category);
CREATE INDEX idx_email_classifications_priority ON email_classifications(priority);
CREATE INDEX idx_email_classifications_sentiment ON email_classifications(sentiment);

-- Documents
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_email_id ON documents(email_id);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_ocr_search ON documents USING gin(to_tsvector('english', ocr_text));

-- Projects
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_client_name ON projects(client_name);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- Tasks
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);

-- Scope of works
CREATE INDEX idx_scope_of_works_user_id ON scope_of_works(user_id);
CREATE INDEX idx_scope_of_works_project_id ON scope_of_works(project_id);
CREATE INDEX idx_scope_of_works_status ON scope_of_works(status);

-- Agent logs
CREATE INDEX idx_agent_logs_user_id ON agent_logs(user_id);
CREATE INDEX idx_agent_logs_email_id ON agent_logs(email_id);
CREATE INDEX idx_agent_logs_agent_type ON agent_logs(agent_type);
CREATE INDEX idx_agent_logs_created_at ON agent_logs(created_at DESC);
CREATE INDEX idx_agent_logs_user_created ON agent_logs(user_id, created_at DESC);

-- Email sync state
CREATE INDEX idx_email_sync_state_user_id ON email_sync_state(user_id);

-- Updated_at triggers

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_messages_updated_at
  BEFORE UPDATE ON email_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scope_of_works_updated_at
  BEFORE UPDATE ON scope_of_works
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_sync_state_updated_at
  BEFORE UPDATE ON email_sync_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation

COMMENT ON TABLE users IS 'User accounts with encrypted Google OAuth tokens';
COMMENT ON TABLE email_messages IS 'Synced emails from Gmail with full content';
COMMENT ON TABLE email_classifications IS 'AI-generated classifications for emails';
COMMENT ON TABLE documents IS 'Files with OCR text extraction (PDFs, images)';
COMMENT ON TABLE projects IS 'User projects linked to emails and tasks';
COMMENT ON TABLE tasks IS 'Action items extracted from emails or manually created';
COMMENT ON TABLE scope_of_works IS 'Generated scope of work documents';
COMMENT ON TABLE agent_logs IS 'Audit trail of all AI agent actions';
COMMENT ON TABLE email_sync_state IS 'Gmail sync state per user for incremental sync';
