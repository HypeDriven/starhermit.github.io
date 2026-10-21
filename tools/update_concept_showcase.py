#!/usr/bin/env python3
"""Rebuild the concept showcases from the saved production rating aggregates."""
from pathlib import Path
from datetime import datetime
from html import escape
import base64
import json
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
CONCEPTS = ROOT / 'concepts'
SNAPSHOT = json.loads((CONCEPTS / 'showcase-ratings.json').read_text())
ASSETS = {
 'e14afb19-1ebd-484e-8ab4-01ee7ec0e513': ('img/turds.webp', 'ARTILLERY / MULTIPLAYER', 'chaos', 'Lead a squad of talking turds into turn-based artillery chaos.'),
 '50d7ebaa-a7af-4a4f-a833-2f462650f44b': ('img/games/skigame.webp', 'DOWNHILL SKI RACER', 'adventure', 'A neon downhill ski racer with jumps, tricks and close calls.'),
 '5adfbe9a-a7a6-45f6-a468-589340bb2a47': ('img/games/turd-karts.webp', 'KART RACING / MULTIPLAYER', 'chaos', 'Eight cartoon drivers, sixteen tracks and a very full bathroom.'),
 '9afe3282-b3a8-4cb6-a098-3c354420628d': ('img/games/turds-3d.webp', '3D SHOOTER / MULTIPLAYER', 'chaos', 'Bring the Turds arsenal into a cartoon third-person shooter.'),
 'c115ae9d-f485-48d2-86c8-1e26d00fded8': ('img/iron-curtain-1983.webp', 'REAL-TIME STRATEGY', 'build', 'Command Cold War armies through the war that never happened.'),
 'db9805dc-4674-409a-b7b1-ff133304c09e': ('img/sky-lobby.webp', 'TOWER TYCOON', 'build', 'Build upward, keep the elevators moving and the tenants happy.'),
 '83fd04b1-3cbe-4b09-a251-3733ad4b9d94': ('img/games/chess.webp', 'CHESS / MULTIPLAYER', 'build', 'Play a quiet game of chess with a friend or challenge the AI.'),
}
GAMES = sorted(SNAPSHOT['games'], key=lambda g: (-g['average'], -g['count'], g['name'].casefold()))
assert len(GAMES) == 7
assert all(g['deployStatus'] == 'live' and g['count'] > 0 for g in GAMES)
for rank, game in enumerate(GAMES, 1):
 image, genre, category, description = ASSETS[game['id']]
 assert (ROOT / image).exists(), image
 game.update(rank=rank, image=image, genre=genre, category=category, pitch=description,
             url=f'https://dashboard.starhermit.com/play/{game["id"]}')
DATE = datetime.fromisoformat(SNAPSHOT['capturedAt']).strftime('%d %b %Y')


def artwork(game, lazy=True):
 return (f'<img src="../{game["image"]}" alt="{escape(game["name"])} game artwork" width="800" height="450"'
         + (' loading="lazy"' if lazy else '') + '>')


def score(game):
 return f'★ {game["average"]:.1f} / 5 · {game["count"]} rating'+('' if game['count']==1 else 's')


def rating(game):
 return f'<span class="rating-line">{score(game)}</span>'


def play(game, label=None, cls='play-link'):
 return f'<a class="{cls}" href="{game["url"]}" target="_blank" rel="noopener">{label or "Play "+escape(game["name"])+" ↗"}</a>'


def replace_element(text, class_name, replacement):
 """Replace one known element, balancing nested tags of the same type."""
 match = re.search(r'<([a-z][a-z0-9]*)\b[^>]*\bclass="'+re.escape(class_name)+r'"[^>]*>', text)
 assert match, class_name
 tag=match.group(1); depth=0
 for token in re.finditer(r'</?'+tag+r'\b[^>]*>', text[match.start():]):
  depth += -1 if token.group().startswith('</') else 1
  if depth==0:
   end=match.start()+token.end()
   return text[:match.start()]+replacement+text[end:]
 raise ValueError('Unclosed element: '+class_name)


first, second, third = GAMES[:3]
html = (CONCEPTS/'horizon.html').read_text()
html = replace_element(html,'horizon-feature',f'<a class="horizon-feature" href="{first["url"]}" target="_blank" rel="noopener">{artwork(first,False)}<div><span class="micro">#01 / PLAYER FAVORITE</span><h2>{escape(first["name"])}</h2>{rating(first)}<span>Enter this world ↗</span></div></a>')
html = replace_element(html,'chapter-heading',f'<div class="chapter-heading"><span class="micro">01 / HIGHEST RATED<br>{DATE.upper()}</span><h2>THE GAMES PLAYERS<br><em>RATE HIGHEST.</em></h2><p>Chosen by platform ratings.<br>One Google sign-in opens your game.</p></div>')
headlines = ['A little chaos.<br>A lot of fun.','Chase the slope.','Take the fast lane.']
cards = ''.join(f'<article class="{"mosaic-large" if i==0 else ""}"><a href="{g["url"]}" target="_blank" rel="noopener">{artwork(g)}<div><span class="micro">#{g["rank"]:02d} / {g["genre"]}</span><h3>{headlines[i]}</h3>{rating(g)}<span>{escape(g["name"])} ↗</span></div></a></article>' for i,g in enumerate(GAMES[:3]))
html=replace_element(html,'horizon-mosaic','<div class="horizon-mosaic">'+cards+'</div>')
(CONCEPTS/'horizon.html').write_text(html)

html=(CONCEPTS/'pearl.html').read_text()
html=replace_element(html,'pearl-section-head',f'<div class="pearl-section-head"><p class="micro">PLAYER FAVORITES / {DATE.upper()}</p><h2>Good games.<br><em>Chosen by the players.</em></h2><p>Highest rated on StarHermit.<br>One Google sign-in, and you’re inside.</p></div>')
editorial=f'<div class="pearl-editorial"><article class="pearl-lead"><a href="{first["url"]}" target="_blank" rel="noopener">{artwork(first)}</a><div><span class="micro">#01 / {first["genre"]}</span><h3>Perfectly<br>ridiculous.</h3>{rating(first)}<p>{first["pitch"]}</p>{play(first)}</div></article><article class="pearl-small"><a href="{second["url"]}" target="_blank" rel="noopener">{artwork(second)}</a><span class="micro">#02 / {second["genre"]}</span><h3>A little speed.<br>A lot of possibility.</h3>{rating(second)}{play(second)}</article></div>'
html=replace_element(html,'pearl-editorial',editorial)
rows=''.join(f'<a href="{g["url"]}" target="_blank" rel="noopener"><span class="micro">{g["rank"]:02d}</span><h3>{escape(g["name"])}</h3><span class="index-rating">{score(g)}</span><b>↗</b></a>' for g in GAMES[2:])
html=replace_element(html,'pearl-index','<div class="pearl-index">'+rows+'</div>')
(CONCEPTS/'pearl.html').write_text(html)

html=(CONCEPTS/'flux.html').read_text()
html=replace_element(html,'flux-section-head',f'<div class="flux-section-head"><span class="micro">PLAYER FAVORITES / {DATE.upper()}</span><h2>THE TOP<br><em>PICKS.</em></h2><div><p>Five stars. Big energy.<br>The highest-rated games on StarHermit.</p><div class="flux-filters" role="group" aria-label="Game category"><button data-filter="all" aria-pressed="true">ALL OF IT</button><button data-filter="chaos" aria-pressed="false">CHAOS</button><button data-filter="build" aria-pressed="false">STRATEGY</button><button data-filter="adventure" aria-pressed="false">ADVENTURE</button></div></div></div>')
picks=''.join(f'<article data-category="{g["category"]}"><a href="{g["url"]}" target="_blank" rel="noopener">{artwork(g)}<span class="flux-pick-label"><span><small>#{g["rank"]:02d} / {g["genre"]}</small><strong>{escape(g["name"])}</strong>{rating(g)}</span><b>↗</b></span></a></article>' for g in GAMES[:5])
html=replace_element(html,'flux-picks','<div class="flux-picks">'+picks+'</div>')
(CONCEPTS/'flux.html').write_text(html)

html=(CONCEPTS/'museum.html').read_text()
html=replace_element(html,'gallery-fallback','<div class="gallery-fallback">'+artwork(first,False)+'</div>')
html=replace_element(html,'museum-controls',f'<div class="museum-controls"><div><span class="micro">HIGHEST RATED / PLAYER FAVORITES</span><h2 data-selected-name>{escape(first["name"])}</h2><span class="rating-line" data-selected-rating>{score(first)}</span></div><div class="museum-arrows"><button data-gallery-next="-1" aria-label="Previous game">←</button><span class="micro"><span data-selected-number>01</span> / 07</span><button data-gallery-next="1" aria-label="Next game">→</button></div><a class="museum-enter" data-selected-link href="{first["url"]}" target="_blank" rel="noopener">Enter this world <b>↗</b></a></div>')
html=replace_element(html,'museum-index-head',f'<div class="museum-index-head"><p class="micro">TOP SEVEN / {DATE.upper()}</p><h2>The players<br><em>have good taste.</em></h2><p>Ranked by platform rating, then rating count.<br>One Google sign-in opens your game.</p></div>')
rows=''.join(f'<a href="{g["url"]}" target="_blank" rel="noopener"><span class="micro">{g["rank"]:02d}</span>{artwork(g)}<h3>{escape(g["name"])}</h3><span class="museum-genre">{score(g)}</span><b>↗</b></a>' for g in GAMES)
html=replace_element(html,'museum-list','<div class="museum-list">'+rows+'</div>')
html=html.replace('Games worth getting lost in. Choose your first.','The highest-rated worlds on StarHermit. Choose your first.')
(CONCEPTS/'museum.html').write_text(html)

html=(CONCEPTS/'signal.html').read_text()
html=replace_element(html,'signal-section-head',f'<div class="signal-section-head"><p class="micro">ON THE PLAYERS’ WAVELENGTH / {DATE.upper()}</p><h2>Good games.<br><em>Strong signals.</em></h2><p>The highest-rated games on StarHermit.<br>Play free, with one Google sign-in.</p></div>')
headlines=['A beautifully<br>ridiculous rivalry.','One slope.<br>A whole lot of speed.','Take the<br>scenic shortcut.']
cards=''.join(f'<article class="signal-story-{["one","two","three"][i]}"><a href="{g["url"]}" target="_blank" rel="noopener">{artwork(g)}<span>#{g["rank"]:02d} / {g["genre"]}</span><h3>{headlines[i]}</h3>{rating(g)}<b>{escape(g["name"])} ↗</b></a></article>' for i,g in enumerate(GAMES[:3]))
html=replace_element(html,'signal-stories','<div class="signal-stories">'+cards+'</div>')
(CONCEPTS/'signal.html').write_text(html)

# Embed the sorted titles, real aggregates and art for the offline WebGL carousel.
art=[]
for g in GAMES:
 art.append(dict(name=g['name'],url=g['url'],average=g['average'],count=g['count'],
                 data='data:image/webp;base64,'+base64.b64encode((ROOT/g['image']).read_bytes()).decode()))
(CONCEPTS/'artwork.js').write_text('window.SH_ARTWORK='+json.dumps(art)+';\n')

# Copy the active review to the user-requested destination; preserve earlier studies.
destination=Path('/tmp/sh-concepts/round-two')
destination.mkdir(parents=True,exist_ok=True)
for name in ['round-two.html','horizon.html','pearl.html','flux.html','museum.html','signal.html','directions.css','directions.js','webgl.js','artwork.js','workbench.css','workbench.js','review.css','showcase-ratings.json']:
 shutil.copy2(CONCEPTS/name,destination/('index.html' if name=='round-two.html' else name))
 if name.endswith('.html'):
  path=destination/('index.html' if name=='round-two.html' else name)
  path.write_text(path.read_text().replace('src="../img/','src="img/').replace('href="../index.html"','href="current.html"'))
shutil.copytree(ROOT/'img',destination/'img',dirs_exist_ok=True)
shutil.copytree(CONCEPTS/'fonts',destination/'fonts',dirs_exist_ok=True)
for g in GAMES: print(f'{g["rank"]}. {g["name"]}: {score(g)}')
print(f'Updated five concepts from the {DATE} production snapshot.')
