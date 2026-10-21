'use strict';
(() => {
 const directions = [
  ['platform','Open Platform','Clear, confident and product-led. Equal space for players and creators.'],
  ['playground','After Hours','A premium game destination that makes the first play feel immediate.'],
  ['workshop','Creator Studio','A creator-first platform, with publishing as the shortest path into the product.'],
  ['network','Connected Worlds','A precise direction that makes the platform’s infrastructure tangible.'],
  ['collective','The Collective','A warmer independent-games identity, with disciplined art direction.']
 ];
 const frame=document.querySelector('#concept-frame'),link=document.querySelector('#open-page');
 function select(slug){const d=directions.find(d=>d[0]===slug)||directions[0];document.querySelectorAll('[data-direction]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.direction===d[0])));frame.src=d[0]+'.html';frame.title=d[1]+' — live design preview';link.href=d[0]+'.html';document.querySelector('#direction-description').textContent=d[2];history.replaceState(null,'','#'+d[0]);}
 document.querySelectorAll('[data-direction]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.direction)));
 document.querySelectorAll('[data-viewport]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-viewport]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelector('.preview-shell').classList.toggle('mobile',button.dataset.viewport==='mobile');}));
 document.addEventListener('keydown',event=>{if(event.altKey||event.metaKey||event.ctrlKey)return;const n=Number(event.key);if(n>=1&&n<=5)select(directions[n-1][0]);});
 select(location.hash.slice(1));
})();
