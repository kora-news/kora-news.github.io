(() => {
'use strict';
const competitions=JSON.parse(document.getElementById('fixture-competitions').textContent);
const $=id=>document.getElementById(id);
const cairoToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T12:00:00Z'));
const shiftDate=(value,days)=>{const d=new Date(value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
let matchTimer,tableTimer;
function mount(kind,url,title){
 const shell=$(kind+'-widget'),status=$(kind+'-status');
 shell.replaceChildren();status.textContent='جارٍ طلب الجدول من المصدر…';
 const frame=document.createElement('iframe');frame.title=title;frame.src=url;frame.loading='eager';frame.referrerPolicy='strict-origin-when-cross-origin';frame.className='provider-frame '+kind+'-frame';frame.setAttribute('allow','');
 const timer=setTimeout(()=>{status.textContent='قد يكون المصدر بطيئًا أو غير متاح. استخدم رابط المصدر أدناه أو أعد عرض الجدول.';},18000);
 if(kind==='match'){clearTimeout(matchTimer);matchTimer=timer;}else{clearTimeout(tableTimer);tableTimer=timer;}
 frame.addEventListener('load',()=>{clearTimeout(timer);status.textContent='الإطار من المصدر. إذا كان فارغًا أو لم يكتمل، افتح رابط المصدر أدناه؛ لا يؤكد تحميله توفر البيانات أو حداثتها.';});
 frame.addEventListener('error',()=>{clearTimeout(timer);status.textContent='تعذر تحميل الجدول. افتح رابط المصدر أدناه أو أعد المحاولة.';});
 shell.append(frame);
}
function matches(){
 const date=$('match-date').value;
 if(!validDate(date)){$('match-status').textContent='اختر تاريخًا صحيحًا أولًا.';return;}
 const id=$('match-league').value,c=competitions.find(c=>c.id===id);
 const url=new URL('https://www.rotascore.com/ar/embed/matches');
 url.search=new URLSearchParams({leagues:c?c.id:competitions.map(c=>c.id).join(','),date,tz:'Africa/Cairo',theme:'dark',host:'dark',bg:'#160d28',controls:'0'}).toString();
 $('match-fallback').href=url.href;
 $('selected-day').textContent=new Intl.DateTimeFormat('ar-EG',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Africa/Cairo'}).format(new Date(date+'T12:00:00Z'))+' · توقيت القاهرة';
 mount('match',url.href,'مباريات '+(c?c.name:'البطولات المتاحة')+' بتاريخ '+date+' بتوقيت القاهرة من Rotascore');
}
function table(){const c=competitions.find(c=>c.id===$('table-league').value)||competitions[0];const url=new URL(`https://www.rotascore.com/ar/embed/standings/${c.id}`);url.search=new URLSearchParams({theme:'dark',host:'dark',bg:'#160d28',tz:'Africa/Cairo',controls:'0'}).toString();$('table-fallback').href=url.href;mount('table',url.href,'جدول ترتيب '+c.name+' من Rotascore');}
$('match-date').value=cairoToday();
$('match-form').addEventListener('submit',e=>{e.preventDefault();matches();});
$('today').addEventListener('click',()=>{$('match-date').value=cairoToday();matches();});
for(const [id,step]of [['previous-day',-1],['next-day',1]])$(id).addEventListener('click',()=>{if(validDate($('match-date').value)){$('match-date').value=shiftDate($('match-date').value,step);matches();}});
$('table-league').addEventListener('change',table);
matches();table();
})();
