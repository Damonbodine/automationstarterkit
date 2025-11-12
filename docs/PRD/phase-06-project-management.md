# Phase 6: Project Management System (Weeks 6-7)

**Timeline:** Weeks 6-7
**Priority:** P0 (Must Have)

---

## 6.1 Project Dashboard

**Priority:** P0 (Must Have)

### Features

- Auto-create projects from SOW emails
- Link emails, documents, tasks to projects
- Timeline visualization
- Milestone tracking
- Budget tracking
- Status overview (health indicator)

### Implementation

```typescript
// lib/projects/auto-create.ts
export async function autoCreateProjectFromSOW(sowId: string, userId: string) {
  const sow = await getScopeOfWork(sowId);
  const email = await getEmail(sow.email_id);

  // Extract project details from SOW
  const projectData = {
    user_id: userId,
    name: sow.title,
    client_name: email.from_name,
    status: 'active',
    start_date: new Date(),
    metadata: {
      source_email_id: email.id,
      source_sow_id: sowId
    }
  };

  const project = await createProject(projectData);

  // Create Google Drive folder
  const folderId = await createProjectFolders(project.id, userId);

  // Create project tracker sheet
  const sheetId = await createProjectTrackerSheet(project.id, userId);

  await updateProject(project.id, {
    google_folder_id: folderId,
    google_sheet_id: sheetId
  });

  // Link SOW to project
  await updateScopeOfWork(sowId, { project_id: project.id });

  return project;
}
```

### Health Indicators

```typescript
function calculateProjectHealth(project: Project): 'green' | 'yellow' | 'red' {
  const factors = {
    onBudget: project.spent <= project.budget,
    onSchedule: new Date() <= project.end_date,
    recentActivity: project.updated_at > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    tasksCompleted: project.tasks.filter(t => t.status === 'completed').length / project.tasks.length > 0.5
  };

  const score = Object.values(factors).filter(Boolean).length;

  if (score >= 3) return 'green';
  if (score >= 2) return 'yellow';
  return 'red';
}
```

### Acceptance Criteria

- [ ] Projects auto-created when SOW generated
- [ ] All related items linked to project
- [ ] Visual timeline with milestones
- [ ] Budget vs. actual tracking
- [ ] Health indicators (green/yellow/red)

---

## 6.2 Task Management

**Priority:** P0 (Must Have)

### Features

- AI-extracted tasks from emails
- Manual task creation
- Task assignment (self or team)
- Due dates with reminders
- Status tracking
- Priority levels
- Link tasks to projects and emails

### API Endpoints

See `00-api-specs.md` for complete API documentation.

### Task Reminders

```typescript
// Cron job to send task reminders
export async function sendTaskReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tasks = await getTasks({
    status: ['pending', 'in_progress'],
    due_date: { lte: tomorrow }
  });

  for (const task of tasks) {
    await sendNotification(task.user_id, {
      type: 'task_reminder',
      title: 'Task Due Soon',
      message: `"${task.description}" is due on ${task.due_date.toLocaleDateString()}`,
      data: { task_id: task.id }
    });
  }
}
```

### Acceptance Criteria

- [ ] Tasks extracted automatically
- [ ] Users can edit/delete tasks
- [ ] Reminders sent before due date
- [ ] Task completion tracked
- [ ] Filter/sort tasks by various criteria

---

## 6.3 Reporting

**Priority:** P1 (Should Have)

### Features

- Weekly/monthly project summaries (Claude-generated)
- Automated status reports to clients
- Analytics dashboard (email volume, agent activity, project health, time saved)
- Export reports to PDF/Google Docs

### Weekly Summary Generation

```typescript
export async function generateWeeklySummary(userId: string) {
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Gather data
  const data = {
    emails: await getEmails({ user_id: userId, received_at: { gte: lastWeek } }),
    tasks: await getTasks({ user_id: userId, created_at: { gte: lastWeek } }),
    projects: await getProjects({ user_id: userId }),
    agentLogs: await getAgentLogs({ user_id: userId, created_at: { gte: lastWeek } })
  };

  // Generate summary with Claude
  const summary = await generateSummaryWithClaude(data);

  // Send email
  await sendEmail(userId, {
    subject: 'Your Weekly Summary',
    html: summary
  });

  return summary;
}
```

### Acceptance Criteria

- [ ] Weekly summary emails sent
- [ ] Status reports generated on demand
- [ ] Dashboard shows key metrics
- [ ] Reports exportable

---

## Deliverables

1. Project dashboard UI
2. Auto-project creation from SOWs
3. Task management system
4. Reporting functionality
5. Tests passing

---

## ✅ Phase 6 Status: 35% Complete

**Completed:**
- ✅ Basic project dashboard UI (list view) - `/projects/page.tsx`
- ✅ Project detail page with tabs - `/projects/[id]/page.tsx`
- ✅ Basic task management UI - `/tasks/page.tsx`
- ✅ Task filtering (status, priority)
- ✅ Task display with metadata (due date, priority, description)
- ✅ API endpoint for projects - `/api/projects/route.ts`
- ✅ Database schema for projects and tasks

**Pending:**
- ⏳ Auto-create projects from SOW emails (P0)
- ⏳ Milestone tracking UI and logic (P0)
- ⏳ Budget tracking (spent vs. budget) (P0)
- ⏳ Status health indicators (green/yellow/red) (P0)
- ⏳ Task creation/editing/deletion functionality (P0)
- ⏳ Task reminders and notifications (P1)
- ⏳ Weekly summary report generation (P1)
- ⏳ Export functionality (reports to PDF/Google Docs) (P1)
- ⏳ Project timeline visualization (P1)
- ⏳ Link tasks to projects (database relations exist but UI missing) (P0)

**Next Steps:**
1. Implement auto-project creation when SOW is generated
2. Add task CRUD operations (create, edit, delete, complete)
3. Build health indicator calculation and display
4. Create milestone tracking feature
5. Implement budget tracking UI
