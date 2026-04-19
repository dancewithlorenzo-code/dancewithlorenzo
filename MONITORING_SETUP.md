# Dance with Lorenzo - Monitoring & Alerting Setup Guide

**Last Updated:** March 4, 2026

---

## Overview

This guide explains how to set up automated monitoring alerts for:
- ✅ Daily log digest emails at 9 AM JST
- ✅ Stripe webhook failure notifications
- ✅ Database slow query alerts (>500ms)
- ✅ Edge Function error rate monitoring (>5%)

---

## 🚨 Important: OnSpace Cloud Limitations

**OnSpace Cloud does NOT have built-in:**
- Scheduled cron jobs
- Automated alerting services
- Real-time monitoring dashboards
- Performance metric collection

**You need to use external services for automated monitoring.**

---

## ✅ Recommended Solution: GitHub Actions (FREE)

### Why GitHub Actions?
- **Free** for public repositories (2,000 minutes/month for private repos)
- Reliable scheduling (cron syntax)
- Easy integration with OnSpace Edge Functions
- No additional tools needed

### Setup Instructions

#### Step 1: Deploy the Monitoring Edge Function

The monitoring Edge Function has been created at:
```
supabase/functions/monitor-health/index.ts
```

**Deploy it now:**
```bash
# In your project directory, use OnSpace CLI or manual deployment
# The function will be available at:
# https://ctvkeqwytarocihhctvk.backend.onspace.ai/functions/v1/monitor-health
```

#### Step 2: Get Your OnSpace Backend URL

Your backend URL is:
```
https://ctvkeqwytarocihhctvk.backend.onspace.ai
```

#### Step 3: Create GitHub Repository

If you haven't already, push your Dance with Lorenzo code to GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/dance-with-lorenzo.git
git push -u origin main
```

#### Step 4: Create GitHub Actions Workflow

Create this file in your repository:

**`.github/workflows/monitoring.yml`**

```yaml
name: Dance with Lorenzo Monitoring

on:
  schedule:
    # Run daily at 9:00 AM JST (midnight UTC)
    - cron: '0 0 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  health-check:
    runs-on: ubuntu-latest
    
    steps:
      - name: Run Health Monitoring
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            https://ctvkeqwytarocihhctvk.backend.onspace.ai/functions/v1/monitor-health
      
      - name: Log completion
        run: echo "Monitoring check completed at $(date)"
```

#### Step 5: Enable GitHub Actions

1. Go to your GitHub repository
2. Click **Actions** tab
3. Enable workflows if prompted
4. You should see "Dance with Lorenzo Monitoring" workflow

#### Step 6: Test Manual Run

1. Go to **Actions** → **Dance with Lorenzo Monitoring**
2. Click **Run workflow** → **Run workflow**
3. Wait 10-20 seconds
4. Check your email (contact@onspace.ai) for monitoring report

#### Step 7: Configure Alert Email

Edit `supabase/functions/monitor-health/index.ts`:

```typescript
const ALERT_EMAIL = 'your-monitoring-email@example.com'; // Change this
```

Redeploy the function after changing the email.

---

## 📊 Monitoring Report Details

### What Gets Monitored

**1. Database Health**
- Connection status
- Response time (alerts if >500ms)
- Query performance

**2. Stripe Webhooks**
- Failed webhook deliveries in last 24 hours
- Stuck payments (pending >48 hours)
- Payment processing errors

**3. Edge Functions**
- Notification delivery failures
- Error rate calculation
- Function execution errors

**4. Business Metrics**
- Total bookings (last 24 hours)
- Total revenue (last 24 hours)
- System health overview

### Alert Levels

**🚨 CRITICAL** - Immediate action required:
- Database connection failures
- 5+ Stripe webhook failures
- Edge Function error rate >5%

**⚠️ WARNING** - Attention needed:
- Slow database responses
- 1-4 Stripe webhook failures
- Payments stuck >48 hours

**ℹ️ INFO** - Informational only:
- Daily statistics
- System health summary

---

## 🔔 Alternative Monitoring Solutions

### Option 2: Cron-Job.org (Free)

1. Sign up at https://cron-job.org
2. Create new cron job:
   - **URL:** `https://ctvkeqwytarocihhctvk.backend.onspace.ai/functions/v1/monitor-health`
   - **Schedule:** `0 0 * * *` (Daily at midnight UTC = 9 AM JST)
   - **Request method:** POST
3. Save and enable

### Option 3: UptimeRobot (Free)

1. Sign up at https://uptimerobot.com
2. Add new monitor:
   - **Monitor Type:** HTTP(s)
   - **URL:** Your Edge Function URL
   - **Monitoring Interval:** Every 24 hours
3. Configure alert contacts

### Option 4: Better Stack (Formerly Better Uptime)

1. Sign up at https://betterstack.com
2. Create uptime monitor
3. Set up heartbeat monitoring
4. Configure email alerts

### Option 5: Sentry (Advanced)

For comprehensive error tracking:
1. Sign up at https://sentry.io
2. Install Sentry SDK in Edge Functions
3. Configure error thresholds
4. Set up performance monitoring

---

## 📧 Email Alert Examples

### Daily Digest (No Issues)

**Subject:** ✅ Dance with Lorenzo Daily Report - All Systems Operational

**Body:**
```
Monitoring Report
Generated: March 4, 2026 9:00 AM JST

✅ No Critical Alerts

24-Hour Statistics:
- Total Bookings: 12
- Total Revenue: ¥156,000
- Edge Function Errors: 0
- Slow Queries: 0
- Stripe Webhook Failures: 0

All systems operating normally.
```

### Critical Alert

**Subject:** 🚨 CRITICAL: Dance with Lorenzo Monitoring Alert (2 critical, 1 warning)

**Body:**
```
Monitoring Report
Generated: March 4, 2026 9:00 AM JST

🚨 CRITICAL ALERTS:

1. Database response slow: 850ms
   Threshold: 500ms
   Action: Check OnSpace Cloud logs

2. High notification failure rate: 12 failures
   Error rate: 15%
   Action: Review notification_logs table

⚠️ WARNINGS:

1. 3 bookings stuck in pending_payment for >48 hours
   Action: Contact users to confirm payment

Next Steps:
- Review OnSpace Cloud Dashboard → Log tab
- Check Stripe Dashboard for webhook status
- Investigate notification failures
```

---

## 🛠️ Manual Monitoring (No Automation)

If you prefer manual daily checks:

### Daily Checklist (9 AM JST)

1. **Check OnSpace Cloud Dashboard**
   - Go to Cloud mode → Log tab
   - Review errors from last 24 hours

2. **Check Stripe Dashboard**
   - Go to https://dashboard.stripe.com
   - Developers → Webhooks → Check delivery success rate

3. **Run Manual Health Check**
   ```bash
   curl -X POST https://ctvkeqwytarocihhctvk.backend.onspace.ai/functions/v1/monitor-health?force_send=true
   ```
   You'll receive email report immediately.

4. **Review Database Performance**
   - OnSpace Cloud → Data tab
   - Check for slow-loading tables

---

## 🔍 Troubleshooting

### Issue: GitHub Actions not running

**Solution:**
- Check Actions tab → Enable workflows
- Verify cron syntax is correct
- Push a commit to trigger workflow
- Check workflow permissions in repo settings

### Issue: No email alerts received

**Solution:**
- Verify RESEND_API_KEY is configured in OnSpace Cloud
- Check spam/junk folder
- Update ALERT_EMAIL in monitor-health function
- Test with `?force_send=true` parameter

### Issue: Monitoring function returns errors

**Solution:**
- Check OnSpace Cloud → Log tab for detailed errors
- Verify all environment variables are set
- Test database connection separately
- Review Edge Function deployment status

---

## 🔔 Slack Integration (Real-Time Alerts)

### Why Slack?
- **Instant notifications** - Get alerts in seconds
- **Team visibility** - Everyone sees issues immediately
- **Mobile alerts** - Slack mobile app keeps you notified
- **Channel separation** - Critical vs warning isolation
- **Rich formatting** - Color-coded, easy-to-read alerts

### Setup Instructions

#### Step 1: Create Slack Channels

1. Open your Slack workspace
2. Create two channels:
   - `#dance-lorenzo-critical` (for critical alerts)
   - `#dance-lorenzo-warnings` (for warning alerts)
3. Invite team members who need to see alerts

#### Step 2: Create Incoming Webhooks

**For Critical Alerts Channel:**

1. Go to https://api.slack.com/apps
2. Click **Create New App** → **From scratch**
3. App Name: `Dance Lorenzo Critical Alerts`
4. Workspace: Select your workspace
5. Click **Create App**
6. In left sidebar, click **Incoming Webhooks**
7. Toggle **Activate Incoming Webhooks** to ON
8. Click **Add New Webhook to Workspace**
9. Select channel: `#dance-lorenzo-critical`
10. Click **Allow**
11. Copy the **Webhook URL** (starts with `https://hooks.slack.com/services/...`)

**For Warning Alerts Channel:**

1. Repeat steps 1-11 above
2. App Name: `Dance Lorenzo Warning Alerts`
3. Select channel: `#dance-lorenzo-warnings`
4. Copy the second **Webhook URL**

#### Step 3: Configure Environment Variables

Add the webhook URLs to OnSpace Cloud:

1. Go to OnSpace Cloud Dashboard
2. Navigate to **Secrets** tab
3. Add two new secrets:
   - **Key:** `SLACK_WEBHOOK_CRITICAL`
     **Value:** `https://hooks.slack.com/services/YOUR/CRITICAL/WEBHOOK`
   - **Key:** `SLACK_WEBHOOK_WARNING`
     **Value:** `https://hooks.slack.com/services/YOUR/WARNING/WEBHOOK`
4. Click **Save**

#### Step 4: Test Slack Alerts

Run a test monitoring check:

```bash
curl -X POST "https://ctvkeqwytarocihhctvk.backend.onspace.ai/functions/v1/monitor-health?force_send=true"
```

**Expected Result:**
- If no issues: No Slack messages (only email)
- If alerts exist: Slack messages appear in respective channels
- Critical alerts → `#dance-lorenzo-critical`
- Warning alerts → `#dance-lorenzo-warnings`

### Alert Message Format

Slack alerts include:
- 🚨 **Header** - App name and alert level
- 📊 **Summary** - Critical/warning counts, timestamp
- 🔴 **Alert Details** - Each alert with category and message
- 📈 **24-Hour Stats** - Bookings, revenue, errors
- 🔗 **Action Links** - Quick access to dashboards
- 🎨 **Color Coding** - Red (critical), Yellow (warning)

### Single Channel Setup (Optional)

If you prefer one channel for all alerts:

1. Create only `#dance-lorenzo-alerts` channel
2. Create one webhook
3. Set **both** environment variables to the same URL:
   - `SLACK_WEBHOOK_CRITICAL` = same URL
   - `SLACK_WEBHOOK_WARNING` = same URL
4. All alerts will go to one channel

### Customizing Slack Messages

Edit `supabase/functions/monitor-health/index.ts`:

```typescript
// Change alert emoji
const emoji = criticalCount > 0 ? '🔥' : '⚠️';

// Change color coding
const color = criticalCount > 0 ? '#d32f2f' : '#f57c00';

// Add custom fields
fields: [
  {
    type: 'mrkdwn',
    text: `*Custom Field:*\nYour value`
  }
]
```

### Mobile Notifications

**Enable Slack Mobile Alerts:**

1. Install Slack mobile app (iOS/Android)
2. Open Slack app → Your workspace
3. Go to channel (e.g., `#dance-lorenzo-critical`)
4. Tap channel name → **Notifications**
5. Set to **All new messages**
6. Enable **Push notifications**

**Notification Settings:**
- Critical channel: **All messages** + Push
- Warning channel: **Mentions only** or **All messages**

### Alert Escalation Example

**Scenario: Database Connection Failure (Critical)**

1. **Immediate (0 minutes):**
   - Slack message to `#dance-lorenzo-critical` 🚨
   - Email to monitoring address
   - Mobile push notification

2. **Response (5 minutes):**
   - Team member acknowledges in Slack thread
   - Starts investigation

3. **Resolution (30 minutes):**
   - Posts resolution in thread
   - Marks with ✅ emoji

### Troubleshooting

#### Issue: No Slack messages received

**Solution:**
- Verify webhook URLs in OnSpace Cloud Secrets
- Check Slack webhook is active (visit webhook URL, should say "Invalid token")
- Test with `force_send=true` parameter
- Check Edge Function logs for Slack errors

#### Issue: Messages going to wrong channel

**Solution:**
- Verify `SLACK_WEBHOOK_CRITICAL` vs `SLACK_WEBHOOK_WARNING` mapping
- Recreate webhooks if needed
- Check channel names match

#### Issue: Slack says "Webhook not found"

**Solution:**
- Webhook was deleted - recreate from Step 2
- Check for typos in environment variable
- Ensure full URL is copied (including `https://`)

### Advanced: Slack Workflow Integration

**Auto-create incidents from critical alerts:**

1. In Slack, go to **Workflow Builder**
2. Create workflow: **When message posted to #dance-lorenzo-critical**
3. Action: **Create Jira ticket** or **PagerDuty incident**
4. Save workflow

Now critical alerts auto-create tickets!

---

## 📈 Advanced: Custom Metrics

### Add Custom Checks

Edit `supabase/functions/monitor-health/index.ts`:

```typescript
// Example: Monitor gift card redemption rate
const { data: giftCards } = await supabaseAdmin
  .from('gift_cards')
  .select('*')
  .eq('is_redeemed', false)
  .lt('expires_at', new Date().toISOString());

if (giftCards && giftCards.length > 10) {
  alerts.push({
    level: 'warning',
    category: 'general',
    message: `${giftCards.length} unredeemed gift cards about to expire`,
  });
}
```

### Add New Alert Categories

Extend the `Alert` interface:

```typescript
interface Alert {
  level: 'critical' | 'warning' | 'info';
  category: 'database' | 'stripe' | 'edge_function' | 'business' | 'security';
  message: string;
  details?: any;
}
```

---

## 🎯 Launch Day Monitoring

On launch day, increase monitoring frequency:

**GitHub Actions** - Edit schedule:
```yaml
schedule:
  # Every 2 hours on launch day
  - cron: '0 */2 * * *'
```

**After 7 days**, revert to daily:
```yaml
schedule:
  # Daily at 9 AM JST
  - cron: '0 0 * * *'
```

---

## 📞 Support

If you need help setting up monitoring:
- **Email:** contact@onspace.ai
- **Documentation:** This guide
- **OnSpace Support:** Contact via platform

---

## ✅ Setup Checklist

Before launch, verify:

- [ ] Monitoring Edge Function deployed
- [ ] GitHub Actions workflow created and enabled
- [ ] Test manual workflow run successful
- [ ] Email alerts received and reviewed
- [ ] ALERT_EMAIL updated to your monitoring address
- [ ] **Slack channels created (#dance-lorenzo-critical, #dance-lorenzo-warnings)**
- [ ] **Slack webhooks configured in OnSpace Cloud Secrets**
- [ ] **Test Slack alerts received in both channels**
- [ ] **Team members added to Slack channels**
- [ ] **Slack mobile notifications enabled for critical channel**
- [ ] Scheduled run tested (wait 24 hours after setup)
- [ ] Escalation plan documented for critical alerts

---

**Monitoring is critical for production apps. Don't skip this setup!** 🚀
