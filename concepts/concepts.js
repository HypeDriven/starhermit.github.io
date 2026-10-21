document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    document.querySelectorAll('[data-category]').forEach(card => {
      card.hidden = filter !== 'all' && !card.dataset.category.split(' ').includes(filter);
    });
  });
});

const surprise = document.querySelector('[data-surprise]');
if (surprise) surprise.addEventListener('click', () => {
  const cards = [...document.querySelectorAll('[data-category]')];
  const choice = cards[Math.floor(Math.random() * cards.length)];
  if (choice) window.open(choice.querySelector('a').href, '_blank', 'noopener');
});

document.querySelectorAll('[data-step]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-step]').forEach(b => b.setAttribute('aria-selected', String(b === button)));
    document.querySelectorAll('[data-panel]').forEach(p => p.hidden = p.dataset.panel !== button.dataset.step);
  });
});

const shareDialog = document.querySelector('#share-dialog');
document.querySelector('[data-share]')?.addEventListener('click', () => shareDialog.showModal());
document.querySelector('[data-close]')?.addEventListener('click', () => shareDialog.close());
document.querySelector('[data-copy]')?.addEventListener('click', async event => {
  const input = document.querySelector('#share-link');
  try {
    await navigator.clipboard.writeText(input.value);
    event.currentTarget.textContent = 'Link copied ✓';
  } catch {
    input.focus(); input.select();
    event.currentTarget.textContent = 'Select and copy the link';
  }
});
document.querySelector('#share-game')?.addEventListener('change', event => {
  document.querySelector('#share-link').value = event.target.value;
  document.querySelector('[data-copy]').textContent = 'Copy game link';
});
