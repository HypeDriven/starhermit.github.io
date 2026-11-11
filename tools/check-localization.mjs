import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { resolve } from 'node:path';
import { root, languages, regions, corpus, sha } from './localize.mjs';
const {pages,strings}=await corpus();
const gameTitles=[...pages[0].document.querySelectorAll('#play .grid-3 h3,.game-tile-name')].map(e=>e.textContent.trim());
const preservedNames=['StarHermit','STARHERMIT','Hype Driven Development Inc.','Google','GitHub','Discord','Windows','Linux','macOS','WebAssembly','OAuth',...gameTitles];
const manifest=JSON.parse(await readFile(resolve(root,'localization/manifest.json'),'utf8'));
const byURL=new Map();
const languageCodes=Object.keys(languages);
assert.deepEqual(manifest.languages,languageCodes);
assert.deepEqual(Object.keys(regions).sort(),['DE','JP','BE','BR','SG','FR','HK','NL','CO','IT','FI','CL','AR','ES','EE','ID','EC','VN'].sort());
for(const [region,config] of Object.entries(regions)){
 assert.ok(config.languages.length,`${region} has no national languages`);
 assert.ok(config.sources.length,`${region} has no language coverage sources`);
 await access(resolve(root,'.'+config.flag));
 for(const code of [...config.languages,...config.regional_languages])assert.ok(languages[code],`${region} references unknown locale ${code}`);
 for(const pending of config.pending_languages){
  assert.ok(!languages[pending.code],`${region}: supported locale ${pending.code} is marked pending`);
  assert.ok(pending.reason,`${region}: pending locale needs an explanation`);
 }
}
for(const [code,locale] of Object.entries(languages)){
 assert.equal(new Intl.Locale(code).toString().toLowerCase(),code.toLowerCase());
 assert.equal(locale.code,code);
 assert.equal(locale.prefix,code==='en'?'':'/'+code);
 assert.ok(locale.name&&locale.language&&locale.play&&locale.og_locale,`${code} has incomplete locale metadata`);
 assert.ok(Object.values(regions).some(r=>[...r.languages,...r.regional_languages].includes(code))||['hi','ar','bn','ur'].includes(code),`${code} is not assigned to a requested region`);
}
for(const lang of Object.keys(languages))for(const page of pages){
 const url=(lang==='en'?'':'/'+lang)+page.url;
 const html=await readFile(resolve(root,lang==='en'?'':lang,page.path),'utf8');
 const {document}=parseHTML(html);byURL.set(url,{document,page,lang});
 assert.ok(html.indexOf('<meta charset="UTF-8">')<1024,'Charset declaration must precede translation data');
 assert.equal(document.documentElement.lang,lang);
 assert.equal(document.querySelector('link[rel=canonical]').getAttribute('href'),'https://starhermit.com'+url);
 assert.equal(document.querySelectorAll('link[hreflang]').length,languageCodes.length+1);
 assert.equal(document.querySelectorAll('.language-option img').length,languageCodes.length);
 assert.deepEqual([...document.querySelectorAll('.language-option')].map(e=>e.dataset.language),languageCodes);
 assert.equal(document.querySelector('.language-option[aria-current]').dataset.language,lang);
 assert.equal(document.querySelector('meta[property="og:locale"]').getAttribute('content'),languages[lang].og_locale);
 const alternates=new Map([...document.querySelectorAll('link[hreflang]')].map(e=>[e.hreflang||e.getAttribute('hreflang'),e.getAttribute('href')]));
 for(const code of languageCodes)assert.equal(alternates.get(code),'https://starhermit.com'+(code==='en'?'':'/'+code)+page.url);
 const config=JSON.parse(document.querySelector('#locale-data').textContent);
 assert.equal(config.code,lang);assert.equal(config.source,page.url);
 assert.deepEqual(config.languages,languageCodes);
 if(lang!=='en'){
  assert.equal(document.documentElement.getAttribute('dir'),languages[lang].dir);
  assert.ok(document.querySelector('.english-original'));
  for(const text of strings)assert.ok(Object.hasOwn(config.strings,text),`${lang} missing dynamic translation: ${text}`);
  for(const [source,translated] of Object.entries(config.strings)){
   assert.equal(typeof translated,'string',`${lang}: invalid translation for ${source}`);
   assert.ok(!translated.includes('undefined'),`${lang}: invalid translation for ${source}`);
   assert.ok(!/ZXQ\d+QXZ/.test(translated),`${lang}: untranslated placeholder in ${source}`);
   for(const name of preservedNames)if(source.includes(name))assert.ok(translated.includes(name),`${lang}: translated protected name ${name} in ${source}`);
  }
  for(const game of ['Crown & Chasm','Blind Magus','Null Range'])assert.equal(config.strings['Play '+game],languages[lang].play+' '+game);
  assert.notEqual(document.querySelector('meta[name=description]').getAttribute('content'),page.document.querySelector('meta[name=description]').getAttribute('content'));
 }
 const ids=doc=>[...doc.querySelectorAll('[id]')].filter(e=>e.id!=='locale-data').map(e=>e.id);
 assert.deepEqual(ids(document),ids(page.document));
 const inline=doc=>[...doc.querySelectorAll('script:not([src]):not([type="application/ld+json"]):not(#locale-data)')].filter(e=>!e.closest('[data-locale-control]')&&!e.textContent.includes('var preferred=')).map(e=>e.textContent);
 assert.deepEqual(inline(document),inline(page.document),'Analytics code changed');
 const dashboard=doc=>[...doc.querySelectorAll('a[href*="dashboard.starhermit.com"]')].map(e=>e.getAttribute('href'));
 assert.deepEqual(dashboard(document),dashboard(page.document),'Dashboard destinations changed');
 const gameNames=doc=>[...doc.querySelectorAll('#play .grid-3 h3,.game-tile-name')].map(e=>e.textContent);
 assert.deepEqual(gameNames(document),gameNames(page.document));
 const addressLines=doc=>[...doc.querySelectorAll('address')].flatMap(e=>[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).filter(s=>/West 7th Avenue|V6H 1B7/.test(s)));
 assert.deepEqual(addressLines(document),addressLines(page.document),'Registered mailing address changed');
 assert.equal(manifest.pages[page.path].hash,page.hash,'Source translations are stale');
 for(const script of document.querySelectorAll('script[type="application/ld+json"]'))JSON.parse(script.textContent);
}
for(const [url,{document,lang}] of byURL){
 for(const element of document.querySelectorAll('[href],[src]'))for(const attr of ['href','src']){
  const value=element.getAttribute(attr);if(!value||/^(data:|mailto:|tel:)/.test(value))continue;
  if(element.tagName==='BASE')continue;
  const target=new URL(value,'https://starhermit.com'+url);
  if(target.origin!=='https://starhermit.com')continue;
  const page=byURL.get(target.pathname);
  if(page){
   if(element.closest('.language-picker')||element.classList.contains('english-original')||element.tagName==='LINK')continue;
   assert.equal(page.lang,lang,`Language lost: ${url} -> ${value}`);
   if(target.hash)assert.ok(page.document.getElementById(decodeURIComponent(target.hash.slice(1))),`Bad anchor: ${url} -> ${value}`);
  }else await access(resolve(root,'.'+target.pathname));
 }
}
assert.equal(manifest.experiment_hash,sha(await readFile(resolve(root,'experiment.js'),'utf8')),'Shared experiment changed');
const sitemap=await readFile(resolve(root,'sitemap.xml'),'utf8');
const sitemapURLs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
assert.deepEqual(sitemapURLs,[...byURL.keys()].map(url=>'https://starhermit.com'+url));
console.log(`${byURL.size} pages checked: ${languageCodes.length} languages across ${Object.keys(regions).length} regions, translations, metadata, links, downloads, anchors, unchanged analytics and experiment behavior.`);
