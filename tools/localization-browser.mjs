import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright-core';
import { root, languages } from './localize.mjs';
const localeCodes=process.env.LOCALES?.split(',')||Object.keys(languages);
const widths=process.env.WIDTHS?.split(',').map(Number)||[1440,390];
const checkHomepage=process.env.PRIVACY_ONLY!=='1';
const locales=localeCodes.map(code=>{
 if(!languages[code])throw new Error(`Unknown test locale: ${code}`);
 return languages[code];
});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{
  let path=new URL(req.url,'http://localhost').pathname;if(path.endsWith('/'))path+='index.html';
  const file=resolve(root,'.'+path);if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}
  res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');res.end(await readFile(file));
 }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[],failures=[];
try{
 for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)failures.push(r.url());});
  await page.route('https://www.googletagmanager.com/**',r=>r.fulfill({body:''}));
  for(const locale of locales){
   const prefix=locale.code==='en'?'':'/'+locale.code;
   if(checkHomepage){
    await page.goto(base+prefix+'/');
    assert.equal(await page.locator('html').getAttribute('lang'),locale.code);
    assert.equal(await page.locator('.language-option').count(),Object.keys(languages).length);
    assert.equal(await page.locator('.language-picker summary img').getAttribute('src'),locale.flag);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${locale.code} homepage ${width} overflow`);
    assert.equal(await page.locator('.hero-visual img').evaluate(e=>e.complete&&e.naturalWidth>0),true);
    assert.match(await page.locator('.hero-feature').getAttribute('href'),/^https:\/\/dashboard\.starhermit\.com\/play\//);
    assert.equal(await page.locator('.featured-card a').count(),5);
    await page.locator('.more-games > summary').evaluate(summary=>summary.click());
    assert.equal(await page.locator('.game-tile:visible').count(),9);
   }
   await page.goto(base+prefix+'/privacy.html');
   assert.equal(await page.locator('html').getAttribute('lang'),locale.code);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${locale.code} privacy ${width} overflow`);
   console.log(`${width}px: ${locale.code} ${checkHomepage?'homepage and ':''}privacy passed`);
  }
  if(checkHomepage){
   const arms=await page.locator('[data-feature-arm]').evaluateAll(items=>items.map(item=>item.dataset.featureArm));
   assert.equal(new Set(arms).size,14);
   for(const arm of arms){
    await page.goto(base+'/?feature_preview='+arm);
    const feature=page.locator('.hero-feature');
    const source=page.locator('[data-feature-arm="'+arm+'"]');
    assert.equal(await feature.getAttribute('data-featured-game'),arm);
    assert.equal(await feature.getAttribute('href'),await source.evaluate(card=>(card.matches('a')?card:card.querySelector('a')).getAttribute('href')));
    assert.equal(await feature.locator('strong').textContent(),await source.locator('h3, .game-tile-name').textContent());
    assert.equal(await feature.locator('img').getAttribute('src'),await source.locator('img').getAttribute('src'));
    assert.ok(!(await context.cookies()).some(cookie=>cookie.name==='sh_ab_feature_v2'));
   }
  }
  await page.goto(base+'/ar/?ref=test#play');
  await page.locator('.language-picker summary').focus();await page.keyboard.press('Enter');
  for(const flag of await page.locator('.language-option img').all())assert.equal(await flag.evaluate(e=>e.complete&&e.naturalWidth>0),true);
  await page.screenshot({path:`/tmp/starhermit-language-menu-${width}.png`});
  await page.keyboard.press('Escape');assert.equal(await page.locator('.language-picker').getAttribute('open'),null);
  await page.locator('.language-picker summary').click();
  await page.locator('.language-option[data-language="fr"]').click();
  await page.waitForURL('**/fr/?ref=test#play');
  assert.equal(await page.evaluate(()=>localStorage.getItem('starhermit-language')),'fr');
  await page.goto(base+'/');await page.waitForURL('**/fr/');
  await page.locator('.english-original').click();await page.waitForURL(base+'/');
  assert.equal(await page.evaluate(()=>localStorage.getItem('starhermit-language')),'en');
  await context.close();
 }
 const noJS=await browser.newContext({javaScriptEnabled:false});const page=await noJS.newPage();
 await page.goto(base+'/es/');assert.ok((await page.locator('.hero-sub').textContent()).trim());
 await page.locator('.language-picker summary').click();await page.locator('.language-option[data-language="ar"]').click();await page.waitForURL('**/ar/');
 await noJS.close();assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 console.log(`Browser checks passed at ${widths.join('/')}px: ${locales.length} selected languages, homepage, privacy, image flags, preference, query/hash preservation, no-JS content and switching, no runtime errors or missing assets.`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
