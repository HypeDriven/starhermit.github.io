import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { parseHTML } from 'linkedom';
import { parse } from 'acorn';

export const root=resolve(import.meta.dirname,'..');
export const normalize=s=>s.trim().replace(/\s+/g,' ');
export const sha=s=>createHash('sha256').update(s).digest('hex');
export const languages=JSON.parse(await readFile(resolve(root,'localization/languages.json'),'utf8'));
const protectedNames=new Set(['STAR','HERMIT','STARHERMIT','StarHermit','Crown & Chasm','Blind Magus','Null Range','Turds','Sky Lobby','Iron Curtain: 1983','Hype Driven Development Inc.','Google','GitHub','Discord','Windows','Linux']);
const ui={notice:'Machine-translated from English.',original:'Read the English original'};
export const clean=s=>s.replace(/(<head>)\n(?=<!-- localization:head -->)/i,'$1').replace(/<!-- localization:[\w-]+ -->[\s\S]*?<!-- \/localization:[\w-]+ -->\n?/g,'');
function fields(document){
 const list=[];
 function text(node){
  if(node.nodeType===1 && (/^(SCRIPT|STYLE|SVG|CODE|PRE)$/i.test(node.tagName)||node.hasAttribute('data-locale-control')||protectedNames.has(normalize(node.textContent))))return;
  if(node.nodeType===3){
   const original=normalize(node.data);
   if(/[a-z]{2}/i.test(original)&&!protectedNames.has(original)&&!/^https?:\/\//.test(original)&&!/^\S+@\S+\.\S+$/.test(original))list.push({original,set(value){node.data=node.data.replace(node.data.trim(),value);}});
  }
  if(node.nodeType===1)for(const name of ['alt','title','aria-label']){
   const original=normalize(node.getAttribute(name)||'');
   if(original&&!protectedNames.has(original))list.push({original,set(value){node.setAttribute(name,value);}});
  }
  for(const child of node.childNodes||[])text(child);
 }
 text(document.documentElement);
 for(const meta of document.querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[property="og:image:alt"],meta[name="twitter:title"],meta[name="twitter:description"],meta[name="twitter:image:alt"]')){
  const original=normalize(meta.getAttribute('content'));list.push({original,set(value){meta.setAttribute('content',value);}});
 }
 return list;
}
export async function corpus(){
 const pages=[];
 for(const path of ['index.html','privacy.html']){
  const source=clean(await readFile(resolve(root,path),'utf8'));
  const {document}=parseHTML(source);
  pages.push({path,url:path==='index.html'?'/':'/privacy.html',source,hash:sha(source),document,fields:fields(document)});
 }
 const dynamic=[];
 function walk(node){
  if(!node||typeof node!=='object')return;
  if(node.type==='AssignmentExpression'&&node.left.type==='MemberExpression'&&['textContent','alt'].includes(node.left.property.name)&&node.right.type==='Literal'&&typeof node.right.value==='string'&&node.right.value.trim())dynamic.push(normalize(node.right.value));
  for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);
 }
 walk(parse(await readFile(resolve(root,'experiment.js'),'utf8'),{ecmaVersion:'latest'}));
 dynamic.push(...['Crown & Chasm','Blind Magus','Null Range'].map(name=>'Play '+name));
 const structured=[];
 function jsonStrings(obj){
  if(!obj||typeof obj!=='object')return;
  if(obj.description)structured.push(normalize(obj.description));
  if(obj.name&&!protectedNames.has(obj.name))structured.push(normalize(obj.name));
  for(const v of Object.values(obj))if(v&&typeof v==='object')jsonStrings(v);
 }
 for(const page of pages)for(const el of page.document.querySelectorAll('script[type="application/ld+json"]'))jsonStrings(JSON.parse(el.textContent));
 return {pages,strings:[...new Set([...Object.values(ui),...pages.flatMap(p=>p.fields.map(s=>s.original)),...dynamic,...structured])]};
}
function escape(s){return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');}
const localizedURL=(lang,url)=>(lang==='en'?'':'/'+lang)+url;
function picker(lang,url){
 const current=languages[lang];
 return `<details class="language-picker" data-locale-control><summary aria-label="${escape(current.language+': '+current.name)}"><img class="language-flag" src="${current.flag}" alt="" width="21" height="14"><span lang="${lang}" dir="auto">${current.name}</span></summary><nav class="language-menu" aria-label="${escape(current.language)}">${Object.values(languages).map(l=>`<a class="language-option" href="${localizedURL(l.code,url)}" data-language="${l.code}"${l.code===lang?' aria-current="page"':''}><img class="language-flag" src="${l.flag}" alt="" width="21" height="14"><span lang="${l.code}" dir="auto">${l.name}</span></a>`).join('')}</nav></details>`;
}
function block(name,value){return `<!-- localization:${name} -->${value}<!-- /localization:${name} -->\n`;}
function decorate(source,lang,url,strings,t){
 const prefix=lang==='en'?'':'/'+lang;
 const alternates=Object.values(languages).map(l=>`<link rel="alternate" hreflang="${l.code}" href="https://starhermit.com${localizedURL(l.code,url)}">`).join('\n');
 const data={code:lang,dir:languages[lang].dir,source:url,languages:Object.keys(languages),strings};
 // Preference restoration runs before analytics and experiment enrollment on the English homepage.
 const preference=lang==='en'&&url==='/'?`<script>try { var preferred=localStorage.getItem('starhermit-language'); if (${JSON.stringify(Object.keys(languages).filter(c=>c!=='en'))}.includes(preferred) && (location.pathname==='/'||location.pathname==='/index.html')) location.replace('/'+preferred+'/'+location.search+location.hash); } catch (_) {}</script>`:'';
 const head=`${lang!=='en'?'<base href="/">':''}${preference}\n${alternates}\n<link rel="alternate" hreflang="x-default" href="https://starhermit.com${url}">\n<link rel="stylesheet" href="/localization.css?v=1">\n<script id="locale-data" type="application/json">${JSON.stringify(data).replaceAll('<','\\u003c')}</script>`;
 // Keep the charset declaration within the first 1024 bytes, ahead of the dictionaries.
 source=source.replace(/<meta charset="UTF-8">/i,match=>match+block('head',head));
 const navStart=source.indexOf('<nav class="nav-links"');
 const navEnd=source.indexOf('</nav>',navStart);
 source=source.slice(0,navEnd)+block('picker',picker(lang,url))+source.slice(navEnd);
 if(lang!=='en'){
  const notice=`<p class="localization-notice" data-locale-control>${escape(t(ui.notice))} <a class="english-original" href="${url}" lang="en">${escape(t(ui.original))}</a></p>`;
  source=source.replace('</footer>',block('notice',notice)+'</footer>');
 }
 const script='<script defer src="/localization.js?v=2"></script>';
 source=source.replace(/<script defer src="(?:\/)?(?:experiment|main)\.js[^\"]*"><\/script>/,match=>block('script',script)+match);
 return source;
}
const [mode,location]=process.argv.slice(2);
if(mode==='prepare'){
 const {pages,strings}=await corpus();
 await writeFile(location,JSON.stringify({languages:Object.values(languages).filter(l=>l.code!=='en'),strings},null,2)+'\n');
 console.log(`${pages.length} public pages plus all four hero variants: ${strings.length} translation segments (${strings.join('').length} characters)`);
}else if(mode==='render'){
 const cache=JSON.parse(await readFile(location,'utf8'));
 const {pages,strings}=await corpus();
 const manifest={languages:Object.keys(languages),engine:'Google Translate; static machine translations',pages:{},experiment_hash:sha(await readFile(resolve(root,'experiment.js'),'utf8'))};
 for(const lang of Object.keys(languages)){
  const t=value=>{
   const original=normalize(value);if(lang==='en'||protectedNames.has(original))return value;
   const game=original.match(/^Play (Crown & Chasm|Blind Magus|Null Range)$/);
   if(game){const play={'zh-CN':'游玩',hi:'खेलें',es:'Jugar',ar:'العب',fr:'Jouer à',bn:'খেলুন',pt:'Jogar',id:'Mainkan',ur:'کھیلیں'};return play[lang]+' '+game[1];}
   const result=cache[lang]?.[sha(original)];
   if(typeof result!=='string'||(!result.trim()&&!/^(the|a|an)$/i.test(original)))throw new Error(`Missing ${lang}: ${original}`);
   return result;
  };
  const dictionary=lang==='en'?{}:Object.fromEntries(strings.map(s=>[s,t(s)]));
  for(const page of pages){
   manifest.pages[page.path]={url:page.url,hash:page.hash};
   let output=page.source;
   if(lang!=='en'){
    const {document}=parseHTML(page.source);
    for(const f of fields(document))f.set(t(f.original));
    document.documentElement.lang=lang;document.documentElement.setAttribute('dir',languages[lang].dir);
    document.querySelector('link[rel=canonical]').setAttribute('href','https://starhermit.com'+localizedURL(lang,page.url));
    document.querySelector('meta[property="og:url"]').setAttribute('content','https://starhermit.com'+localizedURL(lang,page.url));
    const regions={'zh-CN':'zh_CN',hi:'hi_IN',es:'es_ES',ar:'ar_SA',fr:'fr_FR',bn:'bn_BD',pt:'pt_BR',id:'id_ID',ur:'ur_PK'};
    document.querySelector('meta[property="og:locale"]').setAttribute('content',regions[lang]);
    // Keep every asset, download and fragment rooted correctly when pages live under /<language>/.
    for(const element of document.querySelectorAll('[href],[src],[poster]'))for(const attr of ['href','src','poster']){
     if(element.tagName==='LINK'&&element.getAttribute('rel')==='canonical')continue;
     const value=element.getAttribute(attr);if(!value)continue;
     const target=new URL(value,'https://starhermit.com'+page.url);
     if(target.hostname==='wiki.starhermit.com')target.pathname='/'+lang+(target.pathname==='/'?'/':target.pathname);
     else if(target.origin!=='https://starhermit.com')continue;
     else if(['/', '/index.html','/privacy.html'].includes(target.pathname))target.pathname=localizedURL(lang,target.pathname==='/index.html'?'/':target.pathname);
     element.setAttribute(attr,target.origin==='https://starhermit.com'?target.pathname+target.search+target.hash:target.href);
    }
    function localizeJSON(obj){
     if(!obj||typeof obj!=='object')return;
     if(obj.description)obj.description=t(obj.description);
     if(obj.name&&!protectedNames.has(obj.name))obj.name=t(obj.name);
     if(obj.inLanguage)obj.inLanguage=lang;
     if(['WebPage','CollectionPage'].includes(obj['@type'])){obj.url='https://starhermit.com'+localizedURL(lang,page.url);obj['@id']=obj.url+'#webpage';}
     for(const value of Object.values(obj))if(value&&typeof value==='object')localizeJSON(value);
    }
    for(const script of document.querySelectorAll('script[type="application/ld+json"]')){
     const json=JSON.parse(script.textContent);localizeJSON(json);script.textContent=JSON.stringify(json,null,2);
    }
    output=document.toString();
   }
   output=decorate(output,lang,page.url,dictionary,t);
   const path=resolve(root,lang==='en'?'':lang,page.path);await mkdir(resolve(path,'..'),{recursive:true});await writeFile(path,output);
  }
 }
 await writeFile(resolve(root,'localization/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 const urls=Object.keys(languages).flatMap(l=>pages.map(p=>'https://starhermit.com'+localizedURL(l,p.url)));
 await writeFile(resolve(root,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(u=>`  <url><loc>${u}</loc></url>`).join('\n')+'\n</urlset>\n');
 console.log('Generated 18 static translated pages, shared flag dropdowns, localized metadata, and all four hero dictionaries.');
}else if(mode)throw new Error('Usage: node tools/localize.mjs prepare|render CACHE_PATH');
