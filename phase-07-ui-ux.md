# Phase 7: UI/UX (Weeks 7-8)

**Timeline:** Weeks 7-8
**Priority:** P0 (Must Have)

---

## 7.1 Dashboard (Landing Page)

**Priority:** P0 (Must Have)

### Components

**Header**: Logo, user menu, notifications bell
**Quick Stats**: Unread emails, pending tasks, active projects
**Priority Queue**: Emails needing action (sorted by urgency)
**Recent Agent Activity**: Last 10 agent actions with approve/reject
**Project Overview**: Cards for each active project
**Quick Actions**: Compose, create project, run agent manually

### Implementation

```tsx
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const session = await getServerSession();
  const userId = session.user.id;

  // Fetch data in parallel
  const [stats, priorityEmails, agentActivity, projects] = await Promise.all([
    getQuickStats(userId),
    getPriorityEmails(userId),
    getRecentAgentActivity(userId),
    getActiveProjects(userId)
  ]);

  return (
    <div className="dashboard">
      <Header />

      <QuickStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PriorityQueue emails={priorityEmails} />
        <AgentActivity activity={agentActivity} />
      </div>

      <ProjectOverview projects={projects} />
    </div>
  );
}
```

### Real-time Updates

```typescript
// lib/websocket/client.ts
import { io } from 'socket.io-client';

export function useRealtimeUpdates(userId: string) {
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL);

    socket.emit('join', { userId });

    socket.on('new_email', (email) => {
      // Update UI
      queryClient.invalidateQueries(['emails']);
    });

    socket.on('agent_result', (result) => {
      // Show notification
      toast.success(`${result.agentName} completed: ${result.action}`);
      queryClient.invalidateQueries(['agent-activity']);
    });

    return () => socket.disconnect();
  }, [userId]);
}
```

### Acceptance Criteria

- [ ] Loads in <2 seconds
- [ ] Real-time updates via WebSocket
- [ ] Mobile responsive
- [ ] Accessible (WCAG 2.1 AA)

---

## 7.2 Email Management

**Priority:** P0 (Must Have)

### Inbox View

- List view with classification badges
- Smart filters (priority, category, agent-processed)
- Search (full-text, by sender, by date)
- Bulk actions (archive, delete, classify)

```tsx
// components/email/inbox.tsx
export function EmailInbox() {
  const [filters, setFilters] = useState({ category: 'all', priority: 'all' });
  const [search, setSearch] = useState('');

  const { data: emails, isLoading } = useQuery(
    ['emails', filters, search],
    () => fetchEmails({ ...filters, search })
  );

  return (
    <div className="inbox">
      <Filters filters={filters} onChange={setFilters} />
      <SearchBar value={search} onChange={setSearch} />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <EmailList emails={emails} />
      )}
    </div>
  );
}
```

### Email Detail View

- Threaded conversation
- Classification badges and tags
- Agent action history
- Attachments with OCR results
- Related items (project, tasks, documents)
- Actions: Reply, Forward, Assign to project, Run agent

### Acceptance Criteria

- [ ] Inbox loads 100+ emails quickly
- [ ] Filters work instantly
- [ ] Search returns results <1 second
- [ ] Email detail shows full context
- [ ] Can trigger agents manually

---

## 7.3 Project View

**Priority:** P0 (Must Have)

### Features

- Project list (active, paused, archived)
- Project detail page (overview, linked emails/docs/tasks, timeline, activity feed)
- Edit project details
- Archive/delete projects

```tsx
// app/projects/[id]/page.tsx
export default async function ProjectPage({ params }: { params: { id: string } }) {
  const project = await getProjectWithRelations(params.id);

  return (
    <div className="project-detail">
      <ProjectHeader project={project} />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="emails">Emails</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ProjectOverview project={project} />
        </TabsContent>

        <TabsContent value="emails">
          <LinkedEmails emails={project.emails} />
        </TabsContent>

        {/* ... other tabs */}
      </Tabs>
    </div>
  );
}
```

### Acceptance Criteria

- [ ] All project data visible in one place
- [ ] Can navigate to related items
- [ ] Timeline visualization clear
- [ ] Easy to update project status

---

## 7.4 Settings & Configuration

**Priority:** P1 (Should Have)

### Pages

1. **Profile**: Name, email, timezone, preferences
2. **Integrations**: Connected Google account, reconnect if needed
3. **Agents**: Enable/disable agents, configure behavior
4. **Classification Rules**: Custom rules for email classification
5. **Templates**: SOW, Docs, Sheets templates (edit/upload)
6. **Notifications**: Email digest frequency, in-app notification settings
7. **Billing**: Plan tier, usage stats, upgrade/downgrade

### Agent Configuration

```tsx
// app/settings/agents/page.tsx
export default function AgentSettings() {
  const { data: agents } = useQuery(['agents'], getAgents);
  const { data: userSettings } = useQuery(['agent-settings'], getUserAgentSettings);

  return (
    <div className="agent-settings">
      {agents.map(agent => (
        <AgentCard
          key={agent.name}
          agent={agent}
          enabled={userSettings[agent.name]?.enabled ?? true}
          onToggle={(enabled) => updateAgentSetting(agent.name, { enabled })}
        />
      ))}
    </div>
  );
}
```

### Acceptance Criteria

- [ ] Users can customize agent behavior
- [ ] Templates editable via UI
- [ ] Notification preferences saved
- [ ] Billing integration (Stripe)

---

## 7.5 Mobile Responsive

**Priority:** P0 (Must Have)

### Requirements

- Fully responsive design (Tailwind breakpoints)
- Mobile navigation (hamburger menu)
- Touch-friendly UI elements
- Progressive Web App (PWA) capabilities

### PWA Setup

```typescript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA({
  // ... other config
});
```

```json
// public/manifest.json
{
  "name": "Executive Assistant AI",
  "short_name": "EA AI",
  "description": "AI-powered executive assistant",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Acceptance Criteria

- [ ] Works on screens from 320px to 4K
- [ ] Touch targets at least 44x44px
- [ ] Can add to home screen (PWA)
- [ ] Offline mode shows cached data

---

## Design System

### Colors

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          900: '#1e3a8a'
        },
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        urgent: '#dc2626',
        high: '#f97316',
        medium: '#3b82f6',
        low: '#6b7280'
      }
    }
  }
}
```

### Components

- Use shadcn/ui components
- Consistent spacing (4px grid)
- Typography scale
- Button variants
- Form components
- Data tables

---

## Testing Requirements

### E2E Tests (Playwright)

```typescript
// tests/dashboard.spec.ts
test('dashboard loads and displays stats', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page.locator('[data-testid="unread-count"]')).toBeVisible();
  await expect(page.locator('[data-testid="pending-tasks"]')).toBeVisible();
  await expect(page.locator('[data-testid="active-projects"]')).toBeVisible();
});
```

### Visual Regression Tests

- Screenshot testing with Percy or Chromatic
- Test across different viewports

### Accessibility Tests

- Automated testing with axe-core
- Manual keyboard navigation testing
- Screen reader testing

---

## Deliverables

1. Complete dashboard UI
2. Email management interface
3. Project management UI
4. Settings pages
5. Mobile responsive design
6. PWA capabilities
7. Tests passing

---

## ✅ Phase 7 Status: 0% Complete

**Completed:**
- None yet - Phase 7 not started

**Pending:**
- ⏳ Dashboard UI with Tailwind CSS (P0)
- ⏳ Email management interface
- ⏳ Project management UI
- ⏳ Settings and preferences pages
- ⏳ Mobile responsive design
- ⏳ Dark mode support
- ⏳ PWA capabilities (offline support, install prompt)
- ⏳ Real-time updates with WebSockets
- ⏳ Keyboard shortcuts
- ⏳ Accessibility (WCAG 2.1 AA)

**Note:** Phase 7 requires backend APIs from Phases 1-6 to be functional.
