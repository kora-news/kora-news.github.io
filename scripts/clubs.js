'use strict';
const fs = require('fs');
const path = require('path');
const { profiles } = require('./players');
const CLUBS = [
  ['arsenal','أرسنال','Arsenal','england','إنجلترا'],
  ['liverpool','ليفربول','Liverpool','england','إنجلترا'],
  ['manchester-city','مانشستر سيتي','Manchester City','england','إنجلترا'],
  ['manchester-united','مانشستر يونايتد','Manchester United','england','إنجلترا'],
  ['tottenham','توتنهام','Tottenham','england','إنجلترا'],
  ['chelsea','تشيلسي','Chelsea','england','إنجلترا'],
  ['real-madrid','ريال مدريد','Real Madrid','spain','إسبانيا'],
  ['barcelona','برشلونة','Barcelona','spain','إسبانيا'],
  ['atletico-madrid','أتلتيكو مدريد','Atletico Madrid','spain','إسبانيا'],
  ['juventus','يوفنتوس','Juventus','italy','إيطاليا'],
  ['inter','إنتر','Inter','italy','إيطاليا'],
  ['ac-milan','إيه سي ميلان','AC Milan','italy','إيطاليا'],
  ['bayern-munich','بايرن ميونخ','Bayern Munich','germany','ألمانيا'],
  ['borussia-dortmund','بوروسيا دورتموند','Borussia Dortmund','germany','ألمانيا']
].map(([id,nameAr,nameEn,leagueId,leagueAr])=>({id,nameAr,nameEn,leagueId,leagueAr}));

function buildClubs({root,dist,head,header,footer,esc,fmtDate}) {
  const playerProfiles=profiles(root);
  const profileByName=new Map(playerProfiles.map(p=>[p.clubId+'|'+p.squadName,p]));
  const playerName=(c,p)=>{const profile=profileByName.get(c.id+'|'+p.nameEn);return profile?`<a class="squad-profile-link" href="../players/${esc(profile.id)}.html">${esc(p.nameEn)}</a>`:esc(p.nameEn);};
  const dir = process.env.CLUBS_DATA_DIR || path.join(root,'data','clubs');
  const records = new Map();
  if(fs.existsSync(dir)) for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.json'))) {
    const envelope=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));
    for(const row of (envelope.clubs || [envelope])) {
      if(!CLUBS.some(c=>c.id===row.id)) throw new Error('Unknown club id: '+row.id);
      if(records.has(row.id)) throw new Error('Duplicate club data: '+row.id);
      const sourceIds=new Set((row.sources||[]).map(s=>s.id));
      const cited=(value,context)=>{
        if(!value.sourceIds?.length) throw new Error(row.id+' has uncited '+context);
        for(const id of value.sourceIds) if(!sourceIds.has(id)) throw new Error(row.id+' missing source '+id);
      };
      const nonnegative=(n,context)=>{if(!Number.isInteger(n)||n<0)throw new Error(row.id+' invalid '+context);};
      for(const source of row.sources||[]) if(!/^https:\/\//.test(source.url||''))throw new Error(row.id+' invalid source URL');
      if(row.history?.textAr)cited(row.history,'history');
      for(const [key,numberKey] of [['honors','count'],['topScorers','goals'],['mostDecorated','titles']])for(const item of row[key]?.items||[]){
        if(item[numberKey]!==null && item[numberKey]!==undefined){nonnegative(item[numberKey],key);cited(item,key);}
      }
      if(row.honors?.complete && !row.honors.items?.length)throw new Error(row.id+' has empty complete honors');
      if(row.mostDecorated?.status==='verified' && !row.mostDecorated.items?.length)throw new Error(row.id+' has empty most decorated');
      for(const key of ['latestResult','latestTrophy'])if(row[key]?.status==='verified')cited(row[key],key);
      if(row.latestResult?.status==='verified'){
        const m=row.latestResult;nonnegative(m.homeScore,'home score');nonnegative(m.awayScore,'away score');
        if(!m.homeTeamAr||!m.awayTeamAr||!m.playedOn)throw new Error(row.id+' incomplete verified match result');
      }
      if(row.latestTrophy?.status==='verified'&&!row.latestTrophy.competitionAr)throw new Error(row.id+' missing verified trophy');
      records.set(row.id,row);
    }
  }
  if(!records.size) return [];
  const logo=(c,r,rel)=>r?.crest?.file?`<img class="club-crest crest-${esc(c.id)}" src="${rel}assets/club-logos/${esc(r.crest.file)}" alt="شعار ${esc(c.nameAr)}" width="88" height="88" loading="eager">`:r?.crest?.status==='rights-review'?`<span class="club-crest club-crest-pending" role="img" aria-label="شعار ${esc(c.nameAr)} قيد مراجعة الحقوق"><bdi>FCB</bdi><small>حقوق الشعار<br>قيد المراجعة</small></span>`:'';
  const css='<link rel="stylesheet" href="RELPATHassets/clubs.css"><link rel="stylesheet" href="RELPATHassets/players.css">';
  const pageHead=(title,desc,rel,canonical)=>head(title,desc,rel,canonical).replace('</head>',css.replaceAll('RELPATH',rel)+'</head>');
  const date=s=>{
    if(!s || Number.isNaN(Date.parse(s))) return 'تاريخ غير مثبت';
    return s.length===10 ? new Intl.DateTimeFormat('ar-EG',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z')) : fmtDate(s);
  };
  const number=n=>typeof n==='number' && Number.isFinite(n) ? '<bdi>'+esc(n)+'</bdi>' : '<span class="club-unknown">غير مثبت</span>';
  const link=(url,label)=>/^https:\/\//.test(url||'') ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : esc(label);
  const genericScope='الفريق الأول للرجال · المباريات والبطولات الرسمية';
  const label='دليل الأندية';
  const ranking=JSON.parse(fs.readFileSync(path.join(root,'data/club-trophy-ranking.json'),'utf8'));
  const rankingById=new Map(ranking.clubs.map(x=>[x.id,x]));
  if(rankingById.size!==CLUBS.length)throw Error('Incomplete trophy ranking');
  const rankedClubs=[...CLUBS].sort((a,b)=>rankingById.get(b.id).total-rankingById.get(a.id).total||a.nameAr.localeCompare(b.nameAr,'ar'));
  const rankOf=c=>1+rankedClubs.filter(x=>rankingById.get(x.id).total>rankingById.get(c.id).total).length;
  const cards=rankedClubs.map((c,i)=>{
    const r=records.get(c.id), ready=Boolean(r);
    const trophy=rankingById.get(c.id);
    const inside=`<span class="club-tile-country">${c.leagueAr}</span>${logo(c,r,'')}<h2>${c.nameAr}</h2><p lang="en" dir="ltr">${c.nameEn}</p><span class="club-trophy-total"><bdi>${trophy.total}</bdi> لقبًا <small>المرتبة ${rankOf(c)}</small></span><span class="club-tile-bottom">${ready?'القائمة والتاريخ والبطولات <span aria-hidden="true">←</span>':'قيد التوثيق'}</span>`;
    return `<article class="club-tile${ready?'':' pending'}" data-league="${c.leagueId}" data-name="${esc(c.nameAr+' '+c.nameEn+' '+c.id+' '+(c.id==='inter'?'إنتر ميلان Inter Milan':c.id==='tottenham'?'توتنهام هوتسبير Tottenham Hotspur Spurs':c.id==='bayern-munich'?'بايرن ميونيخ':''))}">${ready?`<a href="clubs/${c.id}.html">${inside}</a>`:`<div>${inside}</div>`}</article>`;
  }).join('\n');
  const index=pageHead(label+' | كورة نيوز','تاريخ الأندية وبطولاتها وهدافوها وسجلات لاعبيها، مع مصادر وتواريخ مراجعة واضحة.','','clubs.html')+header('','clubs')+`
<main class="container club-directory">
  <header class="club-directory-head"><span class="badge">التاريخ لا يُختصر في نتيجة</span><h1>دليل الأندية</h1><p>الأندية من الأكثر ألقابًا إلى الأقل، وفق نطاق العد الموضح أدناه.</p><p class="club-scope">${genericScope}</p></header>
  <aside class="club-ranking-method"><h2>الترتيب حسب مجموع الألقاب</h2><p>${esc(ranking.scopeAr)}</p><p class="club-record-note">مراجعة المقارنة: ${esc(date(ranking.asOf))}. المقارنة بين الأندية الـ 14 الموجودة في الدليل فقط.</p><details><summary>منهج العد وتفصيل الألقاب والمصادر</summary><p>${esc(ranking.methodAr)}</p>${rankedClubs.map(c=>{const t=rankingById.get(c.id);return `<details class="club-total-detail"><summary>${esc(c.nameAr)}: ${t.total} لقبًا</summary><p>${esc(t.noteAr)}</p><ul>${t.items.map(x=>`<li>${esc(x.labelAr)}: <bdi>${x.count}</bdi> ${x.urls.map((u,i)=>link(u,'المصدر'+(x.urls.length>1?' '+(i+1):''))).join(' · ')}</li>`).join('')}</ul></details>`}).join('')}</details></aside>
  <section class="club-controls" aria-label="البحث في الأندية"><label for="club-search">ابحث عن ناديك</label><input id="club-search" type="search" placeholder="اسم النادي بالعربية أو الإنجليزية" autocomplete="off"><div class="club-filters" role="group" aria-label="الدولة">${[['all','الكل'],['england','إنجلترا'],['spain','إسبانيا'],['italy','إيطاليا'],['germany','ألمانيا']].map(([id,name])=>`<button type="button" data-filter="${id}" aria-pressed="${id==='all'}">${name}</button>`).join('')}</div></section>
  <div class="club-directory-count" aria-live="polite">الأندية الظاهرة: <span id="club-visible">14</span></div><section class="club-tiles">${cards}</section><p id="club-no-results" hidden>لم نجد ناديًا بهذا الاسم. جرّب اسمًا آخر أو اختر «الكل».</p>
  <aside class="club-method"><h2>كيف تُقرأ الأرقام؟</h2><p>هذه صفحات مرجعية وليست لوحة نتائج مباشرة. لكل سجل تاريخ مراجعة ومصدر، وتُذكر اختلافات احتساب البطولات أو الأهداف بجوار الأرقام. لا نملأ أي معلومة غير مثبتة برقم تقديري.</p><p>«الأكثر تتويجًا» يعني الألقاب التي أحرزها اللاعب مع النادي نفسه، وليس إجمالي ألقابه طوال مسيرته.</p></aside>
</main><script src="assets/clubs.js" defer></script>`+footer('');
  fs.writeFileSync(path.join(dist,'clubs.html'),index);
  fs.mkdirSync(path.join(dist,'clubs'),{recursive:true});
  const logoPath=path.join(root,'assets','club-logos');if(fs.existsSync(logoPath))fs.cpSync(logoPath,path.join(dist,'assets','club-logos'),{recursive:true});
  const generated=['clubs.html'];
  for(const c of CLUBS) {
    const r=records.get(c.id); if(!r) continue;
    const sources=Array.isArray(r.sources)?r.sources:[];
    const bySource=new Map(sources.map((s,i)=>[s.id,{...s,index:i+1}]));
    const refs=ids=> (ids||[]).map(id=>{
      const s=bySource.get(id);
      if(!s) throw new Error(c.id+' references missing source '+id);
      return `<a href="#source-${s.index}" aria-label="المصدر ${s.index}">[${s.index}]</a>`;
    }).join(' ');
    const note=t=>t?`<p class="club-record-note">${esc(t)}</p>`:'';
    const incomplete=t=>`<p class="club-incomplete">${esc(t||'هذا السجل لم يكتمل توثيقه بعد.')}</p>`;
    const stamp=s=>s?`<span class="club-data-date">مرجع السجل: ${esc(date(s))}</span>`:'';
    const section=(id,title,body)=>`<section class="club-section" id="${id}"><h2>${title}</h2>${body}</section>`;
    const history=r.history||{};
    const historyHTML=section('history','نبذة وتاريخ',history.textAr?history.textAr.split(/\n\s*\n/).map(t=>`<p>${esc(t)}</p>`).join('')+`<div class="club-refs">${refs(history.sourceIds)}</div>`:incomplete('لم تكتمل مراجعة نبذة النادي بعد.'));
    const h=r.honors||{};
    const honorsHTML=section('honors','بطولات النادي',note(h.scopeAr)+stamp(h.asOf)+(h.complete?'':incomplete())+`<div class="honors-list">${(h.items||[]).map(x=>`<article class="honor-row"><div><h3>${esc(x.competitionAr)}</h3>${x.seasons?.length?`<details><summary>مواسم التتويج</summary><p dir="auto">${x.seasons.map(esc).join('، ')}</p></details>`:''}${note(x.noteAr)}<div class="club-refs">${refs(x.sourceIds)}</div></div><div class="honor-number">${number(x.count)}<span>لقبًا</span></div></article>`).join('')}</div>`+note(h.noteAr));
    const top=r.topScorers||{};
    if(top.complete && (!Array.isArray(top.items)||top.items.length<10)) throw new Error(c.id+' top scorers marked complete with fewer than ten');
    const scorersHTML=section('scorers','الهدافون التاريخيون',note(top.scopeAr)+stamp(top.asOf)+(top.entrantCheckedAt?`<p class="club-record-note">فحص دخول أسماء جديدة: ${esc(date(top.entrantCheckedAt))} ${refs(top.entrantSourceIds)}</p>`:'')+(top.complete?'':incomplete('القائمة أدناه مقيدة بتاريخ المصادر ونطاق عدها. لم يكتمل توثيق ترتيب حديث وموحد للعشرة الأوائل.'))+`<ol class="scorers-list">${(top.items||[]).map((x,i)=>`<li><span class="scorer-rank">${number(x.rank??i+1)}</span><div class="scorer-name"><strong>${esc(x.nameAr||x.nameEn)}</strong>${x.nameEn?`<small lang="en" dir="ltr">${esc(x.nameEn)}</small>`:''}<div class="club-refs">${refs(x.sourceIds)}</div></div><div class="scorer-goals">${number(x.goals)}<span>هدفًا</span></div></li>`).join('')}</ol>`+note(top.noteAr));
    const decorated=r.mostDecorated||{};
    const decoratedHTML=section('decorated',decorated.status==='verified'?'الأكثر تتويجًا مع النادي':'توثيق الأكثر تتويجًا مع النادي',note(decorated.scopeAr)+stamp(decorated.asOf)+(decorated.status==='verified'?'':incomplete('لم يُحسم سجل الأكثر تتويجًا الشامل. الأرصدة المذكورة أدناه موثقة لأصحابها، ولا تُثبت وحدها ترتيب جميع اللاعبين أو حصر المتصدرين.'))+`<div class="decorated-list">${(decorated.items||[]).map(x=>`<article><div><h3>${esc(x.nameAr||x.nameEn)}</h3>${x.nameEn?`<p lang="en" dir="ltr">${esc(x.nameEn)}</p>`:''}<div class="club-refs">${refs(x.sourceIds)}</div></div><div class="decorated-total">${number(x.titles)}<span>لقبًا مع النادي</span></div></article>`).join('')}</div>`+note(decorated.noteAr));
    const result=r.latestResult||{};
    if(result.playedOn && new Date(result.playedOn+'T00:00:00Z')>new Date()) throw new Error(c.id+' result is in the future');
    const resultVerified=result.status==='verified' && typeof result.homeScore==='number' && typeof result.awayScore==='number';
    const resultHTML=section('result','آخر نتيجة موثقة',resultVerified?`<p class="club-record-note">تم التحقق حتى ${esc(date(result.checkedAt||r.checkedAt))}. نتيجة مسجلة، وليست خدمة تحديث مباشر.</p><p class="club-match-meta">${esc(result.competitionAr||'')} · ${esc(date(result.playedOn))}</p><div class="club-result"><div><h3>${esc(result.homeTeamAr)}</h3><strong>${number(result.homeScore)}</strong></div><span class="club-match-final">نهاية المباراة</span><div><h3>${esc(result.awayTeamAr)}</h3><strong>${number(result.awayScore)}</strong></div></div>${typeof result.penaltyHomeScore==='number'?`<p>ركلات الترجيح: ${esc(result.homeTeamAr)} ${number(result.penaltyHomeScore)}، ${esc(result.awayTeamAr)} ${number(result.penaltyAwayScore)}.</p>`:''}${note(result.noteAr)}<div class="club-refs">${refs(result.sourceIds)}</div>`:incomplete(result.noteAr||'لم نثبت أحدث نتيجة مكتملة بعد.'));
    const trophy=r.latestTrophy||{};
    const trophyHTML=section('latest-trophy','آخر لقب رسمي',trophy.status==='verified'?`<div class="latest-trophy"><span class="badge">آخر تتويج موثق</span><h3>${esc(trophy.competitionAr)}</h3>${trophy.season?`<p>الموسم: <bdi>${esc(trophy.season)}</bdi></p>`:''}${trophy.wonOn?`<p>${esc(date(trophy.wonOn))}</p>`:''}</div>${note(trophy.noteAr)}<div class="club-refs">${refs(trophy.sourceIds)}</div>`:incomplete(trophy.noteAr||'آخر لقب رسمي قيد التوثيق.'));
    const sq=r.squad||{};
    if(sq.status==='verified'){
      if(!sq.items?.length)throw new Error(c.id+' empty squad');
      if(!sq.sourceIds?.length||sq.sourceIds.some(id=>!bySource.has(id)))throw new Error(c.id+' uncited squad');
      const names=new Set();
      for(const p of sq.items){if(!(p.nameAr||p.nameEn)||!p.positionAr)throw new Error(c.id+' incomplete squad member');if(names.has(p.nameEn||p.nameAr))throw new Error(c.id+' duplicate player');names.add(p.nameEn||p.nameAr);}
    }
    const squadHTML=section('squad','قائمة الفريق الأول',sq.status==='verified'?note(sq.scopeAr)+note(sq.noteAr)+`<p class="player-progress">ملفات المسيرة والانتقالات تُضاف تدريجيًا. الأسماء المرتبطة تفتح ملفًا موثقًا؛ بقية الأسماء لم يكتمل ملفها بعد. الهدف يشمل جميع لاعبي القوائم.</p>`+`<p class="club-record-note">مراجعة القائمة: ${esc(date(sq.checkedAt))}. ${refs(sq.sourceIds)}</p><div class="club-squad">${sq.items.map(p=>`<article class="squad-player"><span class="squad-number">${p.number==null?'':number(p.number)}</span><div>${p.nameAr?`<h3>${esc(p.nameAr)}</h3>`:''}${p.nameEn?`<p class="squad-name-en" lang="en" dir="ltr">${playerName(c,p)}</p>`:''}<p class="squad-position">${esc(p.positionAr)}</p></div></article>`).join('')}</div>`:incomplete('قائمة الفريق قيد التحقق من المصدر الرسمي.'));
    const sourcesHTML=section('sources','المصادر ومنهج العد',`<ol class="club-source-list">${sources.map((s,i)=>`<li id="source-${i+1}">${link(s.url,s.title||s.publisher||s.url)}${s.publisher?`<span>${esc(s.publisher)}</span>`:''}${s.publishedOn?`<span>تاريخ المصدر: ${esc(date(s.publishedOn))}</span>`:''}${s.checkedAt?`<span>مراجعة: ${esc(date(s.checkedAt))}</span>`:''}${note(s.noteAr)}</li>`).join('')}</ol>`);
    const warnings=(r.unresolved||[]).filter(Boolean);
    const html=pageHead(c.nameAr+': التاريخ والبطولات والسجلات | كورة نيوز','تاريخ '+c.nameAr+' وبطولاته وهدافوه والأكثر تتويجًا معه، مع آخر نتيجة ولقب رسمي ومصادر البيانات.','../',`clubs/${c.id}.html`)+header('../','clubs')+`
<main class="container club-page"><a class="club-back" href="../clubs.html">دليل الأندية ←</a><header class="club-profile-head">${logo(c,r,'../')}<span class="badge">${c.leagueAr}</span><h1>${c.nameAr}</h1><p class="club-english" lang="en" dir="ltr">${c.nameEn}</p><p class="club-scope">${esc(r.scopeAr||genericScope)}</p><p class="club-reviewed">آخر مراجعة للصفحة: ${esc(date(r.checkedAt))}. النتائج والأرقام لقطة موثقة وليست تحديثًا مباشرًا.</p></header>
<nav class="club-jump" aria-label="أقسام صفحة النادي">${[['squad','قائمة الفريق'],['history','التاريخ'],['honors','البطولات'],['scorers','الهدافون'],['decorated','الأكثر تتويجًا'],['result','آخر نتيجة'],['latest-trophy','آخر لقب'],['sources','المصادر']].map(([id,t])=>`<a href="#${id}">${t}</a>`).join('')}</nav>
${warnings.length?`<aside class="club-audit"><h2>تنبيهات التوثيق</h2><ul>${warnings.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></aside>`:''}
<div class="club-content">${squadHTML}${historyHTML}${honorsHTML}${scorersHTML}${decoratedHTML}${resultHTML}${trophyHTML}${sourcesHTML}</div></main>`+footer('../');
    fs.writeFileSync(path.join(dist,'clubs',c.id+'.html'),html); generated.push('clubs/'+c.id+'.html');
  }
  return generated;
}
module.exports={buildClubs,CLUBS};
