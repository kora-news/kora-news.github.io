'use strict';
const fs=require('fs'),path=require('path');
const {profiles}=require('./players');
const root=path.resolve(__dirname,'..'),all=profiles(root),rows=[];
for(const f of fs.readdirSync(path.join(root,'data/clubs')).filter(f=>f.endsWith('.json'))){
 const c=JSON.parse(fs.readFileSync(path.join(root,'data/clubs',f),'utf8'));
 const src=c.sources.find(s=>(c.squad.sourceIds||[]).includes(s.id));
 for(const p of c.squad.items){const profile=all.find(x=>x.clubId===c.id&&x.squadName===p.nameEn);rows.push({clubId:c.id,nameEn:p.nameEn,number:p.number,positionAr:p.positionAr,squadSource:src?.url,rosterCheckedAt:c.squad.checkedAt,profileId:profile?.id||null,profileStatus:profile?'published':'research-pending',photoStatus:profile?.photo?.file?'current-shirt-verified':profile?.photo?.status||'research-pending'});}
}
fs.writeFileSync(path.join(root,'data/player-coverage.json'),JSON.stringify({scope:'Current club first-team directory players; staged profile and current-shirt photo coverage',targetCount:rows.length,profileCount:rows.filter(x=>x.profileId).length,players:rows},null,2)+'\n');
console.log('Coverage registry:',rows.filter(x=>x.profileId).length+'/'+rows.length,'profiles');
