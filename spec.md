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
| `index.html` | The marketing site: one page, six sections, no framework |
| `privacy.html` | The privacy policy, linked from the footer — same shell (nav, background, styles), prose only |
| `style.css` | All styling — the "HUD" card look, the gradient accents, the reveal transitions |
| `main.js` | UI behaviour only: a `js` class stamped on `<html>` as its first act (see below), reveal-on-scroll via `IntersectionObserver` (with a no-observer fallback that reveals everything), a `scrolled` class on the nav past the hero fold, and the footer year |
| `bg.js` | The deep-space background: a single fullscreen WebGL shader pass — Hubble-palette nebula, parallax starfields, a spiral galaxy, and a black hole with accretion disk and gravitational lensing. The camera pans as the page scrolls and keeps gliding while idle. A **lite mode** for coarse-pointer or small screens uses a cheaper shader, a smaller render target and a capped frame rate that drops further when idle. Absent WebGL, the canvas simply stays out of the way. |
| `img/*.webp` | Artwork for the three games in the **Play now** section — cover art for Crown & Chasm, captured title screens for Blind Magus and Null Range. Committed as static assets rather than hotlinked from the API: the API's `/cover` 404s for games without one, and the one cover that exists is a 1.4 MB PNG. |
| `downloads/StarHermit.exe` | The published production build of the Windows client (`../starhermit-windows-client`), committed here so the download link is a static asset |
| `StarHermit_Terms_of_Service.docx` | The authoritative Terms of Service document. The web dashboard's `terms.txt` is generated from this file (`../starhermit-com-dashboard/tools/extract_terms.py`) — changing the terms here changes the dashboard's hash and re-prompts every user. |

## Sections

1. **Hero** — the platform pitch. Its primary action is **Create Free Account** →
   `dashboard.starhermit.com`; **See the Games** jumps to `#play`, **Publish a Game** to `#developers`.
   A note under the buttons states the cost of clicking ("one Google sign-in — no password, no card,
   nothing to install"), then three headline stats that are true of the shipped platform rather than
   invented catalog figures.
2. **In the library now** (`#play`) — three real games hosted on StarHermit, shown with their
   artwork and named. This section is the site's only pre-signup proof that the platform hosts real
   games: the dashboard is a hard sign-in gate and `GET /api/v1/github-games` is 401 anonymously, so
   nothing about the catalog is visible until after signup.

   **It shows the games but never links to them.** Each card's button is *Sign In to Play* →
   `dashboard.starhermit.com`, and the section closes on *Create Your Free Account*. The games are in
   fact reachable anonymously at their own `<game-id>.starhermit.com` addresses, and this site
   deliberately does not hand those out: a visitor who plays without an account is a visitor who
   never makes one. Proof of the catalog is the job here; the account is the ask. Do not reintroduce
   direct game links.
3. **For players** (`#players`) — the library as the heart of a social ecosystem: catalog breadth, sales,
   one-click community mods, friends and community. Closes on a dashboard CTA.
4. **For creators** (`#developers`) — the three-step publishing story (paste a repo → claim your game →
   get paid), and the built-in payments stack (cards with regional pricing, plus cryptocurrency).
   Closes on a dashboard CTA plus the developer docs.
5. **Download** (`#download`) — two launchpads, **web dashboard first** and carrying the primary
   button, with the native **Windows** client (`downloads/StarHermit.exe`) second and its real cost
   disclosed (size, OS, unsigned build → SmartScreen prompt).
6. **Join** (`#join`) — open the dashboard (signing in with Google *is* the account creation; the
   dashboard has no separate sign-up form), or read the developer docs at `wiki.starhermit.com`.

The footer links off-page — dashboard, developer docs, Windows client, Terms of Service — and names
the operating company.

### Every path leads to sign-up

The page's single conversion goal is an account on `dashboard.starhermit.com`, so no part of it is a
link dead end and nothing offers a way around the gate. The fixed nav carries a filled **Play Now**
pill at all widths — deliberately not sign-up wording, because the persistent nav is the one control
a *returning* account holder uses, and "Sign Up Free" reads as not-for-me to them; it still lands on
the same gate, which signs up and signs in through one Google button. The hero, which speaks to
first-time visitors, carries the explicit ask instead: **Create Free Account**. `#play`, `#players`
and `#developers` each close on a `.section-cta` band; the footer's first link is
**Sign Up / Sign In**.
Every outbound link on the page goes to the dashboard except the developer docs
(`wiki.starhermit.com`) and the Windows client download, which needs an account of its own.

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
- **The `#play` artwork can go stale.** `img/*.webp` is a committed snapshot of three specific games;
  if one is removed from the platform the section is advertising something that no longer exists.
  Re-check the three titles when the catalog changes.
- **Marketing copy is forward-looking by nature**, and some of it describes intent rather than shipped
  behaviour (payments and revenue flows in particular do not exist in the backend yet). That is fine for
  this site — but keep the *platform's* specs (`../starhermit/spec.md` and the sibling clients') strictly
  descriptive, and never cite this page as evidence a feature exists.
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
