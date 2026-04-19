# Dance with Lorenzo Tokyo - Price Testing Checklist

**Version:** 1.0  
**Last Updated:** 2026-03-03  
**Purpose:** Comprehensive QA testing guide for all payment flows before production launches

---

## Table of Contents

1. [Overview](#overview)
2. [Expected Pricing Tables](#expected-pricing-tables)
3. [Validation Rules](#validation-rules)
4. [Test Cases by Payment Type](#test-cases-by-payment-type)
5. [Edge Case Testing](#edge-case-testing)
6. [Verification Procedures](#verification-procedures)
7. [Pre-Production Checklist](#pre-production-checklist)

---

## Overview

### Payment Types

1. **Token Purchase** - Prepaid tokens for BMD classes
2. **Workshop Booking** - Pay-per-session with tiered pricing
3. **Workshop Bundles** - Prepaid credit packages with bulk discounts
4. **Seasonal Promotions** - Time-limited additional discounts on bundles
5. **Gift Cards** - Digital gift cards with bundle pricing
6. **Private Lessons** - Custom private instruction with per-participant pricing

### Currency

All prices are in **Japanese Yen (JPY)** with no decimal places.

### Critical Rules

- ✅ All prices must be positive integers
- ✅ JPY amounts in Stripe are entered as the integer value (¥33,000 = `33000`, NOT `3300000`)
- ✅ All Edge Functions include validation logging
- ✅ Prices must match expected values exactly
- ✅ Maximum discount across all promotions: 50%

---

## Expected Pricing Tables

### 1. Token Purchase

| Item | Quantity | Price (JPY) | Per Token |
|------|----------|-------------|-----------|
| BMD Token Package | 4 tokens | ¥33,000 | ¥8,250 |

### 2. Workshop Booking (Tiered Pricing)

| Participant Count | Price (JPY) | Tier |
|-------------------|-------------|------|
| 0-4 participants | ¥15,000 | Under 5 |
| 5+ participants | ¥12,000 | 5 Plus |

### 3. Workshop Bundles (Base Pricing)

| Bundle Type | Credits | Original Price | Discount % | Final Price | Savings |
|-------------|---------|----------------|------------|-------------|---------|
| 3-Pack | 3 | ¥45,000 | 10% | ¥40,500 | ¥4,500 |
| 5-Pack | 5 | ¥75,000 | 15% | ¥63,750 | ¥11,250 |
| 7-Pack | 7 | ¥105,000 | 20% | ¥84,000 | ¥21,000 |

**Calculation:** `Original = Credits × ¥15,000` → `Final = Original × (1 - Discount%)`

### 4. Seasonal Promotions (Example Scenarios)

| Base Bundle | Base Price | Seasonal Discount | Final Price | Total Discount | Total Savings |
|-------------|------------|-------------------|-------------|----------------|---------------|
| 3-Pack | ¥40,500 | +10% | ¥36,450 | 19% | ¥8,550 |
| 5-Pack | ¥63,750 | +15% | ¥54,188 | 28% | ¥20,812 |
| 7-Pack | ¥84,000 | +20% | ¥67,200 | 36% | ¥37,800 |

**Calculation:** `Seasonal Final = Base Price × (1 - Seasonal%)`

### 5. Gift Cards

Same pricing as Workshop Bundles (see table above).

### 6. Private Lessons

| Participants | Price (JPY) | Per Participant |
|--------------|-------------|-----------------|
| 1 | ¥40,000 | ¥40,000 |
| 2 | ¥80,000 | ¥40,000 |
| 3 | ¥120,000 | ¥40,000 |
| N | N × ¥40,000 | ¥40,000 |

**Calculation:** `Total = Participants × ¥40,000`

---

## Validation Rules

### Global Validation Rules

**Applied to ALL payment types:**

```javascript
// Rule 1: Price must be positive
price > 0

// Rule 2: Price must be an integer
Number.isInteger(price)

// Rule 3: Price must be less than ¥10,000,000 (sanity check)
price < 10000000

// Rule 4: No negative values anywhere
all_numeric_values >= 0
```

### Token Purchase Validation

```javascript
// Rule 1: Exact price match
price === 33000

// Rule 2: Prevent decimal errors
price < 1000000  // Catch ¥3,300,000 error

// Rule 3: Minimum price
price >= 10000
```

### Workshop Booking Validation

```javascript
// Rule 1: Must match one of two tiers
price === 15000 || price === 12000

// Rule 2: Tier logic correctness
if (participants < 5) { price === 15000 }
if (participants >= 5) { price === 12000 }

// Rule 3: Maximum workshop price
price <= 100000
```

### Workshop Bundle Validation

```javascript
// Rule 1: Base price must match expected
basePrices = { '3_pack': 40500, '5_pack': 63750, '7_pack': 84000 }
price === basePrices[bundle_type]

// Rule 2: With seasonal discount
finalPrice <= originalPrice
finalPrice >= originalPrice * 0.5  // Max 50% total discount

// Rule 3: Calculation verification
calculatedPrice = (credits × 15000) × (1 - baseDiscount%) × (1 - seasonalDiscount%)
Math.abs(price - calculatedPrice) < 10  // Allow ¥10 rounding tolerance
```

### Gift Card Validation

Same as Workshop Bundle Validation.

### Private Lesson Validation

```javascript
// Rule 1: Multiple of base rate
price % 40000 === 0

// Rule 2: Match participant count
price === participants × 40000

// Rule 3: Minimum participants
participants >= 1

// Rule 4: Maximum price sanity check
price <= 1000000  // Flag if >25 participants
```

---

## Test Cases by Payment Type

### Token Purchase Test Cases

#### TC-TOKEN-001: Standard Purchase
- **Setup:** Fresh user account
- **Action:** Purchase 4-token package
- **Expected:** 
  - Checkout shows ¥33,000
  - Stripe price shows ¥33,000 (NOT ¥3,300,000)
  - Payment success adds 4 tokens to account
- **Verification:** Check `tokens` table, verify `total_tokens = 4`

#### TC-TOKEN-002: Edge Function Logging
- **Setup:** Any user
- **Action:** Trigger token purchase
- **Expected:** Edge Function logs show:
  ```
  === TOKEN CHECKOUT PRICE VALIDATION ===
  Expected Price: 33000 JPY
  Actual Price: 33000 JPY
  ✅ Price validation PASSED
  ```
- **Verification:** Cloud Dashboard → Edge Functions → `create-token-checkout` logs

#### TC-TOKEN-003: Price Mismatch Detection
- **Setup:** Manually modify Edge Function (test environment only)
- **Action:** Set price to 330000
- **Expected:** Function throws error: "CRITICAL PRICE MISMATCH: Expected ¥33,000 but got ¥330,000"
- **Verification:** Error appears in logs, checkout session NOT created

---

### Workshop Booking Test Cases

#### TC-WORKSHOP-001: Tier 1 Pricing (<5 Participants)
- **Setup:** Class with 0-4 current participants
- **Action:** Book workshop
- **Expected:**
  - Price shows ¥15,000
  - Tier: "under_5"
  - Booking created with `payment_amount = 15000`
- **Verification:** Check `bookings` table

#### TC-WORKSHOP-002: Tier 2 Pricing (5+ Participants)
- **Setup:** Class with 5+ current participants
- **Action:** Book workshop
- **Expected:**
  - Price shows ¥12,000
  - Tier: "5_plus"
  - Booking created with `payment_amount = 12000`
- **Verification:** Check `bookings` table

#### TC-WORKSHOP-003: Tier Transition
- **Setup:** Class with exactly 4 participants
- **Action:** 
  1. Book as 5th participant
  2. Check price for 6th participant
- **Expected:**
  - 5th participant: ¥15,000 (still under 5 when booking starts)
  - 6th participant: ¥12,000 (now 5+ participants)
- **Verification:** Compare `payment_amount` in bookings

#### TC-WORKSHOP-004: Token vs Stripe Payment
- **Setup:** User with tokens available
- **Action:** Book using token (not Stripe)
- **Expected:**
  - No Stripe checkout created
  - Booking created with `payment_method = 'token'`, `payment_amount = 0`
  - `used_tokens` incremented by 1
- **Verification:** Check `tokens` and `bookings` tables

---

### Workshop Bundle Test Cases

#### TC-BUNDLE-001: 3-Pack Purchase (No Promotion)
- **Setup:** Regular user
- **Action:** Purchase 3-pack bundle
- **Expected:**
  - Price: ¥40,500
  - Credits: 3
  - Savings: ¥4,500
  - Discount: 10%
- **Verification:** `workshop_bundles` table shows correct values

#### TC-BUNDLE-002: 5-Pack Purchase (No Promotion)
- **Setup:** Regular user
- **Action:** Purchase 5-pack bundle
- **Expected:**
  - Price: ¥63,750
  - Credits: 5
  - Savings: ¥11,250
  - Discount: 15%
- **Verification:** `workshop_bundles` table shows correct values

#### TC-BUNDLE-003: 7-Pack Purchase (No Promotion)
- **Setup:** Regular user
- **Action:** Purchase 7-pack bundle
- **Expected:**
  - Price: ¥84,000
  - Credits: 7
  - Savings: ¥21,000
  - Discount: 20%
- **Verification:** `workshop_bundles` table shows correct values

#### TC-BUNDLE-004: Seasonal Promotion Applied
- **Setup:** 
  - Create active promotion: 15% off 5-pack
  - Promotion dates: valid, not expired
  - Max uses: not reached
- **Action:** Purchase 5-pack with promotion code
- **Expected:**
  - Base price: ¥63,750
  - Seasonal discount: 15% off ¥63,750 = ¥9,563 savings
  - Final price: ¥54,188 (rounded)
  - Total discount: ~28%
- **Verification:** 
  - Check Edge Function logs for both base and seasonal calculations
  - Check `seasonal_promotions.current_uses` incremented

#### TC-BUNDLE-005: Invalid Promotion Code
- **Setup:** User enters non-existent code
- **Action:** Purchase bundle with invalid code
- **Expected:**
  - No error thrown
  - Base bundle pricing applied (no seasonal discount)
  - Checkout proceeds normally
- **Verification:** Logs show "No valid promotion found"

#### TC-BUNDLE-006: Expired Promotion
- **Setup:** Create promotion with `end_date` in past
- **Action:** Attempt to use expired promotion code
- **Expected:**
  - Promotion not applied
  - Base pricing used
- **Verification:** Edge Function logs show promotion query returned no results

---

### Gift Card Test Cases

#### TC-GIFT-001: Standard Gift Card Purchase
- **Setup:** User A purchases gift card for User B
- **Action:** Purchase 5-pack gift card
- **Expected:**
  - Price: ¥63,750 (same as 5-pack bundle)
  - Unique redemption code generated (format: XXXX-XXXX-XXXX)
  - Email sent to recipient
  - `gift_cards` table record created
- **Verification:** Check gift card redemption code uniqueness

#### TC-GIFT-002: Gift Card Redemption
- **Setup:** Valid unredeemed gift card exists
- **Action:** Recipient redeems code
- **Expected:**
  - Credits added to recipient's `workshop_bundles`
  - Gift card marked `is_redeemed = true`
  - `redeemed_by` set to recipient user ID
  - `redeemed_at` timestamp populated
- **Verification:** Verify bundle credits match gift card credits

#### TC-GIFT-003: Duplicate Redemption Prevention
- **Setup:** Already-redeemed gift card
- **Action:** Attempt to redeem again
- **Expected:** Error: "Gift card already redeemed"
- **Verification:** Credits not duplicated

#### TC-GIFT-004: Expired Gift Card
- **Setup:** Gift card with `expires_at` in past
- **Action:** Attempt to redeem
- **Expected:** Error: "Gift card expired"
- **Verification:** No credits added

---

### Private Lesson Test Cases

#### TC-PRIVATE-001: Single Participant
- **Setup:** Request lesson for 1 participant
- **Action:** Admin approves, payment link generated
- **Expected:**
  - Price: ¥40,000
  - Payment link created
  - `payment_intent_id` saved
- **Verification:** Stripe shows ¥40,000 payment link

#### TC-PRIVATE-002: Multiple Participants
- **Setup:** Request lesson for 3 participants
- **Action:** Admin approves
- **Expected:**
  - Price: ¥120,000 (3 × ¥40,000)
  - Correct calculation logged
- **Verification:** Edge Function logs show `3 participants × ¥40,000 = ¥120,000`

#### TC-PRIVATE-003: Payment Completion
- **Setup:** Approved lesson with payment link
- **Action:** Student completes payment
- **Expected:**
  - Webhook updates `status = 'payment_completed'`
  - `paid_at` timestamp set
  - Email sent to student and admin
- **Verification:** Check `private_lessons` table, email logs

#### TC-PRIVATE-004: Rejection Workflow
- **Setup:** Pending lesson request
- **Action:** Admin rejects
- **Expected:**
  - Status: "rejected"
  - No payment link generated
  - Student notified
- **Verification:** No `payment_intent_id` in database

---

## Edge Case Testing

### Edge Cases: Zero/Negative Values

#### EC-ZERO-001: Zero Workshop Participants
- **Scenario:** Class with 0 participants (new class)
- **Expected Behavior:** 
  - Price: ¥15,000 (under 5 tier)
  - Validation passes
- **Test:** Create brand new class, attempt booking
- **Pass Criteria:** Booking succeeds at ¥15,000

#### EC-ZERO-002: Zero Tokens Remaining
- **Scenario:** User attempts token-based booking with 0 tokens
- **Expected Behavior:** Error: "No tokens remaining"
- **Test:** 
  1. User uses all tokens
  2. Attempt to book with token payment method
- **Pass Criteria:** Booking blocked, error message shown

#### EC-NEG-001: Negative Participant Count (Impossible UI)
- **Scenario:** API called with `participants = -1`
- **Expected Behavior:** Edge Function validation throws error
- **Test:** Direct API call with negative value
- **Pass Criteria:** Error: "INVALID PARTICIPANTS: Must have at least 1"

#### EC-NEG-002: Negative Bundle Credits (Impossible UI)
- **Scenario:** Attempt to transfer more credits than available
- **Expected Behavior:** Transaction blocked by database constraints
- **Test:** Try transferring 10 credits with only 5 remaining
- **Pass Criteria:** Error: "Insufficient credits"

---

### Edge Cases: Excessive Discounts

#### EC-DISC-001: >50% Total Discount
- **Scenario:** Stack seasonal promotion >30% on 7-pack (20% base)
- **Expected Behavior:** Edge Function validation throws error
- **Test:** 
  1. Create promotion with 35% discount on 7-pack
  2. Attempt purchase
- **Pass Criteria:** Error: "EXCESSIVE DISCOUNT: XX% exceeds maximum 50%"

#### EC-DISC-002: Free Bundle (100% Discount)
- **Scenario:** Promotion code with 100% discount
- **Expected Behavior:** Validation prevents price = ¥0
- **Test:** Create 100% discount promotion
- **Pass Criteria:** Error: "INVALID PRICE: Final price must be positive"

#### EC-DISC-003: Negative Final Price (Calculation Error)
- **Scenario:** Discount calculation bug results in negative price
- **Expected Behavior:** Multiple validations catch this
- **Test:** Simulate calculation error in Edge Function
- **Pass Criteria:** Error thrown before Stripe session creation

---

### Edge Cases: Decimal/Rounding Errors

#### EC-DEC-001: Yen Decimal Places
- **Scenario:** Price with decimals (e.g., ¥33,000.50)
- **Expected Behavior:** Stripe rejects non-integer JPY amounts
- **Test:** Manually set `unit_amount: 33000.5` in Edge Function
- **Pass Criteria:** Stripe API returns validation error

#### EC-DEC-002: 100x Price Error (Historical Bug)
- **Scenario:** Price entered as 3,300,000 instead of 33,000
- **Expected Behavior:** Validation catches suspicious price
- **Test:** Set token price to 3300000
- **Pass Criteria:** Error: "SUSPICIOUS PRICE: exceeds ¥1,000,000"

#### EC-DEC-003: Rounding Tolerance
- **Scenario:** Seasonal discount calculation results in ¥54,187.5
- **Expected Behavior:** Rounded to ¥54,188, ¥10 tolerance check passes
- **Test:** 5-pack (¥63,750) with 15% seasonal = ¥54,187.50
- **Pass Criteria:** 
  - Stripe receives ¥54,188
  - Validation allows ±¥10 variance
  - No error thrown

---

### Edge Cases: Concurrency

#### EC-CONC-001: Simultaneous Workshop Bookings
- **Scenario:** 2 users book last spot in class simultaneously
- **Expected Behavior:** One succeeds, one gets "Class full" error
- **Test:** 
  1. Class with `max_participants = 10`, `current_participants = 9`
  2. Two users click "Book" at same time
- **Pass Criteria:** 
  - Only 1 booking succeeds
  - `current_participants` = 10 (not 11)

#### EC-CONC-002: Gift Card Code Collision
- **Scenario:** Two gift cards generated simultaneously get same code
- **Expected Behavior:** Edge Function re-generates code until unique
- **Test:** Review code generation logic with uniqueness check
- **Pass Criteria:** 
  - `redemption_code` has UNIQUE constraint in database
  - Edge Function retries up to 5 times

---

### Edge Cases: Time/Date

#### EC-TIME-001: Expired Promotion Cutoff
- **Scenario:** Purchase at exact `end_date` timestamp
- **Expected Behavior:** Promotion active if `now() <= end_date`
- **Test:** 
  1. Set promotion `end_date = 2026-03-03 23:59:59`
  2. Attempt purchase at 2026-03-03 23:59:58
  3. Attempt purchase at 2026-03-04 00:00:00
- **Pass Criteria:** 
  - First attempt: promotion applied
  - Second attempt: promotion not applied

#### EC-TIME-002: Gift Card Expiration
- **Scenario:** Redeem gift card on expiration date
- **Expected Behavior:** Valid if `now() <= expires_at`
- **Test:** Redeem on exact expiration day
- **Pass Criteria:** Redemption succeeds if within expiration date

---

## Verification Procedures

### Pre-Test Setup

**1. Environment Configuration**
```bash
✓ Stripe test mode enabled
✓ Test API keys configured in Edge Functions
✓ Database in test mode (or use separate test database)
✓ Email service configured (Resend test mode)
```

**2. Test Data Preparation**
```bash
✓ Create test user accounts (student, admin)
✓ Create test workshop classes
✓ Create test seasonal promotions (active, expired, max uses reached)
✓ Create test gift cards (unredeemed, redeemed, expired)
```

**3. Access Requirements**
```bash
✓ Cloud Dashboard access
✓ Stripe Dashboard access
✓ Email inbox access (for receipt verification)
✓ Mobile device for real payment testing
```

---

### Step-by-Step Verification Procedure

#### Procedure A: Token Purchase Verification

**Step 1: Pre-Purchase Checks**
```
1. Log in to Cloud Dashboard → Data → tokens
2. Note current `total_tokens` for test user
3. Open mobile app, navigate to Buy Tokens tab
4. Verify displayed price: ¥33,000
```

**Step 2: Execute Purchase**
```
5. Click "Purchase 4 Tokens"
6. Verify Stripe checkout page:
   - Product: "BMD Token Package (4 Tokens)"
   - Amount: ¥33,000 (NOT ¥3,300,000)
7. Enter test card: 4242 4242 4242 4242
8. Complete payment
```

**Step 3: Post-Purchase Verification**
```
9. Wait 10 seconds for webhook processing
10. Refresh tokens table in Cloud Dashboard
11. Verify: total_tokens increased by 4
12. Check email inbox for receipt
13. Verify receipt shows:
    - Amount: ¥33,000
    - Product: 4 BMD Tokens
    - Transaction ID present
```

**Step 4: Edge Function Log Review**
```
14. Cloud Dashboard → Edge Functions → create-token-checkout
15. Find latest invocation log
16. Verify log contains:
    === TOKEN CHECKOUT PRICE VALIDATION ===
    Expected Price: 33000 JPY
    Actual Price: 33000 JPY
    ✅ Price validation PASSED
17. Check stripe-webhook logs
18. Verify webhook processed successfully
```

**Pass Criteria:**
- ✓ Stripe shows ¥33,000 (exact)
- ✓ Database updated correctly
- ✓ Email received within 30 seconds
- ✓ No errors in Edge Function logs

---

#### Procedure B: Workshop Tiered Pricing Verification

**Step 1: Test Tier 1 (<5 Participants)**
```
1. Create test class with 0 current participants
2. Navigate to Classes tab → Select class
3. Verify displayed price: ¥15,000
4. Click "Book Workshop"
5. Verify Stripe checkout shows ¥15,000
6. Complete payment with test card
```

**Step 2: Test Tier 2 (5+ Participants)**
```
7. Manually update class `current_participants = 5` in database
8. Navigate to same class (as different user)
9. Verify displayed price: ¥12,000
10. Click "Book Workshop"
11. Verify Stripe checkout shows ¥12,000
12. Complete payment
```

**Step 3: Verify Bookings**
```
13. Cloud Dashboard → Data → bookings
14. Find both test bookings
15. Verify first booking: payment_amount = 15000
16. Verify second booking: payment_amount = 12000
```

**Step 4: Edge Function Validation**
```
17. Edge Functions → create-workshop-checkout logs
18. Verify tier logic logged correctly:
    Current Participants: 0
    Price Tier: <5 people
    Expected Price: 15000 JPY
    ✅ Price validation PASSED
```

**Pass Criteria:**
- ✓ Tier 1 price exactly ¥15,000
- ✓ Tier 2 price exactly ¥12,000
- ✓ Booking records match prices
- ✓ Edge Function logs show correct tier logic

---

#### Procedure C: Bundle with Seasonal Promotion Verification

**Step 1: Create Test Promotion**
```
1. Cloud Dashboard → Data → seasonal_promotions
2. Insert new promotion:
   - name: "Test 20% Off"
   - promotion_code: "TEST20"
   - bundle_type: "5_pack"
   - discount_percent: 20
   - start_date: [today]
   - end_date: [tomorrow]
   - is_active: true
   - max_uses: 10
```

**Step 2: Purchase Without Promotion**
```
3. App → Workshop Bundles tab
4. Select 5-pack
5. Leave promotion code blank
6. Verify price: ¥63,750 (base price)
7. Note: "Save ¥11,250 (15%)"
8. (Don't complete purchase yet)
```

**Step 3: Purchase With Promotion**
```
9. Return to bundle selection
10. Enter promotion code: "TEST20"
11. Click "Apply Code"
12. Verify updated price calculation:
    - Original: ¥75,000
    - Base discount (15%): -¥11,250 → ¥63,750
    - Seasonal (20%): -¥12,750 → ¥51,000
    - Total savings: ¥24,000
13. Complete purchase
```

**Step 4: Verify Promotion Usage**
```
14. Cloud Dashboard → seasonal_promotions table
15. Find "TEST20" record
16. Verify current_uses incremented by 1
```

**Step 5: Edge Function Log Analysis**
```
17. Edge Functions → create-workshop-bundle-checkout logs
18. Verify logs show both validation stages:
    === BASE PRICE VALIDATION ===
    Expected Final (before seasonal): 63750 JPY
    ✅ Base price validation PASSED
    
    === FINAL PRICE VALIDATION ===
    Seasonal Discount: 20%
    Final Price: 51000 JPY
    ✅ Final price validation PASSED
```

**Step 6: Verify Maximum Discount Rule**
```
19. Create extreme promotion: 50% off
20. Attempt to purchase 7-pack (20% base) with 50% seasonal
21. Expected: Error thrown (would be 60% total)
22. Verify error: "EXCESSIVE DISCOUNT: XX% exceeds maximum 50%"
```

**Pass Criteria:**
- ✓ Base pricing correct without promotion
- ✓ Stacked discounts calculate correctly
- ✓ Promotion usage tracked
- ✓ Maximum discount rule enforced
- ✓ Both validation stages logged

---

#### Procedure D: Private Lesson Price Scaling Verification

**Step 1: Test Multiple Participant Counts**
```
1. Request private lesson for 1 participant
2. Admin approves → Payment link generated
3. Verify Stripe payment link: ¥40,000

4. Request private lesson for 2 participants
5. Admin approves → Payment link generated
6. Verify Stripe payment link: ¥80,000

7. Request private lesson for 5 participants
8. Admin approves → Payment link generated
9. Verify Stripe payment link: ¥200,000
```

**Step 2: Edge Function Validation Review**
```
10. Edge Functions → create-private-lesson-payment logs
11. For 1-participant lesson, verify:
    Number of Participants: 1
    Expected Total: 40000 JPY
    Actual Total: 40000 JPY
    ✅ Price validation PASSED

12. For 5-participant lesson, verify:
    Number of Participants: 5
    Expected Total: 200000 JPY
    Actual Total: 200000 JPY
    ✅ Price validation PASSED
```

**Step 3: Test Formula Validation**
```
13. Manually modify database: set lesson total_price = 85000 (not multiple of 40000)
14. Admin attempts to approve
15. Expected error: "CALCULATION ERROR: Total ¥85,000 is not a multiple of ¥40,000"
16. Verify payment link NOT created
```

**Pass Criteria:**
- ✓ 1 participant = ¥40,000
- ✓ 2 participants = ¥80,000
- ✓ 5 participants = ¥200,000
- ✓ Formula validation catches incorrect multiples
- ✓ Edge Function blocks invalid prices

---

### Log Analysis Checklist

After each test, verify Edge Function logs contain:

**✓ Token Purchase Logs**
```
✓ "=== TOKEN CHECKOUT PRICE VALIDATION ==="
✓ "Expected Price: 33000 JPY"
✓ "Actual Price: 33000 JPY"
✓ "✅ Price validation PASSED"
✓ "Created token checkout session: [session_id]"
```

**✓ Workshop Booking Logs**
```
✓ "=== WORKSHOP CHECKOUT PRICE VALIDATION ==="
✓ "Current Participants: [count]"
✓ "Price Tier: [tier]"
✓ "Expected Price: [amount] JPY"
✓ "✅ Price validation PASSED"
✓ "Created pending booking: [booking_id]"
```

**✓ Bundle Purchase Logs**
```
✓ "=== BUNDLE CHECKOUT BASE PRICE VALIDATION ==="
✓ "Expected Original: [amount] JPY"
✓ "Expected Final (before seasonal): [amount] JPY"
✓ "✅ Base price validation PASSED"
✓ "=== FINAL PRICE VALIDATION ==="
✓ "Seasonal Discount: [percent]%"
✓ "Final Price: [amount] JPY"
✓ "✅ Final price validation PASSED"
```

**✓ Private Lesson Logs**
```
✓ "=== PRIVATE LESSON PAYMENT PRICE VALIDATION ==="
✓ "Number of Participants: [count]"
✓ "Expected Total: [amount] JPY"
✓ "✅ Price validation PASSED"
✓ "Created Stripe price: [price_id]"
✓ "Created payment link: [url]"
```

**✓ Webhook Logs**
```
✓ "Received webhook: checkout.session.completed"
✓ "Product type: [type]"
✓ "Processing payment for user: [user_id]"
✓ "Email sent successfully to [email]"
```

---

## Pre-Production Checklist

### Phase 1: Pricing Configuration Review

```
□ All expected prices documented and approved
□ Token price verified: ¥33,000 for 4 tokens
□ Workshop tiers verified: ¥15,000 / ¥12,000
□ Bundle pricing verified: ¥40,500 / ¥63,750 / ¥84,000
□ Private lesson rate verified: ¥40,000 per participant
□ Seasonal promotions reviewed and tested
```

### Phase 2: Edge Function Validation

```
□ All 5 payment Edge Functions deployed
□ Validation logging enabled in all functions
□ Price validation rules match this document
□ Maximum discount (50%) enforced
□ Suspicious price checks (>¥1M) in place
□ Error messages clear and actionable
```

### Phase 3: Test Execution

```
□ TC-TOKEN-001 to TC-TOKEN-003 passed
□ TC-WORKSHOP-001 to TC-WORKSHOP-004 passed
□ TC-BUNDLE-001 to TC-BUNDLE-006 passed
□ TC-GIFT-001 to TC-GIFT-004 passed
□ TC-PRIVATE-001 to TC-PRIVATE-004 passed
□ All edge cases (EC-*) tested
□ Concurrency tests passed
□ Time/date edge cases verified
```

### Phase 4: Integration Verification

```
□ Stripe webhook configured and tested
□ Email receipts delivered for all payment types
□ Push notifications sent for booking confirmations
□ Database updates confirmed (tokens, bookings, bundles, etc.)
□ QR codes generated correctly for workshop bookings
□ Admin dashboard shows revenue correctly
```

### Phase 5: Documentation & Training

```
□ This checklist shared with QA team
□ Lorenzo trained on admin approval workflows
□ Customer support briefed on pricing structure
□ Refund policy documented (if applicable)
□ Edge Function logs monitoring set up
```

### Phase 6: Production Readiness

```
□ Stripe LIVE mode configured
□ Production API keys rotated
□ Test transactions cleared from database
□ Email templates reviewed (Japanese + English)
□ Legal review completed (Terms of Service, Privacy Policy)
□ Analytics tracking enabled (revenue, conversion rates)
```

### Phase 7: Go-Live Verification

**Within 24 Hours of Launch:**
```
□ Monitor first 10 real transactions
□ Verify Edge Function logs show no errors
□ Check all email receipts delivered
□ Confirm webhook processing <5 seconds
□ Review Stripe Dashboard for any anomalies
□ Verify no pricing errors reported by users
```

**Within 7 Days of Launch:**
```
□ Review all transaction logs
□ Analyze pricing accuracy (compare expected vs actual)
□ Check for any validation failures
□ Gather user feedback on payment flows
□ Document any issues encountered
□ Update this checklist if gaps found
```

---

## Appendix: Quick Reference

### Stripe Test Cards

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient Funds: 4000 0000 0000 9995
```

### Edge Function URLs

```
create-token-checkout
create-workshop-checkout
create-workshop-bundle-checkout
create-gift-card-checkout
create-private-lesson-payment
stripe-webhook
```

### Database Tables

```
tokens - User token balances
classes - Workshop schedules
bookings - Class reservations
workshop_bundles - Prepaid credit packages
seasonal_promotions - Time-limited discounts
gift_cards - Digital gift card records
private_lessons - Custom lesson requests
```

### Key Formulas

```
Token: ¥33,000 for 4
Workshop: ¥15,000 (<5) | ¥12,000 (5+)
3-Pack: ¥45,000 × 0.9 = ¥40,500
5-Pack: ¥75,000 × 0.85 = ¥63,750
7-Pack: ¥105,000 × 0.8 = ¥84,000
Private: Participants × ¥40,000
```

---

**End of Checklist**

*This document should be reviewed and updated after each production deployment or pricing change.*
