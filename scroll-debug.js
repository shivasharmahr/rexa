/**
 * Mobile Scrolling & Animation Debug Logger
 * Analyzes scrolling behavior, animation timing, and element dimensions on mobile
 *
 * Add to HTML: <script src="scroll-debug.js"></script>
 * Toggle logging in console: ScrollDebugger.enable() / ScrollDebugger.disable()
 */

const ScrollDebugger = {
  enabled: false,
  logs: [],
  maxLogs: 1000,

  init() {
    console.log('📱 Scroll Debugger Initialized');
    this.captureViewportInfo();
    this.captureElementMetrics();
    this.monitorScrollEvents();
    this.monitorAnimations();
    this.monitorLayoutShifts();
    this.createDebugPanel();
  },

  log(category, message, data = {}) {
    if (!this.enabled) return;

    const entry = {
      time: performance.now(),
      category,
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();

    console.log(`[${category}] ${message}`, data);
  },

  captureViewportInfo() {
    const info = {
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio,
      orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
      scrollbarWidth: window.innerWidth - document.documentElement.clientWidth,
      bodyWidth: document.body.offsetWidth,
      documentWidth: document.documentElement.scrollWidth,
    };

    this.log('VIEWPORT', 'Initial viewport metrics', info);

    // Monitor orientation change
    window.addEventListener('orientationchange', () => {
      const newInfo = {
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
      };
      this.log('VIEWPORT', 'Orientation changed', newInfo);
    });

    return info;
  },

  captureElementMetrics() {
    const elements = {
      cards: document.querySelectorAll('.off-card, .svc, .testi-card, .cgrid-card'),
      modals: document.querySelectorAll('.roh-modal, .promo-modal'),
      scrollers: document.querySelectorAll('[style*="overflow"], .roh-modal-body'),
      fixed: document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]'),
      sticky: document.querySelectorAll('[style*="position: sticky"], [style*="position:sticky"]'),
    };

    const metrics = {};

    Object.entries(elements).forEach(([key, els]) => {
      metrics[key] = Array.from(els).map(el => ({
        element: el.className || el.tagName,
        width: el.offsetWidth,
        height: el.offsetHeight,
        scrollWidth: el.scrollWidth,
        scrollHeight: el.scrollHeight,
        overflow: window.getComputedStyle(el).overflow,
        overflowX: window.getComputedStyle(el).overflowX,
        overflowY: window.getComputedStyle(el).overflowY,
        hasInternalScroll: el.scrollHeight > el.offsetHeight || el.scrollWidth > el.offsetWidth,
      }));
    });

    this.log('ELEMENTS', 'Captured element metrics', metrics);
    return metrics;
  },

  monitorScrollEvents() {
    let scrollTimeout;
    let lastScrollY = 0;
    let scrollEvents = 0;

    window.addEventListener('scroll', (e) => {
      scrollEvents++;
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY;
      const direction = delta > 0 ? 'down' : 'up';

      // Log every 10 scroll events to reduce noise
      if (scrollEvents % 10 === 0) {
        this.log('SCROLL', `Scroll event (${scrollEvents} total)`, {
          scrollY: currentY,
          delta: Math.abs(delta),
          direction,
          maxScroll: document.documentElement.scrollHeight - window.innerHeight,
          scrollPercent: ((currentY / (document.documentElement.scrollHeight - window.innerHeight)) * 100).toFixed(1) + '%',
        });
      }

      lastScrollY = currentY;

      // Detect scroll jank
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.log('SCROLL', 'Scroll ended', {
          totalEvents: scrollEvents,
          avgDelta: scrollEvents > 0 ? 'calculated' : 0,
        });
        scrollEvents = 0;
      }, 150);
    }, { passive: true });

    // Monitor scroll performance
    this.monitorScrollPerformance();
  },

  monitorScrollPerformance() {
    let frameCount = 0;
    let lastFrameTime = performance.now();
    let frameDrops = 0;

    function measureFrame() {
      const now = performance.now();
      const frameTime = now - lastFrameTime;
      lastFrameTime = now;
      frameCount++;

      // Flag frames slower than 16.67ms (60fps)
      if (frameTime > 20) {
        frameDrops++;
      }

      // Report every 300 frames (~5 seconds at 60fps)
      if (frameCount % 300 === 0) {
        ScrollDebugger.log('PERFORMANCE', 'Frame rate analysis', {
          framesAnalyzed: frameCount,
          frameDrops,
          dropPercentage: ((frameDrops / frameCount) * 100).toFixed(2) + '%',
          avgFrameTime: (frameTime).toFixed(2) + 'ms',
        });
      }

      requestAnimationFrame(measureFrame);
    }

    requestAnimationFrame(measureFrame);
  },

  monitorAnimations() {
    const animations = document.querySelectorAll('[style*="animation"]');

    const animationData = Array.from(animations).map(el => ({
      element: el.className || el.tagName,
      animation: window.getComputedStyle(el).animation,
      willChange: window.getComputedStyle(el).willChange,
      transform: window.getComputedStyle(el).transform,
    }));

    this.log('ANIMATIONS', 'Captured animation metrics', {
      totalAnimatedElements: animations.length,
      animations: animationData,
    });

    // Monitor animation start/end
    document.addEventListener('animationstart', (e) => {
      this.log('ANIMATIONS', 'Animation started', {
        element: e.target.className || e.target.tagName,
        animationName: e.animationName,
      });
    }, true);

    document.addEventListener('animationend', (e) => {
      this.log('ANIMATIONS', 'Animation ended', {
        element: e.target.className || e.target.tagName,
        animationName: e.animationName,
      });
    }, true);
  },

  monitorLayoutShifts() {
    if (!('LayoutShift' in window)) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          this.log('LAYOUT', 'Cumulative Layout Shift detected', {
            value: entry.value.toFixed(4),
            sources: entry.sources?.map(s => ({
              element: s.node?.className || s.node?.tagName,
              previousRect: s.previousRect,
              currentRect: s.currentRect,
            })),
          });
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('LayoutShift not supported');
    }
  },

  monitorIntersectionObserver() {
    const revealElements = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.log('INTERSECTION', 'Element revealed', {
            element: entry.target.className,
            visibility: (entry.intersectionRatio * 100).toFixed(1) + '%',
            top: entry.boundingClientRect.top,
            bottom: entry.boundingClientRect.bottom,
          });
        }
      });
    }, { threshold: [0.12, 0.5, 1.0] });

    revealElements.forEach(el => observer.observe(el));
  },

  checkScrollableElements() {
    const scrollable = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollHeight > el.offsetHeight || el.scrollWidth > el.offsetWidth) {
        const style = window.getComputedStyle(el);
        if (style.overflow !== 'visible' || style.overflowY !== 'visible') {
          scrollable.push({
            element: el.className || el.tagName,
            scrollableHeight: el.scrollHeight > el.offsetHeight,
            scrollableWidth: el.scrollWidth > el.offsetWidth,
            overflowX: style.overflowX,
            overflowY: style.overflowY,
            height: el.offsetHeight,
            width: el.offsetWidth,
            scrollHeight: el.scrollHeight,
            scrollWidth: el.scrollWidth,
          });
        }
      }
    });

    this.log('SCROLL_ELEMENTS', 'Found scrollable elements', {
      count: scrollable.length,
      elements: scrollable,
    });

    return scrollable;
  },

  testCardsForClipping() {
    const cards = document.querySelectorAll('.off-card, .svc, .testi-card, .cgrid-card');
    const clipped = [];

    cards.forEach(card => {
      const overflow = window.getComputedStyle(card).overflow;
      const overflowX = window.getComputedStyle(card).overflowX;
      const overflowY = window.getComputedStyle(card).overflowY;

      if (overflow === 'hidden' || overflowX === 'hidden' || overflowY === 'hidden') {
        clipped.push({
          element: card.className,
          overflow,
          overflowX,
          overflowY,
          height: card.offsetHeight,
          scrollHeight: card.scrollHeight,
          width: card.offsetWidth,
          scrollWidth: card.scrollWidth,
          willClipContent: card.scrollHeight > card.offsetHeight,
        });
      }
    });

    this.log('CARDS', 'Card clipping analysis', {
      totalCards: cards.length,
      clippedCards: clipped.length,
      details: clipped,
    });

    return clipped;
  },

  createDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'scroll-debug-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      width: 300px;
      max-height: 400px;
      background: rgba(0, 0, 0, 0.9);
      color: #00ff00;
      font-family: monospace;
      font-size: 11px;
      padding: 10px;
      border-radius: 8px;
      overflow-y: auto;
      z-index: 99999;
      display: none;
      box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
    `;

    panel.innerHTML = `
      <div style="margin-bottom: 10px; border-bottom: 1px solid #00ff00; padding-bottom: 5px;">
        <strong>📱 Scroll Debug Panel</strong>
        <button id="close-debug" style="float: right; background: none; border: none; color: #00ff00; cursor: pointer;">✕</button>
      </div>
      <div id="debug-content" style="max-height: 350px; overflow-y: auto;"></div>
    `;

    document.body.appendChild(panel);

    panel.querySelector('#close-debug').addEventListener('click', () => {
      panel.style.display = 'none';
      this.enabled = false;
    });

    this.updatePanel = () => {
      const content = panel.querySelector('#debug-content');
      const latestLogs = this.logs.slice(-20);

      content.innerHTML = latestLogs.map(log => `
        <div style="margin-bottom: 8px; padding: 5px; background: rgba(0, 255, 0, 0.05); border-left: 2px solid #00ff00;">
          <div style="color: #ffff00;">[${log.category}]</div>
          <div>${log.message}</div>
          <div style="color: #888; font-size: 10px;">${log.timestamp}</div>
        </div>
      `).join('');
    };

    // Update panel every 500ms
    setInterval(() => {
      if (this.enabled) this.updatePanel();
    }, 500);

    this.panel = panel;
  },

  enable() {
    this.enabled = true;
    if (this.panel) this.panel.style.display = 'block';
    console.log('✅ Scroll Debugger ENABLED');
    console.log('Commands:');
    console.log('  ScrollDebugger.disable() - Turn off');
    console.log('  ScrollDebugger.checkScrollableElements() - Find scrollable elements');
    console.log('  ScrollDebugger.testCardsForClipping() - Check card clipping');
    console.log('  ScrollDebugger.exportLogs() - Export logs as JSON');
  },

  disable() {
    this.enabled = false;
    if (this.panel) this.panel.style.display = 'none';
    console.log('❌ Scroll Debugger DISABLED');
  },

  exportLogs() {
    const data = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scroll-debug-${Date.now()}.json`;
    a.click();
    console.log('📥 Logs exported');
  },

  report() {
    const summary = {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth,
      },
      issues: {
        scrollableElements: this.checkScrollableElements(),
        clippedCards: this.testCardsForClipping(),
      },
      performance: {
        totalLogs: this.logs.length,
        categories: [...new Set(this.logs.map(l => l.category))],
      },
    };

    console.group('📊 Scroll Debug Report');
    console.table(summary.viewport);
    console.log('Scrollable Elements:', summary.issues.scrollableElements);
    console.log('Clipped Cards:', summary.issues.clippedCards);
    console.groupEnd();

    return summary;
  },
};

// Auto-initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ScrollDebugger.init());
} else {
  ScrollDebugger.init();
}

// Expose globally for console access
window.ScrollDebugger = ScrollDebugger;

console.log('💡 Tip: Run ScrollDebugger.enable() in console to start debugging');
