#!/usr/bin/env node
// SAFETY GUARD: this generator predates the themed page design (data-theme heroes, <main id="main">,
// the 'On this page' markers, preload hints). Running it now would overwrite hand-maintained markup.
// Edit pages directly. Only run with --force after bringing this script and partials/ back in sync.
if (!process.argv.includes('--force')) {
  console.error('build-pages.js is disabled: it would overwrite the current page markup. Pass --force only if you have synced it first.');
  process.exit(1);
}
/**
 * Keeps the shared chrome (head assets, header/nav, footer) identical on every page.
 * Edit partials/footer.html or the NAV list below, then run `npm run build:pages`.
 * Idempotent: blocks are wrapped in <!-- @header --> / <!-- @footer --> markers after the first run.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const NAV = [
  ['Corporate Risk', '/corporate-risk'],
  ['Employee Benefits', '/employee-benefits'],
  ['Wellness &amp; Value', '/wellness-and-value'],
  ['Retail', '/retail-insurance'],
  ['About Us', '/about'],
];
// page file -> nav href that should be highlighted
const ACTIVE = {
  'corporate-risk.html': '/corporate-risk',
  'employee-benefits.html': '/employee-benefits',
  'wellness-and-value.html': '/wellness-and-value',
  'retail-insurance.html': '/retail-insurance',
  'about.html': '/about',
};
// standalone pages: own minimal layout, no shared header/footer
const STANDALONE = new Set(['404.html', '500.html']);
// pages that use styles.css (own reset) instead of the Tailwind preflight build
const STYLES_CSS_PAGES = new Set(['grievance.html', 'privacy.html', 'terms.html']);

const FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap';

function header(active) {
  const desk = NAV.map(([label, href]) => href === active
    ? `<a href="${href}" aria-current="page" class="text-sm font-semibold text-rexa-red border-b-2 border-rexa-red pb-1">${label}</a>`
    : `<a href="${href}" class="text-sm font-medium text-rexa-textMuted hover:text-rexa-navy transition-colors">${label}</a>`).join('\n                    ');
  const mob = NAV.map(([label, href], i) => `<a href="${href}"${href === active ? ' aria-current="page"' : ''} style="--i:${i}">${label}</a>`).join('\n                    ');
  return `<!-- @header -->
    <nav class="fixed top-0 inset-x-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 transition-all duration-300" id="navbar" aria-label="Primary">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-20">
                <a href="/" class="flex-shrink-0 cursor-pointer">
                    <img src="assets/rexa-wordmark.webp" alt="Rexa Insurance Broking" width="434" height="122" style="display:block;width:128px;height:auto">
                </a>

                <div class="hidden md:flex space-x-8 items-center">
                    ${desk}
                </div>

                <div class="hidden md:flex items-center">
                    <a href="/contact" class="px-5 py-2.5 rounded-full border border-rexa-navy text-rexa-navy text-sm font-medium hover:bg-rexa-navy hover:text-white transition-all">
                        Talk to an Advisor
                    </a>
                </div>

                <button id="mobileMenuBtn" class="md:hidden rx-burger" aria-label="Menu" aria-controls="mobileMenu" aria-expanded="false">
                    <i class="fas fa-bars"></i>
                </button>
            </div>
        </div>

        <div id="mobileMenu" class="md:hidden rx-menu">
            <div class="rx-menu-in">
                <div class="rx-menu-links">
                    ${mob}
                </div>
                <a href="/contact" class="rx-menu-cta" style="--i:5">Talk to an Advisor</a>
            </div>
        </div>
    </nav>
    <!-- @/header -->`;
}
const footer = '<!-- @footer -->\n' + fs.readFileSync(path.join(root, 'partials/footer.html'), 'utf8').trimEnd() + '\n    <!-- @/footer -->';

function swap(html, markerName, legacyRe, replacement, file) {
  const marked = new RegExp(`<!-- @${markerName} -->[\\s\\S]*?<!-- @/${markerName} -->`);
  if (marked.test(html)) return html.replace(marked, () => replacement);
  if (legacyRe.test(html)) return html.replace(legacyRe, () => replacement);
  throw new Error(`${file}: no ${markerName} block found`);
}

for (const file of fs.readdirSync(root).filter(f => f.endsWith('.html') && !STANDALONE.has(f))) {
  const p = path.join(root, file);
  let html = fs.readFileSync(p, 'utf8');
  const isB = STYLES_CSS_PAGES.has(file);

  // 1. header + footer
  html = swap(html, 'header', isB ? /<header class="nav">[\s\S]*?<\/header>/ : /<nav class="fixed w-full[\s\S]*?<\/nav>/, header(ACTIVE[file]), file);
  html = swap(html, 'footer', isB ? /<footer class="footer">[\s\S]*?<\/footer>/ : /<footer class="bg-rexa-navy[\s\S]*?<\/footer>/, footer, file);

  // 1b. flag JS-capable browsers early so reveal-on-scroll hiding never applies without JS
  if (!html.includes("classList.add('js')")) html = html.replace('</head>', "<script>document.documentElement.classList.add('js')</script>\n</head>");

  // 2. drop runtime Tailwind (CDN + inline config), link the compiled CSS instead
  html = html.replace(/[ \t]*<script src="https:\/\/cdn\.tailwindcss\.com"><\/script>\n?/, '');
  html = html.replace(/[ \t]*<script>\s*tailwind\.config = \{[\s\S]*?\n<\/script>\n?/, '');
  const cssHref = isB ? 'assets/tailwind-utilities.css' : 'assets/tailwind.css';
  html = html.replace(/[ \t]*<link rel="stylesheet" href="assets\/tailwind(-utilities)?\.css">\n?/, '');
  if (isB) html = html.replace(/(<link rel="stylesheet" href="styles\.css">)/, `$1\n<link rel="stylesheet" href="${cssHref}">`);
  else html = html.replace(/(<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">)/, `<link rel="stylesheet" href="${cssHref}">\n$1`);

  // keep whatever ?v= each shared asset already carries, so a rebuild never downgrades a cache-bust
  const ver = (re, dflt) => { const m = html.match(re); return m && m[1] ? m[1] : dflt; };
  const vMotionCss = ver(/assets\/motion\.css(\?v=\d+)/, '?v=20261201'), vMotionJs = ver(/assets\/motion\.js(\?v=\d+)/, '?v=20261201');
  const vRakshaCss = ver(/assets\/raksha\.css(\?v=\d+)/, '?v=20261204'), vRakshaJs = ver(/assets\/raksha\.js(\?v=\d+)/, '?v=20261204');

  // 2b. shared motion system (assets/motion.css + assets/motion.js), identical on every page
  html = html.replace(/[ \t]*<link rel="stylesheet" href="assets\/motion\.css[^"]*">\n?/, '');
  html = html.replace(/(<link rel="stylesheet" href="assets\/tailwind(?:-utilities)?\.css">)/, '$1\n<link rel="stylesheet" href="assets/motion.css' + vMotionCss + '">');
  html = html.replace(/[ \t]*<script src="assets\/motion\.js[^"]*" defer><\/script>\n?/, '');
  html = html.replace('</body>', '<script src="assets/motion.js' + vMotionJs + '" defer></script>\n</body>');

  // 2b2. illustrated product cards (assets/product-art.css), only on the four product pages
  html = html.replace(/[ \t]*<link rel="stylesheet" href="assets\/product-art\.css">\n?/, '');
  if (['corporate-risk.html', 'employee-benefits.html', 'wellness-and-value.html', 'retail-insurance.html'].includes(file)) html = html.replace(/(<link rel="stylesheet" href="assets\/motion\.css[^"]*">)/, '$1\n<link rel="stylesheet" href="assets/product-art.css">');

  // 2c. Raksha assistant (assets/raksha.css + assets/raksha.js), self-contained, on every page
  html = html.replace(/[ \t]*<link rel="stylesheet" href="assets\/raksha\.css[^"]*">\n?/, '');
  html = html.replace('</head>', '<link rel="stylesheet" href="assets/raksha.css' + vRakshaCss + '">\n</head>');
  html = html.replace(/[ \t]*<script src="assets\/raksha\.js[^"]*" defer><\/script>\n?/, '');
  html = html.replace('</body>', '<script src="assets/raksha.js' + vRakshaJs + '" defer></script>\n</body>');

  // 3. one font request everywhere (Inter + Source Serif 4)
  html = html.replace(/<link href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]*" rel="stylesheet">/, `<link href="${FONTS}" rel="stylesheet">`);
  // Font Awesome is needed by the shared nav/footer icons on every page
  if (isB && !html.includes('font-awesome')) html = html.replace('</head>', '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">\n</head>');

  // 4. styles.css pages: room for the fixed nav, and bind the nav JS
  if (isB) {
    html = html.replace(/<body([^>]*)>/, (m, attrs) => /pt-20/.test(attrs) ? m : /class="/.test(attrs) ? `<body${attrs.replace('class="', 'class="pt-20 ')}>` : `<body${attrs} class="pt-20">`);
    if (!html.includes('assets/site.js')) html = html.replace('</body>', '<script src="assets/site.js" defer></script>\n</body>');
  }
  // 5. analytics (consent-gated GA4; inert until a Measurement ID is set in assets/analytics.js).
  //    End of body, deferred — never in <head>, to protect first paint.
  html = html.replace(/[ \t]*<script src="assets\/analytics\.js" defer><\/script>\n?/, '');
  html = html.replace('</body>', '<script src="assets/analytics.js" defer></script>\n</body>');
  fs.writeFileSync(p, html);
  console.log('built', file);
}
