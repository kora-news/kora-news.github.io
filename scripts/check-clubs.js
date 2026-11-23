'use strict';
const fs=require('fs'),path=require('path');
const {CLUBS}=require('./clubs');
const root=path.resolve(__dirname,'..');
let players=0,crests=0;
for(const c of CLUBS){
 const r=JSON.parse(fs.readFileSync(path.join(root,'data/clubs',c.id+'.json'),'utf8'));
 const s=r.squad;
 if(s?.status!=='verified'||!s.items?.length||!s.checkedAt||!s.sourceIds?.length)throw Error(c.id+' missing squad');
 const names=new Set(),nums=new Set();
 for(const p of s.items){
  if(!(p.nameEn||p.nameAr)||!p.positionAr)throw Error(c.id+' incomplete player');
  if(names.has(p.nameEn||p.nameAr))throw Error(c.id+' duplicate player');names.add(p.nameEn||p.nameAr);
  if(p.number!==null&&p.number!==undefined){if(!Number.isInteger(p.number)||p.number<1||nums.has(p.number))throw Error(c.id+' invalid/duplicate shirt number');nums.add(p.number);}
 }
 const html=fs.readFileSync(path.join(root,'dist/clubs',c.id+'.html'),'utf8');
 if(!html.includes('id="squad"')||!html.includes('href="#squad"'))throw Error(c.id+' missing navigation');
 for(const p of s.items)if(!html.includes(p.nameEn||p.nameAr))throw Error(c.id+' missing rendered player');
 if(r.crest?.file){if(!fs.existsSync(path.join(root,'dist/assets/club-logos',r.crest.file)))throw Error(c.id+' missing crest file');crests++;}
 else if(r.crest?.status!=='rights-review'||!html.includes('club-crest-pending'))throw Error(c.id+' unexplained missing crest');
 players+=s.items.length;
}
console.log(`Club checks passed: ${CLUBS.length} squads, ${players} players, ${crests} crests, ${CLUBS.length-crests} disclosed rights-review placeholder`);

const ranking=JSON.parse(fs.readFileSync(path.join(root,'data/club-trophy-ranking.json'),'utf8'));
const index=fs.readFileSync(path.join(root,'dist/clubs.html'),'utf8');
if(ranking.clubs.length!==CLUBS.length)throw Error('Ranking count');
for(const t of ranking.clubs){if(t.items.reduce((n,x)=>n+x.count,0)!==t.total)throw Error(t.id+' incorrect sum');if(t.items.some(x=>!x.urls.length||x.urls.some(u=>!u.startsWith('https://'))))throw Error(t.id+' missing ranking source');}
const order=[...index.matchAll(/<article class="club-tile[^>]*>[\s\S]*?<a href="clubs\/([^".]+)\.html"/g)].map(m=>m[1]);
if(order.length!==14)throw Error('Rendered ranking incomplete');
for(let i=1;i<order.length;i++)if(ranking.clubs.find(x=>x.id===order[i-1]).total<ranking.clubs.find(x=>x.id===order[i]).total)throw Error('Ranking out of order');
console.log('Trophy ranking passed:14 clubs, sums, sources and descending display');
