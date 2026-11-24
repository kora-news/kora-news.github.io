#!/usr/bin/env node
// Kora News static site generator - zero dependencies.
// Reads posts/*.md (YAML-ish frontmatter + markdown), writes dist/.
// Add a post: drop a new .md file in posts/ and an image in assets/img/, push.
const fs = require('fs');
const path = require('path');
const { buildClubs } = require('./clubs');
const { buildPlayers } = require('./players');
const { buildHistoricalPlayers } = require('./historical-players');
const { buildFixtures } = require('./fixtures');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const DIST = path.join(ROOT, 'dist');
const SITE_NAME = 'كورة نيوز';
const SITE_NAME_LATIN = 'KORA NEWS';
const FB_PAGE = 'https://www.facebook.com/61550609084848/';
const SITE_DESC = 'كورة نيوز - أخبار الكرة العالمية أول بأول';
const BASE_URL = (process.env.SITE_URL || 'https://kora-news.github.io').replace(/\/$/, '');
if (!/^https:\/\/[^/]+(?:\/[^?#]*)?$/.test(BASE_URL)) throw new Error('SITE_URL must be an absolute HTTPS site URL');

// ---------- frontmatter + markdown ----------
function parsePost(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error('Bad frontmatter: ' + file);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  if (!meta.title || !meta.slug || !meta.date) throw new Error('Missing required fields in ' + file);
  meta.body = m[2].trim();
  return meta;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inline(s) {
  s = esc(s);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}

function mdToHtml(md) {
  const blocks = md.split(/\n{2,}/);
  let html = '';
  for (const b of blocks) {
    const t = b.trim();
    if (!t) continue;
    if (t.startsWith('## ')) html += '<h2>' + inline(t.slice(3)) + '</h2>\n';
    else if (t.startsWith('### ')) html += '<h3>' + inline(t.slice(4)) + '</h3>\n';
    else if (/^(-|\*) /.test(t)) {
      html += '<ul>\n' + t.split('\n').map(l => '  <li>' + inline(l.replace(/^(-|\*) /, '')) + '</li>').join('\n') + '\n</ul>\n';
    } else {
      html += '<p>' + t.split('\n').map(inline).join('<br>') + '</p>\n';
    }
  }
  return html;
}

// ---------- shared chrome ----------
const LOGO_SVG = `<svg class="logo-ball" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#fff"/><path d="M24 12l7.4 5.4-2.8 8.7h-9.2l-2.8-8.7z" fill="#1a0b2e"/><path d="M24 2a22 22 0 0 1 19 11l-7.4 5.4-4.2-6.4-7.4 5.4-7.4-5.4-4.2 6.4L5 13A22 22 0 0 1 24 2z" fill="#1a0b2e" opacity=".85"/><path d="M4.6 17.2l6.8 4.9-2.6 8.1-6.6-4.8a22 22 0 0 1 2.4-8.2zm38.8 0a22 22 0 0 1 2.4 8.2l-6.6 4.8-2.6-8.1zM15 39.6l3.4-4.6h11.2l3.4 4.6a22 22 0 0 1-18 0z" fill="#1a0b2e" opacity=".85"/></svg>`;

function head(title, desc, rel, canon) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
${canon !== undefined && BASE_URL ? `<link rel="canonical" href="${BASE_URL}/${canon}">\n<meta property="og:url" content="${BASE_URL}/${canon}">` : ''}
<link rel="icon" type="image/svg+xml" href="${rel}assets/img/logo.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${rel}assets/style.css">
</head>
<body>`;
}

function header(rel, active) {
  const a = (id, href, label) => `<a href="${rel}${href}"${active === id ? ' class="active"' : ''}>${label}</a>`;
  return `<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="${BASE_URL}/">
      <span class="logo-mark">${LOGO_SVG}</span>
      <span class="brand-text"><strong>${SITE_NAME}</strong><small>${SITE_NAME_LATIN}</small></span>
    </a>
    <nav class="main-nav">
      <a href="${BASE_URL}/"${active === 'home' ? ' class="active"' : ''}>الرئيسية</a>
      ${a('matches', 'matches.html', 'المباريات والترتيب')}
      ${a('clubs', 'clubs.html', 'الأندية')}
      ${a('about', 'about.html', 'عن الموقع')}
      <a href="${FB_PAGE}" target="_blank" rel="noopener" class="nav-fb">تابعنا على فيسبوك</a>
    </nav>
  </div>
</header>`;
}

function footer(rel) {
  return `<footer class="site-footer">
  <div class="container">
    <div class="footer-brand">${LOGO_SVG}<span>${SITE_NAME} <small>${SITE_NAME_LATIN}</small></span></div>
    <p>${SITE_DESC}</p>
    <a class="fb-link" href="${FB_PAGE}" target="_blank" rel="noopener">صفحتنا على فيسبوك</a>
    <p class="copy">© ${new Date().getFullYear()} ${SITE_NAME} - جميع الحقوق محفوظة</p>
  </div>
</footer>
</body>
</html>`;
}

function websiteJsonLd() {
  if (!BASE_URL) return '';
  return '<script type="application/ld+json">' + JSON.stringify({
    '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, alternateName: SITE_NAME_LATIN,
    url: BASE_URL + '/', inLanguage: 'ar', sameAs: [FB_PAGE]
  }) + '</script>';
}

function articleJsonLd(p) {
  if (!BASE_URL) return '';
  return '<script type="application/ld+json">' + JSON.stringify({
    '@context': 'https://schema.org', '@type': 'NewsArticle', headline: p.title,
    description: p.excerpt || '', datePublished: p.date, inLanguage: 'ar',
    mainEntityOfPage: BASE_URL + '/posts/' + p.slug + '.html',
    image: [BASE_URL + '/assets/img/' + p.image],
    author: { '@type': 'Organization', name: SITE_NAME, url: BASE_URL + '/' },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: BASE_URL + '/' }
  }) + '</script>';
}

function fmtDate(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Cairo' }).format(d);
}

function card(p, rel, featured) {
  return `<article class="card${featured ? ' featured' : ''}" data-news-card data-category="${esc(p.category||'أخبار')}" data-search="${esc([p.title,p.excerpt,p.body.split(/## (?:المصادر|الصورة)/)[0],...(p.entities||[]).flatMap(e=>e.aliases)].join(' '))}">
  <a href="${rel}posts/${p.slug}.html">
    <div class="card-img"><img src="${rel}assets/img/${p.image}" alt="${esc(p.title)}" loading="${featured ? 'eager' : 'lazy'}"></div>
    <div class="card-body">
      <span class="badge">${esc(p.category || 'أخبار')}</span>
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.excerpt || '')}</p>
      <time datetime="${p.date}">${fmtDate(p.date)}</time>
    </div>
  </a>
</article>`;
}

// ---------- build ----------
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(path.join(DIST, 'posts'), { recursive: true });
fs.mkdirSync(path.join(DIST, 'assets', 'img'), { recursive: true });

const posts = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'))
  .map(f => parsePost(path.join(POSTS_DIR, f)))
  .sort((a, b) => new Date(b.date) - new Date(a.date));

if (!posts.length) throw new Error('No posts found in posts/');
const news=require('./news').createNews(ROOT,posts,esc,fmtDate);

// copy assets
for (const f of fs.readdirSync(path.join(ROOT, 'assets', 'img'))) {
  fs.copyFileSync(path.join(ROOT, 'assets', 'img', f), path.join(DIST, 'assets', 'img', f));
}
fs.copyFileSync(path.join(ROOT, 'assets', 'style.css'), path.join(DIST, 'assets', 'style.css'));
for (const file of ['clubs.css','clubs.js']) fs.copyFileSync(path.join(ROOT,'assets',file), path.join(DIST,'assets',file));

// home
const [first, ...rest] = posts;
const home = head(SITE_NAME + ' | أخبار الكرة العالمية', SITE_DESC, '', '') + websiteJsonLd() + header('', 'home') + `
<main class="container">
  <section class="news-search" aria-label="البحث في الأخبار"><h1>أخبار كورة نيوز</h1><label for="news-query">ابحث عن خبر أو نادٍ أو لاعب</label><input id="news-query" type="search" placeholder="مثال: ريال مدريد، كورتوا، انتقالات" autocomplete="off"><label for="news-category">نوع الأخبار</label><select id="news-category"><option value="">كل الأخبار</option>${[...new Set(posts.map(p=>p.category||'أخبار'))].map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select><p id="news-count" role="status" aria-live="polite">${posts.length} خبرًا</p><p id="news-empty" hidden>لا توجد أخبار مطابقة. جرّب اسمًا آخر أو اختر كل الأخبار.</p><noscript>البحث يحتاج JavaScript؛ كل الأخبار متاحة أدناه.</noscript></section>
  <section class="hero">
    <span class="hero-kicker">آخر الأخبار</span>
    ${card(first, '', true)}
  </section>
  <section class="grid">
    ${rest.map(p => card(p, '', false)).join('\n    ')}
  </section>
</main>
` + '<script src="assets/news-search.js" defer></script>' + footer('');
fs.writeFileSync(path.join(DIST, 'index.html'), home);
fs.copyFileSync(path.join(ROOT,'assets/news-search.js'),path.join(DIST,'assets/news-search.js'));

// post pages
for (const p of posts) {
  const rel = '../';
  const relatedSlugs = (p.related || '').split(',').map(x => x.trim()).filter(Boolean);
  for (const slug of relatedSlugs) {
    if (slug === p.slug || !posts.some(x => x.slug === slug)) throw new Error('Invalid related article: ' + slug);
  }
  const preferred = relatedSlugs.map(slug => posts.find(x => x.slug === slug && x.slug !== p.slug)).filter(Boolean);
  const others = news.related(p,preferred);
  const html = head(p.title + ' | ' + SITE_NAME, p.excerpt || SITE_DESC, rel, `posts/${p.slug}.html`) + articleJsonLd(p) + header(rel, '') + `
<main class="container">
  <article class="post">
    <header class="post-head">
      <span class="badge">${esc(p.category || 'أخبار')}</span>
      <h1>${esc(p.title)}</h1>
      <div class="post-meta">
        <time datetime="${p.date}">${fmtDate(p.date)}</time>
        ${p.facebook ? `<a class="fb-source" href="${p.facebook}" target="_blank" rel="noopener">المصدر على فيسبوك</a>` : ''}
      </div>
    </header>
    <figure class="post-img"><img src="${rel}assets/img/${p.image}" alt="${esc(p.title)}"></figure>
    <div class="post-body">
${mdToHtml(p.body)}    </div>
  </article>
  ${news.entityLinks(p,rel)}
  ${others.length ? `<aside class="related"><h2>اقرأ أيضًا</h2><div class="grid small">${others.map(o => card(o, rel, false)).join('')}</div></aside>` : ''}
</main>
` + footer(rel);
  fs.writeFileSync(path.join(DIST, 'posts', p.slug + '.html'), html);
}

// about
const about = head('عن الموقع | ' + SITE_NAME, SITE_DESC, '', 'about.html') + header('', 'about') + `
<main class="container">
  <article class="post about">
    <h1>عن ${SITE_NAME}</h1>
    <div class="post-body">
      <p><strong>${SITE_NAME} (${SITE_NAME_LATIN})</strong> موقع إخباري رياضي عربي متخصص في أخبار كرة القدم العالمية: الدوريات الأوروبية الكبرى، وميركاتو الانتقالات أول بأول.</p>
      <p>انطلق المشروع من صفحتنا على فيسبوك، حيث ننشر الأخبار والإحصائيات والتشكيلات الرسمية لحظة بلحظة. تابعونا هناك:</p>
      <p><a class="fb-source" href="${FB_PAGE}" target="_blank" rel="noopener">صفحة Kora News على فيسبوك</a></p>
    </div>
  </article>
</main>
` + footer('');
fs.writeFileSync(path.join(DIST, 'about.html'), about);

// 404
const nf = head('الصفحة غير موجودة | ' + SITE_NAME, SITE_DESC, '') + header('', '') + `
<main class="container"><article class="post about"><h1>الصفحة غير موجودة</h1><div class="post-body"><p>الرابط الذي تحاول الوصول إليه غير موجود. <a href="${BASE_URL}/">العودة للرئيسية</a></p></div></article></main>
` + footer('');
fs.writeFileSync(path.join(DIST, '404.html'), nf);

// Club reference section shares navigation and identity with the news site.
const playerPages = buildPlayers({root:ROOT,dist:DIST,head,header,footer,esc,fmtDate,news});
playerPages.push(...buildHistoricalPlayers({root:ROOT,dist:DIST,head,header,footer,esc,fmtDate,news}));
const clubPages = buildClubs({root:ROOT,dist:DIST,head,header,footer,esc,fmtDate,news});

const fixturePages=buildFixtures({root:ROOT,dist:DIST,head,header,footer,esc});

// feed.xml + sitemap.xml + robots.txt
const base = BASE_URL;
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>${SITE_NAME}</title><link>${base}</link><description>${SITE_DESC}</description>
${posts.map(p => `<item><title>${esc(p.title)}</title><link>${base}/posts/${p.slug}.html</link><pubDate>${new Date(p.date).toUTCString()}</pubDate><description>${esc(p.excerpt || '')}</description></item>`).join('\n')}
</channel></rss>`;
fs.writeFileSync(path.join(DIST, 'feed.xml'), feed);
const sm = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${base}/</loc></url>
${[...clubPages,...playerPages,...fixturePages].map(url=>`<url><loc>${base}/${url}</loc></url>`).join('\n')}
${posts.map(p => `<url><loc>${base}/posts/${p.slug}.html</loc></url>`).join('\n')}
</urlset>`;
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sm);
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);
fs.writeFileSync(path.join(DIST, 'googled832250a486ad6bd.html'), 'google-site-verification: googled832250a486ad6bd.html\n');

console.log('Built', posts.length, 'posts ->', DIST);
