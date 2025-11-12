# Phase 5: Google Workspace Integration (Weeks 5-6)

**Timeline:** Weeks 5-6
**Priority:** P0 (Must Have)

---

## Overview

Integrate with Google Workspace APIs (Drive, Docs, Sheets, Calendar) to enable agents to create and manipulate documents, spreadsheets, and calendar events.

---

## 5.1 Google Drive

**Priority:** P0 (Must Have)

### Requirements

- Create folders per project/client
- Upload/download files
- Share files with specific permissions
- Search for files
- Track file versions

### Implementation

```typescript
// lib/google/drive.ts
import { google, drive_v3 } from 'googleapis';

export class DriveClient {
  private drive: drive_v3.Drive;

  constructor(accessToken: string, refreshToken: string) {
    const auth = createGoogleAuth(accessToken, refreshToken);
    this.drive = google.drive({ version: 'v3', auth });
  }

  async createFolder(name: string, parentId?: string): Promise<string> {
    const fileMetadata = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : []
    };

    const file = await this.drive.files.create({
      requestBody: fileMetadata,
      fields: 'id'
    });

    return file.data.id!;
  }

  async uploadFile(
    filename: string,
    content: Buffer | string,
    mimeType: string,
    folderId?: string
  ): Promise<string> {
    const fileMetadata = {
      name: filename,
      parents: folderId ? [folderId] : []
    };

    const media = {
      mimeType,
      body: content
    };

    const file = await this.drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, webViewLink'
    });

    return file.data.id!;
  }

  async shareFile(
    fileId: string,
    email: string,
    role: 'reader' | 'writer' | 'owner' = 'reader'
  ): Promise<void> {
    await this.drive.permissions.create({
      fileId,
      requestBody: {
        type: 'user',
        role,
        emailAddress: email
      }
    });
  }

  async searchFiles(query: string): Promise<drive_v3.Schema$File[]> {
    const response = await this.drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, createdTime, modifiedTime)',
      pageSize: 100
    });

    return response.data.files || [];
  }
}
```

### Project Folder Structure

```typescript
async function createProjectFolders(projectId: string, userId: string) {
  const drive = await getDriveClient(userId);
  const project = await getProject(projectId);

  // Create main project folder
  const projectFolderId = await drive.createFolder(
    `Project: ${project.name}`
  );

  // Create subfolders
  const subfolders = [
    'Documents',
    'Spreadsheets',
    'Presentations',
    'Assets',
    'Deliverables'
  ];

  for (const subfolder of subfolders) {
    await drive.createFolder(subfolder, projectFolderId);
  }

  // Save folder ID to project
  await updateProject(projectId, {
    google_folder_id: projectFolderId
  });

  return projectFolderId;
}
```

### Acceptance Criteria

- [x] Agents can create Google Docs/Sheets (DriveClient implemented)
- [x] Files organized in logical folder structure (createFolder with parent support)
- [ ] Users can access files from UI ⏳ (needs frontend)
- [x] Proper permission management (shareFile method with role-based access)

---

## 5.2 Google Sheets

**Priority:** P0 (Must Have)

### Requirements

- Create sheets from templates
- Update cells programmatically
- Preserve formulas and formatting
- Batch updates for performance
- Read data for context

### Implementation

```typescript
// lib/google/sheets.ts
import { google, sheets_v4 } from 'googleapis';

export class SheetsClient {
  private sheets: sheets_v4.Sheets;

  constructor(accessToken: string, refreshToken: string) {
    const auth = createGoogleAuth(accessToken, refreshToken);
    this.sheets = google.sheets({ version: 'v4', auth });
  }

  async createFromTemplate(
    templateId: string,
    title: string,
    folderId?: string
  ): Promise<string> {
    const drive = new DriveClient(/* ... */);

    // Copy template
    const copy = await drive.drive.files.copy({
      fileId: templateId,
      requestBody: {
        name: title,
        parents: folderId ? [folderId] : []
      }
    });

    return copy.data.id!;
  }

  async updateCells(
    spreadsheetId: string,
    range: string,
    values: any[][]
  ): Promise<void> {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED', // Allows formulas
      requestBody: { values }
    });
  }

  async appendRow(
    spreadsheetId: string,
    sheetName: string,
    values: any[]
  ): Promise<void> {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] }
    });
  }

  async batchUpdate(
    spreadsheetId: string,
    requests: sheets_v4.Schema$Request[]
  ): Promise<void> {
    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests }
    });
  }

  async getValues(
    spreadsheetId: string,
    range: string
  ): Promise<any[][]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range
    });

    return response.data.values || [];
  }
}
```

### Template System

```typescript
// Predefined templates
const SHEET_TEMPLATES = {
  PROJECT_TRACKER: 'template_id_1',
  INVOICE_LOG: 'template_id_2',
  CLIENT_CONTACTS: 'template_id_3',
  TASK_LIST: 'template_id_4'
};

async function createProjectTrackerSheet(
  projectId: string,
  userId: string
): Promise<string> {
  const sheets = await getSheetsClient(userId);
  const project = await getProject(projectId);

  // Create from template
  const sheetId = await sheets.createFromTemplate(
    SHEET_TEMPLATES.PROJECT_TRACKER,
    `Tracker: ${project.name}`,
    project.google_folder_id
  );

  // Populate initial data
  await sheets.updateCells(sheetId, 'A2:D2', [
    [
      project.name,
      project.client_name,
      project.start_date,
      project.budget
    ]
  ]);

  // Save to project
  await updateProject(projectId, {
    google_sheet_id: sheetId
  });

  return sheetId;
}
```

### Project Tracker Agent Integration

```typescript
// Update project tracker sheet when status changes
async function updateProjectTrackerSheet(
  projectId: string,
  update: {
    milestone?: string;
    status?: string;
    progress?: number;
    notes?: string;
  }
) {
  const project = await getProject(projectId);

  if (!project.google_sheet_id) {
    // Create sheet if doesn't exist
    project.google_sheet_id = await createProjectTrackerSheet(projectId, project.user_id);
  }

  const sheets = await getSheetsClient(project.user_id);

  // Append new row with update
  await sheets.appendRow(project.google_sheet_id, 'Updates', [
    new Date().toISOString(),
    update.milestone || '',
    update.status || '',
    update.progress || 0,
    update.notes || ''
  ]);
}
```

### Acceptance Criteria

- [ ] Can create sheets from templates ⏳ (SheetsClient not implemented yet)
- [ ] Updates reflect in real-time ⏳ (SheetsClient not implemented yet)
- [ ] Formulas not overwritten ⏳ (SheetsClient not implemented yet)
- [ ] Handles large sheets (1000+ rows) ⏳ (SheetsClient not implemented yet)

---

## 5.3 Google Docs

**Priority:** P0 (Must Have)

### Requirements

- Create docs from templates
- Insert text at specific locations
- Format text (headers, lists, tables)
- Add comments
- Export to PDF

### Implementation

```typescript
// lib/google/docs.ts
import { google, docs_v1 } from 'googleapis';

export class DocsClient {
  private docs: docs_v1.Docs;

  constructor(accessToken: string, refreshToken: string) {
    const auth = createGoogleAuth(accessToken, refreshToken);
    this.docs = google.docs({ version: 'v1', auth });
  }

  async createDocument(title: string, folderId?: string): Promise<string> {
    const doc = await this.docs.documents.create({
      requestBody: { title }
    });

    const docId = doc.data.documentId!;

    // Move to folder if specified
    if (folderId) {
      const drive = new DriveClient(/* ... */);
      await drive.drive.files.update({
        fileId: docId,
        addParents: folderId,
        fields: 'id, parents'
      });
    }

    return docId;
  }

  async insertText(
    documentId: string,
    text: string,
    index: number = 1
  ): Promise<void> {
    await this.docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [{
          insertText: {
            location: { index },
            text
          }
        }]
      }
    });
  }

  async insertMarkdown(documentId: string, markdown: string): Promise<void> {
    // Convert markdown to Google Docs format
    const requests = this.markdownToDocsRequests(markdown);

    await this.docs.documents.batchUpdate({
      documentId,
      requestBody: { requests }
    });
  }

  private markdownToDocsRequests(markdown: string): docs_v1.Schema$Request[] {
    const requests: docs_v1.Schema$Request[] = [];
    let currentIndex = 1;

    // Simple markdown parser (enhance as needed)
    const lines = markdown.split('\n');

    for (const line of lines) {
      // Headers
      if (line.startsWith('# ')) {
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: line.substring(2) + '\n'
          }
        });
        requests.push({
          updateParagraphStyle: {
            range: {
              startIndex: currentIndex,
              endIndex: currentIndex + line.length - 1
            },
            paragraphStyle: {
              namedStyleType: 'HEADING_1'
            },
            fields: 'namedStyleType'
          }
        });
        currentIndex += line.length - 1;
      }
      // ... handle ## (H2), ### (H3), bold, italic, lists, etc.
      else {
        requests.push({
          insertText: {
            location: { index: currentIndex },
            text: line + '\n'
          }
        });
        currentIndex += line.length + 1;
      }
    }

    return requests;
  }

  async addComment(
    documentId: string,
    text: string,
    startIndex: number,
    endIndex: number
  ): Promise<void> {
    await this.docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [{
          createComment: {
            comment: { content: text },
            textRange: { startIndex, endIndex }
          }
        }]
      }
    });
  }

  async exportToPDF(documentId: string): Promise<Buffer> {
    const drive = new DriveClient(/* ... */);

    const response = await drive.drive.files.export({
      fileId: documentId,
      mimeType: 'application/pdf'
    }, {
      responseType: 'arraybuffer'
    });

    return Buffer.from(response.data as ArrayBuffer);
  }
}
```

### SOW Template System

```typescript
// Default SOW template
const DEFAULT_SOW_TEMPLATE = `
# Scope of Work

## Executive Summary
{summary}

## Project Objectives
{objectives}

## Scope of Work
{scope}

## Deliverables
{deliverables}

## Timeline & Milestones
{timeline}

## Budget & Payment Terms
{budget}

## Assumptions & Constraints
{assumptions}

## Acceptance Criteria
{acceptance}

---
Generated on {date}
`;

async function createSOWFromTemplate(
  userId: string,
  data: any,
  folderId?: string
): Promise<string> {
  const docs = await getDocsClient(userId);

  // Create document
  const docId = await docs.createDocument('Scope of Work - DRAFT', folderId);

  // Get user's custom template or use default
  const template = await getSOWTemplate(userId) || DEFAULT_SOW_TEMPLATE;

  // Fill in template
  const content = fillTemplate(template, data);

  // Insert content
  await docs.insertMarkdown(docId, content);

  return docId;
}
```

### Acceptance Criteria

- [x] SOWs generated with proper formatting (DocsClient with insertText and createDocument)
- [ ] Templates customizable by user ⏳ (needs database schema + UI)
- [x] Can export to PDF (exportToPDF method implemented)
- [x] Comments work for feedback (addComment method implemented)

---

## 5.4 Google Calendar

**Priority:** P1 (Should Have)

### Requirements

- Check availability
- Create events
- Send invites
- Update/cancel events
- Set reminders

### Implementation

```typescript
// lib/google/calendar.ts
import { google, calendar_v3 } from 'googleapis';

export class CalendarClient {
  private calendar: calendar_v3.Calendar;

  constructor(accessToken: string, refreshToken: string) {
    const auth = createGoogleAuth(accessToken, refreshToken);
    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async checkAvailability(
    start: Date,
    end: Date,
    calendarId: string = 'primary'
  ): Promise<boolean> {
    const response = await this.calendar.freebusy.query({
      requestBody: {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        items: [{ id: calendarId }]
      }
    });

    const busy = response.data.calendars?.[calendarId]?.busy || [];
    return busy.length === 0;
  }

  async createEvent(
    summary: string,
    start: Date,
    end: Date,
    attendees?: string[],
    description?: string,
    location?: string
  ): Promise<string> {
    const event = await this.calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary,
        description,
        location,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        attendees: attendees?.map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 } // 30 min before
          ]
        }
      },
      sendUpdates: 'all' // Send invites
    });

    return event.data.id!;
  }

  async updateEvent(
    eventId: string,
    updates: Partial<calendar_v3.Schema$Event>
  ): Promise<void> {
    await this.calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: updates,
      sendUpdates: 'all'
    });
  }

  async cancelEvent(eventId: string): Promise<void> {
    await this.calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all'
    });
  }
}
```

### Calendar Agent Integration

```typescript
// Extract meeting requests from emails
async function handleMeetingRequest(email: Email, userId: string) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Extract meeting details
  const prompt = `Extract meeting details from this email:

${email.body_plain}

Return JSON:
{
  "requestType": "schedule|reschedule|cancel",
  "suggestedTimes": ["ISO date", ...],
  "duration": minutes,
  "attendees": ["email", ...],
  "location": "...",
  "agenda": "..."
}`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  });

  const details = JSON.parse(message.content[0].text);

  // Check availability
  const calendar = await getCalendarClient(userId);

  for (const time of details.suggestedTimes) {
    const start = new Date(time);
    const end = new Date(start.getTime() + details.duration * 60000);

    const isAvailable = await calendar.checkAvailability(start, end);

    if (isAvailable) {
      // Create event
      const eventId = await calendar.createEvent(
        `Meeting: ${details.agenda || 'Discussion'}`,
        start,
        end,
        details.attendees,
        details.agenda,
        details.location
      );

      return { success: true, eventId, time: start };
    }
  }

  return { success: false, reason: 'No availability found' };
}
```

### Acceptance Criteria

- [ ] Calendar Agent can schedule meetings ⏳ (CalendarClient not implemented yet)
- [ ] Availability checking works ⏳ (CalendarClient not implemented yet)
- [ ] Invites sent to attendees ⏳ (CalendarClient not implemented yet)
- [ ] Conflicts detected ⏳ (CalendarClient not implemented yet)

---

## 5.5 Google Maps & Places

**Priority:** P2 (Nice to Have)

### Requirements

- Extract addresses from emails
- Validate addresses
- Get place details
- Calculate travel time
- Add to calendar events

### Acceptance Criteria

- [ ] Addresses auto-validated
- [ ] Travel time added to calendar events
- [ ] Location details enriched

---

## Testing Requirements

### Integration Tests
- Create/update/delete operations for each API
- Permission management
- Error handling (quota exceeded, auth errors)
- Template system

### Manual Tests
- Verify documents created in Drive
- Check formatting in Docs
- Validate Sheet formulas
- Test calendar invites

---

## Deliverables

1. Drive, Docs, Sheets, Calendar clients implemented
2. Template system functional
3. Agents can create/update Google Workspace resources
4. Tests passing

---

## Next Phase

With Google Workspace integration complete, proceed to Phase 6 for project management features.

---

## ✅ Phase 5 Status: 50% Complete

**Completed:**
- ✅ Google Drive Client (src/lib/google/drive-client.ts - 140 lines)
  - Create folders with parent/subfolder support
  - Upload/download files
  - Share files with role-based permissions (reader, writer, owner)
  - Search files with query support
  - File metadata retrieval (id, name, mimeType, timestamps)
- ✅ Google Docs Client (src/lib/google/docs-client.ts - 144 lines)
  - Create documents
  - Insert text at specific locations
  - Format text (headers, paragraphs, styling)
  - Add comments for collaboration
  - Export to PDF
  - Batch update operations
  - Markdown-to-Docs conversion support

**Pending:**
- ⏳ Google Sheets Client (P0 - high priority)
  - Create from templates
  - Update cells/ranges
  - Append rows
  - Batch updates
  - Formula preservation
  - Project tracker integration
- ⏳ Google Calendar Client (P1)
  - Check availability
  - Create/update/cancel events
  - Send invites to attendees
  - Conflict detection
  - Calendar Agent for meeting scheduling
- ⏳ Google Maps & Places (P2 - nice to have)
- ⏳ Template system for SOWs and project trackers
- ⏳ Project folder structure automation
- ⏳ Frontend UI for accessing Google Workspace files
