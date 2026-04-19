# Dance with Lorenzo - Final Launch Checklist

**Last Updated:** March 4, 2026  
**Target Launch Date:** [SET YOUR DATE]  
**Launch Coordinator:** [YOUR NAME]

---

## 🎯 Pre-Launch Overview

This checklist ensures all critical systems are verified, backups are in place, support channels are ready, and marketing materials are prepared before launching "Dance with Lorenzo" to production.

**Status Legend:**
- ⬜ Not Started
- 🟡 In Progress
- ✅ Completed
- ❌ Blocked/Issue

---

## 1. Production Environment Verification

### 1.1 OnSpace Cloud Backend
- ⬜ **Database Status**
  - [ ] All tables created and RLS policies active
  - [ ] Row counts verified for: `user_profiles`, `classes`, `bookings`, `tokens`, `workshop_bundles`, `music_products`
  - [ ] Test queries execute successfully
  - [ ] No orphaned records or data integrity issues
  - [ ] Database response time < 500ms for standard queries

- ⬜ **Storage Buckets**
  - [ ] `class-media` bucket accessible
  - [ ] Sample photos uploaded and URLs working
  - [ ] RLS policies tested (public read, authenticated write)
  - [ ] File size limits configured (max 10MB per file)
  - [ ] CDN caching verified

- ⬜ **Edge Functions**
  - [ ] All 11 Edge Functions deployed successfully:
    - [ ] `create-token-checkout`
    - [ ] `create-workshop-checkout`
    - [ ] `create-workshop-bundle-checkout`
    - [ ] `create-private-lesson-payment`
    - [ ] `create-gift-card-checkout`
    - [ ] `create-test-checkout`
    - [ ] `stripe-webhook`
    - [ ] `generate-receipt`
    - [ ] `send-class-reminders`
    - [ ] `send-payment-reminders`
    - [ ] `check-expired-requests`
  - [ ] Function invocation test (200 status codes)
  - [ ] CORS headers working correctly
  - [ ] Error handling tested (400, 500 responses)

- ⬜ **Environment Variables**
  - [ ] `STRIPE_SECRET_KEY` configured (production key, not test)
  - [ ] `STRIPE_WEBHOOK_SECRET` configured
  - [ ] `RESEND_API_KEY` configured and verified
  - [ ] All secrets accessible from Edge Functions
  - [ ] No test/development keys in production

- ⬜ **Authentication**
  - [ ] Email OTP working (4-digit code, 1-hour expiry)
  - [ ] Password authentication tested
  - [ ] Google OAuth configured (production client ID/secret)
  - [ ] Password reset flow verified
  - [ ] Session management working (auto-refresh)
  - [ ] User signup creates `user_profiles` entry via trigger

### 1.2 Stripe Integration
- ⬜ **Production Mode**
  - [ ] Stripe account in **LIVE mode** (not test mode)
  - [ ] Business verification completed (tax documents submitted)
  - [ ] Bank account connected for payouts
  - [ ] Webhook endpoint configured: `[YOUR_BACKEND_URL]/functions/v1/stripe-webhook`
  - [ ] Webhook signing secret matches backend secret

- ⬜ **Products & Prices**
  - [ ] BMD Token Package (¥33,000 / 4 tokens) created
  - [ ] Workshop pricing logic verified (<5 people ¥15,000, 5+ ¥12,000)
  - [ ] Private lesson product (¥40,000) created
  - [ ] Gift card products created (4, 8, 12 token packages)
  - [ ] All prices in JPY currency

- ⬜ **Payment Testing**
  - [ ] Test successful payment with production Stripe (small amount, then refund)
  - [ ] Webhook receives events (check backend logs)
  - [ ] Receipt emails sent automatically
  - [ ] Payment confirmation updates database correctly
  - [ ] Apple Pay / Google Pay tested on real devices

### 1.3 Email System (Resend)
- ⬜ **Domain Verification**
  - [ ] Domain verified in Resend dashboard
  - [ ] SPF, DKIM, DMARC records added to DNS
  - [ ] Test emails land in inbox (not spam)
  - [ ] Sender address: `noreply@dancewithlorenzotokyojapan.info` (or your domain)

- ⬜ **Email Templates**
  - [ ] Receipt emails rendering correctly (HTML + plain text)
  - [ ] Class reminder emails tested (24 hours before)
  - [ ] Payment reminder emails tested (3 days, 7 days)
  - [ ] Gift card emails with redemption codes working
  - [ ] All emails include unsubscribe link
  - [ ] Japanese translations verified

- ⬜ **Email Logs**
  - [ ] Sent emails tracked in `receipt_logs` table
  - [ ] Delivery status monitored
  - [ ] Bounce/complaint handling configured

### 1.4 Push Notifications (Expo)
- ⬜ **Notification Setup**
  - [ ] Expo push notification credentials configured
  - [ ] Test push sent to iOS device
  - [ ] Test push sent to Android device
  - [ ] Deep linking working (tap notification → opens class details)
  - [ ] Notification permissions requested on first launch

- ⬜ **Notification Scenarios**
  - [ ] Class reminder 24 hours before
  - [ ] Booking confirmation after payment
  - [ ] Payment approval (manual payments)
  - [ ] QR check-in confirmation
  - [ ] Gift card received notification

### 1.5 App Build Quality
- ⬜ **Code Quality**
  - [ ] No TypeScript errors (`tsc --noEmit`)
  - [ ] No console.error in production code
  - [ ] All API keys removed from client-side code
  - [ ] Debug flags disabled
  - [ ] Analytics tracking enabled

- ⬜ **Performance**
  - [ ] App loads in < 3 seconds on 4G
  - [ ] Image optimization verified (expo-image used)
  - [ ] No memory leaks in long sessions
  - [ ] Smooth scrolling (60fps) on mid-range devices
  - [ ] Bundle size < 50MB

- ⬜ **Platform Testing**
  - [ ] iOS: Tested on iPhone 12+, iOS 15+
  - [ ] Android: Tested on Samsung/Pixel, Android 11+
  - [ ] Tablet: Layout responsive on iPad/Android tablets
  - [ ] Web: Basic functionality on desktop browsers (if applicable)

---

## 2. Backup & Data Protection

### 2.1 Database Backup Strategy
- ⬜ **Automated Backups**
  - [ ] OnSpace Cloud automatic backups enabled (check dashboard)
  - [ ] Backup frequency: Daily at minimum
  - [ ] Retention period: 30 days minimum
  - [ ] Backup location: Separate region/storage

- ⬜ **Manual Backup Before Launch**
  - [ ] Export all tables to CSV (via OnSpace Cloud Dashboard → Data tab)
  - [ ] Store in secure location: Google Drive / Dropbox / GitHub private repo
  - [ ] Backup file naming: `dance-lorenzo-backup-YYYY-MM-DD.zip`
  - [ ] Verify backup can be restored (test on dev environment)

- ⬜ **Critical Tables to Backup**
  - [ ] `user_profiles` (user data)
  - [ ] `tokens` (token balances)
  - [ ] `workshop_bundles` (bundle credits)
  - [ ] `bookings` (all reservations)
  - [ ] `classes` (class schedule)
  - [ ] `private_lessons` (lesson bookings)
  - [ ] `gift_cards` (unredeemed cards)
  - [ ] `referrals` (referral codes)
  - [ ] `receipt_logs` (payment history)

- ⬜ **Backup Encryption**
  - [ ] Sensitive data encrypted at rest
  - [ ] Backup access restricted (password-protected)
  - [ ] Backup access audit log enabled

### 2.2 Disaster Recovery Plan
- ⬜ **Recovery Time Objective (RTO)**
  - Target: Restore service within 4 hours of critical failure
  - [ ] Backup restoration tested (dry run completed)
  - [ ] Alternative hosting plan identified (if OnSpace fails)
  - [ ] Emergency contact list prepared

- ⬜ **Data Recovery Scenarios**
  - [ ] Scenario 1: Accidental table deletion → Restore from latest backup
  - [ ] Scenario 2: Database corruption → Rollback to last known good state
  - [ ] Scenario 3: Payment system failure → Manual payment reconciliation via receipt logs
  - [ ] Scenario 4: Edge Function failure → Deploy rollback version immediately

---

## 3. Monitoring & Observability

### 3.1 OnSpace Cloud Monitoring Dashboard
- ⬜ **Cloud Dashboard Setup**
  - [ ] Access OnSpace Cloud Dashboard (right panel → Cloud mode)
  - [ ] Review **Log** tab for real-time errors
  - [ ] Set up bookmark for quick access: `https://ctvkeqwytarocihhctvk.backend.onspace.ai`

- ⬜ **Key Metrics to Monitor**
  - [ ] **Database:** Query count, slow queries (>500ms), failed queries
  - [ ] **Edge Functions:** Invocation count, error rate, execution time
  - [ ] **Storage:** Upload success rate, bandwidth usage
  - [ ] **Auth:** Signup rate, login success rate, failed login attempts

- ⬜ **Error Alerting**
  - [ ] Check logs daily for first 7 days post-launch
  - [ ] Set reminder: Daily 9 AM JST log review
  - [ ] Identify critical error patterns (e.g., payment failures, webhook errors)

### 3.2 Stripe Dashboard Monitoring
- ⬜ **Stripe Monitoring**
  - [ ] Bookmark Stripe Dashboard: `https://dashboard.stripe.com`
  - [ ] Enable email notifications for:
    - Failed payments
    - Disputes/chargebacks
    - Payouts
    - Webhook endpoint failures
  - [ ] Review daily payment volume
  - [ ] Monitor refund rate (should be <5%)

### 3.3 Network Request Monitoring (Client-Side)
- ⬜ **Client Error Tracking**
  - [ ] Use OnSpace AI tool `query_network_requests` to debug user-reported issues
  - [ ] Check for 4xx/5xx errors in production
  - [ ] Identify slow API calls (>3 seconds)
  - [ ] Monitor CORS errors (should be zero)

### 3.4 User Behavior Analytics
- ⬜ **Key Performance Indicators (KPIs)**
  - [ ] Daily Active Users (DAU)
  - [ ] New signups per day
  - [ ] Token purchase conversion rate
  - [ ] Class booking rate
  - [ ] App crash rate (target: <1%)
  - [ ] Average session duration

- ⬜ **Analytics Implementation**
  - [ ] Track via OnSpace Cloud → AI tab (usage metrics)
  - [ ] Manual tracking in Google Sheets (first 30 days)
  - [ ] Weekly analytics review meeting scheduled

---

## 4. Customer Support Readiness

### 4.1 Support Email Setup
- ⬜ **Primary Support Channel**
  - [ ] Email address: `contact@onspace.ai` (forwarding to your inbox)
  - [ ] Auto-reply configured: "We received your message and will respond within 24 hours"
  - [ ] Email signature includes:
    - Dance with Lorenzo branding
    - Link to FAQ page
    - Business hours (if applicable)
  - [ ] Test email delivery both ways

- ⬜ **Support Team Training**
  - [ ] Support team has access to:
    - OnSpace Cloud Dashboard (admin users)
    - Stripe Dashboard (view-only access)
    - FAQ document
  - [ ] Common issues documented (see section 4.3)
  - [ ] Escalation process defined (critical vs. non-critical)

### 4.2 In-App Support
- ⬜ **FAQ Page**
  - [ ] FAQ page accessible from Profile → FAQ
  - [ ] FAQ page accessible from Landing page footer
  - [ ] Covers top 20 questions (already implemented ✅)
  - [ ] Bilingual (English + Japanese ✅)

- ⬜ **Help & Support Section**
  - [ ] Profile → Settings → Help & Support link
  - [ ] Opens email client with pre-filled support address
  - [ ] Includes user ID in email subject for easier tracking

### 4.3 Common Issues & Responses
Prepare templated responses for:

**Issue 1: Payment Not Confirmed**
- Response: "Your payment was successful on Stripe's end. The admin will manually confirm your booking within 24 hours. You'll receive a receipt email once confirmed."

**Issue 2: Can't Login**
- Response: "Please check: (1) Email address is correct, (2) OTP code is still valid (expires after 1 hour), (3) Internet connection is stable. If issues persist, request a new OTP code."

**Issue 3: Class Full**
- Response: "This class has reached maximum capacity. We recommend: (1) Check for alternative dates, (2) Join the waitlist (if available), (3) Book early next time."

**Issue 4: Token Not Deducted**
- Response: "Tokens are deducted immediately after booking confirmation. Check Dashboard → Tokens to see your current balance. If incorrect, contact support with booking ID."

**Issue 5: Haven't Received Receipt**
- Response: "Receipts are sent to [your email]. Please check: (1) Spam/junk folder, (2) Email address in profile is correct. We can resend the receipt manually—please provide your booking ID."

### 4.4 Escalation Matrix

| Issue Type | Severity | Response Time | Escalation Path |
|-----------|----------|---------------|-----------------|
| Payment failure | Critical | 2 hours | Lorenzo → OnSpace Support |
| Login issues | High | 4 hours | Support team → Backend admin |
| Class inquiry | Medium | 24 hours | Support team |
| Feature request | Low | 48 hours | Support team |

---

## 5. Marketing & Announcement Materials

### 5.1 Social Media Announcement Posts

**Platform:** Instagram, Facebook, Twitter/X

#### Post 1: Teaser (3 days before launch)
```
🌺 Big Announcement Coming! 🌺

Something special is about to launch... 

Ori Tahiti lovers in Japan and around the world 🌏
Get ready to dance with Lorenzo like never before! 

Stay tuned... 
March [LAUNCH DATE] 💃✨

#DanceWithLorenzo #OriTahiti #PolynesianDance #TahitianDance #DanceTokyo
```

**Assets needed:**
- [ ] Teaser image: Abstract dance silhouette or app icon
- [ ] Story: 15-second video preview of app interface

---

#### Post 2: Launch Day
```
🎉 IT'S HERE! 🎉

Dance with Lorenzo is NOW LIVE! 

📱 Download the app and join our global Ori Tahiti family!

✨ What's inside:
🎯 Flexible token packages (¥33,000 / 4 classes)
📍 Classes in Tokyo, Yokohama & Online Worldwide
🎓 Expert instruction from Lorenzo
💳 Seamless booking & payments
🎁 Gift cards for dancers

🚨 LAUNCH OFFER: 4 tokens ¥33,000 (save ¥12,000!) 
⏰ Offer expires March 15, 2026

👉 Download now: [LINK TO APP STORE / GOOGLE PLAY]

See you on the dance floor! 💃🌺

#DanceWithLorenzo #OriTahiti #AppLaunch #TahitianDance #DanceApp #PolynesianCulture
```

**Assets needed:**
- [ ] App screenshots (5 images: landing, classes, tokens, booking, QR check-in)
- [ ] Feature graphic (1024x500px - already created ✅)
- [ ] Video: 30-second app walkthrough
- [ ] Hashtag research: Top 10 relevant hashtags

---

#### Post 3: Tutorial / How It Works (1 day after launch)
```
📖 How to Get Started with Dance with Lorenzo

New to the app? Here's your quick guide:

1️⃣ Download & Sign Up (Email or Google)
2️⃣ Browse Classes (BMD tokens or Workshops)
3️⃣ Purchase Tokens (¥33,000 / 4 tokens - SALE ON!)
4️⃣ Book Your Class (One tap!)
5️⃣ Check In with QR Code (On-site classes)

🎁 BONUS: Invite friends & earn free tokens!

Questions? Check our FAQ in the app or DM us!

#DanceWithLorenzo #Tutorial #HowTo #OriTahiti
```

**Assets needed:**
- [ ] Infographic: 5-step visual guide
- [ ] Video: Screen recording with voiceover

---

#### Post 4: User Testimonial (1 week after launch)
```
💬 "The app makes booking so easy! I love the flexibility of tokens." - Yuki M., Tokyo

Hear what our dancers are saying about Dance with Lorenzo! 🌟

Download the app and experience it yourself:
[APP LINK]

#DanceWithLorenzo #Testimonial #HappyDancers #OriTahiti
```

**Assets needed:**
- [ ] Collect 3-5 testimonials from beta testers
- [ ] Photos of dancers (with permission)
- [ ] Video testimonials (if available)

---

### 5.2 Press Release Draft

**FOR IMMEDIATE RELEASE**

---

**Dance with Lorenzo Launches Mobile App for Global Ori Tahiti Community**

*Innovative App Brings Tahitian Dance Classes to Dancers Worldwide with Flexible Token System and International Accessibility*

**Tokyo, Japan – [LAUNCH DATE]** – Dance with Lorenzo, a premier Ori Tahiti (Tahitian dance) instruction platform, today announced the launch of its mobile application for iOS and Android, making world-class Polynesian dance instruction accessible to students globally.

**About the App**

Dance with Lorenzo offers a revolutionary approach to traditional dance education by combining in-person classes in Japan with online global sessions, all managed through an intuitive mobile platform. The app features:

- **Flexible Token System:** Pre-purchase token packages (4 tokens for ¥33,000) with 12-month validity, offering maximum scheduling flexibility
- **International Accessibility:** Online classes accessible worldwide with multi-timezone support
- **Seamless Booking:** One-tap class reservations with automatic reminders and QR code check-in
- **Expert Instruction:** Led by Lorenzo, a renowned Ori Tahiti instructor with over [X] years of experience
- **Bilingual Support:** Full English and Japanese language support

**Launch Promotion**

To celebrate the launch, Dance with Lorenzo is offering a special introductory price of ¥33,000 for 4 BMD tokens (regular price ¥45,000), available until March 15, 2026.

**About Lorenzo**

[Insert Lorenzo's bio: experience, certifications, notable performances, teaching philosophy]

**Availability**

The Dance with Lorenzo app is available for free download on the Apple App Store and Google Play Store. For more information, visit [dancewithlorenzotokyojapan.info] or contact [contact@onspace.ai].

**Media Contact:**
Lorenzo  
Dance with Lorenzo  
Email: contact@onspace.ai  
Website: dancewithlorenzotokyojapan.info

---

**Assets for Press:**
- [ ] Hi-res app icon (1024x1024px)
- [ ] Screenshots (5-8 images)
- [ ] Feature graphic (1024x500px)
- [ ] Lorenzo professional headshot
- [ ] Logo (PNG with transparent background)
- [ ] Demo video link (if available)

**Distribution List:**
- [ ] Tokyo dance magazines/blogs
- [ ] Polynesian culture websites
- [ ] App review sites (TechCrunch Japan, etc.)
- [ ] Local news outlets in Tokyo/Yokohama

---

### 5.3 Email Announcement (Existing Contacts)

**Subject:** 🎉 Dance with Lorenzo App is LIVE! Download Now & Save ¥12,000

**Body:**
```
Dear [Name],

I'm thrilled to announce that the Dance with Lorenzo mobile app is NOW LIVE! 🎉

After months of development, you can now:
✅ Book classes instantly from your phone
✅ Manage your tokens on-the-go
✅ Join online classes from anywhere in the world
✅ Check in with QR codes
✅ Get automatic reminders

🚨 LAUNCH SPECIAL 🚨
4 BMD Tokens: ¥33,000 (save ¥12,000!)
⏰ Offer expires March 15, 2026

📱 Download here:
[iOS App Store Link]
[Google Play Link]

See you on the dance floor!

Iaorana,
Lorenzo

---

P.S. Share this with your dancer friends and earn bonus tokens! 🎁
```

**Send to:**
- [ ] Existing student mailing list
- [ ] Trial class attendees
- [ ] Instagram followers (via DM campaign)
- [ ] Facebook group members

---

### 5.4 Website Update

- ⬜ **Homepage Banner**
  - [ ] "Download the App Now" banner with store badges
  - [ ] Link to app stores (iOS + Android)
  - [ ] Countdown timer for launch offer (expires March 15)

- ⬜ **Dedicated App Page**
  - [ ] URL: dancewithlorenzotokyojapan.info/app
  - [ ] Screenshots carousel
  - [ ] Feature highlights
  - [ ] Download buttons
  - [ ] FAQ section

---

## 6. Rollback & Emergency Response Plan

### 6.1 Rollback Triggers

**When to Rollback:**
- Critical payment system failure (>10% payment failures)
- Data corruption affecting user accounts
- Security vulnerability discovered
- App crashes on launch for >50% of users
- Backend unresponsive for >30 minutes

### 6.2 Rollback Procedure

#### Step 1: Pause New Signups (Immediate)
```sql
-- Disable signups in OnSpace Cloud Dashboard → Auth Settings
-- OR manually set flag in database
UPDATE auth.config SET enable_signup = false;
```

#### Step 2: Communication (Within 15 minutes)
- [ ] Post app status update: "We're experiencing technical issues. Working on a fix. Existing bookings are safe."
- [ ] Email all users: "Service temporarily paused for maintenance"
- [ ] Update social media status

#### Step 3: Identify Root Cause (Within 1 hour)
- [ ] Check OnSpace Cloud logs (Log tab)
- [ ] Check Stripe webhook logs
- [ ] Check Edge Function error rates
- [ ] Review recent code changes (GitHub commits)

#### Step 4: Database Rollback (If needed)
```bash
# Restore from latest backup
# Via OnSpace Cloud Dashboard → Data → Import CSV
# OR use SQL restore commands
```

#### Step 5: Edge Function Rollback (If needed)
- [ ] Revert to previous Edge Function version
- [ ] Redeploy stable version from Git tag
- [ ] Verify function invocations return 200 status

#### Step 6: Gradual Re-enable (Phased)
- [ ] Phase 1: Internal testing (admin users only)
- [ ] Phase 2: 10% of users (beta testers)
- [ ] Phase 3: 50% of users
- [ ] Phase 4: Full rollout

#### Step 7: Post-Mortem (Within 48 hours)
- [ ] Document what went wrong
- [ ] Identify prevention measures
- [ ] Update this checklist with lessons learned

### 6.3 Emergency Contacts

| Role | Name | Phone | Email | Availability |
|------|------|-------|-------|--------------|
| **Primary (Lorenzo)** | [YOUR NAME] | [PHONE] | [EMAIL] | 24/7 |
| **Technical Support** | OnSpace Support | - | contact@onspace.ai | 24/7 |
| **Payment Issues** | Stripe Support | - | Via Dashboard | 24/7 |
| **Email Issues** | Resend Support | - | Via Dashboard | Business hours |

### 6.4 Communication Templates

#### Template 1: Service Interruption
```
⚠️ SERVICE NOTICE

We're currently experiencing technical difficulties. Our team is working to resolve this ASAP.

✅ Your bookings and payments are safe
✅ All data is backed up
⏰ Estimated fix time: [TIME]

We'll update you every 30 minutes.

Thank you for your patience.
- Dance with Lorenzo Team
```

#### Template 2: Service Restored
```
✅ ALL SYSTEMS RESTORED

The app is back online and fully operational.

What happened: [BRIEF EXPLANATION]
What we fixed: [ACTION TAKEN]
Prevention: [MEASURES IMPLEMENTED]

Thank you for your patience and understanding.

If you experience any issues, please contact: contact@onspace.ai
```

---

## 7. Final Pre-Launch Checklist

**24 Hours Before Launch:**
- [ ] Complete full manual backup of database
- [ ] Test payment flow end-to-end (production Stripe)
- [ ] Send test push notification to all devices
- [ ] Verify all social media posts scheduled
- [ ] Review support email auto-reply
- [ ] Sleep well! 😴

**Launch Day (T-0):**
- [ ] 08:00 JST: Final system health check
- [ ] 09:00 JST: Enable app store listings
- [ ] 09:30 JST: Publish social media posts
- [ ] 10:00 JST: Send announcement email
- [ ] 10:30 JST: Monitor logs & metrics
- [ ] 12:00 JST: Check for user issues
- [ ] 18:00 JST: Daily summary report

**First 7 Days Post-Launch:**
- [ ] Daily log review (9 AM JST)
- [ ] Daily metrics tracking
- [ ] Daily support email check
- [ ] Respond to all support tickets within 24 hours
- [ ] Weekly analytics review meeting

---

## 8. Success Metrics (First 30 Days)

**Target KPIs:**
- 100+ app downloads
- 50+ user signups
- 20+ token package purchases
- 30+ class bookings
- <5% refund rate
- <1% app crash rate
- 95%+ positive user feedback

**Track in:**
- [ ] Google Sheets: Daily metrics spreadsheet
- [ ] OnSpace Cloud Dashboard: User growth, API usage
- [ ] Stripe Dashboard: Revenue, payment success rate

---

## ✅ Final Sign-Off

**Reviewed by:**
- [ ] Lorenzo (App Owner)
- [ ] [Developer Name] (Technical Lead)
- [ ] [Support Lead] (Customer Support)

**Approval Date:** __________________

**Launch Authorization:** __________________

---

**Good luck with your launch! 🎉🌺💃**
