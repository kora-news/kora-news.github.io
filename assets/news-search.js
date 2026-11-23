'use strict';
(()=>{const input=document.getElementById('news-query'),select=document.getElementById('news-category');if(!input||!select)return;
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ـ/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const cards=[...document.querySelectorAll('[data-news-card]')].map(el=>({el,text:norm(el.dataset.search)}));
function filter(){const words=norm(input.value).split(/\s+/).filter(Boolean);let n=0;for(const c of cards){const show=(!select.value||c.el.dataset.category===select.value)&&words.every(w=>c.text.includes(w));c.el.hidden=!show;if(show)n++;}document.getElementById('news-count').textContent=`الأخبار المطابقة: ${n} من ${cards.length}`;document.getElementById('news-empty').hidden=n!==0;document.querySelector('.hero').hidden=!cards.some(c=>c.el.classList.contains('featured')&&!c.el.hidden);}
input.addEventListener('input',filter);select.addEventListener('change',filter);
})();
