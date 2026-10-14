/* Language navigation and translation of copy inserted by the shared hero experiment. */
(function () {
  'use strict';
  var config = JSON.parse(document.getElementById('locale-data').textContent);
  // Share the chosen language across landing pages, dashboard and API signup.
  // Local storage is origin-specific; a parent-domain cookie also reaches OAuth callbacks.
  try {
    localStorage.setItem('starhermit-language', config.code);
    document.cookie = 'starhermit-language=' + encodeURIComponent(config.code) +
      '; Path=/; Max-Age=31536000; SameSite=Lax' +
      (location.hostname === 'starhermit.com' || location.hostname.endsWith('.starhermit.com') ? '; Domain=starhermit.com' : '') +
      (location.protocol === 'https:' ? '; Secure' : '');
  } catch (_) {}
  function dashboardLanguage(link) {
    try {
      var url = new URL(link.href);
      if (url.hostname !== 'dashboard.starhermit.com') return;
      if (url.searchParams.get('lang') === config.code) return;
      url.searchParams.set('lang', config.code);
      link.href = url.href;
    } catch (_) {}
  }
  document.querySelectorAll('a[href]').forEach(dashboardLanguage);
  new MutationObserver(function (changes) {
    changes.forEach(function (change) {
      if (change.type === 'attributes') { dashboardLanguage(change.target); return; }
      change.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        if (node.matches('a[href]')) dashboardLanguage(node);
        node.querySelectorAll('a[href]').forEach(dashboardLanguage);
      });
    });
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  var picker = document.querySelector('.language-picker');
  var options = Array.from(document.querySelectorAll('.language-option'));
  options.forEach(function (option) {
    option.addEventListener('click', function (event) {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      try { localStorage.setItem('starhermit-language', option.dataset.language); } catch (_) {}
      location.assign(option.getAttribute('href') + location.search + location.hash);
    });
  });
  document.querySelector('.english-original')?.addEventListener('click', function () {
    try { localStorage.setItem('starhermit-language', 'en'); } catch (_) {}
  });
  document.addEventListener('click', function (event) {
    if (!picker.contains(event.target)) picker.open = false;
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && picker.open) {
      picker.open = false; picker.querySelector('summary').focus();
    }
  });
  if (config.code === 'en') return;
  function translate(value) {
    var key = value.trim().replace(/\s+/g, ' ');
    return Object.prototype.hasOwnProperty.call(config.strings, key) ? config.strings[key] : null;
  }
  function localize(node) {
    if (node.nodeType === 3) {
      var value = translate(node.data);
      if (value !== null && node.data.trim() !== value) node.data = node.data.replace(node.data.trim(), value);
      return;
    }
    if (node.nodeType !== 1 || /^(SCRIPT|STYLE|SVG|CODE|PRE)$/.test(node.tagName) || node.closest('[data-locale-control]')) return;
    ['alt', 'title', 'aria-label'].forEach(function (name) {
      var original = node.getAttribute(name);
      if (!original) return;
      var value = translate(original);
      if (value !== null && value !== original) node.setAttribute(name, value);
    });
    Array.from(node.childNodes).forEach(localize);
  }
  // experiment.js remains byte-identical to the dashboard's shared implementation.
  // Observe only copy changes, never experiment cookies, IDs, events, or destination URLs.
  new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === 'childList') mutation.addedNodes.forEach(localize);
      else if (mutation.type === 'characterData') {
        if (!mutation.target.parentElement?.closest('script, style, code, pre, [data-locale-control]')) localize(mutation.target);
      } else localize(mutation.target);
    });
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['alt', 'title', 'aria-label'] });
})();
