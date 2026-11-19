/* Rexa shared motion runtime — pairs with assets/motion.css.
 * One IntersectionObserver reveals `.reveal, .card-reveal, [data-reveal], .bar-fill`
 * (adds both `in-view` and `in`), pauses floating elements while off-screen,
 * and pops index.html's `.offering-icon` badges. A tiny scroll "sweep" backs the
 * observer up for the cases it can't see: content jumped clean over between frames
 * (anchor links, restored scroll) and content parked in the last few % of the page.
 * Everything is wrapped so it can never throw into other scripts, and every
 * failure path shows the content. */
(function () {
  'use strict';

  var REVEAL_SEL = '.reveal, .card-reveal, [data-reveal], .bar-fill';
  var FLOAT_SEL = '.float-a, .float-b, .animate-float';
  var ICON_SEL = '.offering-icon';

  function toArray(list) { return Array.prototype.slice.call(list); }
  function show(el) { el.classList.add('in-view'); el.classList.add('in'); }
  function showIcon(el) { el.classList.add('icon-in'); }

  function init() {
    var reduce = false;
    try { reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

    var reveals = toArray(document.querySelectorAll(REVEAL_SEL));
    var icons = toArray(document.querySelectorAll(ICON_SEL));
    var floats = toArray(document.querySelectorAll(FLOAT_SEL));

    // No observer support, or the user asked for no motion: show everything now.
    if (!('IntersectionObserver' in window) || reduce) {
      reveals.forEach(show);
      icons.forEach(showIcon);
      return;
    }

    var pending = [];                       // { el, apply, io } still waiting to be revealed
    var vh = window.innerHeight || document.documentElement.clientHeight || 800;

    function reveal(item, instant) {
      if (item.done) return;
      item.done = true;
      // Already scrolled past: no point animating something nobody can see.
      if (instant) item.el.classList.add('is-instant');
      item.apply(item.el);
      try { item.io.unobserve(item.el); } catch (e) {}
    }

    function makeObserver(options) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var item = en.target.__motion;
          if (!item || item.done) return;
          if (en.isIntersecting) reveal(item, false);
          else if (en.boundingClientRect.top < 0) reveal(item, true);
        });
      }, options);
      return io;
    }

    var ioNormal = makeObserver({ threshold: 0.05, rootMargin: '0px 0px 6% 0px' });   // start the fade as the block arrives, not after it has already scrolled into view
    // Elements so tall that 12% of them can never be visible at once would never
    // fire with a ratio threshold, so they use "any overlap" instead.
    var ioTall = makeObserver({ threshold: 0, rootMargin: '0px 0px 6% 0px' });
    var ioIcon = icons.length ? makeObserver({ threshold: 0.4, rootMargin: '0px 0px -10% 0px' }) : null;

    function track(el, apply, io) {
      var item = { el: el, apply: apply, io: io, done: false };
      el.__motion = item;
      pending.push(item);
      io.observe(el);
    }
    reveals.forEach(function (el) {
      var h = el.getBoundingClientRect().height;
      track(el, show, h * 0.12 > vh * 0.9 ? ioTall : ioNormal);
    });
    icons.forEach(function (el) { track(el, showIcon, ioIcon); });

    // Sweep: the observer only reports *changes*, so an element jumped over in a
    // single frame, or one sitting in the last few % of the page, would never
    // fire. Cheap (pending shrinks as things reveal) and rAF-throttled.
    var queued = false;
    function sweep() {
      queued = false;
      var h = window.innerHeight || vh;
      var doc = document.documentElement;
      var atBottom = (window.pageYOffset || doc.scrollTop || 0) + h >= doc.scrollHeight - 4;
      pending = pending.filter(function (item) {
        if (item.done) return false;
        var r = item.el.getBoundingClientRect();
        if (r.bottom < 0) { reveal(item, true); return false; }
        if (r.top < 0 || (atBottom && r.top < h)) { reveal(item, false); return false; }
        return true;
      });
      if (!pending.length) {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
      }
    }
    function schedule() {
      if (queued) return;
      queued = true;
      (window.requestAnimationFrame || window.setTimeout)(sweep, 16);
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);
    schedule();

    // Pause infinite float animations while off-screen (battery on phones).
    if (floats.length) {
      var ioFloat = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          en.target.classList.toggle('is-paused', !en.isIntersecting);
        });
      }, { threshold: 0, rootMargin: '80px 0px' });
      floats.forEach(function (el) { ioFloat.observe(el); });
    }
  }

  function safeInit() {
    try { init(); } catch (err) {
      // Fail safe: never leave content hidden.
      try {
        toArray(document.querySelectorAll(REVEAL_SEL)).forEach(show);
        toArray(document.querySelectorAll(ICON_SEL)).forEach(showIcon);
      } catch (e2) {}
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', safeInit);
  else safeInit();
})();
