"use strict";
const fs=require('fs'),path=require('path');
function normalize(s){return String(s).normalize('NFD').replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ـ/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();}
function createNews(root,posts,esc,fmtDate){
 const clubs=fs.readdirSync(path.join(root,'data/clubs')).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(root,'data/clubs',f),'utf8')));
 const players=require('./players').profiles(root);
 const aliases=JSON.parse(fs.readFileSync(path.join(root,'data/news-aliases.json'),'utf8'));
 const entities=[...clubs.map(c=>({key:'club:'+c.id,id:c.id,type:'clubs',name:c.nameAr,aliases:[c.nameAr,c.nameEn,...(aliases.clubs[c.id]||[])]})),...players.map(p=>({key:'player:'+p.id,id:p.id,type:'players',name:p.nameAr,aliases:[p.nameAr,p.nameEn,...(aliases.players[p.id]||[])]}))];
 const matches=(text,alias)=>(' '+normalize(text)+' ').includes(' '+normalize(alias)+' ');
 for(const p of posts){const text=[p.title,p.excerpt].join(' ');p.entities=entities.filter(e=>e.aliases.some(a=>a&&matches(text,a)));}
 function entityLinks(p,rel){if(!p.entities.length)return '';return `<aside class="news-connections" aria-label="ملفات مرتبطة بالخبر"><h2>أندية ولاعبون ذُكروا في الخبر</h2><div class="entity-links">${p.entities.map(e=>`<a href="${rel}${e.type}/${e.id}.html">${esc(e.name)} <small>${e.type==='clubs'?'ملف النادي':'ملف اللاعب'}</small></a>`).join('')}</div></aside>`;}
 function latest(type,id,rel){const list=posts.filter(p=>p.entities.some(e=>e.type===type&&e.id===id)).slice(0,4);return list.length?`<section class="news-connections"><h2>أخبار مرتبطة ${type==='clubs'?'بالنادي':'باللاعب'}</h2><ul class="linked-news">${list.map(p=>`<li><a href="${rel}posts/${p.slug}.html">${esc(p.title)}</a><time datetime="${p.date}">${fmtDate(p.date)}</time></li>`).join('')}</ul><p class="news-hint">أخبار الأرشيف بتاريخ نشرها؛ ليست تحديثًا مباشرًا أو إثباتًا للحالة الحالية.</p></section>`:'';}
 function related(p,preferred){const keys=new Set(p.entities.map(e=>e.key));return [...preferred,...posts.filter(x=>x.slug!==p.slug&&!preferred.includes(x)).map(x=>({x,score:x.entities.reduce((n,e)=>n+(keys.has(e.key)?(e.type==='players'?4:2):0),0)})).filter(o=>o.score>0).sort((a,b)=>b.score-a.score||new Date(b.x.date)-new Date(a.x.date)).map(o=>o.x)].slice(0,3);}
 return {entityLinks,latest,related};
}
module.exports={createNews,normalize};
