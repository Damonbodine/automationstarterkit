# Open Questions & Decisions

**Version:** 1.0
**Last Updated:** January 2025

---

## Product Decisions

### 1. Agent Approval Workflow

**Question:** Should agents auto-execute or always require user approval?

**Option A: Auto-execute low-risk, require approval for high-risk**
- ✅ Best user experience (less friction)
- ✅ Faster time-to-value
- ❌ Risk of unwanted actions
- ❌ User trust concerns initially

**Option B: Always require approval, learn preferences over time**
- ✅ Maximum user control
- ✅ Builds trust
- ❌ More manual work initially
- ❌ Slower time-to-value

**Option C: User configurable (default to approval required)**
- ✅ Flexibility for different user types
- ✅ Power users can automate fully
- ❌ More complex UX
- ❌ Settings to configure

**Recommendation:** **Option A** with clear opt-out

**Implementation:**
```typescript
// Risk levels
const AGENT_RISK_LEVELS = {
  task_extractor: 'low',      // Auto-execute
  document_summarizer: 'low',  // Auto-execute
  sow_generator: 'high',      // Require approval
  invoice_processor: 'high',  // Require approval
  response_drafter: 'high',   // Require approval
  calendar_agent: 'medium',   // Require approval (or configurable)
};

// User can override in settings
```

**Decision:** ⏳ **Pending user feedback in beta**

---

### 2. Data Retention

**Question:** How long should we keep emails and documents?

**Option A: Keep forever (user manages deletion)**
- ✅ Maximum data availability
- ✅ Users in control
- ❌ Higher storage costs
- ❌ GDPR concerns (data minimization)

**Option B: Auto-delete after 1 year (configurable)**
- ✅ Balanced approach
- ✅ Lower storage costs
- ✅ GDPR compliant
- ❌ Users may want longer retention

**Option C: Tiered by plan (Free = 3 months, Pro = 1 year, Enterprise = unlimited)**
- ✅ Incentive to upgrade
- ✅ Cost-aligned with value
- ❌ Complex to implement
- ❌ User confusion

**Recommendation:** **Option B** (1 year default, configurable up to 3 years)

**Implementation:**
```typescript
// Configurable retention in user settings
const DEFAULT_RETENTION_DAYS = 365;

export async function cleanupOldEmails() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DEFAULT_RETENTION_DAYS);

  // Only delete if user hasn't configured custom retention
  const users = await getUsers({ retention_policy: 'default' });

  for (const user of users) {
    await deleteEmails({
      user_id: user.id,
      received_at: { lt: cutoffDate }
    });
  }
}
```

**Decision:** ✅ **Option B - 1 year default retention**

---

### 3. White Labeling

**Question:** Should we allow agencies to white-label the platform?

**Pros:**
- Additional revenue stream ($200-500/month)
- Faster growth through agency partnerships
- Market validation
- Recurring revenue from agencies

**Cons:**
- Support complexity (supporting their customers)
- Brand dilution (less direct brand awareness)
- Technical complexity (multi-tenant, custom domains)
- QA burden (testing across different configs)

**Considerations:**
- Requires SSO/SAML
- Custom domain setup
- White-label documentation
- Agency success team

**Recommendation:** **No for MVP, consider for Year 2**

**Roadmap:**
- Month 0-12: Focus on direct customers
- Month 12+: Evaluate based on demand
- If 5+ agencies request, build it

**Decision:** ⏳ **Defer to post-launch**

---

### 4. Mobile App

**Question:** Native mobile app or PWA only?

**Option A: PWA for MVP, native app later**
- ✅ Faster to market
- ✅ Lower development cost
- ✅ Single codebase
- ❌ Limited mobile features (push notifications harder)
- ❌ Discovery (not in app stores)

**Option B: React Native app from start**
- ✅ Full native features
- ✅ App store presence
- ❌ Longer development time (3-4 weeks)
- ❌ Maintenance overhead
- ❌ Platform-specific bugs

**Recommendation:** **Option A - PWA for MVP**

**PWA Features:**
- Installable to home screen
- Offline mode (view cached emails)
- Push notifications (via service worker)
- Responsive design

**Native App Roadmap:**
- If mobile usage >30% of traffic
- If users request app frequently
- Target: 6-12 months post-launch

**Decision:** ✅ **PWA for MVP**

---

### 5. Integrations Beyond Google Workspace

**Question:** Which other tools to integrate?

**Candidates:**
| Tool | Value | Complexity | Priority |
|------|-------|------------|----------|
| Slack | Notifications, updates | Low | P1 |
| Asana | Task sync | Medium | P2 |
| Trello | Board sync | Medium | P2 |
| QuickBooks | Invoice tracking | High | P2 |
| Salesforce | CRM sync | High | P3 |
| Microsoft 365 | Email alternative | Very High | P3 |
| Notion | Doc/wiki integration | Medium | P2 |

**Recommendation:** **Google Workspace only for MVP**

**Post-Launch Integrations (Priority Order):**
1. Slack (notifications) - Month 3-4
2. Zapier (integration hub) - Month 6
3. Make.com (automation) - Month 6
4. Direct integrations based on user demand

**Decision:** ✅ **Google Workspace only for MVP**

---

## Technical Decisions

### 6. Database: Prisma ORM vs Direct SQL

**Question:** Use Prisma ORM or direct SQL with Supabase client?

**Option A: Prisma**
- ✅ Type safety
- ✅ Auto-generated types
- ✅ Migrations management
- ❌ Additional abstraction layer
- ❌ Learning curve
- ❌ Performance overhead

**Option B: Direct SQL (Supabase client)**
- ✅ Simpler, less abstraction
- ✅ Better performance
- ✅ Direct control over queries
- ❌ Manual type definitions
- ❌ Manual migration management

**Recommendation:** **Option B - Direct SQL**

**Rationale:**
- Supabase has good TypeScript support
- RLS is easier to reason about with direct SQL
- Fewer dependencies
- Can always add Prisma later if needed

**Decision:** ✅ **Direct SQL with Supabase client**

---

### 7. Monorepo vs Separate Repos

**Question:** Single monorepo or separate repos for frontend/backend/workers?

**Option A: Monorepo (recommended)**
- ✅ Single source of truth
- ✅ Easier to share code (types, utils)
- ✅ Atomic commits across full stack
- ❌ Larger repo size

**Option B: Separate repos**
- ✅ Clearer separation
- ✅ Independent versioning
- ❌ Code duplication (types)
- ❌ Coordination overhead

**Recommendation:** **Monorepo with Next.js**

**Structure:**
```
/app          - Next.js app router (frontend + API routes)
/lib          - Shared libraries
/workers      - Queue workers (separate processes)
/components   - React components
/types        - Shared TypeScript types
```

**Decision:** ✅ **Monorepo**

---

### 8. Real-time Updates: WebSockets vs Server-Sent Events

**Question:** Use WebSockets or SSE for real-time dashboard updates?

**Option A: WebSockets (Socket.io)**
- ✅ Bi-directional
- ✅ Better for chat-like features
- ❌ More complex infrastructure
- ❌ Connection management

**Option B: Server-Sent Events (SSE)**
- ✅ Simpler implementation
- ✅ Built-in reconnection
- ✅ Works with standard HTTP
- ❌ One-way only (server → client)

**Option C: Polling**
- ✅ Simplest implementation
- ✅ No special infrastructure
- ❌ Higher latency
- ❌ More server load

**Recommendation:** **Option A - WebSockets** (via Vercel support or Pusher)

**Alternatives if WebSockets are complex:**
- Use Supabase Realtime (built-in)
- Use Pusher/Ably (managed service)
- Fall back to polling for MVP

**Decision:** ⏳ **WebSockets via Supabase Realtime**

---

### 9. Queue: BullMQ vs Inngest vs Temporal

**Question:** Which job queue system to use?

**Option A: BullMQ + Redis**
- ✅ Battle-tested
- ✅ Full control
- ✅ Redis caching bonus
- ❌ Need to run Redis
- ❌ More infrastructure

**Option B: Inngest**
- ✅ Serverless-native
- ✅ Built-in retries, scheduling
- ✅ Great DX
- ❌ Vendor lock-in
- ❌ Pricing at scale

**Option C: Temporal**
- ✅ Powerful workflow engine
- ✅ Great for complex flows
- ❌ Overkill for simple jobs
- ❌ Steep learning curve

**Recommendation:** **Option A - BullMQ + Upstash Redis**

**Rationale:**
- Upstash is serverless-friendly
- BullMQ is mature and reliable
- Can use Redis for caching too
- Easy to migrate to Inngest later if needed

**Decision:** ✅ **BullMQ + Upstash Redis**

---

## Business Decisions

### 10. Pricing Model

**Question:** Freemium vs Free Trial vs Paid Only?

**Option A: Freemium (Free + Pro + Team + Enterprise)**
- ✅ Low barrier to entry
- ✅ Viral growth potential
- ❌ Free users cost money
- ❌ Need high conversion rate

**Option B: 14-day free trial, then paid**
- ✅ All users paying eventually
- ✅ Higher ARPU
- ❌ Higher barrier to entry
- ❌ Churn risk after trial

**Option C: Paid only (with money-back guarantee)**
- ✅ Highest quality users
- ✅ Best unit economics
- ❌ Slowest growth
- ❌ Hardest to compete

**Recommendation:** **Option A - Freemium**

**Free Tier Limits:**
- 100 emails/month
- 5 SOWs/month
- 1 GB storage
- Basic agents only

**Conversion Strategy:**
- Trigger upgrade prompts at limits
- Show "Pro" features in UI
- Email campaigns highlighting benefits
- Target 20% Free → Pro conversion

**Decision:** ✅ **Freemium model**

---

### 11. Target Market: B2B vs B2C

**Question:** Focus on business users or individual consumers?

**Option A: B2B (consultants, agencies, PMs)**
- ✅ Higher willingness to pay
- ✅ Clear ROI (time saved)
- ✅ Longer retention
- ❌ Slower sales cycle

**Option B: B2C (anyone with email)**
- ✅ Larger market
- ✅ Faster growth potential
- ❌ Lower ARPU
- ❌ Higher churn

**Recommendation:** **B2B focus initially, expand to B2C later**

**Initial Target:**
- Solo consultants
- Small agency owners (5-20 people)
- Freelance project managers
- Professional services

**B2C Expansion:**
- After product-market fit
- Simpler feature set
- Lower price point ($9-15/month)

**Decision:** ✅ **B2B focus**

---

### 12. Launch Strategy

**Question:** Private beta vs Public beta vs Immediate public launch?

**Option A: Private beta (invite-only)**
- ✅ Controlled rollout
- ✅ Close user feedback
- ✅ Fix bugs before public
- ❌ Slower growth

**Option B: Public beta (open to all)**
- ✅ Faster growth
- ✅ More feedback
- ❌ Reputation risk if buggy
- ❌ Hard to support many users

**Option C: Immediate public launch**
- ✅ Maximum growth
- ❌ Highest risk
- ❌ Less iteration time

**Recommendation:** **Option A → Option B transition**

**Timeline:**
- Week 9: Private beta (10-20 users)
- Week 10: Public beta (Product Hunt launch)
- Week 12: General availability (v1.0)

**Decision:** ✅ **Private → Public beta transition**

---

## Decision Log

| # | Decision | Status | Date |
|---|----------|--------|------|
| 1 | Agent approval workflow | ⏳ Pending | - |
| 2 | Data retention policy | ✅ 1 year default | 2025-01 |
| 3 | White labeling | ⏳ Defer | - |
| 4 | Mobile app approach | ✅ PWA for MVP | 2025-01 |
| 5 | Integrations | ✅ Google only (MVP) | 2025-01 |
| 6 | Database approach | ✅ Direct SQL | 2025-01 |
| 7 | Repo structure | ✅ Monorepo | 2025-01 |
| 8 | Real-time updates | ✅ Supabase Realtime | 2025-01 |
| 9 | Queue system | ✅ BullMQ + Upstash | 2025-01 |
| 10 | Pricing model | ✅ Freemium | 2025-01 |
| 11 | Target market | ✅ B2B focus | 2025-01 |
| 12 | Launch strategy | ✅ Private → Public | 2025-01 |

---

## Review Schedule

- **Weekly:** Review pending decisions with new data
- **Monthly:** Re-evaluate made decisions based on metrics
- **Quarterly:** Strategic decisions review and planning

---

## Next Steps

1. ✅ Finalize all technical decisions before Phase 1
2. ⏳ Get user feedback on agent approval workflow during beta
3. ⏳ Monitor white-label requests, decide by Month 6
4. ⏳ Evaluate mobile app need after launch based on usage data
