import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { resolve } from 'node:path';
import { root, languages, corpus, sha } from './localize.mjs';
const {pages,strings}=await corpus();
const manifest=JSON.parse(await readFile(resolve(root,'localization/manifest.json'),'utf8'));
const byURL=new Map();
for(const lang of Object.keys(languages))for(const page of pages){
 const url=(lang==='en'?'':'/'+lang)+page.url;
 const html=await readFile(resolve(root,lang==='en'?'':lang,page.path),'utf8');
 const {document}=parseHTML(html);byURL.set(url,{document,page,lang});
 assert.ok(html.indexOf('<meta charset="UTF-8">')<1024,'Charset declaration must precede translation data');
 assert.equal(document.documentElement.lang,lang);
 assert.equal(document.querySelector('link[rel=canonical]').getAttribute('href'),'https://starhermit.com'+url);
 assert.equal(document.querySelectorAll('link[hreflang]').length,11);
 assert.equal(document.querySelectorAll('.language-option img').length,10);
 const config=JSON.parse(document.querySelector('#locale-data').textContent);
 assert.equal(config.code,lang);assert.equal(config.source,page.url);
 if(lang!=='en'){
  assert.equal(document.documentElement.getAttribute('dir'),languages[lang].dir);
  assert.ok(document.querySelector('.english-original'));
  for(const text of strings)assert.ok(Object.hasOwn(config.strings,text),`${lang} missing dynamic translation: ${text}`);
  assert.notEqual(document.querySelector('meta[name=description]').getAttribute('content'),page.document.querySelector('meta[name=description]').getAttribute('content'));
 }
 const ids=doc=>[...doc.querySelectorAll('[id]')].filter(e=>e.id!=='locale-data').map(e=>e.id);
 assert.deepEqual(ids(document),ids(page.document));
 const inline=doc=>[...doc.querySelectorAll('script:not([src]):not([type="application/ld+json"]):not(#locale-data)')].filter(e=>!e.closest('[data-locale-control]')&&!e.textContent.includes('var preferred=')).map(e=>e.textContent);
 assert.deepEqual(inline(document),inline(page.document),'Analytics code changed');
 const dashboard=doc=>[...doc.querySelectorAll('a[href*="dashboard.starhermit.com"]')].map(e=>e.getAttribute('href'));
 assert.deepEqual(dashboard(document),dashboard(page.document),'Dashboard destinations changed');
 const gameNames=doc=>[...doc.querySelectorAll('#play .grid-3 h3')].map(e=>e.textContent);
 assert.deepEqual(gameNames(document),gameNames(page.document));
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
assert.equal((await readFile(resolve(root,'sitemap.xml'),'utf8')).match(/<loc>/g).length,20);
console.log('20 pages checked: ten-language flags, static translations, metadata, links, downloads, anchors, unchanged analytics and experiment behavior.');
