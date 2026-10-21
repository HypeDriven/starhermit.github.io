'use strict';
(() => {
 if(window.top !== window.self) document.querySelector('.concept-label').hidden = true;
 const dialog = document.querySelector('.publish-dialog');
 let returnFocus;
 document.querySelectorAll('[data-publish]').forEach(button => button.addEventListener('click', () => {
  returnFocus = button;
  dialog.showModal();
  document.body.style.overflow = 'hidden';
 }));
 const close = () => dialog.close();
 dialog.querySelector('[data-close-publish]').addEventListener('click', close);
 dialog.addEventListener('click', event => {
  if(event.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if(event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close();
 });
 dialog.addEventListener('close', () => { document.body.style.overflow = ''; returnFocus?.focus(); });
 const guides = {
  repository:['Have your repository URL ready.','After signing in, select Add Game in the dashboard and paste your GitHub repository URL.'],
  folder:['Have your game build ready.','After signing in, select Add Game in the dashboard and choose the local-folder option to upload your build.'],
  server:['Have your dedicated server image ready.','After signing in, select Add Game in the dashboard and choose the dedicated-server option. The developer docs cover server setup.']
 };
 document.querySelectorAll('[data-source]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-source]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  const [heading,copy] = guides[button.dataset.source];
  dialog.querySelector('[data-source-heading]').textContent = heading;
  dialog.querySelector('[data-source-copy]').textContent = copy;
 }));
 document.querySelectorAll('[data-product-mode]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-product-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  document.querySelectorAll('[data-product-panel]').forEach(panel => { panel.hidden = panel.dataset.productPanel !== button.dataset.productMode; });
 }));
 document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  document.querySelectorAll('[data-game-category]').forEach(card => { card.hidden = button.dataset.filter !== 'all' && card.dataset.gameCategory !== button.dataset.filter; });
 }));
})();
