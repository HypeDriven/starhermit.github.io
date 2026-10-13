import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright-core';
import { root, languages } from './localize.mjs';
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
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)failures.push(r.url());});
  await page.route('https://www.googletagmanager.com/**',r=>r.fulfill({body:''}));
  for(const locale of Object.values(languages)){
   const prefix=locale.code==='en'?'':'/'+locale.code;
   for(const variant of ['control','crown','variety','quick_start']){
    await page.goto(base+prefix+'/?ab_preview='+variant);
    assert.equal(await page.locator('html').getAttribute('lang'),locale.code);
    assert.equal(await page.locator('.language-option').count(),10);
    assert.equal(await page.locator('.language-picker summary img').getAttribute('src'),locale.flag);
    assert.deepEqual(await page.locator('.language-picker summary img').evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),{width:21,height:14});
    assert.equal(await page.locator('.hero-feature-art').count(),variant==='crown'?1:0);
    assert.equal(await page.locator('.hero-game-choices a').count(),variant==='variety'?3:0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${locale.code} ${variant} ${width} overflow`);
    if(variant!=='control'&&locale.code!=='en'){
     const sourceTitle={crown:'Build above. Dig below.',variety:'Pick your next adventure.',quick_start:'Your next game starts here.'}[variant];
     const expected=await page.evaluate(key=>JSON.parse(document.querySelector('#locale-data').textContent).strings[key],sourceTitle);
     await page.waitForFunction(expected=>document.querySelector('.hero-title').textContent===expected,expected);
    }
    for(const img of await page.locator('.hero-feature-art,.hero-game-choices img').all()) assert.equal(await img.evaluate(e=>e.complete&&e.naturalWidth>0),true);
   }
   await page.goto(base+prefix+'/privacy.html');
   assert.equal(await page.locator('html').getAttribute('lang'),locale.code);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  await page.goto(base+'/ar/?ab_preview=variety#play');
  await page.locator('.language-picker summary').focus();await page.keyboard.press('Enter');
  for(const flag of await page.locator('.language-option img').all())assert.equal(await flag.evaluate(e=>e.complete&&e.naturalWidth>0),true);
  await page.screenshot({path:`/tmp/starhermit-language-menu-${width}.png`});
  await page.keyboard.press('Escape');assert.equal(await page.locator('.language-picker').getAttribute('open'),null);
  await page.locator('.language-picker summary').click();
  await page.locator('.language-option[data-language="fr"]').click();
  await page.waitForURL('**/fr/?ab_preview=variety#play');
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
 console.log('Desktop/mobile passed: all ten languages and all four heroes, privacy, image flags, preference, query/hash preservation, no-JS content and switching, no runtime errors or missing assets.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
