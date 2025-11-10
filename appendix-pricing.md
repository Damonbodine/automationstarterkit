# Pricing & Business Model

**Version:** 1.0
**Last Updated:** January 2025

---

## Pricing Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0/month | - 100 emails/month<br>- 5 SOWs/month<br>- Basic agents<br>- 1 GB storage |
| **Pro** | $29/month | - Unlimited emails<br>- Unlimited SOWs<br>- All agents<br>- 10 GB storage<br>- Priority support<br>- Custom templates |
| **Team** | $99/month<br>(up to 5 users) | - Everything in Pro<br>- Shared inbox<br>- Team collaboration<br>- Approval workflows<br>- 50 GB storage<br>- Team analytics |
| **Enterprise** | Custom | - Everything in Team<br>- Unlimited users<br>- SSO/SAML<br>- Dedicated support<br>- SLA guarantee<br>- On-premise option<br>- Custom integrations |

---

## Revenue Projections (Year 1)

### User Growth Targets

| Month | Total Users | Free | Pro | Team | Enterprise | MRR |
|-------|-------------|------|-----|------|------------|-----|
| 3 | 100 | 80 | 15 | 5 | 0 | $735 |
| 6 | 500 | 350 | 120 | 30 | 0 | $6,450 |
| 12 | 2,000 | 1,200 | 650 | 140 | 10 | $32,710 |

**Annual Run Rate (Month 12):** ~$390K

### Conversion Assumptions

- Free → Pro: 20% conversion rate
- Pro → Team: 15% conversion rate
- Team → Enterprise: 5% conversion rate
- Average time to convert: 30 days

---

## Cost Structure

### Variable Costs (per user/month)

| Service | Free User | Pro User | Team User |
|---------|-----------|----------|-----------|
| Claude API | $2 | $15 | $20 |
| Supabase | $0.25 | $0.50 | $0.75 |
| Upstash Redis | $0.10 | $0.25 | $0.50 |
| Google Cloud Storage | $0.05 | $0.10 | $0.25 |
| **Total** | **$2.40** | **$15.85** | **$21.50** |

### Fixed Costs (monthly)

| Service | Cost |
|---------|------|
| Vercel Pro | $20 |
| Domain & SSL | $15 |
| Sentry | $26 |
| Email service (Resend) | $10 |
| Marketing tools | $50 |
| **Total** | **$121** |

### Margin Analysis

**Pro Tier:**
- Revenue: $29/month
- Variable cost: $15.85
- Margin: $13.15 (45%)

**Team Tier:**
- Revenue: $99/month ÷ 5 users = $19.80/user
- Variable cost: $21.50/user
- Margin: -$1.70/user (needs optimization or pricing adjustment)

**Recommended:** Increase Team tier to $149/month or reduce per-user costs

---

## Pricing Strategy

### Value-Based Pricing

**Key Value Propositions:**
1. Time saved: 10+ hours/week → $500-1000/week value (at $50-100/hour)
2. Error reduction: Fewer missed deadlines and opportunities
3. Professionalism: Faster response times, better client experience

**Pricing Psychology:**
- Pro tier at $29 positions as "affordable professional tool"
- Team tier at $99 creates clear upgrade path
- Enterprise custom pricing allows negotiation for large deals

### Competitor Comparison

| Product | Price | Features | Our Advantage |
|---------|-------|----------|---------------|
| Superhuman | $30/month | Email client | We add AI agents + project management |
| Reclaim.ai | $8-12/month | Calendar AI | We cover full EA workflow |
| Motion | $34/month | Task + calendar | We integrate email + docs |
| **Our Product** | $29/month | Full EA suite | All-in-one solution |

### Discounts & Promotions

**Annual Billing:**
- 20% discount for annual payment
- Pro: $278/year (save $70)
- Team: $950/year (save $238)

**Beta User Discount:**
- 50% off first 3 months
- Lifetime 25% discount for first 50 users

**Referral Program:**
- $10 credit for referrer
- $10 credit for new user

---

## Unit Economics

### Customer Acquisition Cost (CAC)

**Target CAC:** $50-100 per customer

**Channels:**
- Organic (Product Hunt, SEO): $0-20
- Content marketing: $30-50
- Paid ads (if used): $100-200

### Lifetime Value (LTV)

**Assumptions:**
- Average customer lifetime: 18 months
- Churn rate: 5%/month (95% retention)
- Average revenue per user (ARPU): $25/month

**LTV Calculation:**
- LTV = ARPU × (1 / Churn Rate)
- LTV = $25 × (1 / 0.05) = $500

**LTV/CAC Ratio:** 5:1 (healthy if CAC = $100)

### Break-Even Analysis

**Fixed costs:** $121/month
**Variable cost per user:** $15.85 (avg)
**Average revenue per user:** $25/month

**Break-even users:** $121 / ($25 - $15.85) = 13 users

---

## Payment & Billing

### Payment Processing

- **Provider:** Stripe
- **Fees:** 2.9% + $0.30 per transaction
- **Supported methods:** Credit card, ACH, international payments

### Billing Cycle

- Monthly billing on sign-up anniversary
- Annual billing: pay upfront, 20% discount
- Prorated upgrades/downgrades

### Usage-Based Overages (Future)

For users exceeding limits:
- $0.01 per extra email (Free tier)
- $5 per extra SOW (Free tier)
- $10 per extra 10GB storage (all tiers)

---

## Growth Levers

### Viral Coefficient

**Target:** 0.3-0.5 (each user invites 0.3-0.5 new users)

**Mechanisms:**
- Email signatures: "Powered by EA AI"
- Shared projects with clients
- Referral incentives

### Expansion Revenue

**Upsell paths:**
1. Free → Pro: Feature limits
2. Pro → Team: Team features
3. Team → Enterprise: Advanced features + support

**Cross-sell:**
- Premium templates marketplace
- Professional services (custom integrations)
- Training and onboarding

---

## Future Pricing Considerations

### Add-Ons (Potential)

- **Premium AI Models:** $10/month for GPT-4 or Claude Opus
- **Advanced Analytics:** $15/month for detailed insights
- **White Label:** $200/month for agencies
- **API Access:** $50/month for developers

### Enterprise Pricing

**Factors:**
- Number of users
- Email volume
- Storage requirements
- SLA requirements
- Custom integrations
- On-premise deployment

**Typical Enterprise Deal:** $500-2,000/month

---

## Metrics to Track

### Product Metrics
- Monthly Active Users (MAU)
- Daily Active Users (DAU)
- DAU/MAU ratio (stickiness)
- Feature adoption rates

### Revenue Metrics
- Monthly Recurring Revenue (MRR)
- Annual Recurring Revenue (ARR)
- Average Revenue Per User (ARPU)
- Customer Lifetime Value (LTV)

### Growth Metrics
- User growth rate (month-over-month)
- Conversion rates (Free → Pro → Team)
- Churn rate
- Net Revenue Retention (NRR)

### Efficiency Metrics
- Customer Acquisition Cost (CAC)
- LTV/CAC ratio
- Payback period
- Gross margin

---

## Financial Projections

### Year 1

| Quarter | Users | MRR | Costs | Profit |
|---------|-------|-----|-------|--------|
| Q1 | 100 | $735 | $2,561 | -$1,826 |
| Q2 | 500 | $6,450 | $8,046 | -$1,596 |
| Q3 | 1,200 | $16,890 | $19,141 | -$2,251 |
| Q4 | 2,000 | $32,710 | $32,121 | $589 |

**Year 1 Total:**
- Revenue: $171,255
- Costs: $185,907
- Net: -$14,652 (investment year)

### Year 2 Projection

- Target: 5,000 users
- MRR: $90,000
- ARR: $1,080,000
- Profitable with healthy margins

---

## Conclusion

The pricing model balances:
1. **Accessibility** (free tier to attract users)
2. **Value capture** (pro tier at market rates)
3. **Expansion** (team and enterprise tiers)

Focus on:
- Optimizing variable costs (especially Claude API usage)
- Maximizing Free → Pro conversion
- Building enterprise sales pipeline for larger deals
