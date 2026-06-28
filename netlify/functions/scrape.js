// netlify/functions/scrape.js
// Dagelijkse scraper — draait elke dag om 06:00 NL tijd
// Scrapt: Marktplaats, AutoScout24, Gaspedaal, ViaBOVAG, Autotrader, Autoline

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'Kawsfan/autovergelijker';
const DATA_FILE = 'data/listings.json';
const HEADERS = {'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36','Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8','Accept-Language':'nl-NL,nl;q=0.9,en;q=0.8','Cache-Control':'no-cache'};

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

async function scrapeMarktplaats(){
  const listings=[],urls=['https://www.marktplaats.nl/l/auto-s/?numberOfResultsPerPage=100','https://www.marktplaats.nl/l/auto-s/volkswagen/?numberOfResultsPerPage=100','https://www.marktplaats.nl/l/auto-s/bmw/?numberOfResultsPerPage=100','https://www.marktplaats.nl/l/auto-s/toyota/?numberOfResultsPerPage=100','https://www.marktplaats.nl/l/auto-s/ford/?numberOfResultsPerPage=100','https://www.marktplaats.nl/l/auto-s/opel/?numberOfResultsPerPage=100','https://www.marktplaats.nl/l/auto-s/renault/?numberOfResultsPerPage=100','https://www.marktplaats.nl/l/auto-s/mercedes-benz/?numberOfResultsPerPage=100','https://www.marktplaats.nl/l/auto-s/audi/?numberOfResultsPerPage=100','https://www.marktplaats.nl/l/auto-s/peugeot/?numberOfResultsPerPage=100'];
  for(const url of urls){try{const r=await fetch(url,{headers:HEADERS,redirect:'follow'});if(!r.ok)continue;listings.push(...parseerMP(await r.text(),listings.length));}catch(e){console.error('MP:',e.message);}await sleep(1500);}
  return listings;
}
function parseerMP(html,offset=0){
  const r=[],g=new Set(),re=/href="(\/(v|m)\/auto-s\/[^/]+\/[am]\d+[^"]*)"/g;let m;
  while((m=re.exec(html))!==null&&r.length<100){
    const href=m[1],url='https://www.marktplaats.nl'+href;
    if(g.has(url))continue;g.add(url);
    const ctx=html.substring(Math.max(0,m.index-200),m.index+2000);
    const pm=ctx.match(/€\s*([\d.]+)(?:,-|\s)/);if(!pm)continue;
    const prijs=parseInt(pm[1].replace(/\./g,''));if(!prijs||prijs<500||prijs>200000)continue;
    const jm=ctx.match(/\b(20[0-2]\d|19[89]\d)\b/),km=ctx.match(/([\d.]{1,9})\s*km/i);
    let bf='';if(/[Ee]lektrisch/.test(ctx))bf='Elektrisch';else if(/[Hh]ybride/.test(ctx))bf='Hybride';else if(/[Dd]iesel/.test(ctx))bf='Diesel';else if(/[Bb]enzine/.test(ctx))bf='Benzine';
    let cr='';for(const[z,l]of[['Stationwagon','Stationwagon'],['Hatchback','Hatchback'],['SUV of Terreinwagen','SUV'],['Sedan','Sedan'],['Cabriolet','Cabrio'],['Coupe','Coupe'],['MPV','MPV']]){if(ctx.includes(z)){cr=l;break;}}
    let tr='';if(/[Aa]utomaat/.test(ctx))tr='Automaat';else if(/[Hh]andgeschakeld/.test(ctx))tr='Handgeschakeld';
    const sl=href.match(/\/[am]\d+-(.+)$/);let titel=sl?decodeURIComponent(sl[1]).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).trim().substring(0,70):'';
    if(!titel||titel.length<4)continue;
    const img=ctx.match(/src="(https:\/\/images\.marktplaats\.com[^"]+)"/);
    let loc='Nederland';for(const s of['Amsterdam','Rotterdam','Utrecht','Den Haag','Eindhoven','Tilburg','Groningen','Breda','Nijmegen','Haarlem','Almere','Apeldoorn']){if(ctx.includes(s)){loc=s;break;}}
    r.push({id:'mp-'+(offset+r.length),bron:'Marktplaats',titel,prijs,jaar:jm?parseInt(jm[1]):null,km:km?parseInt(km[1].replace(/\./g,'')):null,brandstof:bf,carrosserie:cr,transmissie:tr,locatie:loc,url,imgSrc:img?img[1]:'',bijgewerkt:new Date().toISOString().split('T')[0]});
  }return r;
}

async function scrapeViaBOVAG(){
  const listings=[];
  for(let pg=1;pg<=3;pg++){try{const r=await fetch(`https://www.viabovag.nl/occasions?sortOrder=DateDescending&pageSize=50&pageIndex=${pg}`,{headers:HEADERS,redirect:'follow'});if(!r.ok)continue;const html=await r.text();listings.push(...parseerHtmlGeneric(html,'viabovag.nl','/occasion/',listings.length,'ViaBOVAG'));}catch(e){console.error('BOVAG:',e.message);}await sleep(2000);}
  return listings;
}
async function scrapeGaspedaal(){
  const listings=[],urls=['https://www.gaspedaal.nl/occasion/occasions?sort=recent','https://www.gaspedaal.nl/occasion/toyota/occasions','https://www.gaspedaal.nl/occasion/volkswagen/occasions','https://www.gaspedaal.nl/occasion/bmw/occasions','https://www.gaspedaal.nl/occasion/ford/occasions'];
  for(const url of urls){try{const r=await fetch(url,{headers:HEADERS,redirect:'follow'});if(!r.ok)continue;listings.push(...parseerHtmlGeneric(await r.text(),'gaspedaal.nl','/occasion/',listings.length,'Gaspedaal'));}catch(e){console.error('GP:',e.message);}await sleep(1500);}
  return listings;
}
async function scrapeAutotrader(){
  const listings=[];
  for(let pg=1;pg<=3;pg++){try{const r=await fetch(`https://www.autotrader.nl/autos?sort=registrationDate&sortOrder=desc&page=${pg}`,{headers:HEADERS,redirect:'follow'});if(!r.ok)continue;listings.push(...parseerHtmlGeneric(await r.text(),'autotrader.nl','/auto/',listings.length,'Autotrader'));}catch(e){console.error('AT:',e.message);}await sleep(2000);}
  return listings;
}
async function scrapeAutoScout24(){
  const listings=[];
  for(let pg=1;pg<=4;pg++){try{const r=await fetch(`https://www.autoscout24.nl/lst?sort=age&desc=0&ustate=N%2CU&size=20&page=${pg}&fregfrom=2012`,{headers:{...HEADERS,'Referer':'https://www.autoscout24.nl/'},redirect:'follow'});if(!r.ok)continue;listings.push(...parseerHtmlGeneric(await r.text(),'autoscout24.nl','/auto/',listings.length,'AutoScout24'));}catch(e){console.error('AS24:',e.message);}await sleep(2000);}
  return listings;
}
async function scrapeAutoline(){
  const listings=[];
  for(let pg=1;pg<=2;pg++){try{const r=await fetch(`https://autoline.nl/auto-personenautos/?new_used=used&sort=updated-desc&p=${pg}`,{headers:HEADERS,redirect:'follow'});if(!r.ok)continue;listings.push(...parseerHtmlGeneric(await r.text(),'autoline.nl','/auto-personenautos/',listings.length,'Autoline'));}catch(e){console.error('AL:',e.message);}await sleep(2000);}
  return listings;
}

function parseerHtmlGeneric(html,domein,pathPrefix,offset,bron){
  const r=[],g=new Set();
  const escapedPrefix=pathPrefix.replace(/\//g,'\\/');
  const re=new RegExp(`href="(${escapedPrefix}[^"]{5,100})"`,'g');let m;
  while((m=re.exec(html))!==null&&r.length<60){
    const href=m[1],fullUrl='https://www.'+domein+href;
    if(g.has(fullUrl)||!href.match(/[a-z0-9-]{5,}/i))continue;g.add(fullUrl);
    const ctx=html.substring(Math.max(0,m.index-100),m.index+2000);
    const pm=ctx.match(/€\s*[\s]*([\d.,]+)/);if(!pm)continue;
    const prijs=parseInt(pm[1].replace(/[.,]/g,'').substring(0,7));if(!prijs||prijs<500||prijs>200000)continue;
    const jm=ctx.match(/\b(20[0-2]\d|19[89]\d)\b/),km=ctx.match(/([\d.]+)\s*km/i);
    const img=ctx.match(/src="(https:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i);
    let bf='';if(/[Ee]lektrisch|electric/i.test(ctx))bf='Elektrisch';else if(/[Hh]ybride/i.test(ctx))bf='Hybride';else if(/[Dd]iesel/i.test(ctx))bf='Diesel';else if(/[Bb]enzine|petrol/i.test(ctx))bf='Benzine';
    const slug=href.split('/').filter(Boolean).pop()||'';
    const titel=slug.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).substring(0,70);
    if(titel.length<4)continue;
    r.push({id:bron.toLowerCase().replace(/[^a-z]/g,'')+'-'+(offset+r.length),bron,titel,prijs,jaar:jm?parseInt(jm[1]):null,km:km?parseInt(km[1].replace(/[.]/g,'')):null,brandstof:bf,carrosserie:'',transmissie:'',locatie:'Nederland',url:fullUrl,imgSrc:img?img[1]:'',bijgewerkt:new Date().toISOString().split('T')[0]});
  }return r;
}

async function commitNaarGitHub(listings){
  const inhoud=JSON.stringify({bijgewerkt:new Date().toISOString(),totaal:listings.length,bronnen:[...new Set(listings.map(l=>l.bron))],listings},null,2);
  const b64=Buffer.from(inhoud).toString('base64');
  let sha;
  try{const r=await fetch(`https://api.github.com/repos/${REPO}/contents/${DATA_FILE}`,{headers:{Authorization:`Bearer ${GITHUB_TOKEN}`,'User-Agent':'scraper'}});if(r.ok)sha=(await r.json()).sha;}catch(e){}
  const body={message:`Dagelijkse update: ${listings.length} auto's`,content:b64};if(sha)body.sha=sha;
  const r=await fetch(`https://api.github.com/repos/${REPO}/contents/${DATA_FILE}`,{method:'PUT',headers:{Authorization:`Bearer ${GITHUB_TOKEN}`,'Content-Type':'application/json','User-Agent':'scraper'},body:JSON.stringify(body)});
  return{status:r.status,sha:(await r.json()).commit?.sha?.substring(0,10)};
}

exports.handler=async function(event){
  console.log('Scraper gestart:',new Date().toISOString());
  if(!GITHUB_TOKEN)return{statusCode:500,body:JSON.stringify({error:'GITHUB_TOKEN niet ingesteld in Netlify env vars'})};
  const alle=[];
  console.log('Marktplaats...');alle.push(...await scrapeMarktplaats());
  console.log('AutoScout24...');alle.push(...await scrapeAutoScout24());
  console.log('Gaspedaal...');alle.push(...await scrapeGaspedaal());
  console.log('ViaBOVAG...');alle.push(...await scrapeViaBOVAG());
  console.log('Autotrader...');alle.push(...await scrapeAutotrader());
  console.log('Autoline...');alle.push(...await scrapeAutoline());
  console.log('Totaal:',alle.length,'opslaan...');
  const commit=await commitNaarGitHub(alle);
  return{statusCode:200,headers:{'Content-Type':'application/json'},body:JSON.stringify({succes:true,totaal:alle.length,bronnen:[...new Set(alle.map(l=>l.bron))],commit})};
};