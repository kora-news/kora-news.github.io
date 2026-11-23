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
