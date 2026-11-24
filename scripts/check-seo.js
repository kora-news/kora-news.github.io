#!/usr/bin/env node
'use strict';
// Offline checks for generated search-discovery signals. No network requests.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const base = (process.env.SITE_URL || 'https://kora-news.github.io').replace(/\/$/, '');
const sitemap = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
assert(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'));
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
assert(urls.length > 0 && new Set(urls).size === urls.length, 'Sitemap URLs must be present and unique');
assert(urls.includes(base + '/') && !urls.includes(base + '/index.html'), 'Homepage sitemap must prefer root');
for (const url of urls) {
  const parsed = new URL(url);
  assert(url.startsWith(base + '/') && parsed.protocol === 'https:', 'Sitemap URLs must be absolute HTTPS URLs on this site');
  const relative = url.slice(base.length + 1);
  const file = path.join(dist, relative || 'index.html');
  assert(fs.existsSync(file), 'Missing sitemap target: ' + file);
  const html = fs.readFileSync(file, 'utf8');
  assert(html.includes('<link rel="canonical" href="' + url + '">'), 'Canonical must match sitemap: ' + url);
  assert(!/<meta[^>]+name="robots"[^>]+noindex/i.test(html), 'Unexpected noindex: ' + url);
  assert(html.includes('href="' + base + '/"'), 'Missing root homepage link: ' + url);
}
const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8');
assert(robots.includes('Sitemap: ' + base + '/sitemap.xml'));
assert(!robots.includes('Disallow: /'));
const posts = fs.readdirSync(path.join(root, 'posts')).filter(x => x.endsWith('.md'));
for (const filename of posts) {
  const text = fs.readFileSync(path.join(root, 'posts', filename), 'utf8');
  const slug = text.match(/^slug:\s*(.+)$/m)[1].trim();
  assert(urls.includes(base + '/posts/' + slug + '.html'), 'Article absent from sitemap: ' + slug);
  const image = text.match(/^image:\s*(.+)$/m)[1].trim();
  const article = fs.readFileSync(path.join(dist, 'posts', slug + '.html'), 'utf8');
  assert(article.includes('<meta property="og:image" content="' + base + '/assets/img/' + image.split('/').map(encodeURIComponent).join('/') + '">'), 'Missing article hero metadata: ' + slug);
  assert(/<meta property="og:image:width" content="[1-9][0-9]*">/.test(article), 'Missing image width: ' + slug);
  assert(/<meta property="og:image:height" content="[1-9][0-9]*">/.test(article), 'Missing image height: ' + slug);
  assert(article.includes('<meta name="twitter:card" content="summary_large_image">'), 'Missing large image card: ' + slug);
  const related = text.match(/^related:\s*(.+)$/m);
  if (related) for (const target of related[1].split(',').map(x => x.trim())) {
    assert(target !== slug && fs.existsSync(path.join(dist, 'posts', target + '.html')), 'Invalid related article: ' + target);
  }
}
console.log('Search-discovery checks passed: ' + urls.length + ' sitemap URLs and ' + posts.length + ' articles');
