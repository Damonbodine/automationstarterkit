# Phase 1: Foundation (Weeks 1-2)

**Timeline:** Weeks 1-2
**Priority:** P0 (Must Have)

---

## Overview

Establish the foundational infrastructure for the platform including user authentication, multi-tenancy, and database schema. This phase sets up the core architecture that all subsequent features will build upon.

---

## 1.1 User Authentication & Multi-tenancy

**Priority:** P0 (Must Have)

### Requirements

- Google OAuth 2.0 integration
- Secure token storage (encrypted)
- User profile management
- Data isolation per user
- Row-level security in Supabase

### Implementation Details

**Authentication Flow:**
1. User clicks "Sign in with Google"
2. Redirect to Google OAuth consent screen
3. Request scopes: Gmail, Drive, Docs, Sheets, Calendar
4. Receive authorization code
5. Exchange for access token + refresh token
6. Encrypt and store tokens in database
7. Create session for user

**Technology:**
- NextAuth.js for OAuth flow
- Supabase for user data storage
- Crypto library for token encryption

### Acceptance Criteria

- [ ] Users can sign in with Google account
- [ ] Google API scopes requested: Gmail, Drive, Docs, Sheets, Calendar
- [ ] Tokens encrypted at rest
- [ ] Users only see their own data
- [ ] Token refresh works automatically

### Security Considerations

- All tokens encrypted with AES-256
- Refresh tokens rotated on use
- Session expiration after 30 days
- Secure httpOnly cookies for session management

---

## 1.2 Database Schema

**Priority:** P0 (Must Have)

### Tables to Create

See `00-database-schema.md` for complete schema details.

1. **users** - User accounts and authentication
2. **email_messages** - Stored emails from Gmail
3. **email_classifications** - AI classification results
4. **documents** - File uploads and OCR results
5. **projects** - Project management
6. **tasks** - Task tracking
7. **scope_of_works** - SOW documents
8. **agent_logs** - Agent execution history
9. **email_sync_state** - Gmail sync status per user

### Implementation Steps

1. Create Supabase project
2. Write SQL migration files for all tables
3. Create enum types
4. Add indexes for performance
5. Implement Row Level Security (RLS) policies
6. Create seed data for development/testing

### RLS Policies

**Pattern for all tables:**
```sql
-- Users can only read their own data
CREATE POLICY "Users can view own data"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own data
CREATE POLICY "Users can insert own data"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own data
CREATE POLICY "Users can update own data"
  ON table_name FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own data
CREATE POLICY "Users can delete own data"
  ON table_name FOR DELETE
  USING (auth.uid() = user_id);
```

### Acceptance Criteria

- [ ] All tables created with proper indexes
- [ ] Row-level security policies implemented
- [ ] Foreign key constraints in place
- [ ] Migration files version controlled
- [ ] Seed data for testing

---

## 1.3 Migrate Existing OCR

**Priority:** P1 (Should Have)

### Requirements

- Move OCR routes to new structure
- Save OCR results to `documents` table
- Link documents to emails when applicable
- Reuse existing Google Cloud Vision integration

### Implementation Steps

1. Review existing OCR implementation in `ocr-app/`
2. Create new API route: `/api/documents/upload`
3. Integrate with Google Cloud Vision API
4. Save uploaded files to Google Cloud Storage
5. Store OCR results in `documents` table
6. Create API route to retrieve document history

### Migration Path

**Old Flow:**
```
Upload PDF → OCR → Display results
```

**New Flow:**
```
Upload PDF → Save to GCS → OCR → Save to documents table → Link to email (if applicable) → Display results
```

### Acceptance Criteria

- [ ] OCR functionality works as before
- [ ] Results persisted to database
- [ ] File history viewable per user
- [ ] Documents can be linked to emails

---

## Next.js Project Setup

### Tech Stack
- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- NextAuth.js

### Project Structure

```
/app
  /api
    /auth
      [...nextauth]/
    /documents
      upload/
    /emails
    /projects
    /tasks
  /dashboard
  /login
  /settings
/components
  /ui
  /email
  /project
/lib
  /db
    supabase.ts
  /google
    gmail.ts
    drive.ts
  /ai
    claude.ts
  /queue
    bullmq.ts
/types
  database.ts
  api.ts
```

### Environment Setup

Create `.env.local`:
```env
# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Google Cloud
GOOGLE_CLOUD_PROJECT=...
GOOGLE_APPLICATION_CREDENTIALS=...

# Anthropic
ANTHROPIC_API_KEY=...

# Redis (Upstash)
REDIS_URL=...
```

### Initial Dependencies

```json
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.0.0",
    "next-auth": "^4.24.0",
    "@supabase/supabase-js": "^2.38.0",
    "@anthropic-ai/sdk": "^0.27.0",
    "@google-cloud/vision": "^4.0.0",
    "@google-cloud/storage": "^7.7.0",
    "googleapis": "^129.0.0",
    "bullmq": "^5.0.0",
    "ioredis": "^5.3.0",
    "tailwindcss": "^4.0.0",
    "zod": "^3.22.0"
  }
}
```

---

## Testing Requirements

### Unit Tests
- Authentication flow
- Token encryption/decryption
- Database CRUD operations
- RLS policy enforcement

### Integration Tests
- Google OAuth flow end-to-end
- User registration and profile creation
- Token refresh mechanism

### Manual Testing Checklist
- [ ] Sign in with Google works
- [ ] User profile displays correctly
- [ ] Session persists across page refreshes
- [ ] Token refresh happens automatically
- [ ] Users cannot access other users' data

---

## Deliverables

1. Supabase project configured
2. Database schema deployed
3. Next.js project initialized
4. Authentication working
5. OCR routes migrated (if applicable)
6. Documentation updated

---

## Dependencies

**External Services:**
- Supabase account
- Google Cloud Project
- Google OAuth credentials

**Before Starting:**
- [ ] Create Supabase project
- [ ] Enable Google OAuth in Supabase
- [ ] Create Google Cloud project
- [ ] Enable Google APIs (Gmail, Drive, Docs, Sheets, Calendar)
- [ ] Create OAuth 2.0 credentials

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| RLS policies incorrect | High | Comprehensive testing with multiple user accounts |
| Token encryption weak | High | Use industry-standard encryption (AES-256) |
| OAuth flow errors | Medium | Thorough error handling and logging |
| Migration complexity | Low | Keep existing OCR as fallback during migration |

---

## Success Metrics

- [ ] All acceptance criteria met
- [ ] Tests passing at >90% coverage
- [ ] Authentication works for 10+ test users
- [ ] No security vulnerabilities in audit
- [ ] Documentation complete
