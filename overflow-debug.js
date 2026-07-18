/**
 * Mobile Overflow Detection & Debugging Tool
 * Add to HTML: <script src="overflow-debug.js"></script>
 * Only runs in development (logs to console)
 */

const OverflowDebugger = {
  init() {
    console.log('🔍 Overflow Debugger Initialized');
    this.highlightOverflow();
    this.logDimensions();
    this.testAllElements();
    this.setupWatchers();
  },

  logDimensions() {
    const html = document.documentElement;
    const body = document.body;
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    console.group('📐 Viewport Dimensions');
    console.log(`Viewport: ${viewport.width}x${viewport.height}px`);
    console.log(`HTML offsetWidth: ${html.offsetWidth}px`);
    console.log(`Body offsetWidth: ${body.offsetWidth}px`);
    console.log(`scrollWidth: ${body.scrollWidth}px`);

    const overflowing = body.scrollWidth > viewport.width;
    console.log(overflowing ? '❌ OVERFLOW DETECTED' : '✅ No overflow');
    console.groupEnd();

    return { viewport, overflowing };
  },

  highlightOverflow() {
    const viewport = window.innerWidth;
    const allElements = document.querySelectorAll('*');
    const overflowingElements = [];

    allElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && (rect.right > viewport + 2 || rect.left < -2)) {
        overflowingElements.push({
          element: el.tagName.toLowerCase(),
          class: el.className,
          width: rect.width,
          left: rect.left,
          right: rect.right,
          overflow: rect.right - viewport
        });
      }
    });

    if (overflowingElements.length > 0) {
      console.group('⚠️ Elements Exceeding Viewport');
      overflowingElements.forEach(item => {
        console.log(
          `${item.element}.${item.class || 'no-class'} ` +
          `| Width: ${Math.round(item.width)}px ` +
          `| Overflow: ${Math.round(item.overflow)}px`,
          overflowingElements.length > 1 ? item : null
        );
      });
      console.groupEnd();
    } else {
      console.log('✅ All elements within viewport bounds');
    }

    return overflowingElements;
  },

  testAllElements() {
    console.group('🔎 Element Overflow Analysis');

    const criticalSelectors = [
      { selector: '.wrap', name: 'Main Wrapper' },
      { selector: '.hero', name: 'Hero Section' },
      { selector: '.stats', name: 'Stats Section' },
      { selector: '.dashboard', name: 'Dashboard' },
      { selector: '.dash-notif', name: 'Dashboard Notif' },
      { selector: '.dash-chip', name: 'Dashboard Chip' },
      { selector: '.roh-modal', name: 'Raksha Modal' },
      { selector: '.promo-modal', name: 'Promo Modal' },
      { selector: '.section', name: 'All Sections' }
    ];

    criticalSelectors.forEach(({ selector, name }) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) return;

      elements.forEach((el, idx) => {
        const rect = el.getBoundingClientRect();
        const computed = window.getComputedStyle(el);
        const overflowX = computed.overflowX;
        const overflowY = computed.overflowY;

        const exceeds = rect.right > window.innerWidth || rect.left < 0;

        if (exceeds) {
          console.warn(
            `${name}${idx > 0 ? ` [${idx}]` : ''}: ` +
            `overflow-x: ${overflowX}, ` +
            `left: ${Math.round(rect.left)}px, ` +
            `right: ${Math.round(rect.right)}px, ` +
            `exceeds viewport by ${Math.round(Math.max(0, rect.right - window.innerWidth))}px`
          );
        }
      });
    });

    console.groupEnd();
  },

  setupWatchers() {
    // Watch for layout changes
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        console.log('📱 Viewport resized, checking overflow...');
        this.logDimensions();
        this.highlightOverflow();
      }, 500);
    });

    // Watch for orientation change
    window.addEventListener('orientationchange', () => {
      console.log(`📱 Orientation changed to ${window.innerWidth}x${window.innerHeight}`);
      setTimeout(() => {
        this.logDimensions();
        this.highlightOverflow();
      }, 300);
    });

    console.log('👁️ Watchers set up - will monitor resize & orientation events');
  },

  // Check for specific problem areas
  checkPseudoElements() {
    console.group('🎨 Pseudo-Element Analysis');

    const problematicSelectors = [
      '.hero-glow-r', '.hero-glow-l',
      '.stats::after',
      '.cta-glow',
      '.testi-featured::before',
      '.cta-block::after',
      '.estimate::after',
      '.dash-notif',
      '.dash-chip'
    ];

    problematicSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector.split('::')[0]);
      if (elements.length > 0) {
        const el = elements[0];
        const computed = window.getComputedStyle(el);
        const clipPath = computed.clipPath;
        const position = computed.position;
        const left = computed.left;
        const right = computed.right;

        console.log(
          `${selector}: ` +
          `position=${position}, ` +
          `clip-path=${clipPath !== 'none' ? '✓ set' : '⚠️ none'}`
        );
      }
    });

    console.groupEnd();
  },

  // Visual highlighter (adds red border to overflowing elements)
  visualHighlight(enable = true) {
    if (!enable) {
      document.querySelectorAll('.overflow-debug-highlight').forEach(el => {
        el.classList.remove('overflow-debug-highlight');
      });
      return;
    }

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .overflow-debug-highlight {
        outline: 3px solid red !important;
        background: rgba(255, 0, 0, 0.1) !important;
      }
    `;
    document.head.appendChild(style);

    // Highlight overflowing elements
    const viewport = window.innerWidth;
    document.querySelectorAll('*').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && (rect.right > viewport + 2 || rect.left < -2)) {
        el.classList.add('overflow-debug-highlight');
      }
    });

    console.log('🎨 Overflowing elements highlighted in red');
  }
};

// Auto-run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => OverflowDebugger.init());
} else {
  OverflowDebugger.init();
}

// Expose globally for manual testing
window.OverflowDebugger = OverflowDebugger;

console.log('💡 Use OverflowDebugger.visualHighlight() to highlight problematic elements');
