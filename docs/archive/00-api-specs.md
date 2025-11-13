# API Specifications

> Note: Canonical API reference is `docs/api.md`.

**Version:** 1.0
**Last Updated:** January 2025

---

## Authentication Endpoints

### POST /api/auth/signin
Sign in with Google OAuth

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": "session_token"
}
```

---

## Email Endpoints

### GET /api/emails
List user's emails with filters

**Query Params:**
- `page` (number): Page number
- `limit` (number): Items per page (max 100)
- `category` (string): Filter by category
- `priority` (string): Filter by priority
- `unread` (boolean): Only unread emails
- `search` (string): Full-text search

**Response:**
```json
{
  "emails": [
    {
      "id": "uuid",
      "subject": "Project Proposal Request",
      "from": "client@example.com",
      "received_at": "2025-01-15T10:30:00Z",
      "classification": {
        "category": "client_request",
        "priority": "high",
        "tags": ["proposal", "new_client"]
      },
      "has_attachments": true,
      "unread": true
    }
  ],
  "total": 1523,
  "page": 1,
  "pages": 16
}
```

---

### GET /api/emails/:id
Get email details

**Response:**
```json
{
  "id": "uuid",
  "subject": "Project Proposal Request",
  "from": { "email": "client@example.com", "name": "Jane Client" },
  "to": ["user@example.com"],
  "cc": [],
  "body": "...",
  "received_at": "2025-01-15T10:30:00Z",
  "classification": {
    "category": "client_request",
    "priority": "high",
    "sentiment": "positive",
    "tags": ["proposal", "new_client"],
    "confidence": 0.92
  },
  "attachments": [
    {
      "id": "uuid",
      "filename": "requirements.pdf",
      "ocr_text": "..."
    }
  ],
  "agent_actions": [
    {
      "agent": "sow_generator",
      "action": "Created SOW draft",
      "result": { "doc_id": "google_doc_id" },
      "timestamp": "2025-01-15T10:32:00Z"
    }
  ],
  "related_project": { "id": "uuid", "name": "Acme Corp Website" }
}
```

---

### POST /api/emails/:id/classify
Manually trigger classification

**Response:**
```json
{
  "classification": {
    "category": "client_request",
    "priority": "high",
    "sentiment": "positive",
    "tags": ["proposal", "new_client"],
    "confidence": 0.92
  }
}
```

---

## Agent Endpoints

### POST /api/agents/:agentType/execute
Manually execute an agent on an email

**Request:**
```json
{
  "email_id": "uuid",
  "params": { }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "doc_id": "google_doc_id",
    "message": "SOW created successfully"
  }
}
```

---

### GET /api/agents/logs
Get agent execution logs

**Query Params:**
- `agent_type` (string): Filter by agent
- `email_id` (uuid): Filter by email
- `limit` (number)

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "agent_type": "sow_generator",
      "action": "create_sow",
      "success": true,
      "execution_time_ms": 3421,
      "created_at": "2025-01-15T10:32:00Z"
    }
  ]
}
```

---

## Project Endpoints

### GET /api/projects
List user's projects

**Query Params:**
- `status` (string): Filter by status (active, paused, completed, archived)
- `page` (number)
- `limit` (number)

**Response:**
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "Acme Corp Website",
      "client_name": "Acme Corp",
      "status": "active",
      "start_date": "2025-01-01",
      "end_date": "2025-03-31",
      "budget": 50000.00
    }
  ],
  "total": 15,
  "page": 1
}
```

---

### POST /api/projects
Create new project

**Request:**
```json
{
  "name": "Acme Corp Website",
  "client_name": "Acme Corp",
  "start_date": "2025-01-01",
  "end_date": "2025-03-31",
  "budget": 50000.00,
  "metadata": {}
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Acme Corp Website",
  "status": "active",
  "created_at": "2025-01-15T10:00:00Z"
}
```

---

### GET /api/projects/:id
Get project details with linked emails, tasks, documents

**Response:**
```json
{
  "id": "uuid",
  "name": "Acme Corp Website",
  "client_name": "Acme Corp",
  "status": "active",
  "start_date": "2025-01-01",
  "end_date": "2025-03-31",
  "budget": 50000.00,
  "google_sheet_id": "sheet_id",
  "google_folder_id": "folder_id",
  "emails": [
    {
      "id": "uuid",
      "subject": "Project kickoff",
      "received_at": "2025-01-15T10:00:00Z"
    }
  ],
  "tasks": [
    {
      "id": "uuid",
      "description": "Design homepage mockup",
      "status": "in_progress",
      "due_date": "2025-01-20T00:00:00Z"
    }
  ],
  "documents": [
    {
      "id": "uuid",
      "filename": "proposal.pdf",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "metadata": {}
}
```

---

### PUT /api/projects/:id
Update project

**Request:**
```json
{
  "name": "Acme Corp Website Redesign",
  "status": "active",
  "budget": 60000.00
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Acme Corp Website Redesign",
  "updated_at": "2025-01-15T11:00:00Z"
}
```

---

## Task Endpoints

### GET /api/tasks
List tasks with filters

**Query Params:**
- `status` (string): Filter by status
- `priority` (string): Filter by priority
- `project_id` (uuid): Filter by project
- `page` (number)
- `limit` (number)

**Response:**
```json
{
  "tasks": [
    {
      "id": "uuid",
      "description": "Design homepage mockup",
      "status": "in_progress",
      "priority": "high",
      "due_date": "2025-01-20T00:00:00Z",
      "project": {
        "id": "uuid",
        "name": "Acme Corp Website"
      }
    }
  ],
  "total": 42,
  "page": 1
}
```

---

### POST /api/tasks
Create task

**Request:**
```json
{
  "description": "Review design mockups",
  "priority": "high",
  "due_date": "2025-01-22T00:00:00Z",
  "project_id": "uuid",
  "assigned_to": "user@example.com"
}
```

**Response:**
```json
{
  "id": "uuid",
  "description": "Review design mockups",
  "status": "pending",
  "created_at": "2025-01-15T10:00:00Z"
}
```

---

### PUT /api/tasks/:id
Update task

**Request:**
```json
{
  "status": "completed",
  "description": "Reviewed and approved design mockups"
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "completed",
  "updated_at": "2025-01-15T11:00:00Z"
}
```

---

## Webhook Endpoints

### POST /api/webhooks/gmail
Receive Gmail push notifications from Pub/Sub

**Request (from Pub/Sub):**
```json
{
  "message": {
    "data": "base64_encoded_data",
    "messageId": "...",
    "publishTime": "..."
  }
}
```

**Response:**
```json
{
  "status": "ok"
}
```

---

## Document Endpoints

### GET /api/documents
List documents

**Query Params:**
- `email_id` (uuid): Filter by source email
- `page` (number)
- `limit` (number)

**Response:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "filename": "invoice.pdf",
      "file_type": "application/pdf",
      "ocr_text": "...",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

### GET /api/documents/:id
Get document details

**Response:**
```json
{
  "id": "uuid",
  "filename": "invoice.pdf",
  "file_type": "application/pdf",
  "gcs_url": "https://storage.googleapis.com/...",
  "ocr_text": "...",
  "ocr_completed_at": "2025-01-15T10:05:00Z",
  "created_at": "2025-01-15T10:00:00Z"
}
```

---

### POST /api/documents/upload
Upload document for OCR

**Request:** multipart/form-data
- `file`: File to upload

**Response:**
```json
{
  "id": "uuid",
  "filename": "document.pdf",
  "gcs_url": "https://storage.googleapis.com/...",
  "status": "processing"
}
```

---

## Error Responses

All endpoints may return these error responses:

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Access denied"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 422 Unprocessable Entity
```json
{
  "error": "Validation Error",
  "message": "Invalid input",
  "details": {
    "field": "error description"
  }
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate Limit Exceeded",
  "message": "Too many requests, please try again later",
  "retry_after": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```
