/* Rexa page rhythm runtime (pairs with assets/rhythm.css). Progressive: the page is complete without it. */
(function () {
  'use strict';
  var reduce = false;
  try { reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function init() {
    // loader: remember it has played this session (the inline head script already skips it on repeat views)
    var loader = document.getElementById('rxLoader');

    $all('.rx-hero .grid > div:last-child').forEach(function (el) { el.setAttribute('data-rx-par', '-.05'); el.classList.add('rx-pl'); });
    var pars = $all('[data-rx-par]');
    var vh = window.innerHeight || 800;
    var ticking = false;

    function frame() {
      ticking = false;
      var doc = document.documentElement;
      if (reduce) return;
      for (var i = 0; i < pars.length; i++) {
        var el = pars[i], host = el.parentNode;
        if (!host) continue;
        var r = host.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;       // off-screen: skip
        var k = parseFloat(el.getAttribute('data-rx-par')) || .15;
        var off = (r.top + r.height / 2 - vh / 2) * k;
        el.style.setProperty('--py', off.toFixed(1) + 'px');
        if (el.hasAttribute('data-rx-spin')) el.style.setProperty('--rot', (off * .12).toFixed(2) + 'deg');
      }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { vh = window.innerHeight || 800; onScroll(); });
    frame();

    // hero spotlight follows the pointer
    var hero = document.querySelector('.rx-hero');
    if (hero && !reduce && window.matchMedia && matchMedia('(hover: hover)').matches) {
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        hero.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        hero.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    }

    // CTA cards: the whole card is the click target (the real button inside stays for keyboard + screen readers)
    $all('.rx-ask').forEach(function (card) {
      card.addEventListener('click', function (e) {
        var btn = card.querySelector('.open-lead-modal');
        if (btn && !e.target.closest('button, a')) btn.click();
      });
    });


    /* ---- page-to-page: quick fade out, the next page fades in (internal links only) ---- */
    var PAGES = { '/': 1, '/index': 1, '/corporate-risk': 1, '/employee-benefits': 1, '/wellness-and-value': 1, '/retail-insurance': 1, '/about': 1, '/contact': 1, '/grievance': 1, '/privacy': 1, '/terms': 1 };
    function pagePath(u) { return u.pathname.replace(/\.html$/, '').replace(/\/+$/, '') || '/'; }
    var html = document.documentElement;
    if (!reduce) {
      document.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var a = e.target.closest && e.target.closest('a[href]');
        if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
        var u; try { u = new URL(a.href, location.href); } catch (err) { return; }
        if (u.origin !== location.origin || !PAGES[pagePath(u)]) return;
        if (pagePath(u) === pagePath(location) ) return;           // same page / in-page anchors keep smooth-scrolling
        e.preventDefault();
        try { sessionStorage.setItem('rx_nav', '1'); } catch (err) {}
        html.classList.add('rx-leaving');
        setTimeout(function () { location.href = u.href; }, 170);
        setTimeout(function () { html.classList.remove('rx-leaving'); }, 2500);   // safety if the navigation never happens
      });
      window.addEventListener('pageshow', function (ev) { if (ev.persisted) html.classList.remove('rx-leaving'); });   // back button
    }


    /* ---- cascade: sibling reveals that have no delay of their own arrive one after another ---- */
    (function cascade() {
      var groups = new Map();
      $all('.reveal, .card-reveal, [data-reveal]').forEach(function (el) {
        if (el.style.getPropertyValue('--delay') || el.closest('#rxLoader')) return;
        var p = el.parentNode; if (!groups.has(p)) groups.set(p, []); groups.get(p).push(el);
      });
      groups.forEach(function (arr) {
        if (arr.length < 2) return;
        arr.forEach(function (el, i) { el.style.setProperty('--delay', Math.min(i, 5) * 0.09 + 's'); });
      });
    })();

    /* ---- smoother scroll reveals: headings, cards and blocks rise in softly, in order ---- */
    if (!reduce && 'IntersectionObserver' in window) {
      var SKIP = '#rxLoader, nav, footer, #bioModal, #leadModal, .rx-hero, .rx-div, .reveal, .card-reveal, [data-reveal], .rx-rv, .marquee-container, .railnav, .railnav-mobile';
      var targets = $all('main section:not(.rx-hero) h2, section:not(.rx-hero) h2, section:not(.rx-hero) .eyebrow, .bento-card, .offering-card, .team-card, .rx-ask, section:not(.rx-hero) form, details, .phase, .faq-item, section:not(.rx-hero) .rx-sec-lead');
      var seen = [];
      targets = targets.filter(function (el) { if (seen.indexOf(el) > -1) return false; seen.push(el); return !el.closest(SKIP) || el.matches('.bento-card, .offering-card, .team-card, .rx-ask') && !el.closest('#rxLoader, nav, footer, #bioModal, #leadModal, .rx-hero') && !el.matches('.reveal, .card-reveal, [data-reveal]'); });
      var vh2 = window.innerHeight || 800;
      // stagger siblings that share a parent (cards in a grid, rows in a list)
      var groups = new Map();
      targets.forEach(function (el) { var p = el.parentNode; if (!groups.has(p)) groups.set(p, []); groups.get(p).push(el); });
      groups.forEach(function (arr) { arr.forEach(function (el, i) { el.style.setProperty('--rd', Math.min(i, 5) * 0.09 + 's'); }); });
      // once an element has landed, hand it back to its own styles (keeps hover lifts etc. working)
      function cleanup(el, ms) { setTimeout(function () { el.classList.remove('rx-rv', 'rx-in', 'rx-instant', 'rx-rv-scale'); el.style.removeProperty('--rd'); }, ms + 700); }
      var rio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var el = en.target;
          if (en.isIntersecting) { el.classList.add('rx-in'); rio.unobserve(el); cleanup(el, 1300); }
          else if (en.boundingClientRect.top < 0) { el.classList.add('rx-instant', 'rx-in'); rio.unobserve(el); cleanup(el, 50); }
        });
      }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
      targets.forEach(function (el) {
        var r = el.getBoundingClientRect();
        el.classList.add('rx-rv');
        if (el.matches('.bento-card, .offering-card, .team-card, .rx-ask, form')) el.classList.add('rx-rv-scale');
        rio.observe(el);
      });
      // failsafe: nothing may stay hidden
      setTimeout(function () { $all('.rx-rv:not(.rx-in)').forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < (window.innerHeight || 800)) el.classList.add('rx-in'); }); }, 3500);
    }

    /* ---- About hero figures count up ---- */
    $all('.rx-hero-center h4').forEach(function (h) {
      var m = /^\s*(\d+(?:\.\d+)?)(.*)$/.exec(h.textContent || '');
      if (!m || h.hasAttribute('data-count')) return;
      h.setAttribute('data-count', m[1]); h.setAttribute('data-suffix', m[2].trim()); h.firstChild && h.firstChild.nodeType === 3 || h.insertBefore(document.createTextNode(h.textContent), h.firstChild);
    });


    /* ---- "On this page" bar (inner pages): sections carry data-nav labels; the bar follows you down the page ---- */
    (function subnav() {
      var secs = $all('main section[data-nav]');
      if (secs.length < 3) return;
      var bar = document.createElement('nav'); bar.className = 'rx-subnav'; bar.setAttribute('aria-label', 'On this page');
      var inner = document.createElement('div'); inner.className = 'rx-subnav-in';
      var lbl = document.createElement('span'); lbl.className = 'rx-subnav-lbl'; lbl.textContent = 'On this page'; inner.appendChild(lbl);
      var links = secs.map(function (s, i) {
        if (!s.id) s.id = 'rx-sec-' + (i + 1);
        var a = document.createElement('a'); a.href = '#' + s.id; a.textContent = s.getAttribute('data-nav'); inner.appendChild(a);
        a.addEventListener('click', function (e) { e.preventDefault(); s.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); try { history.replaceState(null, '', '#' + s.id); } catch (err) {} });
        return a;
      });
      bar.appendChild(inner); document.body.appendChild(bar);
      var hero = document.querySelector('.rx-hero');
      var tick = false;
      function update() {
        tick = false;
        var y = window.pageYOffset || 0, hb = hero ? hero.offsetTop + hero.offsetHeight - 120 : 400;
        bar.classList.toggle('is-on', y > hb);
        var cur = -1, line = (window.innerHeight || 800) * .38;
        secs.forEach(function (s, i) { if (s.getBoundingClientRect().top < line) cur = i; });
        links.forEach(function (a, i) { if (i === cur) { a.setAttribute('aria-current', 'true'); } else { a.removeAttribute('aria-current'); } });
        if (cur > -1 && links[cur] && bar.classList.contains('is-on')) {   // keep the active pill in view on phones
          var l = links[cur], box = inner; if (l.offsetLeft < box.scrollLeft || l.offsetLeft + l.offsetWidth > box.scrollLeft + box.clientWidth) box.scrollTo({ left: l.offsetLeft - 40, behavior: 'smooth' });
        }
      }
      window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
      window.addEventListener('resize', update); update();
    })();


    /* ---- mobile menu: keep the hamburger/X state, page scroll-lock and Escape in sync with the menu panel ---- */
    (function menuSync() {
      var btn = document.getElementById('mobileMenuBtn'), menu = document.getElementById('mobileMenu');
      if (!btn || !menu) return;
      function sync() {
        var open = menu.classList.contains('open');
        btn.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.documentElement.classList.toggle('rx-menu-open', open);
        if (open) { var first = menu.querySelector('a'); }
      }
      var scrim = document.createElement('div'); scrim.className = 'rx-scrim'; scrim.setAttribute('aria-hidden', 'true');
      document.body.appendChild(scrim);
      scrim.addEventListener('click', function () { if (menu.classList.contains('open')) { btn.click(); } });   // tap the dimmed page to close the menu
      new MutationObserver(sync).observe(menu, { attributes: true, attributeFilter: ['class'] });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) { btn.click(); btn.focus(); } });
      window.addEventListener('resize', function () { if (window.innerWidth >= 768 && menu.classList.contains('open')) btn.click(); });
      sync();
    })();

    // count-up numbers: the markup already holds the final value
    var counters = $all('[data-count]');
    function fmt(n, dec) { return dec ? n.toFixed(dec) : String(Math.round(n)); }
    function run(el) {
      var end = parseFloat(el.getAttribute('data-count')), dec = parseInt(el.getAttribute('data-dec') || '0', 10);
      var pre = el.getAttribute('data-prefix') || '', suf = el.getAttribute('data-suffix') || '';
      var t0 = null, dur = 1600;
      function step(t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.firstChild.nodeValue = pre + fmt(end * e, dec) + suf;
        if (p < 1) requestAnimationFrame(step); else el.firstChild.nodeValue = pre + fmt(end, dec) + suf;
      }
      requestAnimationFrame(step);
    }
    if (counters.length && !reduce && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); run(en.target); } });
      }, { threshold: .4 });
      counters.forEach(function (c) { c.firstChild.nodeValue = (c.getAttribute('data-prefix') || '') + '0' + (c.getAttribute('data-suffix') || ''); io.observe(c); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

/* Email links: the address is written as "info [at] rexabroking.com" in the HTML so scrapers that read page
   source do not collect it. Here it becomes a normal mailto: link with the real address for visitors. */
(function () {
  function fix() {
    var els = document.querySelectorAll('a[data-mail]');
    for (var i = 0; i < els.length; i++) {
      var a = els[i], addr = a.getAttribute('data-mail') + '@' + 'rexabroking.com';
      a.setAttribute('href', 'mailto:' + addr);
      if (/\[at\]/.test(a.textContent)) a.textContent = addr;
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fix); else fix();
})();
