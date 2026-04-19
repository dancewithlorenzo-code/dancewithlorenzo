# App Preview Video Guide
## Dance with Lorenzo - 30-Second Promotional Video

Create a compelling App Preview video that showcases the complete user journey and increases App Store conversion rates by up to 30%.

---

## Video Requirements (Apple Specifications)

### Technical Specifications

| Specification | Requirement |
|--------------|-------------|
| **Duration** | 15-30 seconds (recommended: 30 seconds) |
| **File Format** | .mov, .m4v, or .mp4 |
| **Resolution** | 1920x1080 (landscape) or 1080x1920 (portrait) |
| **Frame Rate** | 25-30 fps |
| **Codec** | H.264 or HEVC (H.265) |
| **Max File Size** | 500 MB |
| **Audio** | Optional but recommended (music/voiceover) |

**Recommended:** Portrait orientation (1080x1920) to match mobile app experience

---

## 30-Second Storyboard

### Scene Breakdown (Complete User Journey)

| Time | Scene | What to Show | Duration |
|------|-------|--------------|----------|
| **0:00-0:05** | **Opening + Sign Up** | App logo animation → Landing page → Quick tap "Sign Up" → Email field pre-filled → OTP verification → Dashboard appears | 5 sec |
| **0:05-0:12** | **Browse Classes** | Tap "Classes" tab → Scroll through beautiful class cards with photos → Highlight "Become my Dancers" workshop with details visible | 7 sec |
| **0:12-0:18** | **Book with Tokens** | Tap "Book Now" → Token balance shows (8 tokens) → Confirm booking → Success animation | 6 sec |
| **0:18-0:25** | **QR Check-In** | Tap "Check-in" tab → Camera opens → Scan QR code (mock or real) → Success check-in animation → Confetti effect | 7 sec |
| **0:25-0:30** | **Closing** | Return to dashboard showing updated stats → "Dance with Lorenzo" logo + tagline: "Join Tokyo's Dance Community" | 5 sec |

---

## Detailed Shot List

### Shot 1: Opening + Sign Up (0:00-0:05)
**Visual:**
- App icon fades in with subtle animation
- Landing page appears showing hero image (Tahitian dancer)
- Finger tap "Sign Up" button
- Email field auto-fills: demo@dancewithlorenzo.com
- 4-digit OTP appears (animated typing: 1-2-3-4)
- Smooth transition to dashboard

**Pro Tip:** Use fast transitions (0.3-0.5 seconds) to keep energy high

---

### Shot 2: Browse Classes (0:05-0:12)
**Visual:**
- Tap "Classes" tab in bottom navigation
- Smooth scroll through 3-4 class cards:
  - "Become my Dancers" with photo
  - "AHUROA Workshop" with photo  
  - "Ote'a Basic" with photo
- Pause on "Become my Dancers" showing:
  - Class photo (full width)
  - Title in bold
  - Location: Tokyo
  - Date: March 29, 2026
  - Price: ¥11,000/person
  - Available spots: 5/10

**Camera Work:** Slow, smooth scroll with slight deceleration at featured class

---

### Shot 3: Book with Tokens (0:12-0:18)
**Visual:**
- Tap "Book Now" button on featured class
- Modal/sheet slides up showing:
  - Class summary
  - Token balance: 8 tokens (highlighted)
  - Payment method: "Use 1 Token" (pre-selected)
- Tap "Confirm Booking"
- Success animation:
  - Checkmark appears
  - Confetti/celebration effect
  - "Booking Confirmed!" message
  - Email receipt sent notification

**Animation:** Use built-in success animations from the app

---

### Shot 4: QR Check-In at Studio (0:18-0:25)
**Visual:**
- Navigate to "Check-in" tab
- Camera viewfinder opens with QR code scanning interface
- QR code appears in frame (can be pre-made test QR code)
- Scanning animation (blue outline pulsing around QR code)
- **Success moment:**
  - Green checkmark animation
  - "Check-in Successful!" message
  - Attendance updated
  - Small celebration confetti

**Background:** Show real dance studio environment if possible, or clean white/branded background

**Pro Tip:** This is the emotional climax - make the success animation satisfying!

---

### Shot 5: Closing (0:25-0:30)
**Visual:**
- Return to dashboard showing updated stats:
  - Classes Attended: 11 → 12 (animated count-up)
  - Tokens: 8 → 7 (animated count-down)
  - Attendance Rate: 95%
- Smooth zoom out to full dashboard view
- Final frame:
  - App logo centered
  - Tagline: "Dance with Lorenzo"
  - Subtitle: "Join Tokyo's Dance Community"
  - Download indicator (App Store badge)

**Background Music:** Fade out gently

---

## Recording Methods

### Method 1: iOS Screen Recording (Recommended)

**Built-in iPhone Screen Recorder:**

1. **Enable Screen Recording:**
   - Settings → Control Center → Add "Screen Recording"

2. **Prepare Your Device:**
   ```
   - Use iPhone 15 Pro Max (6.7" display)
   - Enable Do Not Disturb
   - Clean status bar (or use simulator)
   - Set time to 9:41 AM (Apple default)
   - Full battery display
   - WiFi/cellular signal full
   ```

3. **Record:**
   - Swipe to Control Center
   - Tap record button (3-second countdown)
   - Navigate through your app following storyboard
   - Swipe to Control Center, tap red status bar to stop

4. **Video saves to Photos app** (1080x1920 portrait)

---

### Method 2: QuickTime Screen Recording (Mac)

**For iOS Simulator recording:**

1. **Connect iPhone via USB** (or use simulator)
2. **Open QuickTime Player** on Mac
3. **File → New Movie Recording**
4. **Click dropdown next to record** → Select iPhone
5. **Record screen** while navigating app
6. **Save as .mov file**

**Advantage:** Cleaner status bar, no interruptions

---

### Method 3: Professional (OBS Studio)

**For highest quality:**

1. **Download OBS Studio** (free): https://obsproject.com
2. **Add Source:** Display Capture (iOS Simulator)
3. **Set Canvas:** 1080x1920
4. **Record in H.264** codec
5. **Export as .mp4**

---

## Creating Demo Data for Video

### Step 1: Demo Account Setup
```typescript
Email: video.demo@dancewithlorenzo.com
Password: Demo2026Video!
Name: Sakura Tanaka
```

### Step 2: Pre-populate Data

**Via Admin Dashboard:**
- Add 8 tokens to demo account
- Create 3-4 upcoming classes with photos
- Add 10 past check-ins for realistic stats
- Set attendance rate to 95%

**Database (SQL):**
```sql
-- Add tokens
INSERT INTO tokens (user_id, total_tokens, used_tokens)
VALUES ((SELECT id FROM user_profiles WHERE email = 'video.demo@dancewithlorenzo.com'), 12, 4);

-- Add past check-ins for stats
INSERT INTO check_ins (user_id, class_id, check_in_method, created_at)
SELECT 
  (SELECT id FROM user_profiles WHERE email = 'video.demo@dancewithlorenzo.com'),
  id,
  'qr_code',
  NOW() - INTERVAL '7 days' * generate_series(1, 10)
FROM classes
LIMIT 10;
```

---

## Adding Background Music (Optional)

### Recommended Music Style
- **Genre:** Upbeat, modern, tropical/Polynesian-inspired
- **Mood:** Energetic, welcoming, cultural
- **Tempo:** 120-130 BPM
- **Duration:** 30 seconds (loopable)

### Royalty-Free Music Sources
- **Epidemic Sound:** https://www.epidemicsound.com
- **Artlist:** https://artlist.io
- **YouTube Audio Library:** Free basic tracks
- **Uppbeat:** https://uppbeat.io (free with attribution)

### Audio Mixing Tips
- Keep music volume at 60-70% to allow UI sounds
- Fade in first 1 second
- Fade out last 2 seconds
- Sync beat drops with key moments (booking success, check-in)

---

## Video Editing

### Simple Editing (iMovie - Mac/iPhone)

1. **Import screen recording** to iMovie
2. **Trim to 30 seconds** exactly
3. **Add text overlays** (optional):
   - "Sign Up in Seconds" (0:03)
   - "Browse Beautiful Classes" (0:08)
   - "Book with Tokens" (0:15)
   - "Check-In with QR Code" (0:21)

4. **Add transitions:**
   - Smooth crossfades (0.3 seconds)
   - No fancy transitions (keep professional)

5. **Color correction:**
   - Increase saturation +10%
   - Increase brightness +5%
   - Keep natural skin tones

6. **Export Settings:**
   - Resolution: 1080p
   - Frame Rate: 30 fps
   - Quality: High
   - Format: .mp4 or .mov

---

### Advanced Editing (Final Cut Pro / Adobe Premiere)

**Timeline Structure:**
```
Track 1: Video (screen recording)
Track 2: Text overlays (titles/captions)
Track 3: Background music
Track 4: Sound effects (button taps, success sounds)
Track 5: Logo animation (opening/closing)
```

**Effects to Use:**
- **Zoom-in transitions** between scenes (subtle)
- **Highlight circles** around tap points (optional)
- **Speed ramping** for booking/check-in success (slow-mo for 0.5 sec)
- **Ken Burns effect** on final logo screen

**Color Grading:**
- Apply LUT: "Warm Vibrant" or custom
- Saturation: +15%
- Contrast: +10%
- Highlights: -5%
- Shadows: +10%

---

## Text Overlays & Captions

### Option 1: Minimal (Recommended)
**No text overlays** - let the visuals speak for themselves

### Option 2: Feature Highlights
Add subtle text at key moments:

| Time | Text | Position |
|------|------|----------|
| 0:03 | "Instant Sign-Up" | Bottom center |
| 0:10 | "Beautiful Class Catalog" | Top center |
| 0:15 | "Easy Token Booking" | Bottom center |
| 0:22 | "QR Check-In" | Top center |
| 0:27 | "Join Today!" | Center |

**Font:** San Francisco (iOS native) or similar  
**Color:** White with 50% black shadow  
**Animation:** Fade in/out (0.3 seconds)

---

## Voiceover Script (Optional)

### English Version:
```
[0:00] "Discover Tokyo's premier Tahitian dance community"
[0:06] "Browse authentic Ori Tahiti workshops"
[0:12] "Book classes with convenient token packages"
[0:18] "Check-in instantly with QR codes"
[0:25] "Download Dance with Lorenzo today"
```

### Japanese Version:
```
[0:00] "東京のタヒチアンダンスコミュニティへようこそ"
[0:06] "本格的なオリタヒチワークショップを探す"
[0:12] "トークンで簡単予約"
[0:18] "QRコードで即座にチェックイン"
[0:25] "今すぐダウンロード"
```

**Voice:** Professional, warm, welcoming (hire on Fiverr for ~$20-50)

---

## Status Bar Clean-Up

### Simulator Clean Status Bar
```bash
# Clean status bar in iOS Simulator
xcrun simctl status_bar booted override \
  --time "9:41" \
  --dataNetwork wifi \
  --wifiBars 3 \
  --cellularMode active \
  --cellularBars 4 \
  --batteryState charged \
  --batteryLevel 100
```

### Physical Device
- Enable Airplane Mode
- Connect to WiFi
- Charge to 100%
- Set time to 9:41 AM
- Close all apps
- Disable notifications during recording

---

## Testing Before Final Recording

### Pre-Flight Checklist

- [ ] Demo account created and populated with data
- [ ] All classes have high-quality photos
- [ ] Token balance set to 8 tokens
- [ ] QR code ready for scanning (test code or real)
- [ ] Status bar cleaned up
- [ ] Device in Do Not Disturb mode
- [ ] Full battery or charging
- [ ] Good lighting (if showing real check-in)
- [ ] Background music downloaded (if using)
- [ ] Editing software ready
- [ ] Practice run completed 3 times

### Practice Recording
1. Record full 30-second sequence 3-5 times
2. Review each take for:
   - Smooth transitions
   - No hesitation or errors
   - Good timing (not too fast/slow)
   - All key features visible
   - Professional appearance
3. Select best take or combine best moments from multiple takes

---

## Upload to App Store Connect

### Step 1: Prepare Final File

**File Naming:**
```
DanceWithLorenzo-AppPreview-Portrait-1080x1920.mov
```

**File Check:**
- Exactly 30 seconds (or less)
- Resolution: 1080x1920 (portrait) or 1920x1080 (landscape)
- Format: .mov or .mp4
- File size: Under 500MB
- No letterboxing or black bars

---

### Step 2: Upload Process

1. **Go to App Store Connect** → Your App → Version 1.0
2. **Scroll to "App Previews and Screenshots"**
3. **Select device size:** 6.7" Display
4. **Click "+" next to App Previews**
5. **Drag and drop your video file**
6. **Set poster frame:**
   - Choose frame at 0:15 (booking success moment)
   - Or 0:22 (check-in success)
   - Must be visually appealing as thumbnail

7. **Add to other device sizes:**
   - Same video works for all sizes
   - Apple automatically scales

8. **Preview on all devices** to ensure quality

---

## Best Practices

### Do's ✅
- **Show real app flow** - authentic navigation
- **Use actual features** - no mockups or simulations
- **Keep it fast-paced** - 2-3 seconds per action
- **Highlight unique features** - QR check-in, token system
- **End with clear call-to-action** - "Download now"
- **Use high-quality assets** - real class photos
- **Test on multiple devices** - ensure quality
- **Get feedback** - show to 3-5 people before submitting

### Don'ts ❌
- **No fake UI** - must be actual app
- **No lorem ipsum** - use real content
- **No error states** - only successful flows
- **No placeholder images** - use real class photos
- **No black bars** - match video to device aspect ratio
- **No audio distortion** - keep music levels balanced
- **No long static shots** - keep moving
- **No text spam** - minimal overlays

---

## Advanced Tips for Maximum Conversions

### 1. Hook in First 3 Seconds
- Open with most visually striking element
- Show the app icon with animation
- Immediately demonstrate value proposition

### 2. Show, Don't Tell
- Actions over text
- Let users see themselves using the app
- Demonstrate results (stats updating, success animations)

### 3. Build Anticipation
- Each scene should lead to the next
- Create mini "aha!" moments
- Ending should feel rewarding

### 4. Cultural Authenticity
- Showcase Tahitian dance imagery
- Use appropriate music (Polynesian influences)
- Highlight Lorenzo's expertise
- Show community aspect

### 5. Mobile-First Framing
- Portrait orientation matches user experience
- Vertical video performs better on App Store
- Easier for users to preview on their phones

---

## Example Timeline (Frame-by-Frame)

```
00:00 - App logo fades in (1 sec)
00:01 - Landing page appears (0.5 sec)
00:01.5 - Tap "Sign Up" (0.3 sec)
00:01.8 - Email field fills (0.5 sec)
00:02.3 - OTP animation (1.2 sec)
00:03.5 - Dashboard transition (0.5 sec)
00:04 - Pause on dashboard stats (1 sec)
00:05 - Tap "Classes" tab (0.3 sec)
00:05.3 - Class list appears (0.5 sec)
00:05.8 - Scroll through classes (3 sec)
00:08.8 - Pause on featured class (2 sec)
00:10.8 - Tap "Book Now" (0.3 sec)
00:11.1 - Booking modal slides up (0.5 sec)
00:11.6 - Show token balance (1 sec)
00:12.6 - Tap "Confirm" (0.3 sec)
00:12.9 - Success animation (2 sec)
00:14.9 - Return to dashboard (0.5 sec)
00:15.4 - Navigate to Check-in (0.8 sec)
00:16.2 - Camera opens (0.5 sec)
00:16.7 - QR code scanning (2 sec)
00:18.7 - Check-in success (1.5 sec)
00:20.2 - Stats update animation (2 sec)
00:22.2 - Zoom out from dashboard (1.5 sec)
00:23.7 - Logo + tagline appear (3 sec)
00:26.7 - Call-to-action (2 sec)
00:28.7 - Fade to black (1.3 sec)
00:30 - End
```

---

## Measuring Success

After your video is live, track:

**App Store Connect Analytics:**
- App Units (downloads)
- Impressions
- Product Page Views
- Conversion Rate (views → downloads)

**Benchmark:** Apps with preview videos see **30-40% higher conversion rates** than those without.

**A/B Test:** Create 2 versions and test which performs better:
- Version A: Focus on class booking flow
- Version B: Focus on community/social aspects

---

## Resources

### Video Tools
- **iMovie** (Mac/iOS): Free, easy to use
- **Final Cut Pro** (Mac): $299, professional
- **Adobe Premiere Rush** (Cross-platform): $9.99/month
- **DaVinci Resolve** (Free): Professional color grading
- **OBS Studio** (Free): Screen recording

### Music
- **Epidemic Sound:** https://www.epidemicsound.com
- **Artlist:** https://artlist.io
- **Premium Beat:** https://www.premiumbeat.com
- **YouTube Audio Library:** Free

### Voiceover
- **Fiverr:** $20-100 per video
- **Voices.com:** Professional voice actors
- **Bunny Studio:** High-quality, fast turnaround

### Inspiration
- Search App Store for apps with great preview videos:
  - ClassPass (fitness booking)
  - Eventbrite (event booking)
  - Mindbody (wellness classes)

---

## Quick Start: 5-Minute Version

**If you're short on time:**

1. **Use iPhone screen recording** (built-in)
2. **Navigate through app** following 5-scene storyboard
3. **Trim to 30 seconds** in Photos app
4. **Upload directly** to App Store Connect
5. **No music, no editing** - just authentic app flow

**This simple version still increases conversions!**

---

## Final Checklist Before Upload

- [ ] Video is exactly 30 seconds or less
- [ ] Resolution is correct (1080x1920 portrait)
- [ ] File format is .mov or .mp4
- [ ] File size is under 500MB
- [ ] Audio levels are balanced (if using music)
- [ ] No black bars or letterboxing
- [ ] Poster frame is visually appealing
- [ ] All UI elements are readable
- [ ] No personal data visible
- [ ] App flow is smooth and natural
- [ ] Ending has clear call-to-action
- [ ] Tested playback on multiple devices
- [ ] Received positive feedback from 3+ people

---

## Example File Structure

```
app-preview-video/
├── raw-recordings/
│   ├── take-1.mov
│   ├── take-2.mov (best)
│   └── take-3.mov
├── assets/
│   ├── background-music.mp3
│   ├── logo-animation.mov
│   └── sound-effects/
├── edited/
│   ├── draft-v1.mov
│   ├── draft-v2.mov
│   └── final.mov (upload this)
└── DanceWithLorenzo-AppPreview-Portrait-1080x1920.mov
```

---

## Troubleshooting

### Issue: Video won't upload
**Solution:** Check file size (max 500MB), format (.mov/.mp4), and resolution

### Issue: Video quality is blurry
**Solution:** Record at 1080p minimum, avoid compression during export

### Issue: Audio is distorted
**Solution:** Lower music volume to -6dB, normalize audio levels

### Issue: Poster frame looks bad
**Solution:** Choose frame at 0:15-0:20 with visible action, avoid mid-transition frames

### Issue: Video is rejected by Apple
**Solution:** Ensure video shows actual app functionality, no fake UI or simulations

---

**Your app deserves a stunning preview video! This guide will help you create one that converts viewers into users. 🎬**

**Need help? Contact: contact@onspace.ai**

---

**Pro Tip:** Record 3-5 takes and combine the best moments from each. Your final video should feel effortless and professional!
