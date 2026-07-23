# Mobile Scrolling & Animation Debug Guide

## Overview

Comprehensive logging system to analyze and fix mobile scrolling issues, animation timing, and performance problems.

## Quick Start

### Enable Debugging

1. **Open DevTools on Mobile** (Chrome DevTools or Safari Web Inspector)
2. **Add debug script to HTML** (optional, for persistent debugging):
   ```html
   <script src="scroll-debug.js"></script>
   ```
3. **Enable in console**:
   ```javascript
   ScrollDebugger.enable()
   ```

### What Gets Logged

#### 1. **Viewport & Device Info**
- Window dimensions (width, height)
- Screen size and DPI
- Scrollbar width
- Orientation (portrait/landscape)
- Document scroll dimensions

**Console Command:**
```javascript
ScrollDebugger.captureViewportInfo()
```

#### 2. **Element Metrics**
- Card dimensions and overflow settings
- Modal sizes
- Scrollable elements
- Fixed/sticky positioned elements

**Console Command:**
```javascript
ScrollDebugger.captureElementMetrics()
```

#### 3. **Scroll Events**
- Scroll position (Y coordinate)
- Scroll direction (up/down)
- Scroll velocity (delta)
- Percentage through document
- Scroll jank detection

**Console Command:** Automatic after enable()

#### 4. **Animation Timing**
- Typewriter animation progress
- Character-by-character timing
- Line completion markers
- Total animation duration

**Console Output:** Automatic during typewriter animation

#### 5. **Performance Metrics**
- Frame rate analysis (60fps baseline)
- Frame drops detection
- Cumulative Layout Shift (CLS)
- Glow effect calculation time

**Console Command:** Automatic after enable()

#### 6. **Intersection Observer Events**
- Element visibility percentage
- Reveal animation triggers
- Element position relative to viewport

**Console Command:** Automatic after enable()

---

## Usage Scenarios

### Scenario 1: Scrolling Feels Jank on Mobile

**Steps:**
1. Open browser DevTools
2. Run: `ScrollDebugger.enable()`
3. Scroll through the page slowly
4. Check the debug panel (bottom-right)
5. Look for high frame times or frame drops

**What to Look For:**
- Frame times > 20ms = Dropped frames
- Layout Shift detected = Content jumping
- Slow glow calculations = Performance issue

**Fix Based on Findings:**
- High frame drops → Optimize animations with `will-change`
- Layout shifts → Fix overflow or positioning
- Slow calculations → Reduce element count or throttle

---

### Scenario 2: Cards Appear Clipped on Mobile

**Steps:**
1. Open console
2. Run: `ScrollDebugger.testCardsForClipping()`
3. Check output for `willClipContent: true`

**Example Output:**
```
{
  element: "off-card",
  overflow: "hidden",
  willClipContent: true,
  height: 300,
  scrollHeight: 450  // Content is larger than container!
}
```

**Fix:**
- Change `overflow: hidden` → `overflow: visible`
- Add media query for mobile if needed
- Adjust card height on mobile

---

### Scenario 3: Animations Complete Too Fast

**Steps:**
1. Run: `ScrollDebugger.enable()`
2. Scroll to hero section
3. Check console for `[TYPEWRITER]` logs
4. Look at timing:

**Example Output:**
```
[TYPEWRITER] Char 1 of 18 at 400ms
[TYPEWRITER] Char 5 of 18 at 850ms
[TYPEWRITER] Char 10 of 18 at 1300ms
[TYPEWRITER] Line 0 complete
```

**Interpretation:**
- Each character at ~90ms → Good timing
- Completes before user scrolls to it → Timing is off
- Look at `typewriterStart` time vs `scroll position`

**Fix:**
- Increase character delay (90ms is current)
- Add longer initial delay
- Make sure animation triggers on scroll event

---

### Scenario 4: Excessive Scroll Listener Calculations

**Steps:**
1. Run: `ScrollDebugger.enable()`
2. Scroll through client grid section
3. Look for `[GLOW_PERFORMANCE]` logs
4. Check calculation time:

**Example Output:**
```
[GLOW_PERFORMANCE] 5.23ms
cardsProcessed: 18
scrollPosition: 2850

[GLOW_PERFORMANCE] 4.87ms  // Good: < 10ms
```

**Interpretation:**
- < 10ms → Good performance
- 10-20ms → Acceptable
- > 20ms → Performance issue

**Fix if needed:**
- Throttle with `requestAnimationFrame` ✅ (Already done)
- Reduce card count in DOM
- Use CSS animations instead of JS

---

## Console Commands Reference

### Information Commands
```javascript
// Get complete debug report
ScrollDebugger.report()

// Check for scrollable/clipped elements
ScrollDebugger.checkScrollableElements()

// Specifically test cards for clipping
ScrollDebugger.testCardsForClipping()

// View all captured metrics
ScrollDebugger.captureElementMetrics()

// Get viewport information
ScrollDebugger.captureViewportInfo()
```

### Control Commands
```javascript
// Start debugging
ScrollDebugger.enable()

// Stop debugging
ScrollDebugger.disable()

// Export logs to JSON file
ScrollDebugger.exportLogs()

// View debug panel
ScrollDebugger.panel.style.display = 'block'
```

### Real-Time Analysis
```javascript
// While debugging is enabled, you'll see:
// [SCROLL] - Scroll position updates
// [VIEWPORT] - Viewport changes
// [ANIMATIONS] - Animation events
// [REVEAL] - Element reveal events
// [GLOW_PERFORMANCE] - Glow calculation times
// [TYPEWRITER] - Typewriter animation progress
// [LAYOUT] - Layout shift detection
// [PERFORMANCE] - Frame rate analysis
```

---

## Debug Panel

**Location:** Bottom-right corner of screen

**Features:**
- Real-time log display
- Color-coded categories
- Timestamps for each event
- Scrollable history
- Close button (✕)

**Log Categories:**
- 🔵 VIEWPORT - Device/screen info
- 🟢 SCROLL - Scroll position updates
- 🟡 ANIMATIONS - Animation events
- 🔴 PERFORMANCE - Frame rate issues
- 🟣 LAYOUT - Layout shifts
- ⚪ REVEAL - Element reveals

---

## Common Issues & Fixes

### Issue: Cards Showing Clipped Content

**Diagnosis:**
```javascript
ScrollDebugger.testCardsForClipping()
// Returns clipped cards
```

**Root Cause:** `overflow: hidden` with `scrollHeight > offsetHeight`

**Fix:**
```css
.off-card {
  overflow: visible;  /* Changed from hidden */
  will-change: transform;
}
```

---

### Issue: Animation Completes Before Scroll

**Diagnosis:**
```javascript
ScrollDebugger.enable()
// Scroll to hero section
// Check [TYPEWRITER] logs in console
// Animation complete before you see it
```

**Root Cause:** Animation timing too fast or triggers too early

**Fix:**
```javascript
// Increase timing
setTimeout(tick, 90);    // 55ms → 90ms per character
setTimeout(tick, 350);   // 280ms → 350ms between lines
setTimeout(tick, 400);   // 200ms → 400ms initial delay
```

---

### Issue: Scroll Stuttering

**Diagnosis:**
```javascript
ScrollDebugger.enable()
// Scroll through page
// Check [PERFORMANCE] logs
// Frame drops > 10%
```

**Root Cause:** Unthrottled scroll calculations or no GPU acceleration

**Fix:**
```javascript
// Throttle with requestAnimationFrame
window.addEventListener('scroll', () => {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(updateGlow);  // Throttled!
}, { passive: true });

// Add GPU acceleration
.element {
  will-change: transform;
  transform: translateZ(0);  // Enable GPU
}
```

---

### Issue: Layout Shifts (CLS)

**Diagnosis:**
```javascript
ScrollDebugger.enable()
// Scroll page
// Check [LAYOUT] logs for "Layout Shift detected"
```

**Root Cause:** Content jumping, overflow issues, or size changes

**Fix:**
```css
/* Reserve space for dynamic content */
.container {
  min-height: 200px;  /* Prevent layout shift */
  overflow: visible;  /* Don't hide content */
}
```

---

## Mobile Testing Setup

### Testing on Real Device

1. **Enable USB Debugging** (Android) or **Enable Web Inspector** (iOS)
2. **Connect to Desktop**
3. **Open Remote DevTools**
4. **Run debug commands in console**

### Testing in DevTools Emulation

1. **Press F12** to open DevTools
2. **Press Ctrl+Shift+M** to toggle device toolbar
3. **Select device** (iPhone 12, Galaxy S21, etc.)
4. **Open Console tab**
5. **Run debug commands**

### Key Viewports to Test

```javascript
// Small phone
375px (iPhone SE, older iPhones)

// Standard phone
390px (iPhone 12-14)
360px (Galaxy S21)

// Large phone
412px (Pixel 5)

// Tablet
768px (iPad)

// Large tablet
1024px (iPad Pro)
```

---

## Log Export & Analysis

### Export Logs to File

```javascript
// Export all logs as JSON
ScrollDebugger.exportLogs()
// Downloads: scroll-debug-{timestamp}.json
```

### Analyze Exported Logs

**JSON Structure:**
```json
[
  {
    "time": 1234.56,
    "category": "SCROLL",
    "message": "Scroll event (10 total)",
    "data": {
      "scrollY": 2500,
      "direction": "down",
      "scrollPercent": "45.2%"
    },
    "timestamp": "14:32:45"
  }
]
```

**Use for:**
- Sharing with team
- Detailed analysis
- Performance benchmarking
- Bug reproduction

---

## Performance Targets

### Mobile Scrolling Performance

| Metric | Target | Status |
|--------|--------|--------|
| Frame Rate | 60fps | ✅ |
| Frame Drop % | < 5% | ✅ |
| Glow Calculation | < 10ms | ✅ |
| CLS (Layout Shift) | < 0.1 | ✅ |
| Scroll Jank | None | ✅ |

### Animation Timing

| Element | Timing | Status |
|---------|--------|--------|
| Typewriter Char | 90ms | ✅ |
| Line Delay | 350ms | ✅ |
| Card Reveal | As scroll | ✅ |
| Mascot Float | 3.6s | ✅ |

---

## Quick Reference Card

```javascript
// Enable debugging
ScrollDebugger.enable()

// Find clipped cards
ScrollDebugger.testCardsForClipping()

// Check scrollable elements
ScrollDebugger.checkScrollableElements()

// Get full report
ScrollDebugger.report()

// Export logs
ScrollDebugger.exportLogs()

// Disable debugging
ScrollDebugger.disable()
```

---

## Integration with Main App

The main `app.js` file already includes logging hooks:

- **Reveal animations** → Logs visibility percentage
- **Glow calculations** → Logs performance timing
- **Typewriter** → Logs character progress and total time

All logging respects `ScrollDebugger.enabled` flag, so it only runs when explicitly enabled.

---

## Support

**Having issues?**

1. Run `ScrollDebugger.report()` to get diagnostics
2. Export logs: `ScrollDebugger.exportLogs()`
3. Check console for error messages
4. Review this guide for your specific issue

**Remember:** Debugging is always enabled in development, disabled in production.
