'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const {profiles}=require('./players');const root=path.resolve(__dirname,'..'),all=profiles(root),ids=new Set();
for(const p of all){
 assert(!ids.has(p.id));ids.add(p.id);assert(p.nameAr&&p.nameEn&&p.checkedAt&&p.clubId&&p.squadName);
 const sources=new Set(p.sources.map(s=>{assert(/^https:\/\//.test(s.url));return s.id;}));
 function cited(x){assert(x.sourceIds?.length,'Uncited '+p.id);x.sourceIds.forEach(id=>assert(sources.has(id),'Missing source '+id));}
 cited(p);p.career.forEach(cited);
 for(const s of p.stats||[]){cited(s);assert(s.competitionAr&&s.season&&s.clubAr&&s.through&&s.checkedAt);for(const k of ['goals','appearances','assists'])assert(s[k]===null||Number.isInteger(s[k])&&s[k]>=0);}
 assert(p.photo?.file||p.photo?.noteAr,'Missing photo gap disclosure');
 if(p.photo?.file){assert(p.photo.currentClubId===p.clubId,'Photo shirt mismatch');assert(fs.existsSync(path.join(root,'assets/players',p.photo.file)),'Missing photo asset');if(p.photo.rightsStatus==='reuse-permission-unconfirmed'){assert(p.photo.sourceUrl&&p.photo.status==='current-shirt-rights-unconfirmed');assert(!p.photo.license,'Unconfirmed image must not claim a license');}else{cited(p.photo);assert(p.photo.license&&p.photo.author);assert(p.photo.captionAr||p.photo.license==='CC0 1.0','Attribution caption required for this license');}}
 const club=JSON.parse(fs.readFileSync(path.join(root,'data/clubs',p.clubId+'.json'),'utf8'));assert(club.squad.items.some(x=>x.nameEn===p.squadName));
 const html=fs.readFileSync(path.join(root,'dist/players',p.id+'.html'),'utf8');assert(html.includes('id="career"')&&html.includes('id="sources"'));
 const clubhtml=fs.readFileSync(path.join(root,'dist/clubs',p.clubId+'.html'),'utf8');assert(clubhtml.includes('../players/'+p.id+'.html'));assert(clubhtml.includes('>'+p.squadName+'</a>'),'Squad profile link must show name alone');assert(!clubhtml.includes('← ملف اللاعب'),'Unexpected squad link label');
}
const registry=JSON.parse(fs.readFileSync(path.join(root,'data/player-coverage.json'),'utf8'));assert(registry.profileCount===all.length);assert(registry.players.length===registry.targetCount);
console.log('Player profile checks passed:',all.length+' published of '+registry.targetCount+' targets');
