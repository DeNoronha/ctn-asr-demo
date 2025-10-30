# Responsive Design Testing Guide

**Last Updated:** October 29, 2025
**WCAG 2.1 AA Compliance:** DA-005 (Responsive Layouts)

This document provides testing procedures for responsive design across mobile, tablet, and desktop viewports.

---

## Breakpoints

The Admin Portal uses the following responsive breakpoints:

| Breakpoint | Range | Device Type | Primary Use Case |
|------------|-------|-------------|------------------|
| **Mobile Small** | 320px - 480px | Small phones (iPhone SE, etc.) | One-column layout, stacked forms |
| **Mobile Large** | 481px - 767px | Large phones, small tablets | One-column layout, touch-optimized |
| **Tablet** | 768px - 1024px | Tablets, small laptops | Two-column layout, hybrid touch/mouse |
| **Desktop** | 1025px+ | Laptops, desktops | Multi-column layout, mouse-optimized |

---

## Testing Viewports

### Critical Viewports to Test

1. **320px width** - iPhone SE (portrait)
2. **375px width** - iPhone 12/13 Pro (portrait)
3. **768px width** - iPad (portrait)
4. **1024px width** - iPad Pro (portrait)
5. **1280px width** - Desktop (minimum)
6. **1920px width** - Desktop (standard)

---

## Browser DevTools Testing

### Chrome/Edge DevTools

```bash
1. Open DevTools (F12 or Cmd+Option+I)
2. Click "Toggle Device Toolbar" (Ctrl+Shift+M or Cmd+Shift+M)
3. Select responsive mode
4. Test each viewport:
   - iPhone SE (375x667)
   - iPhone 12 Pro (390x844)
   - iPad (768x1024)
   - iPad Pro (1024x1366)
5. Test both portrait and landscape orientations
6. Test touch emulation (click "Toggle device toolbar" icon)
```

### Firefox Responsive Design Mode

```bash
1. Open DevTools (F12 or Cmd+Option+I)
2. Click "Responsive Design Mode" (Ctrl+Shift+M or Cmd+Option+M)
3. Select device from dropdown or enter custom dimensions
4. Test touch events: Settings > "Touch simulation"
```

---

## Responsive Testing Checklist

### ✅ Layout & Navigation

- [ ] **Sidebar** collapses/expands correctly on mobile
- [ ] **Header** adjusts height and spacing on mobile
- [ ] **Logo** scales appropriately (max 28px height on mobile)
- [ ] **Menu button** is at least 44x44px for touch
- [ ] **Skip to content** link works on mobile
- [ ] **User info** menu is accessible on mobile

### ✅ Forms & Inputs

- [ ] **Form fields** stack vertically on mobile (<768px)
- [ ] **Input height** is at least 44px for touch (prevents zoom on iOS)
- [ ] **Font size** is at least 16px in inputs (prevents iOS zoom)
- [ ] **Labels** are above inputs (not side-by-side) on mobile
- [ ] **Validation messages** are visible and readable on mobile
- [ ] **Buttons** have adequate spacing (min 8px gap)
- [ ] **Form rows** (side-by-side fields) stack on mobile

### ✅ Grids & Tables

- [ ] **Grids** have horizontal scroll on mobile (overflow-x: auto)
- [ ] **Touch scrolling** is smooth (-webkit-overflow-scrolling: touch)
- [ ] **Grid actions** (Edit, Delete buttons) are at least 44x44px
- [ ] **Column widths** are appropriate for mobile (avoid too narrow)
- [ ] **Card layout** option available for mobile grids (optional)

### ✅ Dialogs & Modals

- [ ] **Dialogs** are full-screen on mobile (<768px)
- [ ] **Dialog content** is scrollable if it exceeds viewport
- [ ] **Close button** (X) is at least 44x44px
- [ ] **Action buttons** (Cancel, Confirm) are at least 44x44px
- [ ] **Focus trap** works correctly on mobile

### ✅ Touch Targets (WCAG 2.1 Level AAA - 2.5.5)

- [ ] **All buttons** are at least 44x44px
- [ ] **All links** have adequate click/tap area (44x44px)
- [ ] **Checkboxes** are at least 24x24px
- [ ] **Icon buttons** are at least 44x44px
- [ ] **Grid action buttons** are at least 44x44px
- [ ] **Dropdown triggers** are at least 44px tall

### ✅ Typography & Readability

- [ ] **Font sizes** are readable on mobile (min 14px body text)
- [ ] **Line height** is adequate (1.5 or greater)
- [ ] **Contrast ratios** meet WCAG AA (4.5:1 for normal text)
- [ ] **Text doesn't overflow** containers on narrow viewports
- [ ] **Long words/URLs** wrap correctly (word-break: break-word)

### ✅ Images & Media

- [ ] **Logo** scales correctly and doesn't pixelate
- [ ] **Icons** are visible at small sizes
- [ ] **Images** scale proportionally (max-width: 100%)
- [ ] **Alt text** is present for all images

---

## Responsive Utility Classes

The following utility classes are available in `src/styles/responsive.css`:

### Display Utilities

```css
.hide-mobile          /* Hide on mobile (<768px) */
.hide-tablet          /* Hide on tablet (768-1024px) */
.hide-desktop         /* Hide on desktop (>1024px) */

.show-mobile          /* Show only on mobile */
.show-mobile-inline   /* Show inline only on mobile */
.show-mobile-flex     /* Show flex only on mobile */
```

### Layout Utilities

```css
.stack-mobile         /* Stack flex children vertically on mobile */
.full-width-mobile    /* Full width on mobile */
```

### Spacing Utilities

```css
.p-mobile-sm/.md/.lg  /* Responsive padding */
.px-mobile-sm/.md/.lg /* Horizontal padding */
.py-mobile-sm/.md/.lg /* Vertical padding */

.m-mobile-sm/.md/.lg  /* Responsive margin */
.mx-mobile-sm/.md/.lg /* Horizontal margin */
.my-mobile-sm/.md/.lg /* Vertical margin */
```

### Typography Utilities

```css
.text-mobile-sm/.base/.lg/.xl  /* Responsive text sizes */
.text-mobile-left/center/right /* Responsive text alignment */
```

---

## Testing Real Devices

### iOS Testing (Safari)

```bash
1. Enable Web Inspector:
   Settings > Safari > Advanced > Web Inspector

2. On Mac:
   - Open Safari > Develop > [Your iPhone Name] > [Page]
   - Use remote inspector to debug

3. Test on:
   - iPhone SE (320px width - smallest)
   - iPhone 12/13 Pro (390px width)
   - iPad (768px width)
```

### Android Testing (Chrome)

```bash
1. Enable USB Debugging:
   Settings > Developer Options > USB Debugging

2. On Desktop Chrome:
   - Open chrome://inspect
   - Connect device via USB
   - Click "Inspect" on your page

3. Test on:
   - Small Android phone (360px width)
   - Standard Android phone (411px width)
   - Android tablet (768px width)
```

---

## Common Responsive Issues & Fixes

### Issue 1: Horizontal Scrolling on Mobile

**Symptom:** Page scrolls horizontally on mobile
**Cause:** Fixed-width elements wider than viewport
**Fix:**
```css
element {
  max-width: 100%;
  box-sizing: border-box;
}
```

### Issue 2: Text Too Small on Mobile

**Symptom:** Users need to zoom to read text
**Cause:** Font size below 14px
**Fix:**
```css
body {
  font-size: 16px; /* Minimum for mobile */
}

@media (max-width: 767px) {
  .small-text {
    font-size: 14px; /* Minimum readable size */
  }
}
```

### Issue 3: Touch Targets Too Small

**Symptom:** Buttons hard to tap on mobile
**Cause:** Touch targets below 44x44px
**Fix:**
```css
@media (max-width: 767px) and (hover: none) {
  button, .btn {
    min-width: 44px;
    min-height: 44px;
    padding: 12px;
  }
}
```

### Issue 4: iOS Input Zoom

**Symptom:** iOS Safari zooms in when focusing inputs
**Cause:** Font size below 16px in input fields
**Fix:**
```css
input, select, textarea {
  font-size: 16px; /* Prevents iOS zoom */
}
```

### Issue 5: Form Fields Side-by-Side on Mobile

**Symptom:** Form fields too narrow on mobile
**Cause:** Flex row not stacking on mobile
**Fix:**
```css
@media (max-width: 767px) {
  .form-row-group {
    flex-direction: column !important;
  }

  .form-row-group > * {
    width: 100% !important;
  }
}
```

---

## Automated Testing

### Playwright Responsive Tests

```typescript
// Example responsive test
import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1920, height: 1080 },
];

for (const viewport of viewports) {
  test(`should render correctly on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    // Take screenshot for visual comparison
    await page.screenshot({
      path: `screenshots/${viewport.name}.png`,
      fullPage: true,
    });

    // Test critical elements are visible
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });
}
```

### Lighthouse Mobile Audit

```bash
# Run Lighthouse mobile audit
npx lighthouse https://your-app.com \
  --preset=desktop \
  --view

# Check for:
# - Viewport is set correctly
# - Content sized correctly for viewport
# - Touch targets are appropriately sized
# - Text is legible
```

---

## Performance Considerations

### Mobile-Specific Optimizations

1. **Lazy load images** below the fold
2. **Minimize JavaScript** on initial load
3. **Use CSS media queries** instead of JS for responsive behavior
4. **Optimize images** for mobile bandwidth
5. **Enable gzip/brotli compression**
6. **Use CDN** for static assets

---

## Resources

- [WCAG 2.1 - Reflow (1.4.10)](https://www.w3.org/WAI/WCAG21/Understanding/reflow.html)
- [WCAG 2.1 - Target Size (2.5.5)](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [MDN - Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [Google - Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
- [Viewport Sizes](https://viewportsizer.com/)

---

## Implementation Status

✅ **Completed (DA-005):**
- Responsive utility classes (400+ lines)
- Touch target sizing (44x44px minimum)
- Mobile-first breakpoints
- Form stacking on mobile
- Grid horizontal scroll
- Full-screen dialogs on mobile
- Print styles

⏳ **Pending:**
- Card-style grid view for mobile (optional enhancement)
- Hamburger menu animation
- Gesture-based navigation (swipe to open/close sidebar)
- Progressive Web App (PWA) manifest

---

## Support & Feedback

If you encounter responsive design issues:
1. **Report issue** with:
   - Device model
   - Browser and version
   - Viewport size
   - Screenshot of issue
2. **Priority:** Responsive issues affecting usability are P1
3. **Testing:** All responsive changes require testing on real devices before merge
