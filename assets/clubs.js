(()=>{
  const input=document.getElementById('club-search');
  if(!input)return;
  const tiles=[...document.querySelectorAll('.club-tile')];
  const buttons=[...document.querySelectorAll('[data-filter]')];
  const count=document.getElementById('club-visible');
  const empty=document.getElementById('club-no-results');
  let league='all';
  const normalize=x=>x.toLowerCase().normalize('NFKD').replace(/[\u064b-\u065f\u0670\u0300-\u036f]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[\s\-.]+/g,'').trim();
  const update=()=>{
    const query=normalize(input.value);
    let visible=0;
    for(const tile of tiles){
      const show=(league==='all'||tile.dataset.league===league)&&normalize(tile.dataset.name).includes(query);
      tile.hidden=!show;
      visible+=Number(show);
    }
    count.textContent=visible;
    empty.hidden=visible!==0;
  };
  input.addEventListener('input',update);
  for(const button of buttons)button.addEventListener('click',()=>{
    league=button.dataset.filter;
    for(const other of buttons)other.setAttribute('aria-pressed',String(other===button));
    update();
  });
  update();
})();
