require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const { contactRateLimiter } = require('../middleware/rateLimit');
const { initializeEmailService } = require('../utils/emailService');
const contactRoutes = require('../routes/contact');
const leadRoutes = require('../routes/lead');

const app = express();
const PORT = process.env.PORT || 3000;

// Determine the correct base directory
const baseDir = path.resolve(__dirname, '..');

// Initialize email service
initializeEmailService();

// Behind Vercel's proxy: trust X-Forwarded-For so rate limiting is per visitor, not per proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  permissionsPolicy: {
    geolocation: ['(self)'],
    camera: [],
    microphone: []
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // 'unsafe-inline' is needed because pages are served as static HTML
      // (no templating/nonce support); cdn.tailwindcss.com powers the
      // Tailwind-based homepage, which generates its CSS via this script.
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com', 'https://www.google.com', 'https://www.gstatic.com', 'https://www.googletagmanager.com'],
      // reCAPTCHA v3 loads a hidden iframe and posts to google.com
      frameSrc: ['https://www.google.com', 'https://recaptcha.google.com'],
      // GA4 (assets/analytics.js) sends events to these hosts
      connectSrc: ["'self'", 'https://www.google.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com'],
      // helmet defaults this to 'none', which silently breaks onclick="" and
      // the onerror="" logo-fallback handlers used throughout every page.
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      imgSrc: ["'self'", 'data:', 'https://*.google-analytics.com', 'https://*.googletagmanager.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      // Only upgrade to https in production; on http://localhost it makes
      // browsers request CSS/JS over https and the pages render unstyled.
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' || process.env.VERCEL ? [] : null
    }
  }
}));

// CORS configuration
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      process.env.CORS_ORIGIN || 'https://www.rexabroking.com',
      (process.env.CORS_ORIGIN || 'https://www.rexabroking.com').replace('://www.', '://'),
      'http://localhost:3000',
      'http://localhost:8000',
      'http://127.0.0.1:8000',
      'http://127.0.0.1:3000'
    ];

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      const err = new Error('Not allowed by CORS');
      err.status = 403;
      callback(err);
    }
  },
  optionsSuccessStatus: 200,
  credentials: false // the site uses no cookies or sessions, so credentialed cross-origin requests are never needed
};
app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: false })); // simple parser: no nested-object (qs) parsing surface

// API responses are never cached
app.use('/api', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

// RFC 9116: where to report a security problem
app.get('/.well-known/security.txt', (req, res) => {
  res.type('text/plain').send('Contact: mailto:info@rexabroking.com\nExpires: 2027-11-30T00:00:00.000Z\nPreferred-Languages: en\nCanonical: https://www.rexabroking.com/.well-known/security.txt\n');
});

// Don't serve the error pages as 200s if someone requests them directly
app.get(['/404', '/404.html'], (req, res) => res.status(404).sendFile(path.join(baseDir, '404.html')));
app.get(['/500', '/500.html'], (req, res) => res.status(500).sendFile(path.join(baseDir, '500.html')));

// Serve ONLY public files. The project root holds server source, docs and
// config, so it must never be served wholesale.
const cacheHeaders = (res, filePath) => {
  if (/\.(png|jpe?g|webp|avif|svg|ico|woff2?)$/i.test(filePath)) {
    res.setHeader('Cache-Control', 'public, max-age=2592000');
  } else if (/\.(css|js)$/i.test(filePath)) {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
};
const PUBLIC_ROOT_FILES = new Set([
  'styles.css', 'app.js', 'lead-form.js', 'offers.json',
  'robots.txt', 'sitemap.xml', 'llms.txt'
]);
app.use('/assets', express.static(path.join(baseDir, 'assets'), { setHeaders: cacheHeaders }));
app.use('/logos', express.static(path.join(baseDir, 'logos'), { setHeaders: cacheHeaders }));
// reCAPTCHA site key comes from the RECAPTCHA_SITE_KEY env var (no key is hard-coded in the pages).
// This script sets window.__RECAPTCHA_SITE_KEY__ and loads Google's api.js with that same key,
// so the browser and the server secret always come from the same key pair.
const cleanSiteKey = (v) => String(v || '').trim().replace(/^["']+|["']+$/g, '').trim();
app.get('/recaptcha-config.js', (req, res) => {
  const key = cleanSiteKey(process.env.RECAPTCHA_SITE_KEY);
  res.type('application/javascript').set('Cache-Control', 'no-cache');
  if (!/^6L[A-Za-z0-9_-]{30,60}$/.test(key)) {
    console.error('[recaptcha] RECAPTCHA_SITE_KEY is missing or malformed; the forms cannot load reCAPTCHA');
    return res.send('console.error("reCAPTCHA is not configured");');
  }
  const k = JSON.stringify(key);
  // Google's api.js is heavy, so it loads only when it is needed: on the first interaction
  // (scroll, touch, key, pointer), a form submit (the form code calls window.__loadRecaptcha),
  // or after a long idle fallback. window.__RECAPTCHA_SITE_KEY__ is available immediately.
  res.send(
    `window.__RECAPTCHA_SITE_KEY__=${k};` +
    `(function(){var done=false;function load(){if(done)return;done=true;` +
    `['scroll','touchstart','pointerdown','keydown','focusin'].forEach(function(e){window.removeEventListener(e,load,true);});` +
    `var s=document.createElement('script');` +
    `s.src='https://www.google.com/recaptcha/api.js?render='+encodeURIComponent(${k});` +
    `s.async=true;s.onload=function(){window.recaptchaReady=true;};document.head.appendChild(s);}` +
    `window.__loadRecaptcha=load;` +
    `['scroll','touchstart','pointerdown','keydown','focusin'].forEach(function(e){window.addEventListener(e,load,{capture:true,once:true,passive:true});});` +
    `setTimeout(load,15000);})();`
  );
});
app.get('/:file', (req, res, next) => {
  if (!PUBLIC_ROOT_FILES.has(req.params.file)) return next();
  cacheHeaders(res, req.params.file);
  res.sendFile(path.join(baseDir, req.params.file));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Redirect .html requests to clean URLs
app.get('/:page.html', (req, res) => {
  res.redirect(301, `/${req.params.page}`);
});

// Routes for HTML pages (clean URLs without .html)
app.get('/', (req, res) => {
  res.sendFile(path.join(baseDir, 'index.html'));
});

// Helper function to serve HTML files
const serveFile = (filename) => {
  return (req, res) => {
    const filepath = path.join(baseDir, filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).sendFile(path.join(baseDir, '404.html'));
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.sendFile(filepath);
  };
};

// Routes - handle both with and without trailing slashes
app.get('/contact', serveFile('contact.html'));
app.get('/contact/', serveFile('contact.html'));

// Retired pages (see docs/removed-pages.md) — keep old links and search results working
app.get(['/general', '/general/', '/general.html'], (req, res) => res.redirect(301, '/corporate-risk'));

app.get('/corporate-risk', serveFile('corporate-risk.html'));
app.get('/corporate-risk/', serveFile('corporate-risk.html'));

app.get('/employee-benefits', serveFile('employee-benefits.html'));
app.get('/employee-benefits/', serveFile('employee-benefits.html'));

app.get('/wellness-and-value', serveFile('wellness-and-value.html'));
app.get('/wellness-and-value/', serveFile('wellness-and-value.html'));

app.get('/retail-insurance', serveFile('retail-insurance.html'));
app.get('/retail-insurance/', serveFile('retail-insurance.html'));

app.get(['/life', '/life/', '/life.html'], (req, res) => res.redirect(301, '/employee-benefits'));

app.get('/about', serveFile('about.html'));
app.get('/about/', serveFile('about.html'));

app.get('/privacy', serveFile('privacy.html'));
app.get('/privacy/', serveFile('privacy.html'));

app.get('/terms', serveFile('terms.html'));
app.get('/terms/', serveFile('terms.html'));

app.get('/grievance', serveFile('grievance.html'));
app.get('/grievance/', serveFile('grievance.html'));

// Contact form API with rate limiting
app.use('/api/contact', contactRateLimiter, contactRoutes);
app.use('/api/lead', contactRateLimiter, leadRoutes);

// 404 handler: real 404 status (never redirect to the homepage — that creates soft-404s).
// API calls get JSON, missing assets get a bare 404, pages get the branded fallback.
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Endpoint not found' });
  }
  if (/\.[a-z0-9]{2,5}$/i.test(req.path) && !/\.html$/i.test(req.path)) {
    return res.status(404).type('text/plain').send('Not found');
  }
  res.status(404).sendFile(path.join(baseDir, '404.html'));
});

// Error handler: honours client-error statuses (bad JSON, body too large,
// CORS) instead of reporting them as 500s.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 500 ? err.status : 500;
  const wantsJson = req.path.startsWith('/api/') || req.accepts(['html', 'json']) === 'json';
  if (status === 500 && !wantsJson) {
    return res.status(500).sendFile(path.join(baseDir, '500.html'));
  }
  const messages = { 400: 'Invalid request', 403: 'Request not allowed', 413: 'Request too large' };
  return res.status(status).json({
    success: false,
    message: status === 500 ? 'Internal server error' : (messages[status] || 'Invalid request')
  });
});

// Export for Vercel serverless functions
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT);
}
