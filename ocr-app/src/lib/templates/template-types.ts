/**
 * Template types and interfaces for Google Workspace document generation
 */

export type TemplateType = 'sow' | 'project_tracker' | 'invoice' | 'meeting_notes' | 'custom';

export interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  description: string;
  content: string; // Markdown or template string
  variables: TemplateVariable[];
  googleDocTemplateId?: string; // Optional Google Doc template ID
  googleSheetTemplateId?: string; // Optional Google Sheet template ID
  isDefault: boolean;
  userId?: string; // If custom template
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateData {
  [key: string]: any;
}

/**
 * Default template variables for SOW
 */
export const SOW_VARIABLES: TemplateVariable[] = [
  { name: 'title', description: 'SOW Title', required: true },
  { name: 'client_name', description: 'Client Name', required: true },
  { name: 'client_email', description: 'Client Email', required: false },
  { name: 'project_overview', description: 'Project Overview', required: true },
  { name: 'scope', description: 'Scope of Work', required: true },
  { name: 'deliverables', description: 'List of Deliverables', required: true },
  { name: 'timeline', description: 'Project Timeline', required: false },
  { name: 'milestones', description: 'Key Milestones', required: false },
  { name: 'budget', description: 'Budget/Payment Terms', required: false },
  { name: 'assumptions', description: 'Assumptions & Constraints', required: false },
  { name: 'acceptance_criteria', description: 'Acceptance Criteria', required: false },
  { name: 'generated_date', description: 'Date Generated', required: false, defaultValue: new Date().toLocaleDateString() },
];

/**
 * Default template variables for Project Tracker
 */
export const PROJECT_TRACKER_VARIABLES: TemplateVariable[] = [
  { name: 'project_name', description: 'Project Name', required: true },
  { name: 'client_name', description: 'Client Name', required: true },
  { name: 'start_date', description: 'Start Date', required: false },
  { name: 'end_date', description: 'End Date', required: false },
  { name: 'budget', description: 'Budget', required: false },
  { name: 'status', description: 'Status', required: false, defaultValue: 'active' },
];
