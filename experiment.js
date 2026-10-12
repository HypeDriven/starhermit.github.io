/* Shared by the public site and dashboard. No account identifiers enter analytics. */
(function () {
  'use strict';
  var ID = 'hero_v2', KEY = 'sh_ab_hero_v2', PREFIX = 'sh2_', SIGNED = 'sh_signed_in';
  var VARIANTS = ['control', 'crown', 'variety', 'quick_start'];
  var DAY = 86400000, WINDOW = 7 * DAY;
  var ENROLL_UNTIL = Date.parse('2026-11-09T00:00:00Z');
  var state = null, surface = 'home', initialized = false;
  var production = /^(www\.)?starhermit\.com$/.test(location.hostname) || location.hostname === 'dashboard.starhermit.com';
  var preview = new URLSearchParams(location.search).get('ab_preview');
  if (preview === 'game_first') preview = 'crown'; // Preserve the original preview link.
  var isPreview = VARIANTS.indexOf(preview) !== -1;

  function cookie(name) {
    var match = document.cookie.split('; ').find(function (part) { return part.indexOf(name + '=') === 0; });
    if (!match) return null;
    try { return JSON.parse(decodeURIComponent(match.slice(name.length + 1))); } catch (_) { return null; }
  }
  function write(name, value, age) {
    try {
      document.cookie = name + '=' + encodeURIComponent(JSON.stringify(value)) + '; Path=/; Max-Age=' + age
        + '; SameSite=Lax' + (production ? '; Domain=starhermit.com; Secure' : '');
    } catch (_) { /* A blocked cookie must not affect the site or authentication. */ }
  }
  function save() { if (state && !isPreview) write(KEY, state, Math.max(0, Math.floor((state.at + 90 * DAY - Date.now()) / 1000))); }
  function valid(s) {
    return s && VARIANTS.indexOf(s.variant) !== -1 && Number.isFinite(s.at)
      && s.at <= Date.now() && s.at > Date.now() - 90 * DAY;
  }
  state = cookie(KEY);
  if (!valid(state)) state = null;
  // Retain the original cohort's treatment and attribution; never mix its events
  // with the new four-arm experiment or enroll the same browser in both.
  if (!state && !isPreview) {
    var legacy = cookie('sh_ab_hero_v1');
    if (legacy && legacy.exposed && (legacy.variant === 'control' || legacy.variant === 'game_first')
        && Number.isFinite(legacy.at) && legacy.at <= Date.now() && legacy.at > Date.now() - 90 * DAY) {
      state = legacy; ID = 'hero_v1'; KEY = 'sh_ab_hero_v1'; PREFIX = 'sh_';
    }
  }

  function event(name, extra) {
    if (!production || isPreview || typeof window.gtag !== 'function') return;
    var data = Object.assign({ site_surface: surface, transport_type: 'beacon' }, extra || {});
    if (state) { data.experiment_id = ID; data.experiment_variant = state.variant; }
    // Variant-specific names are usable in GA4 without registering custom dimensions.
    var eventName = name === 'page_view' ? name : PREFIX + name.slice(3) + (state ? '_' + state.variant : '');
    try { window.gtag('event', eventName, data); } catch (_) { /* Measurement is optional. */ }
  }
  function eligible() { return state && state.exposed && Date.now() - state.at <= WINDOW; }
  function activity() {
    var last = performance.now(), active = 0;
    var focused = document.visibilityState === 'visible' && document.hasFocus();
    function sample() {
      var now = performance.now();
      if (focused) active += Math.min(now - last, 2000); // Do not count suspended timers.
      last = now;
      focused = document.visibilityState === 'visible' && document.hasFocus();
      while (active >= 15000) {
        if (eligible()) event(surface === 'home' ? 'sh_home_tick' : 'sh_app_tick');
        active -= 15000;
      }
    }
    setInterval(sample, 1000);
    ['visibilitychange', 'focus', 'blur', 'pagehide'].forEach(function (name) { window.addEventListener(name, sample); });
  }
  function gameHero() {
    var title = document.querySelector('.hero-title');
    if (!title) return;
    title.textContent = 'Build above. Dig below.';
    title.classList.add('hero-game-title');
    document.querySelector('.hero-sub').textContent = 'Play Crown & Chasm free in your browser. Build a kingdom above a vast chasm, then explore what lies beneath.';
    var button = document.querySelector('.hero-actions .btn-primary');
    button.textContent = 'Play Free Now';
    button.href = 'https://dashboard.starhermit.com/play/d1f5890a-7e08-49ec-8ec7-30f542f20b05';
    var art = document.createElement('img');
    art.src = 'img/crown-and-chasm.webp'; art.alt = 'Crown & Chasm — a fortified city above a vast excavated chasm';
    art.width = 800; art.height = 450; art.className = 'hero-feature-art'; art.decoding = 'async';
    document.querySelector('.hero-sub').after(art);
    document.querySelector('.hero-note').textContent = 'Free. Sign in and accept the Terms to start playing — no card, nothing to install.';
  }
  function alternativeHero(variant) {
    if (variant === 'crown' || variant === 'game_first') { gameHero(); return; }
    if (variant === 'control') return;
    var title = document.querySelector('.hero-title');
    title.classList.add('hero-game-title');
    var sub = document.querySelector('.hero-sub');
    var button = document.querySelector('.hero-actions .btn-primary');
    if (variant === 'quick_start') {
      title.textContent = 'Your next game starts here.';
      sub.textContent = 'Create your free account with Google, GitHub, or another supported provider. Explore the library and launch browser games with no installation or payment card.';
      button.textContent = 'Explore Free Games';
      var note = document.createElement('p');
      note.className = 'hero-feature-note';
      note.textContent = 'One account. A library of free browser games.';
      sub.after(note);
      return;
    }
    title.textContent = 'Pick your next adventure.';
    sub.textContent = 'Build a kingdom, explore a dungeon, or take a starship into battle. Pick a free browser game and sign in to start playing.';
    button.textContent = 'Explore the Library';
    var gallery = document.createElement('div'); gallery.className = 'hero-game-choices';
    [
      ['Crown & Chasm', 'img/crown-and-chasm.webp', 'd1f5890a-7e08-49ec-8ec7-30f542f20b05'],
      ['Blind Magus', 'img/blind-magus.webp', 'c1b0c665-3e09-4bab-a0d5-1a0c31506b26'],
      ['Null Range', 'img/null-range.webp', '225f6604-7546-42f8-97c2-d5f9299d7d4a']
    ].forEach(function (game) {
      var link = document.createElement('a');
      link.href = 'https://dashboard.starhermit.com/play/' + game[2];
      link.target = '_blank'; link.rel = 'noopener';
      var image = document.createElement('img'); image.src = game[1]; image.alt = '';
      image.width = 800; image.height = 450; image.decoding = 'async';
      var label = document.createElement('span'); label.textContent = 'Play ' + game[0];
      link.append(image, label); gallery.appendChild(link);
    });
    sub.after(gallery);
    document.querySelector('.hero-note').textContent = 'Free. Sign in and accept the Terms to start playing — no card, nothing to install.';
  }
  function home() {
    if (isPreview) state = { variant: preview, at: Date.now() };
    else if (!state && production && !cookie(SIGNED) && Date.now() < ENROLL_UNTIL) {
      var random = new Uint32Array(1); crypto.getRandomValues(random);
      state = { variant: VARIANTS[Math.floor(random[0] / 4294967296 * VARIANTS.length)], at: Date.now() };
      save();
      // Don't enroll people whose browser cannot persist assignment through sign-in.
      if (!valid(cookie(KEY))) state = null;
    }
    if (state) alternativeHero(state.variant);
    if (state && !state.exposed) {
      state.exposed = true; save(); event('sh_exposure');
    }
    if (eligible() && !state.returned && Date.now() - state.at >= DAY) {
      state.returned = true; save(); event('sh_return_visit');
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a || !eligible()) return;
      var url = new URL(a.href, location.href);
      if (url.hostname !== 'dashboard.starhermit.com') return;
      event(url.pathname.indexOf('/play/') === 0 ? 'sh_game_click' : 'sh_account_click', {
        cta_location: a.closest('.hero') ? 'hero' : a.closest('nav') ? 'nav' : 'body'
      });
    });
    activity();
  }
  window.starhermitExperiment = {
    initDashboard: function () {
      if (initialized) return;
      initialized = true; surface = 'dashboard';
      if (production && !isPreview) {
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
        // Called AFTER auth.js scrubs OAuth tokens. Also strip all queries/fragments,
        // including invite identifiers, and suppress automatic history pageviews.
        window.gtag('js', new Date());
        window.gtag('set', { page_location: location.origin + '/', page_referrer: '' });
        window.gtag('config', 'G-W4D9C5NP9G', {
          page_location: location.origin + '/', page_referrer: '',
          send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false
        });
        var script = document.createElement('script'); script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=G-W4D9C5NP9G';
        document.head.appendChild(script);
        event('page_view');
      }
      activity();
    },
    signInShown: function () { if (eligible()) event('sh_signin_view'); },
    signedIn: function (me) {
      if (isPreview) return;
      var returning = !!cookie(SIGNED);
      write(SIGNED, true, 365 * 86400);
      if (!eligible() || state.converted) return;
      state.converted = true; save();
      event('sh_conversion');
      var created = Date.parse(me.createdAt);
      if (Number.isFinite(created) && created >= state.at) event('sh_signup');
      else if (Number.isFinite(created) || returning) event('sh_returning_signin');
      else event('sh_unclassified_signin');
    },
    gameLaunched: function () { if (eligible()) event('sh_game_launch'); }
  };
  if (document.querySelector('.hero')) home();
})();
