/*!
 * Rexa — Google Analytics 4, consent-gated.
 *
 * SETUP: paste your GA4 Measurement ID (G-XXXXXXXXXX) into GA_MEASUREMENT_ID below.
 *   Empty (the default) = analytics fully OFF: no requests, no banner, no cookies.
 *   See docs/analytics.md.
 *
 * PUBLIC API (always defined, safe to call even when analytics is off):
 *   rexaTrack(name, params)  Send a GA4 event. Params are scrubbed: anything that looks
 *                            like an email address or phone number is dropped. Never pass
 *                            what a visitor typed into a form or into Raksha.
 *                            e.g. rexaTrack('raksha_open'), rexaTrack('generate_lead', {source:'contact'})
 *   rexaOpenConsent()        Re-open the consent banner (also bound to any [data-consent-settings]).
 *
 * AUTO EVENTS (no markup needed): click_to_call, click_email, cta_click, nav_click,
 *   outbound_click, scroll_depth (25/50/75/90). generate_lead is sent by lead-form.js and contact.html.
 *
 * Privacy: Consent Mode v2 (everything denied until the visitor accepts), IP anonymised,
 *   Google signals + ad personalisation off, Do Not Track / Global Privacy Control honoured.
 */
(function () {
  'use strict';

  /* ===================== CONFIG ===================== */
  var GA_MEASUREMENT_ID = ''; // e.g. 'G-ABC123XYZ9'
  /* ================================================== */

  var STORAGE_KEY = 'rexa_consent_v1';
  var enabled = /^G-[A-Z0-9]{6,}$/i.test(GA_MEASUREMENT_ID);
  var ready = false; // gtag bootstrapped

  // Always-defined public API (no-ops until enabled & bootstrapped).
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  var PII_RE = /@|\d[\d\s().-]{6,}\d/; // email-ish or phone-ish
  function scrub(params) {
    var out = {};
    if (!params || typeof params !== 'object') return out;
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (typeof v === 'number' || typeof v === 'boolean') { out[k] = v; return; }
      if (typeof v === 'string' && !PII_RE.test(v)) out[k] = v.slice(0, 100);
    });
    return out;
  }
  function send(name, params) { // internal: params already trusted
    if (!enabled || !ready) return;
    try { gtag('event', name, params || {}); } catch (e) {}
  }
  window.rexaTrack = function (name, params) {
    try {
      if (typeof name !== 'string' || !name) return;
      send(name, scrub(params));
    } catch (e) {}
  };
  window.rexaOpenConsent = function () {};

  // Settings links ship hidden in the markup and are only revealed when analytics is actually on.
  function showSettingsLinks() {
    try {
      document.querySelectorAll('[data-consent-settings]').forEach(function (el) {
        el.hidden = false;
        el.classList.remove('hidden');
        el.classList.add('inline-block');
      });
    } catch (e) {}
  }

  if (!enabled) return;

  /* ---------- storage (blocked-safe) ---------- */
  var storageOK = false;
  var memoryChoice = null;
  try {
    window.localStorage.setItem('__rexa_t', '1');
    window.localStorage.removeItem('__rexa_t');
    storageOK = true;
  } catch (e) {}
  function readChoice() {
    if (!storageOK) return memoryChoice;
    try {
      var v = window.localStorage.getItem(STORAGE_KEY);
      return v === 'granted' || v === 'denied' ? v : null;
    } catch (e) { return memoryChoice; }
  }
  function writeChoice(v) {
    memoryChoice = v;
    if (!storageOK) return;
    try { window.localStorage.setItem(STORAGE_KEY, v); } catch (e) {}
  }

  /* ---------- privacy signals ---------- */
  var optedOutByBrowser = (navigator.globalPrivacyControl === true) ||
    (navigator.doNotTrack === '1' || window.doNotTrack === '1');

  /* ---------- page type ---------- */
  function pagePath() {
    var p = (location.pathname || '/').replace(/\.html$/, '').replace(/\/+$/, '') || '/';
    return p === '/index' ? '/' : p;
  }
  function pageType(p) {
    if (p === '/' || p === '/index') return 'home';
    if (/^\/(corporate-risk|employee-benefits|wellness-and-value|retail-insurance)$/.test(p)) return 'product';
    if (p === '/about') return 'about';
    if (p === '/contact') return 'contact';
    if (/^\/(privacy|terms|grievance)$/.test(p)) return 'legal';
    return 'other';
  }

  /* ---------- bootstrap gtag (consent default FIRST) ---------- */
  var initial = optedOutByBrowser ? 'denied' : readChoice();
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });
  if (initial === 'granted') gtag('consent', 'update', { analytics_storage: 'granted' });
  gtag('js', new Date());
  var ptype = pageType(pagePath());
  gtag('set', 'user_properties', { page_type: ptype });
  gtag('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    send_page_view: true,
    page_type: ptype
  });
  ready = true;
  try {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
    document.head.appendChild(s);
  } catch (e) {}

  function applyConsent(v) {
    writeChoice(v);
    try { gtag('consent', 'update', { analytics_storage: v === 'granted' ? 'granted' : 'denied' }); } catch (e) {}
  }

  /* ---------- banner ---------- */
  var CSS = [
    '.rx-consent{position:fixed;left:24px;bottom:24px;z-index:9990;max-width:420px;width:calc(100% - 48px);box-sizing:border-box;',
    'background:#0A1128;color:#fff;border-radius:16px;padding:20px;box-shadow:0 20px 50px -12px rgba(10,17,40,.55);',
    'font:14px/1.5 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;border:1px solid rgba(255,255,255,.1)}',
    '.rx-consent[hidden]{display:none}',
    '.rx-consent h2{margin:0 0 6px;font:700 15px/1.3 "Source Serif 4",Georgia,serif;letter-spacing:0;color:#fff}',
    '.rx-consent p{margin:0 0 14px;color:rgba(255,255,255,.78);font-size:13px;line-height:1.55}',
    '.rx-consent a{color:#fff;text-decoration:underline;text-underline-offset:2px}',
    '.rx-consent-row{display:flex;gap:10px;flex-wrap:wrap}',
    '.rx-consent button{font:600 14px/1 Inter,system-ui,sans-serif;min-height:44px;padding:0 18px;border-radius:999px;cursor:pointer;flex:1 1 auto;',
    'border:1px solid transparent;-webkit-tap-highlight-color:transparent}',
    '.rx-consent button:focus-visible{outline:2px solid #fff;outline-offset:2px}',
    '.rx-consent .rx-accept{background:#E61C24;color:#fff}',
    '.rx-consent .rx-accept:hover{background:#CC1820}',
    '.rx-consent .rx-decline{background:transparent;color:#fff;border-color:rgba(255,255,255,.4)}',
    '.rx-consent .rx-decline:hover{border-color:#fff}',
    '@media (prefers-reduced-motion:no-preference){.rx-consent{animation:rxConsentIn .35s ease-out both}',
    '@keyframes rxConsentIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}}',
    '@media (max-width:640px){.rx-consent{left:0;right:0;bottom:0;width:100%;max-width:none;border-radius:16px 16px 0 0;',
    'padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px))}}',
    /* keep the Raksha launcher clear of the banner on phones */
    '@media (max-width:640px){html.consent-open #rohiniWidget{bottom:calc(var(--consent-h,120px) + 12px)}}'
  ].join('');

  var banner = null, opener = null;

  function setOpenState(open) {
    var root = document.documentElement;
    if (open && banner) {
      root.style.setProperty('--consent-h', banner.offsetHeight + 'px');
      root.classList.add('consent-open');
    } else {
      root.classList.remove('consent-open');
      root.style.removeProperty('--consent-h');
    }
  }

  function closeBanner(restoreFocus) {
    if (!banner) return;
    banner.hidden = true;
    setOpenState(false);
    if (restoreFocus && opener && typeof opener.focus === 'function') { try { opener.focus(); } catch (e) {} }
    opener = null;
  }

  function buildBanner() {
    if (banner) return banner;
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    banner = document.createElement('div');
    banner.className = 'rx-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Analytics preferences');
    banner.hidden = true;
    banner.innerHTML =
      '<h2>Help us improve this site</h2>' +
      '<p></p>' +
      '<div class="rx-consent-row"></div>';
    document.body.appendChild(banner);
    window.addEventListener('resize', function () {
      if (banner && !banner.hidden) setOpenState(true);
    });
    banner.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeBanner(true); }
    });
    return banner;
  }

  function showBanner(manual) {
    buildBanner();
    var p = banner.querySelector('p');
    var row = banner.querySelector('.rx-consent-row');
    row.innerHTML = '';
    function btn(cls, label, fn) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = cls; b.textContent = label;
      b.addEventListener('click', fn);
      row.appendChild(b);
      return b;
    }
    var first;
    if (optedOutByBrowser) {
      p.innerHTML = 'Your browser is sending a Do Not Track / Global Privacy Control signal, so analytics stays off. ' +
        'Read our <a href="/privacy">Privacy Policy</a>.';
      first = btn('rx-decline', 'OK', function () { closeBanner(true); });
    } else {
      p.innerHTML = 'With your permission we use Google Analytics to see which pages are visited and which buttons are clicked. ' +
        'It is anonymised and never includes what you type into forms or chat. See our <a href="/privacy">Privacy Policy</a>.';
      first = btn('rx-accept', 'Accept analytics', function () { applyConsent('granted'); closeBanner(manual); });
      btn('rx-decline', 'Decline', function () { applyConsent('denied'); closeBanner(manual); });
    }
    banner.hidden = false;
    setOpenState(true);
    if (manual && first) { try { first.focus(); } catch (e) {} }
  }

  window.rexaOpenConsent = function () {
    try {
      opener = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
      showBanner(true);
    } catch (e) {}
  };

  function init() {
    showSettingsLinks();
    // Show on first visit only. If storage is blocked we cannot remember a choice, so treat as
    // declined and stay quiet (no nagging on every page); the settings link still works.
    if (!optedOutByBrowser && storageOK && readChoice() === null) showBanner(false);

    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-consent-settings]') : null;
      if (t) { e.preventDefault(); window.rexaOpenConsent(); }
    });
  }

  /* ---------- auto events ---------- */
  function clean(txt) { return (txt || '').replace(/\s+/g, ' ').trim().slice(0, 60); }
  function samePage() { return pagePath(); }

  document.addEventListener('click', function (e) {
    try {
      var el = e.target && e.target.closest ? e.target.closest('a,button,[data-cta]') : null;
      if (!el) return;
      var loc = samePage();
      var label = clean(el.getAttribute('data-cta') || el.getAttribute('aria-label') || el.textContent);
      var href = el.tagName === 'A' ? (el.getAttribute('href') || '') : '';

      if (/^tel:/i.test(href)) { send('click_to_call', { contact_point: href.slice(4), location: loc }); return; }
      if (/^mailto:/i.test(href)) { send('click_email', { contact_point: href.slice(7).split('?')[0], location: loc }); return; }

      var a = el.tagName === 'A' ? el : null;
      var url = null;
      if (a && /^https?:/i.test(a.href || '')) { try { url = new URL(a.href, location.href); } catch (x) {} }
      var external = url && url.hostname !== location.hostname;
      var toContact = url && !external && /^\/contact(\.html)?\/?$/.test(url.pathname);
      var inNav = !!el.closest('#navbar');

      if (inNav) {
        if (toContact) send('cta_click', { label: label, location: 'header' });
        else if (a && !external) send('nav_click', { label: label, destination: url ? url.pathname : '' });
        else if (external) send('outbound_click', { link_domain: url.hostname, link_url: url.origin + url.pathname });
        return;
      }
      if (external) { send('outbound_click', { link_domain: url.hostname, link_url: url.origin + url.pathname }); return; }
      if (toContact || el.closest('.open-lead-modal,[data-cta]')) {
        send('cta_click', { label: label, location: loc });
      }
    } catch (err) {}
  }, true);

  /* ---------- scroll depth (throttled, once per threshold) ---------- */
  (function () {
    var marks = [25, 50, 75, 90], fired = {}, ticking = false;
    function check() {
      ticking = false;
      var doc = document.documentElement;
      var total = Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0);
      if (total <= window.innerHeight * 1.2) return; // page fits on screen: depth is meaningless
      var pct = ((window.pageYOffset || doc.scrollTop) + window.innerHeight) / total * 100;
      marks.forEach(function (m) {
        if (!fired[m] && pct >= m) { fired[m] = true; send('scroll_depth', { percent: m, location: pagePath() }); }
      });
    }
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      (window.requestAnimationFrame || function (f) { return setTimeout(f, 100); })(check);
    }, { passive: true });
  })();

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
