# starhermit.com — running specification

> **This is the running specification: it describes what this site is today.** It is loaded into every
> Claude Code session at start. Any task that changes the site must update this document in the same
> change — see [Keeping this document current](#keeping-this-document-current).

The public marketing site for StarHermit, served at **starhermit.com** (GitHub Pages; `CNAME` carries
the hostname). It is the front door: it pitches the platform to players and to developers, hands out the
Windows, Linux and macOS clients, and links to the web dashboard and the developer wiki. It holds no account state and
calls no API of its own; the only third-party runtime dependency is Google Analytics.

## What's in the repo

| Path | What it is |
|---|---|
| `index.html` | The player-first homepage, with game discovery, publishing and optional downloads |
| `privacy.html` | The privacy policy, linked from the footer — same shell (nav, background, styles), prose only |
| `style.css` | Shared styling and the privacy page shell |
| `home.css` | Homepage layout, art-led hero, game cards, publishing panel and responsive styling |
| `robots.txt` | Allows public pages and assets to search engines and AI search crawlers; excludes development tools and workspace documentation, and advertises the sitemap. |
| `sitemap.xml` | Lists the English homepage/privacy policy and all 114 translated URLs (58 languages, 116 URLs); excludes prototypes, downloads, fragment links and authenticated subdomains. |
| `llms.txt` | A concise public site guide with factual playing/publishing information and official links, including sign-in, age requirements and the payment roadmap. Supplementary discovery information, not an indexing or ranking guarantee. |
| `img/observatory.webp`, `img/observatory-mobile.webp`, `img/observatory-mark.svg` | Wide hero artwork, a closer mobile crop, and the observatory mark used for navigation and favicons. |
| `img/starhermit-social.svg`, `img/starhermit-social.png` | The observatory artwork and StarHermit wordmark composed into a 1200 × 630 social preview. Regenerate with `rsvg-convert img/starhermit-social.svg -o img/starhermit-social.png`. |
| `main.js` | UI behaviour only: a `js` class stamped on `<html>` as its first act (see below), reveal-on-scroll via `IntersectionObserver` (with a no-observer fallback that reveals everything), a `scrolled` class on the nav past the hero fold, and the footer year |
| `bg.js` | The deep-space background: a single fullscreen WebGL shader pass — Hubble-palette nebula, parallax starfields, a spiral galaxy, and a black hole with accretion disk and gravitational lensing. The camera pans as the page scrolls and keeps gliding while idle. A **lite mode** for coarse-pointer or small screens uses a cheaper shader, a smaller render target and a capped frame rate that drops further when idle. Absent WebGL, the canvas simply stays out of the way. |
| `img/*.webp` | Featured artwork for Crown & Chasm, Blind Magus, Turds, Sky Lobby and Iron Curtain: 1983, plus a retained Null Range asset. Committed as static assets rather than hotlinked from the API: the API's `/cover` falls back to a favicon or a placeholder for games without one, and original covers can be large PNGs. |
| `img/games/*.webp` | Game-wall cover assets, 320px square (~16 KB each), named after the game's folder. They were cut from each game's own `cover=` art, or from its uploaded cover where the repo has none. |
| `downloads/StarHermit.exe` | The published production build of the Windows client (`../starhermit-client/starhermit-windows-client`), committed here so the download link is a static asset |
| `downloads/StarHermit-linux-x86_64.tar.gz` | The published production build of the Linux client (`../starhermit-client/starhermit-linux-client`) as a tarball, which keeps the executable bit a browser download would drop. This is what the Linux download card links to. |
| `downloads/starhermit-client-linux-x86_64` | The same Linux build as a bare executable: the file the Linux client's self-updater downloads and swaps in. Not linked from the page. |
| `downloads/StarHermit-macos-universal.zip` | The published production build of the macOS client (`../starhermit-client/starhermit-osx-client`, `tools/bundle.sh --production` on a Mac): `StarHermit.app`, universal (Apple silicon and Intel), ad-hoc signed, zipped with `ditto`. It has no entry in `version.json` yet, so the macOS client does not update itself. |
| `downloads/StarHermit-android.apk` | The published production build of the Android client (`../starhermit-client/starhermit-android-client`, `tools/build-apk.sh`): arm64-v8a and x86_64, Android 9+ (API 28), the engine's Android runtime bundled, signed with the StarHermit release key (`~/.android/starhermit-release.keystore` on the deploy machine; every later APK must use the same key or installed copies cannot update). It has no `version.json` entry: an APK cannot replace itself, so players install a newer one over it. |
| `downloads/version.json` | The clients' self-update manifest, written by the production deploy script with each build: `{"version","url","size","sha256"}` for `StarHermit.exe` at the top level (all the older C++ Windows clients can read), plus the same four members per platform under `platforms` (`windows-x86_64`, `linux-x86_64`), which the current clients read. A production client checks it at start and periodically; when its platform's entry names a newer version it downloads the build, checks size and SHA-256, and replaces itself. Publish manifest and builds together: an entry whose hash does not match its file is ignored until they agree. |
| `.well-known/assetlinks.json` | Digital Asset Links for the Android client (`com.starhermit.client`): the SHA-256 of the StarHermit release key's certificate, which makes `https://starhermit.com/app/oauth-callback` a verified app link. A new or rotated signing key (or Play App Signing's key) must be added here, or the sign-in link stops opening the app. |
| `app/oauth-callback.html` | Where the Android client's browser sign-in ends (the API's `OAuth:FrontendRedirectUris:android` redirect, tokens in the fragment). Android normally opens the app on this address without showing the page; when the browser shows it anyway, its button hands the tokens to the app with an `intent://` link and the script drops the fragment from the address bar. No analytics or other third-party scripts, `noindex`, no referrer. |
| `tools/stamp_client_version.py` | Compatibility entry point for the production deploy script. Validates arguments without stamping the homepage. |
| `StarHermit_Terms_of_Service.docx` | The authoritative Terms of Service document. The web dashboard's `terms.txt` is generated from this file (`../starhermit-com-dashboard/tools/extract_terms.py`) — changing the terms here changes the dashboard's hash and re-prompts every user. |

## Sections

1. **Hero** — a remote observatory tower takes its cues from a lighthouse keeper’s station. Midnight blue,
   ivory serif headings and the warmth of the tower’s amber window carry through to the library and publishing panel.
   “Free online games” and **Browse Games** lead into the library, with a compact direct link to the featured game.
   The header offers Games, Developers, Sign In, and the language picker.
2. **Game library** (`#play`) — five fixed covers plus nine more games in a native disclosure.
   The list is a November 18, 2026 snapshot filtered to live games with a production average of at least 2/5 and at least one rating.
   Every game link goes through `https://dashboard.starhermit.com/play/<game-id>`, which preserves the
   destination through sign-in and the Terms gate.
3. **Publishing** (`#developers`) — a short pitch for vibe-coded games, free server access, and creator-chosen
   monetization. The steps are sign in and click **Add Game**. Platform and integration details live in the wiki.
4. **Native Clients for Better Framerates!** (`#download`) — an initially expanded disclosure with amber Windows, Linux, macOS and Android download buttons and platform requirements.

The footer links to the dashboard, developer wiki, native clients, Discord, and legal and security pages.

### Search and AI discoverability

Both English production pages and their translations have unique titles/descriptions, absolute HTTPS canonical URLs, index/follow
directives with large image previews, Open Graph/Twitter metadata and static JSON-LD. The homepage
describes the Organization, WebSite, CollectionPage and five featured VideoGame items in an ItemList;
the privacy page describes the same Organization/WebSite and its WebPage. Game names, artwork and dashboard play URLs in the ItemList must stay synchronized with the featured selection.
No invented ratings, offers or unsupported rich-result claims are included.

The canonical homepage is `https://starhermit.com/`; the privacy policy remains
`https://starhermit.com/privacy.html`. Privacy-page home links use `/` rather than `index.html`.
Primary content and JSON-LD are present in the initial HTML and need no JavaScript to read.
The sitemap and `llms.txt` remain static files, without build dependencies. The wildcard robots policy
allows AI search crawling along with conventional search; it does not introduce separate training
permissions. Google AI search uses the same SEO fundamentals rather than special AI markup.

### Dashboard handoff

Game links take players directly to the chosen game's dashboard entry. The dashboard manages sign-in,
account creation and Terms acceptance. The public homepage does not call the catalog API.

**Discord lives in the footer, never the hero.** It was a hero button once, on an invite
(`discord.gg/shugC9fMg`) that had expired — so the loudest control on the page led to Discord's
"Invite Invalid" screen, and nothing in this repo could notice.

The current invite is `discord.gg/pJ9QPGW9Tt`, verified against the Discord API as permanent:
`expires_at: null`, `max_uses: null`, guild `1531881098232070165` ("Starhermit.com"). **Verify any
replacement the same way before committing** — a default Discord invite lasts 7 days, and neither
GitHub Pages nor anything else here will ever fail a build over a dead one:

```
curl -s "https://discord.com/api/v10/invites/<CODE>?with_expiration=true"
```

It must return a guild object with `"expires_at": null` — not a non-null date, and not
`{"code": 50270}` ("Invite is expired").

## Homepage A/B experiment

The homepage uses solid navy surfaces with blue and violet accents and a filled light-blue Sign In button.
The remastered layout keeps a compact library and publishing panel. The privacy page retains the WebGL background.

`experiment.js` gives all 14 homepage games an equal chance of appearing in the featured slot.
Eligible browsers keep their assignment while other visitors get a random pick on each page load. The art, title, and direct play link change as a unit while the rest of the page
is fixed. The dashboard copy must ship first to record new-account conversion and game launches.
The historical `hero_v2` enrollment closed November 9, 2026. See `experiments.md` for the current
test window, preview URLs, GA4 events, rollout and analysis. Standard GA4 remains active.

## Localization

The homepage and privacy policy have 58 language editions. English keeps `/` and `/privacy.html`;
57 translated pairs live at `/<language>/` and `/<language>/privacy.html`. Existing URLs remain stable,
including Brazilian Portuguese at `/pt/` and shared Spanish at `/es/` for Spain, Colombia, Chile,
Argentina and Ecuador. Shared French, Dutch and German also cover Belgium; Singapore has English,
Simplified Chinese, Malay and Tamil. Finnish and Swedish cover Finland. Hong Kong has separate
Traditional Chinese (`zh-HK`) and written Cantonese (`yue-HK`) editions, alongside English and the
existing Simplified Chinese edition. The remaining national-language additions are German, Japanese,
Dutch, Italian, Finnish, Swedish, Estonian and Vietnamese.

Recognized regional and Indigenous language editions include Catalan/Valencian, Basque, Galician,
Occitan, West Frisian, Limburgish, Danish, Breton, Corsican, Friulian, Slovenian, Greek, Albanian,
Croatian, Romani, Northern Sámi, Javanese, Sundanese, Madurese, Minangkabau, Balinese, Acehnese,
Batak Toba, Makassarese, Betawi, Hmong, Khmer, Quechua, Guaraní, Aymara, Venetian, Ligurian,
Lombard, Sicilian and Luxembourgish. Russian is also available for Estonia’s recognized Russian
minority. Hindi, Arabic, Bengali and Urdu remain available.

`localization/regions.json` records all 18 requested regions, available shared language editions,
primary sources, and outstanding dedicated translations. Recognition includes national/co-official
status and regional, minority or heritage protection; these are not equivalent legal statuses.
The configured service does not cover every recognized language: examples include Low German,
Sorbian, Sardinian, Ladin, Mapudungun, Wayuunaiki, Ecuadorian Kichwa and Shuar. Those languages are
explicitly pending rather than published with English copy or a neighboring language. General Occitan
does not claim Aranese localization, general Quechua does not claim Ecuadorian Kichwa localization,
and standard Albanian/Greek/Croatian are not dialect-specific Arbëresh/Griko/Molise Croatian editions.
The regional inventory prioritizes widely used written languages rather than listing every protected
or endangered language. All generated translations are machine translations, not human-reviewed copy.

The header uses a keyboard-accessible disclosure dropdown with local SVG flags under `img/flags/`.
It works without JavaScript. Language switching preserves the current page, query parameters
and section anchor. `localization.js` saves the selection; an early script
restores it on the English homepage before analytics initialization. Explicit deep links
retain their language. Translated footers identify machine translation and link to the English original.
Arabic and Urdu use right-to-left layouts; country flags are image assets, independent of emoji fonts.

`localization/languages.json` supplies native names, directions, flag paths, localized play verbs,
Open Graph locales, and translation-service identifiers when they differ from the public BCP 47 tag.
`tools/localize.mjs` generates static translated prose, metadata, JSON-LD, canonical and hreflang links,
and a sitemap of all 116 public URLs. English HTML is the source of truth; generated additions have
`localization` comment markers.
`tools/localization-cache.json` stores translations, and `localization/manifest.json` records clean
English source hashes and the experiment script's hash. Game titles, brands, IDs, dashboard play links,
client downloads, and the authoritative Terms document retain their original values.
The translation fetcher masks game and brand names with opaque tokens, validates that the service
preserved them, and restores their exact spelling. A cache protection hash refreshes older unprotected
entries on the next online translation run. `localization/overrides.json` holds explicit UI corrections
and Hong Kong terminology; offline generation applies these after the service cache.
The separately deployed developer wiki still has the original ten language editions. Links use its
existing localized routes for those languages and its English root for other editions; this change
does not invent missing wiki routes or add translations to the dashboard/client repositories.

Localized homepages use the same static game links, artwork and layout. The generated dictionaries
retain the historical hero strings. Translation runs at build time, with no browser translation service.

Development tooling uses Node.js 22+, Python 3, and `npm ci`. `npm run localize` rebuilds offline from
the cache; `npm run localize:refresh` sends changed public prose to Google Translate and updates it.
Missing cache entries fail generation instead of falling back to English. Translation work uses the
configured service identifier (Traditional Chinese uses `zh-TW`; Cantonese uses `yue`) while generated
URLs, document language, preferences, dashboard handoff and hreflang retain `zh-HK` and `yue-HK`.
`npm test` checks all pages, links, anchors, downloads, metadata, game names, source freshness, and
unchanged analytics/experiment code, plus region coverage, locale metadata, picker entries and sitemap
parity. `npm run test:browser` checks desktop/mobile, all languages, the homepage, privacy, image flags, keyboard controls, saved preferences, and no-JavaScript access.
Commit generated translations with any public copy changes. The site still publishes static files
through GitHub Pages without an application build.

The test command also runs offline translation-service regression checks for opaque name tokens,
altered identifiers, dropped-name recovery, and unsupported-language errors without network calls.
Translated legal copy allows long compound words to wrap on mobile screens. Browser checks can be
narrowed with `LOCALES=se,ru`, `WIDTHS=390`, or
`PRIVACY_ONLY=1` for focused regression checks; the default covers every locale.

## Constraints

- **No build step and no dependencies.** Plain HTML/CSS/JS, deployed as-is by GitHub Pages. The site
  calls no StarHermit API at runtime; the game artwork it shows is committed to `img/`.
- **Google Analytics (GA4 `G-W4D9C5NP9G`) is the one third-party script**, the standard `gtag.js`
  snippet in the `<head>` of *both* `index.html` and `privacy.html` — a page added later that omits it
  is a page with no traffic data. It loads `async` and nothing else depends on it, so a blocked tag
  costs measurement and nothing else. The privacy policy already discloses analytics cookies and
  analytics service providers; keep it that way if the tag is ever replaced or removed.
- **The page must be readable without JavaScript.** `.reveal` starts hidden only under
  `html.js`, and `main.js` adds that class as its first statement — so a blocked, 404'd or failed
  `main.js` leaves every word and every CTA visible instead of a blank starfield. `main.js` also
  loads *before* `bg.js`, and both are `defer`red, so the WebGL shader compile never delays the
  content. Do not reintroduce a bare `.reveal { opacity: 0 }`.
- **Outbound links rot silently.** Nothing here has a build step that could fail on a dead link —
  an expired Discord invite shipped as the hero's loudest button and stayed there. Re-check every
  outbound link whenever the site is touched.
- **The `#play` games can go stale.** The 14 games and their IDs are a committed snapshot of the
  catalog. A removed or redeployed-as-new game leaves a play link that ends on a "no longer in the
  library" toast, and nothing here will notice. Re-check them when the catalog changes against
  `GET /api/v1/github-games`, which needs a session. Every linked game must be `deployStatus: live`
  on its own `<game-id>.starhermit.com` host.
- **Keep search and AI-facing copy factual.** Planned checkout, payment methods, refunds and payouts
  must remain labelled as planned in visible copy. Metadata, structured data and `llms.txt` describe
  available functionality. Keep the *platform's* specs (`../starhermit/spec.md` and the sibling clients')
  strictly descriptive, and never cite marketing intent as evidence a feature exists.
- The client binaries are **published artefacts**: replace them by publishing new builds from
  `../starhermit-client` (the production deploy script does this), not by hand-editing anything here.

## Keeping this document current

**Every task that changes the site updates this file as part of the same change** — a new or removed
section, a changed download or link target, a change to the background renderer's modes, a new asset
committed for distribution. A change is not done until the spec matches it.

1. Describe the site's structure and what each part is for; the copy itself lives in `index.html` and
   does not need mirroring here.
2. When the Terms of Service document changes, say so in the same pass in
   `../starhermit-com-dashboard/spec.md` — the dashboard's gate re-prompts every user off its hash.
3. Edit in place, don't append a changelog; delete what stopped being true.
