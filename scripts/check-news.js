'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..'),dist=path.join(root,'dist');
const read=p=>fs.readFileSync(path.join(dist,p),'utf8');
const home=read('index.html');assert(home.includes('id="news-query"'));assert(home.includes('id="news-category"'));assert(home.includes('id="news-empty"'));assert(home.includes('assets/news-search.js'));
const article=read('posts/mourinho-vinicius-starts-psv-courtois-conference.html');assert(article.includes('../players/thibaut-courtois.html'));assert(article.includes('../clubs/real-madrid.html'));assert(article.includes('class="related"'));
assert(read('players/thibaut-courtois.html').includes('class="linked-news"'));assert(read('clubs/real-madrid.html').includes('class="linked-news"'));
let links=0;
for(const dir of ['posts','clubs','players'])for(const f of fs.readdirSync(path.join(dist,dir)).filter(f=>f.endsWith('.html'))){for(const m of read(dir+'/'+f).matchAll(/href="(\.\.\/(?:posts|players|clubs)\/[^"#]+\.html)"/g)){assert(fs.existsSync(path.resolve(dist,dir,m[1])),dir+'/'+f+' broken '+m[1]);links++;}}
const norm=require('./news').normalize;assert.equal(norm('أَرْسَنَال'),norm('ارسنال'));assert.equal(norm('Mbappé'),norm('Mbappe'));
console.log('News-discovery checks passed: search controls, reciprocal links, related stories and '+links+' internal targets');
