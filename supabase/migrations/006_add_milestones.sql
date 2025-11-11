-- Add milestones table for project milestone tracking
-- Migration: 006_add_milestones.sql
-- Created: November 2025

-- Create milestone_status enum
CREATE TYPE milestone_status AS ENUM ('pending', 'completed', 'cancelled');

-- Create milestones table
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status milestone_status DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_milestones_user_id ON milestones(user_id);
CREATE INDEX idx_milestones_project_id ON milestones(project_id);
CREATE INDEX idx_milestones_due_date ON milestones(due_date);
CREATE INDEX idx_milestones_status ON milestones(status);

-- Add RLS policies
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- Users can only see their own milestones
CREATE POLICY "Users can view their own milestones"
  ON milestones
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own milestones
CREATE POLICY "Users can insert their own milestones"
  ON milestones
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own milestones
CREATE POLICY "Users can update their own milestones"
  ON milestones
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own milestones
CREATE POLICY "Users can delete their own milestones"
  ON milestones
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment on the table
COMMENT ON TABLE milestones IS 'Project milestones for tracking key deliverables and deadlines';
