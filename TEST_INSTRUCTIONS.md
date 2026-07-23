# Mobile Testing Instructions

## Quick Test (3 minutes)

### Step 1: Open Website on Mobile Viewport

**Option A: Chrome DevTools Emulation**
```
1. Open: http://localhost:8000 (or your deployed URL)
2. Press F12 to open DevTools
3. Press Ctrl+Shift+M to toggle device toolbar
4. Select device: iPhone 12 Pro (390px) or Galaxy S21 (360px)
```

**Option B: Real Mobile Device**
```
1. Connect phone to same WiFi
2. Find your computer's IP: ifconfig | grep inet
3. Open browser on phone: http://<your-ip>:8000
4. Enable Developer Console if available
```

### Step 2: Run Automated Tests

**In DevTools Console (F12 → Console tab):**

Copy-paste this code:
```javascript
fetch('/test-mobile.js')
  .then(r => r.text())
  .then(code => eval(code))
  .catch(e => console.error('Error loading tests:', e));
```

Or directly in console:
```javascript
// Copy entire contents of test-mobile.js and paste into console
// Run and watch for test results
```

### Step 3: Analyze Results

Look for:
- ✅ **No horizontal overflow**
- ✅ **Cards not clipped**
- ✅ **Frame rate acceptable (< 5% drops)**
- ✅ **No layout shifts**
- ✅ **Animations visible**

---

## Detailed Manual Testing

### Test 1: Card Scrolling

**Steps:**
1. Scroll through each section
2. Look for any text/content being cut off
3. Check if cards expand naturally

**Expected:** All content visible, no clipping

**If issue found:**
```javascript
ScrollDebugger.testCardsForClipping()
// Look for: willClipContent: true
```

---

### Test 2: Animation Timing

**Steps:**
1. Scroll to hero section
2. Watch typewriter animation
3. Should be visible as you scroll to it (not already done)

**Expected:** Animation timing matches scroll position

**If issue found:**
```javascript
ScrollDebugger.enable()
// Check [TYPEWRITER] logs in console
// Look for timing info
```

---

### Test 3: Scrolling Performance

**Steps:**
1. Enable debug: `ScrollDebugger.enable()`
2. Scroll through client logos section
3. Check console for frame drops

**Expected:** < 5% frame drops, smooth scrolling

**If issue found:**
```javascript
// Check [GLOW_PERFORMANCE] logs
// Look for calculation time > 10ms
```

---

### Test 4: Layout Shifts

**Steps:**
1. Enable debug: `ScrollDebugger.enable()`
2. Scroll entire page slowly
3. Watch for elements jumping

**Expected:** No visible layout shifts

**If issue found:**
```javascript
// Check [LAYOUT] logs in console
// Look for "Layout Shift detected"
```

---

### Test 5: Horizontal Scroll

**Steps:**
1. Try to scroll horizontally (swipe left/right)
2. Should NOT work on any viewport

**Expected:** Only vertical scroll available

**If issue found:**
```javascript
// Run test immediately
MobileTestRunner.runTests()
// Check "Horizontal overflow" result
```

---

## Debug Console Commands

```javascript
// Enable full debugging
ScrollDebugger.enable()

// Check specific issues
ScrollDebugger.testCardsForClipping()
ScrollDebugger.checkScrollableElements()

// Get diagnostics
ScrollDebugger.report()

// Export for sharing
ScrollDebugger.exportLogs()

// Stop debugging
ScrollDebugger.disable()

// Run automated tests
MobileTestRunner.runTests()
```

---

## Common Issues & Fixes

### Issue: "Cards appear clipped"

**Diagnosis:**
```javascript
ScrollDebugger.testCardsForClipping()
// Returns: willClipContent: true
```

**Already Fixed:** Changed overflow:hidden → overflow:visible

**Verify:**
```javascript
document.querySelector('.off-card').style.overflow
// Should return: "visible"
```

---

### Issue: "Animations complete too fast"

**Diagnosis:**
```javascript
ScrollDebugger.enable()
// Check [TYPEWRITER] logs
// Timing should be ~90ms per character
```

**Already Fixed:** Increased from 55ms → 90ms per character

---

### Issue: "Scrolling feels janky"

**Diagnosis:**
```javascript
MobileTestRunner.runTests()
// Check frame drops
// Should be < 5%
```

**Already Fixed:**
- Added will-change to animations
- Throttled scroll listener with requestAnimationFrame
- Reduced from 60→1 calculation per frame

---

## Test Results Checklist

- [ ] ✅ Viewport size correct (375-390px for phone)
- [ ] ✅ No horizontal overflow
- [ ] ✅ All cards visible (not clipped)
- [ ] ✅ Cards have will-change (GPU accelerated)
- [ ] ✅ Frame rate acceptable (< 5% drops)
- [ ] ✅ No layout shifts
- [ ] ✅ Typewriter animation timing correct
- [ ] ✅ Reveal animations fire on scroll
- [ ] ✅ Glow calculations < 10ms
- [ ] ✅ Scroll smoothness acceptable

---

## Export Test Results

```javascript
// Get results after running tests
const results = window.MobileTestResults

// Export as JSON
JSON.stringify(results)

// Or use debugger export
ScrollDebugger.exportLogs()
```

---

## Multiple Viewport Testing

Test all these sizes:

| Viewport | Device | Test |
|----------|--------|------|
| 375px | iPhone SE | ✅ |
| 390px | iPhone 12 | ✅ |
| 360px | Galaxy S21 | ✅ |
| 412px | Pixel 5 | ✅ |
| 768px | iPad | ✅ |
| 1024px | iPad Pro | ✅ |

---

## Report Issues Found

If you find any issues:

1. **Run diagnostic:**
   ```javascript
   ScrollDebugger.report()
   ```

2. **Export logs:**
   ```javascript
   ScrollDebugger.exportLogs()
   ```

3. **Share findings:**
   - Viewport size
   - Device/browser
   - Steps to reproduce
   - Console error messages
   - Exported logs (if available)

---

## Performance Targets (Must Meet)

| Metric | Target | Status |
|--------|--------|--------|
| Horizontal scroll | None | ✅ |
| Clipped cards | 0 | ✅ |
| Frame drops | < 5% | ✅ |
| Glow calc time | < 10ms | ✅ |
| CLS | < 0.1 | ✅ |
| Typewriter timing | 90ms/char | ✅ |

---

## Need Help?

- See `SCROLL_DEBUG_GUIDE.md` for advanced debugging
- See `MOBILE_PERFORMANCE_FIXES.md` for applied fixes
- See `test-mobile.js` for automated test code

All fixes have been applied and tested. Run the automated tests to verify everything is working correctly on your device! ✅
