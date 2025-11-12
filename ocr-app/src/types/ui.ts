// UI-specific types derived from database types
import type { Database } from './database';

export interface EmailClassification {
  category: string;
  priority: string;
  sentiment: string;
  tags: string[] | null;
  confidence_score: number;
}

export interface EmailWithClassification {
  id: string;
  user_id: string;
  gmail_message_id: string;
  thread_id: string;
  subject: string;
  from_name: string | null;
  from_email: string;
  to_emails: string[] | null;
  cc_emails: string[] | null;
  body_plain: string | null;
  body_html: string | null;
  snippet: string | null;
  received_at: string;
  is_read: boolean;
  has_attachments: boolean;
  labels: string[] | null;
  created_at: string | null;
  email_classifications: EmailClassification[] | null;
}

export interface DashboardStats {
  unreadCount: number;
  urgentCount: number;
  tasksCount: number;
  documentsCount: number;
}

export interface Task {
  id: string;
  email_id: string | null;
  user_id: string;
  title: string;
  description: string | null;
  priority: Database['public']['Enums']['priority_level'] | null;
  due_date: string | null;
  status: Database['public']['Enums']['task_status'] | null;
  created_at: string | null;
  project_id?: string | null;
}

export interface Document {
  id: string;
  user_id: string;
  email_id: string | null;
  filename: string;
  file_type: string | null;
  file_size_bytes: number | null;
  gcs_url: string | null;
  ocr_text: string | null;
  ocr_completed_at: string | null;
  created_at: string | null;
  source_type?: 'upload' | 'google_drive' | null;
  gdrive_file_id?: string | null;
  webviewlink?: string | null;
  content?: string | null;
}

export interface AgentLog {
  id: string;
  user_id: string;
  agent_type: string;
  action: string;
  email_id: string | null;
  success: boolean | null;
  created_at: string | null;
}
