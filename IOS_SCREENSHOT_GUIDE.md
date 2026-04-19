# iOS App Store Screenshot Guide
## Dance with Lorenzo - Required Screenshots

This guide explains how to capture actual screenshots from your app for the App Store listing.

---

## Required Resolutions

Apple requires screenshots for the following iPhone display sizes:

| Display Size | Resolution | Devices |
|-------------|-----------|---------|
| **6.7" (Primary)** | 1290 x 2796 | iPhone 15 Pro Max, 14 Pro Max, 13 Pro Max, 12 Pro Max |
| 6.5" | 1242 x 2688 | iPhone 11 Pro Max, XS Max |
| 5.5" | 1242 x 2208 | iPhone 8 Plus, 7 Plus, 6s Plus |

**Note:** You must provide at least 3-10 screenshots for 6.7" display. The other sizes can use the same screenshots (Apple will scale them).

---

## Method 1: Using iOS Simulator (Recommended)

### Step 1: Install Xcode
```bash
# Install Xcode from Mac App Store (free)
# Or download from https://developer.apple.com/xcode/
```

### Step 2: Run Your App in Simulator
```bash
# Build for iOS Simulator
eas build --platform ios --profile development

# Or run locally
npx expo run:ios
```

### Step 3: Select Correct Device
1. In Xcode Simulator, go to **File → Open Simulator**
2. Select **iPhone 15 Pro Max** (6.7" display)
3. Your app should launch automatically

### Step 4: Capture Screenshots
1. Navigate to each screen you want to capture:
   - Landing page (auth.tsx)
   - Dashboard ((tabs)/dashboard.tsx)
   - Classes ((tabs)/classes.tsx)
   - Tokens ((tabs)/tokens.tsx)
   - Check-in ((tabs)/checkin.tsx)

2. For each screen:
   - Press `Cmd + S` to save screenshot
   - Screenshots save to Desktop by default
   - File name includes device name and timestamp

### Step 5: Verify Resolution
```bash
# Check image dimensions (Mac)
sips -g pixelHeight -g pixelWidth ~/Desktop/screenshot-name.png

# Should show: 2796 x 1290 (or 1290 x 2796 depending on orientation)
```

---

## Method 2: Using Physical iPhone (Alternative)

### Step 1: Install TestFlight Build
1. Upload build to TestFlight (see APP_STORE_CONNECT_SETUP.md)
2. Install on your iPhone 15 Pro Max (or similar 6.7" device)

### Step 2: Capture Screenshots
1. Navigate to each screen
2. Press **Volume Up + Side Button** simultaneously
3. Screenshots save to Photos app

### Step 3: Transfer to Computer
1. Use AirDrop, iCloud Photos, or USB cable
2. Screenshots will be at exact device resolution (1290 x 2796)

---

## Recommended Screenshots (in Order)

### 1. Landing Page (auth.tsx)
**What to Show:**
- App logo and "Dance with Lorenzo" branding
- Beautiful Tahitian dance imagery
- "Sign Up" and "Log In" buttons
- Clean, professional first impression

**Tips:**
- Use light mode for better visibility
- Ensure all text is readable
- No personal data visible

---

### 2. Dashboard ((tabs)/dashboard.tsx)
**What to Show:**
- User stats (Classes Attended, Tokens, Attendance Rate)
- "Upcoming Classes" section with 2-3 classes
- Bottom navigation bar visible
- Active, engaged user profile

**Setup Before Screenshot:**
- Create test account with realistic data
- Add 2-3 upcoming classes
- Ensure token balance shows (e.g., 8 tokens)
- Set attendance rate to impressive number (e.g., 95%)

**Tips:**
- Use demo data, not real student info
- Show variety of class types
- Highlight the value proposition

---

### 3. Class Booking ((tabs)/classes.tsx)
**What to Show:**
- List of available workshops with photos
- Class details (title, location, date, price)
- Available spots indicator (e.g., "5/10 spots")
- "Book Now" buttons

**Setup Before Screenshot:**
- Create 3-4 visually appealing classes
- Use high-quality class photos
- Show variety (different dates, locations, prices)
- Display classes with available spots

**Tips:**
- Scroll to show best-looking classes
- Ensure prices are clearly visible (¥11,000-¥15,000)
- Show mix of workshop types

---

### 4. Token Purchase ((tabs)/tokens.tsx)
**What to Show:**
- Current token balance card
- Token package options
- "Become My Dancers" bundle highlighted
- Clear pricing and discount information

**Setup Before Screenshot:**
- Set test account balance to 8 tokens (realistic)
- Ensure bundle shows "Save ¥7,000" badge
- Display both single token and bundle options

**Tips:**
- Highlight the bundle deal visually
- Make pricing prominent and clear
- Show value proposition of bundles

---

### 5. QR Check-In ((tabs)/checkin.tsx)
**What to Show:**
- QR code scanner viewfinder
- Camera preview background
- Instructions "Scan class QR code to check in"
- Recent check-ins list below

**Setup Before Screenshot:**
- Grant camera permissions
- Position camera to show clean background
- Show 2-3 recent check-ins in history
- Display active scanning state

**Tips:**
- Use well-lit environment for camera preview
- Show professional, clean interface
- Include recent check-ins to demonstrate functionality

---

## Optional Bonus Screenshots

### 6. Boutique (boutique.tsx)
- Dance accessories catalog
- Product cards with photos
- Shopping cart functionality
- Shows revenue diversity

### 7. Music Store ((tabs)/music.tsx)
- Lorenzo's music tracks
- Play/preview functionality
- Professional music catalog
- Cultural authenticity

### 8. Admin Dashboard (admin.tsx)
- Analytics and insights
- Student management
- Revenue tracking
- Demonstrates platform power

---

## Screenshot Best Practices

### Do's ✅
- Use realistic demo data
- Show active, engaged usage
- Highlight unique features
- Use high-quality photos
- Ensure text is readable
- Show complete workflows
- Use consistent lighting

### Don'ts ❌
- Include real user data
- Show error messages
- Use placeholder/lorem ipsum text
- Leave empty states
- Show under-construction features
- Include test/debug UI
- Use low-quality images

---

## Image Optimization

### After Capturing Screenshots:

1. **Verify Resolution**
```bash
# Should be exactly 1290 x 2796 pixels
sips -g pixelHeight -g pixelWidth screenshot.png
```

2. **Optimize File Size** (Optional)
```bash
# Compress PNG without quality loss
pngquant screenshot.png --quality 80-95 --output screenshot-optimized.png
```

3. **Rename Files Descriptively**
```
screenshot-1-landing-6.7.png
screenshot-2-dashboard-6.7.png
screenshot-3-class-booking-6.7.png
screenshot-4-tokens-6.7.png
screenshot-5-checkin-6.7.png
```

---

## Creating Test Data for Screenshots

### Step 1: Create Demo Account
```typescript
// In your app's auth.tsx or database
Email: demo@dancewithlorenzo.com
Password: Demo2026!
```

### Step 2: Add Demo Classes
Use admin dashboard or database to create:
- "Become my Dancers" - tokyo - ¥11,000 - March 29, 2026
- "AHUROA Workshop" - online_global - ¥11,000 - April 5, 2026
- "Ote'a Basic" - online_global - ¥11,000 - April 12, 2026

### Step 3: Add Demo Tokens
```sql
-- In your database
INSERT INTO tokens (user_id, total_tokens, used_tokens, token_type)
VALUES ((SELECT id FROM user_profiles WHERE email = 'demo@dancewithlorenzo.com'), 12, 4, 'become_my_dancers');
```

### Step 4: Add Demo Bookings
Book 2-3 upcoming classes and check in to 10-12 past classes for realistic stats.

---

## Creating Screenshots for Other Resolutions

### For 6.5" Display (1242 x 2688):
1. Open iPhone 11 Pro Max simulator
2. Repeat screenshot process
3. Or resize 6.7" screenshots:
```bash
sips --resampleHeightWidth 2688 1242 screenshot-6.7.png --out screenshot-6.5.png
```

### For 5.5" Display (1242 x 2208):
1. Open iPhone 8 Plus simulator
2. Repeat screenshot process
3. Or resize 6.7" screenshots:
```bash
sips --resampleHeightWidth 2208 1242 screenshot-6.7.png --out screenshot-5.5.png
```

---

## Uploading to App Store Connect

### Step 1: Organize Files
```
app-store-screenshots/
├── 6.7-inch/
│   ├── 01-landing.png
│   ├── 02-dashboard.png
│   ├── 03-classes.png
│   ├── 04-tokens.png
│   └── 05-checkin.png
├── 6.5-inch/
│   └── (same 5 screenshots)
└── 5.5-inch/
    └── (same 5 screenshots)
```

### Step 2: Upload via App Store Connect
1. Go to your app version in App Store Connect
2. Scroll to **App Previews and Screenshots**
3. Select **6.7" Display**
4. Drag and drop all 5 screenshots
5. Arrange in order (1→5)
6. Repeat for 6.5" and 5.5" displays

---

## Troubleshooting

### Issue: Wrong Resolution
**Solution:** Ensure you're using the correct simulator/device size

### Issue: Status Bar Shows Test Data
**Solution:** Use Simulator's "Clean Status Bar" feature:
```bash
xcrun simctl status_bar booted override --time "9:41" --dataNetwork wifi --wifiBars 3 --cellularBars 4 --batteryLevel 100
```

### Issue: Screenshots Too Large for Upload
**Solution:** App Store Connect accepts up to 500MB per screenshot, but optimize anyway:
```bash
# Compress to ~2-5MB each
pngquant --quality 85-95 screenshot.png
```

### Issue: Simulator Doesn't Match Real Device
**Solution:** Always test on real device if possible, or use latest Xcode

---

## Quick Start Checklist

- [ ] Install Xcode and iOS Simulator
- [ ] Build app for iOS (`npx expo run:ios`)
- [ ] Open iPhone 15 Pro Max simulator
- [ ] Create demo account with test data
- [ ] Capture 5 required screenshots (Cmd + S)
- [ ] Verify resolution (1290 x 2796)
- [ ] Rename files descriptively
- [ ] Optimize file size if needed
- [ ] Upload to App Store Connect
- [ ] Arrange in proper order
- [ ] Preview on all device sizes

---

## Example Screenshot Captions (Optional)

Apple allows you to add captions under each screenshot:

1. **Landing:** "Join Tokyo's premier Tahitian dance community"
2. **Dashboard:** "Track your progress and upcoming workshops"
3. **Classes:** "Browse and book authentic Ori Tahiti classes"
4. **Tokens:** "Save with convenient token bundles"
5. **Check-In:** "Fast QR code check-in at every class"

---

## Resources

- **Apple Screenshot Guidelines:** https://developer.apple.com/app-store/product-page/
- **App Preview Specs:** https://help.apple.com/app-store-connect/#/dev4e413fcb8
- **iOS Simulator Guide:** https://developer.apple.com/documentation/xcode/running-your-app-in-simulator-or-on-a-device

---

**Need Help?**

If screenshots don't meet Apple's requirements during review, they'll provide specific feedback. Common issues:
- Wrong resolution
- Contains placeholder text
- Shows error states
- Includes personal information
- Not representative of actual app functionality

Contact: contact@onspace.ai for additional guidance.

---

**Your app is beautiful and functional - these screenshots will showcase it perfectly! 🎉**
