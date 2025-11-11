-- Add AI summary field to email_messages table
-- Migration: 004_add_email_summary.sql
-- Created: November 2025

-- Add summary column to store AI-generated summaries
ALTER TABLE email_messages
ADD COLUMN ai_summary JSONB;

-- Add index for querying emails with summaries
CREATE INDEX idx_email_messages_ai_summary ON email_messages USING gin(ai_summary) WHERE ai_summary IS NOT NULL;

-- Comment on the column
COMMENT ON COLUMN email_messages.ai_summary IS 'AI-generated summary containing summary text, key_points array, document_type, and word_count';
