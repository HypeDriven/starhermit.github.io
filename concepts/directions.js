(() => {
  const canvas=document.querySelector('canvas[data-scene]');
  canvas?.addEventListener('selectionchange',event=>{
    const item=window.SH_ARTWORK[event.detail.index];
    document.querySelector('[data-selected-name]').textContent=item.name;
    document.querySelector('[data-selected-number]').textContent=String(event.detail.index+1).padStart(2,'0');
    document.querySelector('[data-selected-link]').href=item.url;
    document.querySelector('[data-selected-rating]').textContent=`★ ${item.average.toFixed(1)} / 5 · ${item.count} rating${item.count === 1 ? '' : 's'}`;
  });
  document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    document.querySelectorAll('[data-category]').forEach(card=>card.hidden=button.dataset.filter!=='all'&&card.dataset.category!==button.dataset.filter);
  }));
  // The collection remains browsable if hardware acceleration is unavailable.
  if(canvas?.dataset.scene==='museum')document.querySelectorAll('[data-gallery-next]').forEach(button=>button.addEventListener('click',()=>{
    if(!document.body.classList.contains('no-webgl'))return;
    const label=document.querySelector('[data-selected-number]');
    const index=(Number(label.textContent)-1+Number(button.dataset.galleryNext)+7)%7;
    canvas.dispatchEvent(new CustomEvent('selectionchange',{detail:{index}}));
    document.querySelector('.gallery-fallback img').src=window.SH_ARTWORK[index].data;
  }));
})();
