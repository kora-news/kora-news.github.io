'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),{historicalProfiles,historyByName,norm}=require('./historical-players'),{profiles}=require('./players');
const all=historicalProfiles(root),current=profiles(root),currentIds=new Set(current.map(p=>p.id)),ids=new Set(),names=new Set();
const targets=JSON.parse(fs.readFileSync(path.join(root,'data/historical-player-targets.json'),'utf8'));
assert.equal(targets.length,152,'Historical target inventory changed unexpectedly');
assert.equal(new Set(targets.map(t=>norm(t.nameEn))).size,targets.length);
for(const p of all){
 assert(/^[a-z0-9-]+$/.test(p.id));assert(!ids.has(p.id),'Duplicate historical id');ids.add(p.id);
 assert(p.nameAr&&p.nameEn&&p.summaryAr&&p.checkedAt&&p.sources?.length&&p.associations?.length&&p.achievements?.length,'Incomplete historical profile '+p.id);
 const key=norm(p.nameEn);assert(!names.has(key),'Duplicate historical identity');names.add(key);
 const target=targets.find(t=>norm(t.nameEn)===key);assert(target,'Out-of-scope historical identity '+p.id);assert(target.clubIds.every(c=>p.associations.some(a=>a.clubId===c)),'Missing target club association '+p.id);
 const sources=new Set(p.sources.map(s=>{assert(/^https:\/\//.test(s.url),'Invalid source');return s.id;}));
 const cited=x=>{assert(x.sourceIds?.length,'Uncited historical fact '+p.id);for(const id of x.sourceIds)assert(sources.has(id),'Missing historical source '+id);};
 cited(p);p.associations.forEach(a=>{assert(fs.existsSync(path.join(root,'data/clubs',a.clubId+'.json')));assert(a.textAr);cited(a);});p.achievements.forEach(a=>{assert(a.labelAr&&a.textAr);cited(a);});
 if(p.existingProfileId){assert(currentIds.has(p.existingProfileId));assert(!p.photo?.file,'Existing player portrait must be preserved');}
 else {assert(!currentIds.has(p.id),'Historical profile collides with current');assert(p.photo?.file&&p.photo.sourceUrl&&p.photo.pageUrl,'Historical photo lacks provenance');assert(/^https:\/\//.test(p.photo.sourceUrl)&&/^https:\/\//.test(p.photo.pageUrl));assert(fs.existsSync(path.join(root,'assets/players',p.photo.file)));if(p.photo.rightsStatus==='reuse-permission-unconfirmed')assert(!p.photo.license,'Do not invent open license');else assert(p.photo.license&&p.photo.author&&p.photo.captionAr,'Licensed image requires attribution');}
 if(p.photo?.license?.startsWith('CC '))assert(/^https:\/\/creativecommons\.org\//.test(p.photo.licenseUrl||''),'Missing actual license link '+p.id);
 const profileId=p.existingProfileId||p.id,html=fs.readFileSync(path.join(root,'dist/players',profileId+'.html'),'utf8');assert(html.includes('id="historical-achievements"'));assert(html.includes('id="historical-sources"'));if(!p.existingProfileId)assert(!html.includes('بقميص ناديه الحالي')&&!html.includes('إحصاءات الموسم'),'Historical profile mislabeled as current');
}
const coverage=JSON.parse(fs.readFileSync(path.join(root,'data/historical-player-coverage.json'),'utf8'));assert.equal(coverage.targetCount,targets.length);assert.equal(coverage.newHistoricalCount,all.filter(p=>!p.existingProfileId).length);assert.equal(coverage.enrichedExistingCount,all.filter(p=>p.existingProfileId).length);
const map=historyByName(root);let linked=0;
for(const t of targets){const id=map.get(norm(t.nameEn))||map.get(norm(t.nameAr));if(!id)continue;linked++;for(const c of t.clubIds){const html=fs.readFileSync(path.join(root,'dist/clubs',c+'.html'),'utf8');assert(html.includes('../players/'+id+'.html'),'Missing historical link '+t.nameEn+' '+c);}}
assert.equal(coverage.linkedCount,linked,'Stale historical coverage registry');
console.log(`Historical profile checks passed: ${all.filter(p=>!p.existingProfileId).length} new profiles, ${all.filter(p=>p.existingProfileId).length} enriched current profiles; ${linked}/${targets.length} target identities linked`);
