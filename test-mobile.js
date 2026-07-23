/**
 * Automated Mobile Testing Script
 * Analyzes scrolling, animations, and layout on mobile viewports
 * Run in DevTools console: copy-paste this entire file and execute
 */

const MobileTestRunner = {
  results: {
    viewport: {},
    cards: {},
    scrolling: {},
    animations: {},
    performance: {},
    issues: []
  },

  async runTests() {
    console.log('🧪 Starting Mobile Test Suite...\n');

    await this.testViewport();
    await this.testCards();
    await this.testScrolling();
    await this.testAnimations();
    await this.testPerformance();

    this.reportResults();
  },

  async testViewport() {
    console.group('📱 VIEWPORT TEST');

    const info = {
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio,
      orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
      scrollbarWidth: window.innerWidth - document.documentElement.clientWidth,
      bodyOverflow: window.getComputedStyle(document.body).overflow,
      htmlOverflow: window.getComputedStyle(document.documentElement).overflow,
      maxScroll: document.documentElement.scrollHeight - window.innerHeight,
    };

    console.table(info);
    this.results.viewport = info;

    // Check for overflow issues
    if (info.bodyOverflow !== 'hidden' && info.bodyOverflow !== 'auto') {
      console.warn('⚠️ Body overflow not set to hidden');
      this.results.issues.push('Body overflow-x not properly constrained');
    }

    console.groupEnd();
  },

  async testCards() {
    console.group('🎴 CARDS TEST');

    const cardSelectors = ['.off-card', '.svc', '.testi-card', '.cgrid-card'];
    const allCards = [];

    cardSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(card => {
        const style = window.getComputedStyle(card);
        const data = {
          element: card.className,
          width: card.offsetWidth,
          height: card.offsetHeight,
          scrollWidth: card.scrollWidth,
          scrollHeight: card.scrollHeight,
          overflow: style.overflow,
          overflowX: style.overflowX,
          overflowY: style.overflowY,
          willChange: style.willChange,
          isClipped: card.scrollHeight > card.offsetHeight && style.overflow === 'hidden',
          hasOverflow: card.scrollHeight > card.offsetHeight || card.scrollWidth > card.offsetWidth,
        };
        allCards.push(data);

        if (data.isClipped) {
          console.warn(`❌ Card clipped: ${data.element}`);
          this.results.issues.push(`Card ${data.element} is clipping content`);
        }

        if (!data.willChange && data.hasOverflow) {
          console.warn(`⚠️ No will-change on card: ${data.element}`);
        }
      });
    });

    console.table(allCards.slice(0, 10)); // Show first 10
    console.log(`Total cards analyzed: ${allCards.length}`);
    console.log(`Clipped cards: ${allCards.filter(c => c.isClipped).length}`);

    this.results.cards = {
      total: allCards.length,
      clipped: allCards.filter(c => c.isClipped).length,
      missingWillChange: allCards.filter(c => !c.willChange && c.hasOverflow).length,
    };

    console.groupEnd();
  },

  async testScrolling() {
    console.group('📜 SCROLLING TEST');

    const scrollTest = {
      currentScroll: window.scrollY,
      maxScroll: document.documentElement.scrollHeight - window.innerHeight,
      scrollPercent: ((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100).toFixed(2) + '%',
      documentWidth: document.documentElement.scrollWidth,
      windowWidth: window.innerWidth,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };

    console.table(scrollTest);

    if (scrollTest.horizontalOverflow) {
      console.error('❌ HORIZONTAL OVERFLOW DETECTED!');
      this.results.issues.push('Horizontal overflow exists');
    } else {
      console.log('✅ No horizontal overflow');
    }

    // Test scroll smoothness
    await this.measureScrollPerformance();

    this.results.scrolling = scrollTest;
    console.groupEnd();
  },

  async measureScrollPerformance() {
    console.group('⚡ Scroll Performance');

    let frameCount = 0;
    let lastTime = performance.now();
    let frameTimes = [];

    return new Promise(resolve => {
      const measureScroll = () => {
        const now = performance.now();
        const frameTime = now - lastTime;
        frameTimes.push(frameTime);
        lastTime = now;
        frameCount++;

        if (frameCount < 60) {
          requestAnimationFrame(measureScroll);
        } else {
          const avgTime = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
          const drops = frameTimes.filter(t => t > 20).length;

          console.log(`Frames measured: ${frameCount}`);
          console.log(`Average frame time: ${avgTime.toFixed(2)}ms`);
          console.log(`Frame drops (>20ms): ${drops}/${frameCount}`);
          console.log(`Drop percentage: ${((drops / frameCount) * 100).toFixed(1)}%`);

          if (drops > frameCount * 0.1) {
            console.warn('⚠️ High frame drop rate detected');
          } else {
            console.log('✅ Frame rate acceptable');
          }

          this.results.performance.frameData = { avgTime, drops, total: frameCount };
          console.groupEnd();
          resolve();
        }
      };

      requestAnimationFrame(measureScroll);
    });
  },

  async testAnimations() {
    console.group('🎬 ANIMATIONS TEST');

    // Check for CSS animations
    const animatedElements = document.querySelectorAll('[style*="animation"]');
    console.log(`Elements with CSS animations: ${animatedElements.length}`);

    // Check keyframes
    const sheets = document.styleSheets;
    let keyframesCount = 0;

    try {
      for (const sheet of sheets) {
        if (sheet.cssRules) {
          keyframesCount += Array.from(sheet.cssRules).filter(rule =>
            rule.type === CSSRule.KEYFRAMES_RULE
          ).length;
        }
      }
    } catch (e) {
      console.warn('Could not access all stylesheets');
    }

    console.log(`Total keyframes defined: ${keyframesCount}`);

    // Check specific animations
    const mascots = document.querySelectorAll('.off-mascot, .roh-face, .roh-launcher-img');
    const mascotAnimations = Array.from(mascots).map(m => ({
      element: m.className,
      animation: window.getComputedStyle(m).animation,
      willChange: window.getComputedStyle(m).willChange,
    }));

    console.table(mascotAnimations);

    this.results.animations = {
      animatedElements: animatedElements.length,
      keyframes: keyframesCount,
      mascotAnimations: mascotAnimations.length,
    };

    console.groupEnd();
  },

  async testPerformance() {
    console.group('📊 PERFORMANCE TEST');

    const perfData = {
      navigationTiming: performance.timing ? {
        navigationStart: performance.timing.navigationStart,
        loadEventEnd: performance.timing.loadEventEnd,
        totalLoadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
      } : 'Not available',
      memoryUsage: performance.memory ? {
        jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB',
        totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
        usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
      } : 'Not available',
    };

    console.table(perfData);

    // Test layout shifts
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          console.warn(`⚠️ Layout Shift: ${entry.value}`);
          this.results.issues.push(`Layout Shift detected: ${entry.value}`);
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.log('Layout Shift API not available');
    }

    this.results.performance = perfData;
    console.groupEnd();
  },

  reportResults() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(80));

    if (this.results.issues.length === 0) {
      console.log('✅ All tests passed! No critical issues detected.\n');
    } else {
      console.log(`❌ Found ${this.results.issues.length} issue(s):\n`);
      this.results.issues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
      });
      console.log('');
    }

    // Quick stats
    console.group('📈 Quick Stats');
    console.log(`Viewport: ${this.results.viewport.windowWidth}x${this.results.viewport.windowHeight}`);
    console.log(`Cards analyzed: ${this.results.cards.total}`);
    console.log(`Clipped cards: ${this.results.cards.clipped}`);
    console.log(`Horizontal overflow: ${this.results.scrolling.horizontalOverflow ? '❌ YES' : '✅ NO'}`);
    console.log(`Animated elements: ${this.results.animations.animatedElements}`);
    console.groupEnd();

    // Save results
    window.MobileTestResults = this.results;
    console.log('\n💾 Results saved to: window.MobileTestResults');
    console.log('💾 Export: JSON.stringify(window.MobileTestResults)');
  }
};

// Run tests
MobileTestRunner.runTests();
