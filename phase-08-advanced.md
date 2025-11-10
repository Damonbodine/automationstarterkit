# Phase 8: Advanced Features (Weeks 8-9)

**Timeline:** Weeks 8-9
**Priority:** P2 (Nice to Have)

---

## 8.1 Learning & Personalization

**Priority:** P2 (Nice to Have)

### Features

- User feedback on classifications (correct/incorrect)
- Learn user preferences over time
- Custom classification rules from patterns
- Agent behavior tuning per user
- Template customization based on usage

### Implementation

```typescript
// lib/learning/pattern-detection.ts
export async function detectPatternsFromFeedback(userId: string) {
  const feedback = await getClassificationFeedback(userId, { limit: 100 });

  const patterns = [];

  // Pattern: Always mark emails from specific sender as high priority
  const senderPriorities = {};
  for (const fb of feedback) {
    if (fb.corrected.priority !== fb.original.priority) {
      senderPriorities[fb.email.from_email] = senderPriorities[fb.email.from_email] || [];
      senderPriorities[fb.email.from_email].push(fb.corrected.priority);
    }
  }

  for (const [sender, priorities] of Object.entries(senderPriorities)) {
    const mostCommon = mode(priorities);
    if (priorities.filter(p => p === mostCommon).length >= 3) {
      patterns.push({
        type: 'sender_priority',
        sender,
        priority: mostCommon,
        confidence: priorities.filter(p => p === mostCommon).length / priorities.length
      });
    }
  }

  return patterns;
}

// Suggest rules to user
export async function suggestRules(userId: string) {
  const patterns = await detectPatternsFromFeedback(userId);

  for (const pattern of patterns) {
    if (pattern.confidence > 0.8) {
      await createRuleSuggestion(userId, {
        name: `Auto-set priority for ${pattern.sender}`,
        pattern,
        conditions: [
          { field: 'from', operator: 'equals', value: pattern.sender }
        ],
        actions: [
          { type: 'set_priority', value: pattern.priority }
        ]
      });
    }
  }
}
```

### Acceptance Criteria

- [ ] Classification accuracy improves with feedback
- [ ] System suggests custom rules
- [ ] Templates adapt to user's style

---

## 8.2 Collaboration (Team Features)

**Priority:** P2 (Nice to Have)

### Features

- Team accounts (shared inbox)
- Assign emails to team members
- Shared projects
- Approval workflows (e.g., SOW needs manager approval)
- Team activity feed

### Schema Updates

```sql
-- teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- team_members table
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id),
  user_id UUID REFERENCES users(id),
  role TEXT CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- email_assignments table
CREATE TABLE email_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_id UUID REFERENCES email_messages(id),
  assigned_to UUID REFERENCES users(id),
  assigned_by UUID REFERENCES users(id),
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Acceptance Criteria

- [ ] Multiple users can access shared inbox
- [ ] Email assignment works
- [ ] Approval workflows configurable
- [ ] Team dashboard shows all activity

---

## 8.3 Security & Compliance

**Priority:** P1 (Should Have)

### Features

- End-to-end encryption for sensitive data
- GDPR compliance (data export, deletion, privacy policy)
- Audit logs (all user actions)
- Two-factor authentication (2FA)
- SOC 2 compliance readiness

### GDPR Compliance

```typescript
// Data export
export async function exportUserData(userId: string): Promise<string> {
  const data = {
    user: await getUser(userId),
    emails: await getEmails({ user_id: userId }),
    projects: await getProjects({ user_id: userId }),
    tasks: await getTasks({ user_id: userId }),
    documents: await getDocuments({ user_id: userId }),
    agent_logs: await getAgentLogs({ user_id: userId })
  };

  // Create zip file
  const zip = await createZip(data);
  return zip;
}

// Right to be forgotten
export async function deleteUserData(userId: string) {
  // Delete in correct order (foreign keys)
  await deleteAgentLogs({ user_id: userId });
  await deleteTasks({ user_id: userId });
  await deleteDocuments({ user_id: userId });
  await deleteProjects({ user_id: userId });
  await deleteEmailClassifications({ user_id: userId });
  await deleteEmails({ user_id: userId });
  await deleteUser(userId);

  // Delete from Google Cloud Storage
  await deleteUserFiles(userId);
}
```

### 2FA Implementation

```typescript
// Using next-auth with 2FA
import { authenticator } from 'otplib';

export async function enable2FA(userId: string) {
  const secret = authenticator.generateSecret();

  await updateUser(userId, {
    two_factor_secret: encrypt(secret),
    two_factor_enabled: false // Will be true after verification
  });

  // Generate QR code
  const otpauth = authenticator.keyuri(user.email, 'EA AI', secret);
  const qrCode = await generateQRCode(otpauth);

  return { secret, qrCode };
}

export async function verify2FA(userId: string, token: string): Promise<boolean> {
  const user = await getUser(userId);

  if (!user.two_factor_secret) return false;

  const secret = decrypt(user.two_factor_secret);
  const isValid = authenticator.verify({ token, secret });

  if (isValid && !user.two_factor_enabled) {
    await updateUser(userId, { two_factor_enabled: true });
  }

  return isValid;
}
```

### Acceptance Criteria

- [ ] Sensitive data encrypted (tokens, email content)
- [ ] Users can export all their data
- [ ] Users can delete account and all data
- [ ] Audit logs retained for 90 days
- [ ] 2FA available

---

## Deliverables

1. Learning system implemented (optional)
2. Team features (optional)
3. Security enhancements
4. GDPR compliance
5. 2FA setup
6. Tests passing
