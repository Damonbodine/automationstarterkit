# Database Schema

> Note: Canonical data model is `docs/data-model.md`. For up-to-date types see `src/types/database.ts`.

**Version:** 1.0
**Last Updated:** January 2025

---

## Tables Overview

1. users
2. email_messages
3. email_classifications
4. documents
5. projects
6. tasks
7. scope_of_works
8. agent_logs
9. email_sync_state

---

## 1. users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | User identifier |
| email | text | UNIQUE, NOT NULL | User email address |
| name | text | | User full name |
| google_access_token | text | ENCRYPTED | Google OAuth access token |
| google_refresh_token | text | ENCRYPTED | Google OAuth refresh token |
| preferences | jsonb | DEFAULT '{}' | User preferences and settings |
| plan_tier | enum | DEFAULT 'free' | free, pro, team, enterprise |
| created_at | timestamp | DEFAULT NOW() | Account creation time |
| updated_at | timestamp | DEFAULT NOW() | Last update time |

**Indexes:**
- PRIMARY KEY on id
- UNIQUE on email
- Index on plan_tier

**Row Level Security:**
- Users can only access their own records

---

## 2. email_messages

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Email message identifier |
| user_id | uuid | FOREIGN KEY → users.id | Owner of the email |
| gmail_id | text | UNIQUE, NOT NULL | Gmail message ID |
| thread_id | text | | Gmail thread ID |
| subject | text | | Email subject line |
| from_email | text | | Sender email address |
| from_name | text | | Sender display name |
| to_email | text | | Primary recipient |
| cc_emails | text[] | | CC recipients |
| body_plain | text | | Plain text body |
| body_html | text | | HTML body |
| has_attachments | boolean | DEFAULT false | Has attachments flag |
| received_at | timestamp | | Email received timestamp |
| created_at | timestamp | DEFAULT NOW() | Record creation time |

**Indexes:**
- PRIMARY KEY on id
- UNIQUE on gmail_id
- Index on user_id
- Index on thread_id
- Index on received_at
- Full-text search index on subject, body_plain

**Row Level Security:**
- Users can only access emails where user_id = auth.uid()

---

## 3. email_classifications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Classification identifier |
| email_id | uuid | FOREIGN KEY → email_messages.id | Classified email |
| category | enum | NOT NULL | client_request, invoice, contract, project_update, general, other |
| priority | enum | NOT NULL | urgent, high, medium, low |
| sentiment | enum | NOT NULL | positive, neutral, negative, action_required |
| tags | text[] | DEFAULT '{}' | Auto-generated tags |
| assigned_agents | text[] | DEFAULT '{}' | Agents to process this email |
| confidence_score | decimal(3,2) | | AI confidence (0.00-1.00) |
| classified_at | timestamp | DEFAULT NOW() | Classification timestamp |

**Indexes:**
- PRIMARY KEY on id
- UNIQUE on email_id
- Index on category
- Index on priority
- Index on classified_at

**Row Level Security:**
- Users can only access classifications for their emails

---

## 4. documents

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Document identifier |
| user_id | uuid | FOREIGN KEY → users.id | Document owner |
| email_id | uuid | FOREIGN KEY → email_messages.id, NULLABLE | Source email (if from attachment) |
| filename | text | NOT NULL | Original filename |
| file_type | text | | MIME type |
| gcs_url | text | NOT NULL | Google Cloud Storage URL |
| ocr_text | text | | Extracted text from OCR |
| ocr_completed_at | timestamp | | OCR completion time |
| created_at | timestamp | DEFAULT NOW() | Upload time |

**Indexes:**
- PRIMARY KEY on id
- Index on user_id
- Index on email_id
- Full-text search index on ocr_text

**Row Level Security:**
- Users can only access documents where user_id = auth.uid()

---

## 5. projects

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Project identifier |
| user_id | uuid | FOREIGN KEY → users.id | Project owner |
| name | text | NOT NULL | Project name |
| client_name | text | | Client/company name |
| status | enum | DEFAULT 'active' | active, paused, completed, archived |
| start_date | date | | Project start date |
| end_date | date | | Project end date |
| budget | decimal(12,2) | | Project budget |
| google_sheet_id | text | | Linked Google Sheet ID |
| google_folder_id | text | | Linked Google Drive folder ID |
| metadata | jsonb | DEFAULT '{}' | Custom project metadata |
| created_at | timestamp | DEFAULT NOW() | Project creation time |
| updated_at | timestamp | DEFAULT NOW() | Last update time |

**Indexes:**
- PRIMARY KEY on id
- Index on user_id
- Index on status
- Index on client_name

**Row Level Security:**
- Users can only access projects where user_id = auth.uid()

---

## 6. tasks

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Task identifier |
| user_id | uuid | FOREIGN KEY → users.id | Task owner |
| project_id | uuid | FOREIGN KEY → projects.id, NULLABLE | Associated project |
| email_id | uuid | FOREIGN KEY → email_messages.id, NULLABLE | Source email |
| description | text | NOT NULL | Task description |
| status | enum | DEFAULT 'pending' | pending, in_progress, completed, cancelled |
| priority | enum | DEFAULT 'medium' | urgent, high, medium, low |
| due_date | timestamp | | Task due date |
| assigned_to | text | | Assignee (email or name) |
| created_at | timestamp | DEFAULT NOW() | Task creation time |
| updated_at | timestamp | DEFAULT NOW() | Last update time |

**Indexes:**
- PRIMARY KEY on id
- Index on user_id
- Index on project_id
- Index on status
- Index on due_date

**Row Level Security:**
- Users can only access tasks where user_id = auth.uid()

---

## 7. scope_of_works

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | SOW identifier |
| user_id | uuid | FOREIGN KEY → users.id | SOW owner |
| email_id | uuid | FOREIGN KEY → email_messages.id, NULLABLE | Source email |
| project_id | uuid | FOREIGN KEY → projects.id, NULLABLE | Associated project |
| title | text | NOT NULL | SOW title |
| content | text | | SOW content (markdown) |
| google_doc_id | text | | Google Doc ID |
| status | enum | DEFAULT 'draft' | draft, pending_approval, approved, sent |
| created_at | timestamp | DEFAULT NOW() | SOW creation time |
| updated_at | timestamp | DEFAULT NOW() | Last update time |

**Indexes:**
- PRIMARY KEY on id
- Index on user_id
- Index on project_id
- Index on status

**Row Level Security:**
- Users can only access SOWs where user_id = auth.uid()

---

## 8. agent_logs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Log entry identifier |
| user_id | uuid | FOREIGN KEY → users.id | User who triggered agent |
| email_id | uuid | FOREIGN KEY → email_messages.id, NULLABLE | Processed email |
| agent_type | text | NOT NULL | Agent name/type |
| action | text | NOT NULL | Action performed |
| input_data | jsonb | DEFAULT '{}' | Input parameters |
| output_data | jsonb | DEFAULT '{}' | Result data |
| success | boolean | NOT NULL | Success/failure flag |
| error_message | text | | Error details (if failed) |
| execution_time_ms | integer | | Execution duration |
| created_at | timestamp | DEFAULT NOW() | Execution timestamp |

**Indexes:**
- PRIMARY KEY on id
- Index on user_id
- Index on agent_type
- Index on success
- Index on created_at

**Row Level Security:**
- Users can only access logs where user_id = auth.uid()

---

## 9. email_sync_state

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY | Sync state identifier |
| user_id | uuid | FOREIGN KEY → users.id, UNIQUE | User account |
| last_sync_at | timestamp | | Last successful sync time |
| last_history_id | text | | Gmail history ID |
| sync_status | enum | DEFAULT 'active' | active, paused, error |
| error_message | text | | Error details (if failed) |
| updated_at | timestamp | DEFAULT NOW() | Last update time |

**Indexes:**
- PRIMARY KEY on id
- UNIQUE on user_id

**Row Level Security:**
- Users can only access their own sync state

---

## Enums

### plan_tier
- free
- pro
- team
- enterprise

### email_category
- client_request
- invoice
- contract
- project_update
- general
- other

### priority_level
- urgent
- high
- medium
- low

### sentiment_type
- positive
- neutral
- negative
- action_required

### project_status
- active
- paused
- completed
- archived

### task_status
- pending
- in_progress
- completed
- cancelled

### sow_status
- draft
- pending_approval
- approved
- sent

### sync_status
- active
- paused
- error

---

## Acceptance Criteria

- [ ] All tables created with proper indexes
- [ ] Row-level security policies implemented
- [ ] Foreign key constraints in place
- [ ] Migration files version controlled
- [ ] Seed data for testing
