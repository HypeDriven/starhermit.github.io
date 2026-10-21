const concepts = ['arcade', 'journal', 'clubhouse', 'cosmic', 'launchpad'];
const names = ['Instant Arcade', 'The Discovery Journal', 'The Clubhouse', 'Cosmic Playground', 'The Launchpad'];
const notes = document.querySelector('#notes');
let saved = { shortlist: [], notes: '' };
try {
  const data = JSON.parse(localStorage.getItem('starhermit-design-review'));
  if (data && Array.isArray(data.shortlist) && typeof data.notes === 'string') saved = data;
} catch {}
notes.value = saved.notes;
function persist() {
  try { localStorage.setItem('starhermit-design-review', JSON.stringify(saved)); }
  catch { document.querySelector('#save-status').textContent = 'Storage unavailable. Download feedback to keep your notes.'; }
}
function refresh() {
  document.querySelectorAll('[data-favorite]').forEach(button => {
    const active = saved.shortlist.includes(button.dataset.favorite);
    button.setAttribute('aria-pressed', String(active));
    button.textContent = active ? '★ Shortlisted' : '☆ Shortlist';
  });
}
document.querySelectorAll('[data-favorite]').forEach(button => button.addEventListener('click', () => {
  const id = button.dataset.favorite;
  saved.shortlist = saved.shortlist.includes(id) ? saved.shortlist.filter(x => x !== id) : [...saved.shortlist, id];
  refresh(); persist();
}));
notes.addEventListener('input', () => { saved.notes = notes.value; persist(); });
refresh();
document.querySelector('#export-review').addEventListener('click', () => {
  const shortlist = saved.shortlist.map(id => names[concepts.indexOf(id)]).join(', ') || 'None yet';
  const blob = new Blob([`StarHermit design review\n\nShortlist: ${shortlist}\n\n${saved.notes}\n`], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'starhermit-design-feedback.txt'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
const dialog = document.querySelector('#compare-dialog');
const left = document.querySelector('#compare-left');
const right = document.querySelector('#compare-right');
right.value = 'journal';
function fitFrames() {
  if (!dialog.open) return;
  const width = dialog.classList.contains('mobile-view') ? 390 : 1440;
  document.querySelectorAll('.frame-shell').forEach(shell => {
    const frame = shell.querySelector('iframe');
    const scale = Math.min(shell.clientWidth / width, 1);
    frame.style.width = `${width}px`;
    frame.style.height = `${Math.floor(shell.clientHeight / scale)}px`;
    frame.style.left = `${Math.max(0, (shell.clientWidth - width * scale) / 2)}px`;
    frame.style.transform = `scale(${scale})`;
  });
}
function loadFrames() {
  [['left', left], ['right', right]].forEach(([side, select]) => {
    document.querySelector(`#${side}-frame`).src = `${select.value}.html`;
    const title = document.querySelector(`#${side}-title`);
    title.replaceChildren();
    const label = document.createElement('span');
    label.textContent = names[concepts.indexOf(select.value)];
    const link = document.createElement('a');
    link.href = `${select.value}.html`; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Open full page ↗';
    title.append(label, link);
  });
}
document.querySelector('#compare-open').addEventListener('click', () => { loadFrames(); dialog.showModal(); fitFrames(); });
document.querySelector('#compare-close').addEventListener('click', () => dialog.close());
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  dialog.classList.toggle('mobile-view', button.dataset.view === 'mobile');
  document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  fitFrames();
}));
window.addEventListener('resize', fitFrames);
