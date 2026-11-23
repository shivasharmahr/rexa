#!/usr/bin/env node
/*
 * Minify the site's own CSS and JS.
 *
 *   npm run build:min
 *
 * The readable files stay the source of truth. This writes minified copies next to them
 * (all inside /assets, which the server already serves) and the pages load the .min files.
 * Re-run it after editing any source file below, then commit the .min files too:
 * Vercel does not run a build step for this project.
 *
 * Not minified here: assets/tailwind*.css (already minified by `npm run build:css`).
 */
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');

// [source, output]  (outputs live in /assets so relative url() and script-relative paths keep working)
const FILES = [
  ['assets/rhythm.css', 'assets/rhythm.min.css'],
  ['assets/motion.css', 'assets/motion.min.css'],
  ['assets/team.css', 'assets/team.min.css'],
  ['assets/product-art.css', 'assets/product-art.min.css'],
  ['assets/raksha.css', 'assets/raksha.min.css'],
  ['styles.css', 'assets/styles.min.css'],
  ['assets/rhythm.js', 'assets/rhythm.min.js'],
  ['assets/motion.js', 'assets/motion.min.js'],
  ['assets/analytics.js', 'assets/analytics.min.js'],
  ['assets/site.js', 'assets/site.min.js'],
  ['assets/raksha.js', 'assets/raksha.min.js'],
  ['app.js', 'assets/app.min.js'],
  ['lead-form.js', 'assets/lead-form.min.js']
];

let before = 0, after = 0;
for (const [src, out] of FILES) {
  const srcPath = path.join(root, src);
  if (!fs.existsSync(srcPath)) { console.warn('skip (missing): ' + src); continue; }
  const code = fs.readFileSync(srcPath, 'utf8');
  const loader = src.endsWith('.css') ? 'css' : 'js';
  // Classic scripts, not modules: esbuild keeps top-level names, so inline onclick="" handlers keep working.
  const result = esbuild.transformSync(code, { loader, minify: true, target: loader === 'js' ? 'es2017' : 'chrome80', legalComments: 'none' });
  fs.writeFileSync(path.join(root, out), result.code);
  before += Buffer.byteLength(code); after += Buffer.byteLength(result.code);
  console.log(out.padEnd(34), (Buffer.byteLength(code) / 1024).toFixed(1).padStart(6) + ' KB ->', (Buffer.byteLength(result.code) / 1024).toFixed(1).padStart(6) + ' KB');
}
console.log('total'.padEnd(34), (before / 1024).toFixed(1).padStart(6) + ' KB ->', (after / 1024).toFixed(1).padStart(6) + ' KB');
