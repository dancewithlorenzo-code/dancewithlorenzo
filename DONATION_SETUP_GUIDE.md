# Donation Feature Setup Guide
## Dance with Lorenzo - Stripe Payment Link Configuration

---

## 📋 Overview

The donation feature allows fans who don't take classes to support your Ori Tahiti community through one-time contributions. The implementation uses **Stripe Payment Links** for simplicity and security.

---

## 🎯 How It Works

### User Flow
1. User opens app → Dashboard → "Support Our Community" banner
2. Taps banner → Beautiful donation page with hero image
3. Selects amount (¥1,000 / ¥3,000 / ¥5,000 / ¥10,000) or enters custom amount
4. Taps "Donate Now" → Opens Stripe Payment Link in browser
5. Completes payment on Stripe's secure checkout page
6. Receives email receipt from Stripe automatically

### Technical Flow
- **No Edge Function needed** - Stripe handles everything
- **No webhook required** - Donations tracked in Stripe Dashboard
- **No database changes** - Donations are separate from class bookings
- **Mobile-friendly** - Opens in device browser seamlessly

---

## 🔧 Setup Instructions

### Step 1: Create Donation Product in Stripe Dashboard

1. **Go to Stripe Dashboard**
   - Open [https://dashboard.stripe.com/products](https://dashboard.stripe.com/products)
   - Make sure you're in **LIVE mode** (toggle at top)

2. **Create New Product**
   - Click **"+ Add product"**
   - Product name: `Community Donation`
   - Description: `Support Dance with Lorenzo Ori Tahiti Tokyo community`
   - Upload image: Use `assets/images/donation-hero.png` from the app
   - Pricing model: **One-time**
   - Price: **Customer chooses price** (enable this option)
   - Currency: **JPY**
   - Minimum amount: ¥100 (recommended)
   - Suggested amounts: Add ¥1,000, ¥3,000, ¥5,000, ¥10,000
   - Click **"Save product"**

### Step 2: Create Payment Link

1. **From the product page, click "Create payment link"**
   
2. **Configure Payment Link Settings:**
   - **Quantity:** Fixed at 1 (donations are single items)
   - **Customer information:**
     - ✅ Collect customer name
     - ✅ Collect customer email (for receipt)
     - ⬜ Collect billing address (optional)
     - ⬜ Collect shipping address (not needed)
   
   - **After payment:**
     - Success page: **Use Stripe's default success page** OR
     - Custom redirect: `https://dancewithlonrenzo.com/donation-success` (if you create one)
   
   - **Payment methods:**
     - ✅ Card
     - ✅ Google Pay
     - ✅ Apple Pay
     - ⬜ Other methods (optional)

3. **Click "Create link"**

4. **Copy the Payment Link URL**
   - It will look like: `https://buy.stripe.com/live_XXXXXXXXXXXXX`
   - **Save this URL** - you'll need it in the next step!

### Step 3: Update App Code

1. **Open `app/donate.tsx` in your code editor**

2. **Find this line (around line 35):**
   ```typescript
   const stripePaymentLink = 'https://your-stripe-payment-link-here';
   ```

3. **Replace with your actual Payment Link:**
   ```typescript
   const stripePaymentLink = 'https://buy.stripe.com/live_XXXXXXXXXXXXX';
   ```
   (Paste the URL you copied in Step 2)

4. **Save the file**

5. **Test the donation flow:**
   - Open app → Dashboard → "Support Our Community"
   - Select amount → Tap "Donate Now"
   - Should open Stripe checkout page in browser
   - Complete test donation
   - Verify receipt email arrives

---

## 💰 Tracking Donations

### In Stripe Dashboard

**View All Donations:**
1. Go to [Stripe Dashboard → Payments](https://dashboard.stripe.com/payments)
2. Filter by product: "Community Donation"
3. See all donation amounts, dates, customer info

**Export Donation Report:**
1. Go to Payments tab
2. Click "Export" button
3. Select date range
4. Download CSV with all donation data

**Revenue Analytics:**
1. Go to [Stripe Dashboard → Reports](https://dashboard.stripe.com/reports)
2. See donation revenue alongside class payments
3. Track monthly/yearly donation trends

---

## 🎨 Customization Options

### Change Suggested Amounts

Edit `app/donate.tsx` around line 12:

```typescript
const DONATION_AMOUNTS = [
  { amount: 500, label: '¥500' },    // Add smaller option
  { amount: 1000, label: '¥1,000' },
  { amount: 5000, label: '¥5,000' },
  { amount: 20000, label: '¥20,000' }, // Add larger option
];
```

### Update Mission Statement

Edit `app/donate.tsx` around lines 77-85 for English text and Japanese translation.

### Change Hero Image

Replace `assets/images/donation-hero.png` with your own image:
- Recommended size: 1080 x 1920 (9:16 ratio for mobile)
- Format: PNG or JPEG
- Content: Community photos, dance performances, cultural events

---

## 📧 Email Receipts

**Stripe automatically sends receipts** to donors with:
- ✅ Donation amount
- ✅ Transaction date
- ✅ Receipt number
- ✅ Your business name (Dance with Lorenzo)
- ✅ Your contact email

**To customize email receipts:**
1. Go to [Stripe Dashboard → Settings → Emails](https://dashboard.stripe.com/settings/emails)
2. Enable "Successful payments"
3. Customize receipt template (optional)
4. Add logo and brand colors

---

## 🔒 Security & Compliance

**Built-in Security:**
- ✅ PCI DSS compliant (Stripe handles card data)
- ✅ 3D Secure authentication for fraud prevention
- ✅ Encrypted payment processing
- ✅ No sensitive data stored in your app

**Tax & Legal:**
- Stripe provides detailed transaction records for accounting
- You can download annual tax reports from Stripe Dashboard
- Consider consulting accountant for donation tax treatment in Japan

---

## 🌐 Multi-Language Support

The donation page already supports:
- **English** - Default for international supporters
- **Japanese** - Automatic based on user's language setting

All text dynamically changes based on user preference.

---

## 📊 Success Metrics

**Track These KPIs:**
- Total donation revenue (monthly/yearly)
- Average donation amount
- Number of unique donors
- Donation growth rate
- Donor retention (repeat donations)

**Find in Stripe Dashboard:**
- Revenue → Home → Filter by "Community Donation" product

---

## ❓ Troubleshooting

### Issue: Payment link doesn't open
**Solution:** 
- Check URL format in `app/donate.tsx`
- Ensure URL starts with `https://buy.stripe.com/`
- Test URL by pasting in browser

### Issue: Donations not showing in Dashboard
**Solution:**
- Verify you're in LIVE mode in Stripe (not test mode)
- Check product name matches "Community Donation"
- Wait 1-2 minutes for Stripe to process

### Issue: Users getting error after payment
**Solution:**
- Set custom success URL in Payment Link settings
- Or use Stripe's default success page

### Issue: Minimum amount not working
**Solution:**
- Check Stripe product settings → Price → Minimum amount
- Verify app validation (line 30 in `app/donate.tsx`)

---

## 🚀 Launch Checklist

- [ ] Created "Community Donation" product in Stripe LIVE mode
- [ ] Created Payment Link with correct settings
- [ ] Copied Payment Link URL
- [ ] Updated `app/donate.tsx` with actual URL (replaced placeholder)
- [ ] Tested donation flow with real payment
- [ ] Verified email receipt received
- [ ] Checked donation appears in Stripe Dashboard
- [ ] Reviewed Stripe email receipt settings
- [ ] Set up revenue tracking/reporting
- [ ] Announced donation feature to community

---

## 💡 Marketing Ideas

**Promote Your Donation Feature:**

1. **In-App:**
   - Dashboard banner (already implemented ✅)
   - Profile section link
   - After class completion message

2. **Social Media:**
   - Instagram Story: "Support our dance family! 🌺"
   - Facebook post with donation page screenshot
   - Share impact stories from donations

3. **Email:**
   - Monthly newsletter with donation link
   - Thank you emails to donors
   - Annual impact report

4. **Events:**
   - Display QR code at performances
   - Mention donation option at workshops
   - Share during community gatherings

---

## 📞 Support

**For Stripe Issues:**
- Stripe Support: [https://support.stripe.com/](https://support.stripe.com/)
- Documentation: [https://stripe.com/docs/payment-links](https://stripe.com/docs/payment-links)

**For App Issues:**
- Contact: contact@dancewithlonrenzo.com

---

**Ready to accept donations! 🎉**

Your fans can now support the Ori Tahiti community even when they're not taking classes.
