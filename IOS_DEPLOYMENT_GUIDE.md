# iOS Deployment Guide - Dance with Lorenzo

## Prerequisites Checklist

- [ ] **Apple Developer Account** ($99/year) - Sign up at https://developer.apple.com/programs/
- [ ] **Computer** (Mac, Windows, or Linux - EAS Build works on all)
- [ ] **Node.js installed** (check with `node --version`)
- [ ] **npm installed** (check with `npm --version`)

---

## Step 1: Export Your Project Code from OnSpace

### 1.1 Download Source Code

1. **In your OnSpace dashboard**, click the **"Code View"** button (top-right corner)
2. Click **"Download Source Code"** button
3. Save the ZIP file to your computer (e.g., `dance-with-lorenzo.zip`)
4. **Extract the ZIP file** to a folder (e.g., `~/Projects/dance-with-lorenzo/`)

### 1.2 Verify Files

Open a terminal/command prompt and navigate to your project folder:

```bash
cd ~/Projects/dance-with-lorenzo
```

Verify key files exist:

```bash
ls app.json
ls package.json
ls eas.json
```

✅ You should see all three files listed.

---

## Step 2: Install & Configure EAS CLI

### 2.1 Install EAS Command Line Interface

```bash
npm install -g eas-cli
```

**Verify installation:**

```bash
eas --version
```

You should see something like `eas-cli/5.x.x`

### 2.2 Login to Expo Account

**If you don't have an Expo account:**
1. Go to https://expo.dev/signup
2. Sign up for FREE (no credit card required)

**Login via terminal:**

```bash
eas login
```

Enter your Expo email and password when prompted.

### 2.3 Configure Your Project for iOS

**Update `eas.json`** (already created for you):

Open `eas.json` and update the `submit.production.ios` section:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-id@example.com",
      "ascAppId": "LEAVE_BLANK_FOR_NOW",
      "appleTeamId": "LEAVE_BLANK_FOR_NOW"
    }
  }
}
```

Replace `your-apple-id@example.com` with your actual Apple ID email.

### 2.4 Link Project to EAS

```bash
eas build:configure
```

When prompted:
- **"Which platforms would you like to configure?"** → Select **iOS** (use arrow keys + spacebar)
- Press **Enter**

✅ Your project is now linked to EAS Build!

---

## Step 3: Build iOS App (.ipa file)

### 3.1 Start iOS Build

```bash
eas build --platform ios --profile production
```

### 3.2 Answer Build Questions

EAS will ask you several questions. Here's what to answer:

**Q: "Generate a new Apple Distribution Certificate?"**
- **Answer:** `Yes` (press Enter)

**Q: "Generate a new Apple Provisioning Profile?"**
- **Answer:** `Yes` (press Enter)

**Q: "What would you like your iOS bundle identifier to be?"**
- **Answer:** `com.lorenzo.dancewithlorenzo` (or use your preferred identifier)

**Q: "Log in to your Apple account"**
- **Enter your Apple ID email** (the one with Developer Program enrollment)
- **Enter your Apple ID password**
- If you have 2FA enabled, enter the **6-digit code** from your iPhone/trusted device

**Q: "Select your Apple Team"**
- If you see multiple teams, select your **personal team** or **organization team**
- Press Enter

### 3.3 Wait for Build to Complete

EAS will now:
1. ✅ Upload your code to EAS servers
2. ✅ Configure iOS certificates and profiles
3. ✅ Build your iOS app (15-30 minutes)
4. ✅ Generate downloadable `.ipa` file

**You can:**
- Close the terminal (build continues in cloud)
- Check build status at: https://expo.dev/accounts/YOUR_USERNAME/projects/dance-with-lorenzo/builds
- You'll receive an **email** when build completes

### 3.4 Download Your iOS App (Optional)

Once build completes:

1. Go to https://expo.dev/accounts/YOUR_USERNAME/projects/dance-with-lorenzo/builds
2. Click on your latest iOS build
3. Click **"Download"** button to get the `.ipa` file

**What can you do with the .ipa?**
- Install on your iPhone via Xcode (requires Mac)
- Test via TestFlight before App Store release
- Nothing directly on iPhone without Mac/Xcode

⚠️ **For actual App Store submission, continue to Step 4** (no download needed)

---

## Step 4: Submit to Apple App Store

### 4.1 Create App in App Store Connect (One-Time Setup)

**Before submitting, create your app listing:**

1. Go to https://appstoreconnect.apple.com
2. Click **"My Apps"**
3. Click **"+"** button → **"New App"**
4. Fill in the form:
   - **Platform:** iOS
   - **Name:** Dance with Lorenzo
   - **Primary Language:** English (or Japanese)
   - **Bundle ID:** Select `com.lorenzo.dancewithlorenzo` (the one you created in Step 3)
   - **SKU:** `dance-lorenzo-001` (any unique identifier)
   - **User Access:** Full Access
5. Click **"Create"**

**Note down your App Store Connect App ID:**
- After creation, look at the URL: `https://appstoreconnect.apple.com/apps/1234567890/appstore`
- The number `1234567890` is your **ascAppId**

### 4.2 Update eas.json with App Store Info

Open `eas.json` and update:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-id@example.com",
      "ascAppId": "1234567890",  // ← Your App Store Connect App ID
      "appleTeamId": "YOUR_TEAM_ID"  // ← Get from developer.apple.com/account → Membership
    }
  }
}
```

### 4.3 Submit Build to App Store

```bash
eas submit --platform ios --profile production
```

EAS will:
1. ✅ Find your latest iOS build
2. ✅ Upload to App Store Connect
3. ✅ Submit for TestFlight processing (takes 5-10 minutes)

**You'll see:**

```
✔ Submitting to App Store Connect
✔ Uploaded to App Store Connect
✔ Submitted for processing
```

### 4.4 Complete App Store Listing

Once upload completes, go to https://appstoreconnect.apple.com:

1. **App Information:**
   - Privacy Policy URL: `https://dancewithlorenzotokyojapan.info/privacy-policy.html`
   - Category: **Health & Fitness**
   - Content Rights: Select appropriate option

2. **Pricing and Availability:**
   - Price: **Free**
   - Availability: **All countries** (or select specific regions)

3. **App Privacy:**
   - Click **"Get Started"**
   - Answer privacy questions (data collection, usage, etc.)
   - Dance with Lorenzo collects: Email, Name, Payment Info
   - Purpose: App functionality, Analytics, Product personalization

4. **Version Information (1.0):**
   - **Screenshots:** Upload 6.5" iPhone screenshots (required)
     - You can create these by:
       1. Download OnSpace app on iPhone
       2. Scan QR code to preview your app
       3. Take screenshots (Volume Up + Power button)
       4. Upload screenshots to App Store Connect
   - **Promotional Text:** "Learn Ori Tahiti dance from Lorenzo, a professional dancer with 10+ years of international experience"
   - **Description:** (Use the description from your project, emphasizing international classes, online workshops, etc.)
   - **Keywords:** `tahitian dance, ori tahiti, dance classes, lorenzo, polynesian dance, online dance, workshops`
   - **Support URL:** `https://dancewithlorenzotokyojapan.info`
   - **Marketing URL:** (Optional)

5. **Build:**
   - Click **"+ Build"** under "Build" section
   - Select the build you just uploaded via EAS
   - Click **"Done"**

6. **Age Rating:**
   - Complete questionnaire (likely **4+** for dance instruction)

7. **App Review Information:**
   - **First Name / Last Name:** Your name
   - **Phone Number:** Your contact number
   - **Email:** Your email
   - **Demo Account:** If your app requires login, provide test credentials:
     - Username: `test@example.com`
     - Password: `123456` (or create a test account specifically for Apple reviewers)
   - **Notes:** "Dance class booking app with integrated payment. Test account provided for review. No special hardware needed."

8. **Version Release:**
   - Select **"Manually release this version"** (recommended for first release)

### 4.5 Submit for Review

1. Click **"Add for Review"** (top-right)
2. Review all information
3. Click **"Submit to App Review"**

✅ **Congratulations! Your app is submitted!**

---

## Timeline & What to Expect

| Stage | Duration | Status Check |
|-------|----------|--------------|
| **Build (Step 3)** | 15-30 minutes | https://expo.dev/builds |
| **Upload to App Store (Step 4)** | 5-10 minutes | App Store Connect → Activity |
| **Processing** | 10-30 minutes | App Store Connect → TestFlight |
| **In Review** | 24-48 hours | App Store Connect → App Store → iOS App → Version |
| **Review Complete** | N/A | Email notification from Apple |
| **Published** | Instant (after manual release) | Live on App Store! 🎉 |

---

## Common Issues & Solutions

### ❌ "Authentication failed"
**Solution:** Make sure you're using the Apple ID enrolled in Apple Developer Program ($99/year). Free Apple IDs cannot submit to App Store.

### ❌ "Bundle identifier is not available"
**Solution:** In Step 3.2, choose a unique bundle ID like `com.yourname.dancewithlorenzo` or `com.lorenzo.tahitian.dance`

### ❌ "Missing compliance"
**After submission, Apple may ask about encryption:**
1. Go to App Store Connect → Your App → Version → App Store → Export Compliance
2. Select **"No"** (unless you implemented custom encryption beyond HTTPS)

### ❌ "Missing screenshots"
**Solution:** 
1. Download OnSpace app on iPhone
2. Scan preview QR code
3. Navigate through your app and take 6-8 screenshots
4. Upload at least 3 screenshots per device size in App Store Connect

### ❌ Build failed during Step 3
**Solution:**
- Check build logs at https://expo.dev/builds
- Most common issue: Invalid `app.json` configuration
- Fix errors and run `eas build --platform ios --profile production` again

---

## Testing Before Public Release

### Option 1: TestFlight (Recommended)

**Internal Testing (Instant):**
1. After build is processed in App Store Connect (10-30 min)
2. Go to App Store Connect → TestFlight → Internal Testing
3. Add testers (up to 100 people with App Store Connect access)
4. They receive TestFlight invitation email
5. Install TestFlight app from App Store
6. Install your app via TestFlight

**External Testing (Requires Apple Review - 24-48 hours):**
1. Go to App Store Connect → TestFlight → External Testing
2. Create External Group (can add up to 10,000 testers via email)
3. Add your app build to the group
4. Submit for Beta Review (similar to App Store review, but faster)
5. Once approved, external testers receive invitation emails

### Option 2: Direct Install (Requires Mac + Xcode)

If you have a Mac:
1. Download `.ipa` from EAS Build dashboard
2. Open Xcode
3. Window → Devices and Simulators
4. Connect your iPhone via USB
5. Drag `.ipa` file onto your iPhone in Devices list
6. App installs directly

---

## Need Help?

**EAS Build Documentation:**
- https://docs.expo.dev/build/introduction/

**App Store Connect Guide:**
- https://developer.apple.com/app-store-connect/

**Common App Rejection Reasons:**
- https://developer.apple.com/app-store/review/guidelines/

**Lorenzo's Support:**
- Email: contact@onspace.ai (for OnSpace platform issues)
- For app-specific issues: Review error messages in App Store Connect

---

## Quick Command Reference

```bash
# Export project (manual download from OnSpace dashboard)

# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build iOS app
eas build --platform ios --profile production

# Submit to App Store (after creating app in App Store Connect)
eas submit --platform ios --profile production

# Check build status
eas build:list

# View build logs
eas build:view BUILD_ID
```

---

**🎉 You're ready to launch Dance with Lorenzo on the App Store!**

Follow these 4 steps in order, and you'll have your app live within 3-7 days (including Apple's review time).

Good luck! 🍀
