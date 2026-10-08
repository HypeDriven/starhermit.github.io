# starhermit.com — running specification

> **This is the running specification: it describes what this site is today.** It is loaded into every
> Claude Code session at start. Any task that changes the site must update this document in the same
> change — see [Keeping this document current](#keeping-this-document-current).

The public marketing site for StarHermit, served at **starhermit.com** (GitHub Pages; `CNAME` carries
the hostname). It is the front door: it pitches the platform to players and to developers, hands out the
Windows client, and links to the web dashboard and the developer wiki. It holds no account state and
calls no API of its own; the only third-party runtime dependency is Google Analytics.

## What's in the repo

| Path | What it is |
|---|---|
| `index.html` | The marketing site: one page, seven sections including a public FAQ, no framework |
| `privacy.html` | The privacy policy, linked from the footer — same shell (nav, background, styles), prose only |
| `style.css` | All styling — the "HUD" card look, the gradient accents, the reveal transitions |
| `robots.txt` | Allows public pages and assets to search engines and AI search crawlers; excludes development tools and workspace documentation, and advertises the sitemap. Concept pages remain crawlable so their existing `noindex` directives can be read. |
| `sitemap.xml` | Lists the canonical homepage and privacy policy; excludes prototypes, downloads, fragment links and authenticated subdomains. |
| `llms.txt` | A concise public site guide with factual playing/publishing information and official links, including sign-in, age requirements and the payment roadmap. Supplementary discovery information, not an indexing or ranking guarantee. |
| `img/starhermit-social.svg`, `img/starhermit-social.png` | Native brand artwork and its 1200 × 630 PNG export for social previews. Regenerate with `rsvg-convert img/starhermit-social.svg -o img/starhermit-social.png`. |
| `main.js` | UI behaviour only: a `js` class stamped on `<html>` as its first act (see below), reveal-on-scroll via `IntersectionObserver` (with a no-observer fallback that reveals everything), a `scrolled` class on the nav past the hero fold, and the footer year |
| `bg.js` | The deep-space background: a single fullscreen WebGL shader pass — Hubble-palette nebula, parallax starfields, a spiral galaxy, and a black hole with accretion disk and gravitational lensing. The camera pans as the page scrolls and keeps gliding while idle. A **lite mode** for coarse-pointer or small screens uses a cheaper shader, a smaller render target and a capped frame rate that drops further when idle. Absent WebGL, the canvas simply stays out of the way. |
| `img/*.webp` | Artwork for the six featured games in `#play` — cover art for Crown & Chasm, captured title screens for Blind Magus and Null Range, and official square covers for Turds, Sky Lobby and Iron Curtain: 1983. The square covers retain their full composition in the second row. Committed as static assets rather than hotlinked from the API: the API's `/cover` falls back to a favicon or a placeholder for games without one, and original covers can be large PNGs. |
| `img/games/*.webp` | The 24 game-wall covers, 320px square (~16 KB each), named after the game's folder. They were cut from each game's own `cover=` art, or from its uploaded cover where the repo has none. |
| `downloads/StarHermit.exe` | The published production build of the Windows client (`../starhermit-windows-client`), committed here so the download link is a static asset |
| `StarHermit_Terms_of_Service.docx` | The authoritative Terms of Service document. The web dashboard's `terms.txt` is generated from this file (`../starhermit-com-dashboard/tools/extract_terms.py`) — changing the terms here changes the dashboard's hash and re-prompts every user. |

## Sections

1. **Hero** — the platform pitch. Its primary action is **Create Free Account** →
   `dashboard.starhermit.com`; **Play Free Games** jumps to `#play`, **Publish a Game** to `#developers`.
   The pitch names free browser games and publishing from GitHub or a local build. A note under the
   buttons explains supported sign-in providers, with no payment card or installation needed,
   then three headline stats that are true of the shipped platform rather than
   invented catalog figures.
2. **In the library now** (`#play`) — real games hosted on StarHermit, each one a single click from
   playing. It has six featured cards (art, name, pitch, **Play Free Now**), then a wall of 24 more
   cover tiles ("Play free" on hover; a ▶ badge on touch screens, where only the first 12 show). It
   closes on *Browse the Full Library* → the dashboard, citing the library's size (130+). This
   section is the site's only pre-signup proof of the catalog: the dashboard is a hard sign-in gate
   and `GET /api/v1/github-games` is 401 anonymously.

   **Every game link is a dashboard play link, never the game's own address.** Each card's button
   and art, and each tile, go to `https://dashboard.starhermit.com/play/<game-id>`. The dashboard
   holds that link through provider sign-in and its Terms gate, shows the game's cover on the sign-in
   card, then launches the game (`../starhermit-com-dashboard/spec.md`, *Play links*). The games
   are also reachable anonymously at `<game-id>.starhermit.com`, and this site deliberately does
   not hand those out: a visitor who plays without an account is a visitor who never makes one. The
   play link gets them into the game *and* the account in one motion. Never link a game's own host.

   Null Range is the exception that does not auto-launch: it runs on its own site rather than a
   StarHermit host, so its play link opens its page in the library, one click from a new tab.
3. **For players** (`#players`) — free browser game discovery, web/Windows access, friends, chat,
   voice and shared game services. Closes on a dashboard CTA. Descriptions avoid unsupported claims
   about AAA releases, sales, refunds, mods, streaming and family sharing.
4. **For creators** (`#developers`) — repository/local-build publishing, GitHub ownership, deployment
   management and shared game services. Paid checkout and publisher payouts are explicitly labelled
   as a roadmap, including the planned cards and cryptocurrency capabilities. Closes on a dashboard
   CTA plus the developer docs.
5. **Download** (`#download`) — two launchpads, **web dashboard first** and carrying the primary
   button, with the native **Windows** client (`downloads/StarHermit.exe`) second and its real cost
   disclosed (size, OS, unsigned build → SmartScreen prompt).
6. **FAQ** (`#faq`) — visible HTML answers about the platform/operator, free featured games, sign-in
   and Terms gate, optional installation, publishing, payment availability and account eligibility.
   It links to games, downloads, dashboard, docs and legal documents, and is linked from the footer.
7. **Join** (`#join`) — open the dashboard (provider sign-in *is* the account creation; the
   dashboard has no separate sign-up form), or read the developer docs at `wiki.starhermit.com`.

The footer links off-page — dashboard, developer docs, Windows client, Terms of Service — and names
the operating company.

### Search and AI discoverability

Both production pages have unique titles/descriptions, absolute HTTPS canonical URLs, index/follow
directives with large image previews, Open Graph/Twitter metadata and static JSON-LD. The homepage
describes the Organization, WebSite, CollectionPage and six featured VideoGame items in an ItemList;
the privacy page describes the same Organization/WebSite and its WebPage. Game names, descriptions,
artwork and dashboard play URLs in the ItemList must stay synchronized with the visible cards.
No invented ratings, offers or unsupported rich-result claims are included.

The canonical homepage is `https://starhermit.com/`; the privacy policy remains
`https://starhermit.com/privacy.html`. Privacy-page home links use `/` rather than `index.html`.
Primary content, the FAQ and JSON-LD are present in the initial HTML and need no JavaScript to read.
The sitemap and `llms.txt` remain static files, without build dependencies. The wildcard robots policy
allows AI search crawling along with conventional search; it does not introduce separate training
permissions. Google AI search uses the same SEO fundamentals rather than special AI markup.

### Every path leads to sign-up

The page's single conversion goal is an account on `dashboard.starhermit.com`, so no part of it is a
link dead end and nothing offers a way around the gate. The fixed nav carries a filled **Play Now**
pill at all widths — deliberately not sign-up wording, because the persistent nav is the one control
a *returning* account holder uses, and "Sign Up Free" reads as not-for-me to them; it still lands on
the same gate, which signs up and signs in through the supported provider picker. The hero, which speaks to
first-time visitors, carries the explicit ask instead: **Create Free Account**. `#play`, `#players`
and `#developers` each close on a `.section-cta` band; the footer's first link is
**Sign Up / Sign In**.
Every outbound link on the page goes to the dashboard (its home, or a game's `/play/<game-id>`)
except the developer docs (`wiki.starhermit.com`) and the Windows client download, which needs an
account of its own.

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
- **The `#play` games can go stale.** The 30 games and their IDs are a committed snapshot of the
  catalog. A removed or redeployed-as-new game leaves a play link that ends on a "no longer in the
  library" toast, and nothing here will notice. Re-check them when the catalog changes against
  `GET /api/v1/github-games`, which needs a session. Every linked game must be `deployStatus: live`
  on its own `<game-id>.starhermit.com` host, except Null Range (see `#play` above). The "130+"
  library figure comes from the same snapshot.
- **Keep search and AI-facing copy factual.** Planned checkout, payment methods, refunds and payouts
  must remain labelled as planned in visible copy. Metadata, structured data and `llms.txt` describe
  available functionality. Keep the *platform's* specs (`../starhermit/spec.md` and the sibling clients')
  strictly descriptive, and never cite marketing intent as evidence a feature exists.
- The Windows client binary is a **published artefact**: replace it by publishing a new build from
  `../starhermit-windows-client`, not by hand-editing anything here.

## Keeping this document current

**Every task that changes the site updates this file as part of the same change** — a new or removed
section, a changed download or link target, a change to the background renderer's modes, a new asset
committed for distribution. A change is not done until the spec matches it.

1. Describe the site's structure and what each part is for; the copy itself lives in `index.html` and
   does not need mirroring here.
2. When the Terms of Service document changes, say so in the same pass in
   `../starhermit-com-dashboard/spec.md` — the dashboard's gate re-prompts every user off its hash.
3. Edit in place, don't append a changelog; delete what stopped being true.
