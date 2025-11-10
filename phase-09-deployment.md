# Phase 9: Testing & Deployment (Weeks 9-10)

**Timeline:** Weeks 9-10
**Priority:** P0 (Must Have)

---

## 9.1 Testing

**Priority:** P0 (Must Have)

### Test Coverage Requirements

**Target: 80%+ code coverage**

### Unit Tests

```typescript
// tests/unit/email-classifier.test.ts
import { classifyEmail } from '@/lib/ai/email-classifier';

describe('Email Classifier', () => {
  it('should classify client request correctly', async () => {
    const email = {
      subject: 'New Project Inquiry',
      body_plain: 'We need a website built...',
      from_email: 'client@example.com'
    };

    const classification = await classifyEmail(email);

    expect(classification.category).toBe('client_request');
    expect(classification.priority).toBeOneOf(['high', 'urgent']);
  });

  it('should handle classification errors gracefully', async () => {
    const email = { /* invalid data */ };

    const classification = await classifyEmail(email);

    expect(classification.category).toBe('general');
    expect(classification.confidence_score).toBeLessThan(0.5);
  });
});
```

**Test Coverage:**
- Agent logic (canHandle, execute)
- Classification engine
- API routes
- Database operations
- Utility functions

### Integration Tests

```typescript
// tests/integration/gmail-sync.test.ts
import { performInitialSync } from '@/lib/sync/initial-sync';

describe('Gmail Sync', () => {
  it('should sync emails from Gmail', async () => {
    const userId = await createTestUser();

    await performInitialSync(userId);

    const emails = await getEmails({ user_id: userId });
    expect(emails.length).toBeGreaterThan(0);
  });

  it('should process attachments with OCR', async () => {
    // Test with email containing PDF
    const emailWithPDF = await sendTestEmail({
      attachments: ['test-invoice.pdf']
    });

    await processEmail(emailWithPDF.id);

    const documents = await getDocuments({ email_id: emailWithPDF.id });
    expect(documents.length).toBe(1);
    expect(documents[0].ocr_text).toBeTruthy();
  });
});
```

**Test Coverage:**
- Gmail sync (initial + incremental)
- Webhook processing
- Google API interactions (Drive, Docs, Sheets)
- Queue processing
- Agent execution

### End-to-End Tests

```typescript
// tests/e2e/user-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete user flow', async ({ page }) => {
  // Sign in
  await page.goto('/login');
  await page.click('button:has-text("Sign in with Google")');
  // ... Google OAuth flow ...

  // Wait for dashboard
  await expect(page).toHaveURL('/dashboard');

  // Check stats are visible
  await expect(page.locator('[data-testid="unread-count"]')).toBeVisible();

  // View an email
  await page.click('[data-testid="email-list"] >> nth=0');
  await expect(page.locator('[data-testid="email-detail"]')).toBeVisible();

  // Check classification badges
  await expect(page.locator('[data-testid="category-badge"]')).toBeVisible();

  // Trigger agent manually
  await page.click('button:has-text("Generate SOW")');
  await expect(page.locator('text=SOW generated successfully')).toBeVisible();

  // Navigate to projects
  await page.click('a[href="/projects"]');
  await expect(page).toHaveURL('/projects');
});
```

**Test Coverage:**
- User sign-up flow
- Email processing pipeline
- Agent execution
- Project management
- Settings configuration

### Load Testing

```typescript
// tests/load/email-processing.test.ts
import { check } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
  },
};

export default function () {
  const response = http.post('https://api.example.com/api/webhooks/gmail', {
    message: {
      data: base64encode(JSON.stringify({ emailAddress: 'test@example.com' }))
    }
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });
}
```

**Load Test Targets:**
- 1000 emails processed in <10 minutes
- 100 concurrent users
- API response time p95 < 2 seconds

### Security Testing

**OWASP Top 10:**
- SQL Injection
- XSS
- CSRF
- Authentication bypass
- Authorization issues
- Sensitive data exposure
- API security

**Penetration Testing:**
- Hire external security firm
- Bug bounty program (optional)

### Acceptance Criteria

- [ ] All tests passing
- [ ] CI/CD pipeline runs tests automatically
- [ ] Load tests meet performance targets
- [ ] Security vulnerabilities addressed

---

## 9.2 Deployment

**Priority:** P0 (Must Have)

### Infrastructure

See `00-architecture.md` for complete infrastructure details.

**Services:**
- Vercel (frontend + API)
- Supabase (database)
- Upstash (Redis)
- Google Cloud (Pub/Sub, Storage)
- Sentry (error tracking)

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/actions/deploy@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Database Migrations

```typescript
// migrations/001_initial_schema.sql
-- Run migrations on deploy
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  -- ...
);

-- Track migration status
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES (1);
```

**Migration Strategy:**
- Version controlled SQL files
- Run migrations before deployment
- Rollback capability
- Zero-downtime migrations (add column, then remove old)

### Environment Variables

```bash
# Production .env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ANTHROPIC_API_KEY=...
NEXTAUTH_SECRET=...
SENTRY_DSN=...
```

**Security:**
- Store in Vercel environment variables
- Rotate secrets regularly
- Never commit to git

### Deployment Process

1. Push to `main` branch
2. CI runs tests
3. Build on Vercel
4. Run database migrations
5. Deploy to production
6. Health checks
7. Rollback if issues

### Health Checks

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    google_apis: await checkGoogleAPIs(),
    anthropic: await checkAnthropic()
  };

  const healthy = Object.values(checks).every(c => c.status === 'ok');

  return Response.json(
    { healthy, checks },
    { status: healthy ? 200 : 503 }
  );
}
```

### Acceptance Criteria

- [ ] Deployments automated via Git push
- [ ] Zero-downtime deployments
- [ ] Rollback works in <5 minutes
- [ ] Environment variables secured

---

## 9.3 Monitoring & Observability

**Priority:** P0 (Must Have)

See `00-architecture.md` for complete monitoring details.

### Monitoring Stack

- Vercel Analytics (performance)
- Sentry (errors)
- Custom metrics (business KPIs)

### Metrics to Track

**System Health:**
- API response times (p50, p95, p99)
- Error rates
- Queue depth
- Database query performance

**Business Metrics:**
- DAU/WAU/MAU
- Email processing volume
- Agent success rates
- Classification accuracy
- User retention

### Alerts

```typescript
// lib/monitoring/alerts.ts
export async function checkAlerts() {
  // Error rate
  const errorRate = await getErrorRate('1h');
  if (errorRate > 0.05) {
    await sendAlert('error_rate_high', { rate: errorRate });
  }

  // Queue backed up
  const queueDepth = await getQueueDepth();
  if (queueDepth > 1000) {
    await sendAlert('queue_backed_up', { depth: queueDepth });
  }

  // API latency
  const p95Latency = await getAPILatency('p95', '1h');
  if (p95Latency > 10000) {
    await sendAlert('api_slow', { latency: p95Latency });
  }
}
```

### Dashboards

**Grafana/Vercel Analytics:**
- System health (uptime, errors, latency)
- User metrics (signups, retention)
- Agent performance
- Business metrics

### Acceptance Criteria

- [ ] All critical metrics tracked
- [ ] Alerts fire correctly
- [ ] On-call engineer notified for critical issues
- [ ] Dashboards accessible to team

---

## 9.4 Documentation

**Priority:** P1 (Should Have)

### User Documentation

**Content:**
- Getting started guide
- Feature tutorials (video + text)
- Agent explanations
- Template customization
- Troubleshooting / FAQ
- Privacy and security info

**Platform:** Notion, GitBook, or custom docs site

### Developer Documentation

**Content:**
- Architecture overview
- API documentation (OpenAPI/Swagger)
- Database schema
- Adding new agents
- Contributing guide
- Deployment guide

**Auto-generated API Docs:**

```typescript
// Use tRPC or similar for auto-generated API docs
import { initTRPC } from '@trpc/server';

const t = initTRPC.create();

export const appRouter = t.router({
  emails: {
    list: t.procedure
      .input(z.object({
        page: z.number().optional(),
        limit: z.number().max(100).optional()
      }))
      .query(async ({ input }) => {
        return await getEmails(input);
      })
  }
});

// Auto-generate OpenAPI spec
```

### Acceptance Criteria

- [ ] User docs published and accessible
- [ ] Video tutorials for key features
- [ ] API docs auto-generated
- [ ] Developer setup works from README

---

## 9.5 Beta Launch

**Priority:** P0 (Must Have)

### Launch Plan

**Week 9:** Internal testing with 3-5 beta users
**Week 10:** Public beta launch to 50-100 users

### Beta User Criteria

- Professionals managing 5+ client projects
- Receive 50+ emails daily
- Use Google Workspace
- Willing to provide detailed feedback

### Feedback Collection

- User interviews (1-on-1)
- Surveys (NPS, feature requests)
- In-app feedback widget
- Usage analytics

### Iteration

- Fix critical bugs within 24 hours
- Address UX feedback
- Monitor metrics daily
- Weekly updates to beta users

### Marketing

**Channels:**
- Product Hunt launch
- Blog post (Medium, personal blog)
- Social media (Twitter, LinkedIn)
- Email to personal network
- Reddit (r/productivity, r/saas)

**Product Hunt Launch Checklist:**
- [ ] Compelling tagline
- [ ] Screenshots and demo video
- [ ] Launch announcement prepared
- [ ] Respond to comments promptly
- [ ] Track upvotes and feedback

### Acceptance Criteria

- [ ] 50+ beta users signed up
- [ ] <5 critical bugs reported
- [ ] NPS score >40
- [ ] 60%+ retention after 30 days
- [ ] Product Hunt launch successful (>100 upvotes)

---

## Final Deliverables

1. Complete test suite (unit, integration, e2e)
2. Load tests passing
3. Security audit completed
4. Production deployment live
5. Monitoring and alerts configured
6. Documentation published
7. Beta launch executed
8. Initial users onboarded

---

## Success Metrics

### Week 10 (Launch)
- 50+ beta users
- 1,000+ emails processed
- <5 critical bugs
- NPS >40

### Month 3
- 100+ users
- 10,000+ emails/month
- 85%+ classification accuracy
- 10+ hours saved per user/week

See `00-overview.md` for complete success metrics.
