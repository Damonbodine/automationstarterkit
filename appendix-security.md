# Security & Privacy

**Version:** 1.0
**Last Updated:** January 2025

---

## Data Security

### 1. Encryption at Rest

**Database:**
- Supabase PostgreSQL with encryption enabled
- AES-256 encryption for all data at rest
- Encrypted backups

**Tokens:**
```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

**Email Content:**
- Consider encryption for enterprise tier
- Client-side encryption option for sensitive emails
- Encrypted field-level encryption for specific data

---

### 2. Encryption in Transit

**HTTPS Only:**
- TLS 1.3 enforced
- HSTS headers enabled
- Automatic redirect from HTTP to HTTPS

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          }
        ]
      }
    ];
  }
};
```

**WebSocket Security:**
- WSS (WebSocket Secure) only
- Authentication required before connection
- Rate limiting on WebSocket connections

---

### 3. Access Control

**Row Level Security (RLS):**

```sql
-- Users can only access their own data
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own emails"
  ON email_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emails"
  ON email_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Similar policies for all tables
```

**Service Accounts:**
- Dedicated service account for Google APIs
- Minimal permissions (principle of least privilege)
- Rotated credentials every 90 days

**API Access:**
- JWT-based authentication
- Short-lived tokens (1 hour)
- Refresh token rotation

---

### 4. Authentication

**Google OAuth 2.0:**
- Delegated authentication (no password storage)
- Verified email addresses only
- Request minimal scopes necessary

**Session Management:**
```typescript
// NextAuth configuration
export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly ...',
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  }
};
```

**Two-Factor Authentication (2FA):**
- Optional 2FA for all users
- Required for enterprise tier
- TOTP (Time-based One-Time Password)
- Backup codes for recovery

---

### 5. API Security

**Rate Limiting:**
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to API routes
app.use('/api/', limiter);
```

**CORS Restrictions:**
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://yourdomain.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' }
        ]
      }
    ];
  }
};
```

**Webhook Verification:**
```typescript
export function verifyPubSubWebhook(req: Request): boolean {
  const authHeader = req.headers.authorization;

  // Verify JWT from Google Pub/Sub
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);

  try {
    // Verify JWT signature with Google's public keys
    const decoded = jwt.verify(token, getGooglePublicKey());
    return decoded.email_verified && decoded.email === EXPECTED_SERVICE_ACCOUNT;
  } catch (error) {
    return false;
  }
}
```

**Input Validation:**
```typescript
import { z } from 'zod';

const emailSchema = z.object({
  subject: z.string().max(500),
  body: z.string().max(100000),
  from_email: z.string().email(),
});

export async function createEmail(data: unknown) {
  const validated = emailSchema.parse(data); // Throws if invalid
  // ... proceed with validated data
}
```

---

## Privacy Considerations

### 1. Data Minimization

**What We Collect:**
- Email metadata (from, to, subject, date)
- Email body content (for classification)
- Attachments (for OCR)
- User actions and preferences

**What We Don't Collect:**
- Email passwords (OAuth only)
- Emails marked "do not process" by user
- Deleted emails (hard delete, not soft)

**User Control:**
```typescript
// Allow users to exclude emails from processing
await updateUser(userId, {
  preferences: {
    excluded_senders: ['sensitive@example.com'],
    excluded_labels: ['personal', 'confidential']
  }
});
```

---

### 2. User Control

**Email Deletion:**
```typescript
export async function deleteEmail(emailId: string, userId: string) {
  // Hard delete from database
  await db.email_messages.delete({
    where: { id: emailId, user_id: userId }
  });

  // Delete attachments from GCS
  const documents = await getDocuments({ email_id: emailId });
  for (const doc of documents) {
    await deleteFromGCS(doc.gcs_url);
  }
}
```

**Agent Control:**
- Users can enable/disable any agent
- Users can set agents to "approval required" mode
- Users can undo agent actions

**Data Export:**
```typescript
export async function exportAllUserData(userId: string): Promise<Buffer> {
  const data = {
    user: await getUser(userId),
    emails: await getEmails({ user_id: userId }),
    projects: await getProjects({ user_id: userId }),
    tasks: await getTasks({ user_id: userId }),
    documents: await getDocuments({ user_id: userId }),
    agent_logs: await getAgentLogs({ user_id: userId }),
    classifications: await getClassifications({ user_id: userId })
  };

  return createZipArchive(data);
}
```

---

### 3. Transparency

**Privacy Policy:**
- Clear explanation of data collection
- Purpose of each data point
- Third-party services disclosed
- User rights explained

**Agent Actions:**
- All actions logged to `agent_logs`
- User can view complete history
- Clear explanation of what each agent does

**Terms of Service:**
- Clear usage terms
- Data retention policy
- Account deletion policy

---

### 4. GDPR Compliance

**User Rights:**

**Right to Access:**
```typescript
// Users can download all their data
GET /api/user/export
```

**Right to be Forgotten:**
```typescript
export async function deleteAccount(userId: string) {
  // Delete all user data
  await deleteAgentLogs({ user_id: userId });
  await deleteTasks({ user_id: userId });
  await deleteProjects({ user_id: userId });
  await deleteDocuments({ user_id: userId });
  await deleteClassifications({ user_id: userId });
  await deleteEmails({ user_id: userId });
  await deleteSyncState({ user_id: userId });
  await deleteUser(userId);

  // Delete files from GCS
  await deleteUserBucket(userId);

  // Revoke Google OAuth tokens
  await revokeGoogleTokens(userId);
}
```

**Right to Rectification:**
- Users can edit all their data
- Classification corrections
- Profile updates

**Right to Data Portability:**
- Export in JSON format
- Export in CSV format (for emails, tasks)

**Cookie Consent:**
```tsx
// Cookie consent banner for EU users
export function CookieConsent() {
  const [consent, setConsent] = useState(false);

  return (
    <div className="cookie-banner">
      <p>We use cookies to improve your experience...</p>
      <button onClick={() => setConsent(true)}>Accept</button>
      <button onClick={() => setConsent(false)}>Reject</button>
    </div>
  );
}
```

---

### 5. Third-party Data Sharing

**Services We Use:**

| Service | Purpose | Data Shared | Privacy Policy |
|---------|---------|-------------|----------------|
| Anthropic Claude | Email classification | Email content | [Link](https://anthropic.com/privacy) |
| Google APIs | Email sync, Docs/Sheets | Email content, docs | [Link](https://policies.google.com/privacy) |
| Vercel | Hosting | Usage data | [Link](https://vercel.com/legal/privacy-policy) |
| Supabase | Database | All user data | [Link](https://supabase.com/privacy) |
| Sentry | Error tracking | Error logs | [Link](https://sentry.io/privacy/) |

**Commitments:**
- No data sold to third parties
- No advertising partners
- All third parties are GDPR compliant
- Data Processing Agreements (DPAs) in place

---

## Compliance

### GDPR (EU)
- ✅ Data Processing Agreement
- ✅ Privacy Policy
- ✅ Cookie Consent
- ✅ Right to Access
- ✅ Right to be Forgotten
- ✅ Data Portability

### CCPA (California)
- ✅ Privacy Policy disclosure
- ✅ Do Not Sell option
- ✅ Data deletion requests
- ✅ Data access requests

### SOC 2 (Future)
- Type I audit (point-in-time)
- Type II audit (over time)
- Trust Service Criteria compliance

### Google API Terms
- ✅ Limited Use disclosure
- ✅ Secure data handling
- ✅ Clear OAuth consent screen
- ✅ Scopes justified

---

## Security Best Practices

### Code Security

**Dependency Scanning:**
```bash
# Run on every commit
npm audit
npm audit fix
```

**SAST (Static Analysis):**
```bash
# Use ESLint security plugins
npm install --save-dev eslint-plugin-security
```

**Secret Scanning:**
```bash
# GitHub secret scanning enabled
# Pre-commit hooks to prevent secret commits
```

### Infrastructure Security

**Principle of Least Privilege:**
- Service accounts have minimal permissions
- Database users have restricted access
- API keys rotated regularly

**Network Security:**
- Private subnets for databases
- VPC for sensitive services (future)
- Firewall rules for API access

**Backup & Recovery:**
- Daily database backups (Supabase)
- Point-in-time recovery (7 days)
- Backup encryption enabled

---

## Incident Response

### Security Incident Plan

**1. Detection:**
- Automated alerts (Sentry)
- User reports
- Security scans

**2. Assessment:**
- Determine severity (low/medium/high/critical)
- Identify affected users
- Assess data exposure

**3. Containment:**
- Disable affected endpoints
- Rotate compromised credentials
- Isolate affected systems

**4. Notification:**
- Notify affected users within 72 hours (GDPR)
- Provide clear information
- Offer remediation steps

**5. Remediation:**
- Fix vulnerability
- Deploy patch
- Monitor for recurrence

**6. Post-Mortem:**
- Document incident
- Update security practices
- Train team

---

## Audit Logs

```typescript
// Log all sensitive operations
export async function createAuditLog(
  userId: string,
  action: string,
  resource: string,
  details: any
) {
  await db.audit_logs.create({
    data: {
      user_id: userId,
      action,
      resource,
      details,
      ip_address: getClientIP(),
      user_agent: getUserAgent(),
      created_at: new Date()
    }
  });
}

// Examples
await createAuditLog(userId, 'delete_email', 'email_messages', { email_id: '...' });
await createAuditLog(userId, 'export_data', 'user', {});
await createAuditLog(userId, 'update_settings', 'user', { changed: ['2fa_enabled'] });
```

**Retention:** 90 days for compliance

---

## Conclusion

Security and privacy are foundational to the platform. We commit to:
- Protecting user data with industry-standard encryption
- Providing transparency and control
- Complying with all applicable regulations
- Continuous security improvements
