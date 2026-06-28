exports.handler=async function(event){
  const p=event.queryStringParameters||{};
  const CACHE='https://raw.githubusercontent.com/Kawsfan/autovergelijker/main/data/listings.json';
  try{
    const resp=await fetch(CACHE,{headers:{'Cache-Control':'no-cache'}});
    if(!resp.ok)throw new Error('cache leeg');
    const data=await resp.json();
    let listings=data.listings||[];
    if(p.merk){const m=p.merk.toLowerCase();listings=listings.filter(l=>l.titel.toLowerCase().includes(m));}
    if(p.model){const m=p.model.toLowerCase();listings=listings.filter(l=>l.titel.toLowerCase().includes(m));}
    if(p.carro)listings=listings.filter(l=>l.carrosserie===p.carro);
    if(p.brandstof)listings=listings.filter(l=>l.brandstof===p.brandstof);
    if(p.prijsMax)listings=listings.filter(l=>l.prijs<=parseInt(p.prijsMax));
    if(p.bron)listings=listings.filter(l=>l.bron===p.bron);
    if(p.jaarMin)listings=listings.filter(l=>l.jaar&&l.jaar>=parseInt(p.jaarMin));
    if(p.jaarMax)listings=listings.filter(l=>l.jaar&&l.jaar<=parseInt(p.jaarMax));
    const sort=p.sort||'prijs';
    if(sort==='prijs')listings.sort((a,b)=>a.prijs-b.prijs);
    else if(sort==='jaar')listings.sort((a,b)=>(b.jaar||0)-(a.jaar||0));
    else if(sort==='km')listings.sort((a,b)=>(a.km||999999)-(b.km||999999));
    listings=listings.slice(0,100);
    return{statusCode:200,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},body:JSON.stringify({listings,totaal:listings.length,cacheDatum:data.bijgewerkt,bronnen:data.bronnen||[]})};
  }catch(err){
    return await liveMarktplaats(p);
  }
};
async function liveMarktplaats(p){
  const SLUG={'Volkswagen':'volkswagen','BMW':'bmw','Toyota':'toyota','Ford':'ford','Audi':'audi','Peugeot':'peugeot','Renault':'renault','Hyundai':'hyundai','Kia':'kia','Tesla':'tesla','Volvo':'volvo','Skoda':'skoda','Mercedes-Benz':'mercedes-benz','Seat':'seat','Opel':'opel','Fiat':'fiat','Honda':'honda','Mazda':'mazda','Nissan':'nissan','Citroen':'citroen','Dacia':'dacia','Mini':'mini','Land Rover':'land-rover','Porsche':'porsche'};
  let url='https://www.marktplaats.nl/l/auto-s/';
  if(p.merk&&SLUG[p.merk])url+=SLUG[p.merk]+'/';
  const qp=[];if(p.model)qp.push('query='+encodeURIComponent(p.model));if(p.prijsMax)qp.push('PriceCentsTo='+(parseInt(p.prijsMax)*100));if(qp.length)url+='?'+qp.join('&');
  try{
    const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html','Accept-Language':'nl-NL,nl;q=0.9'},redirect:'follow'});
    if(!r.ok)return err('Status '+r.status,url);
    const html=await r.text();
    return{statusCode:200,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},body:JSON.stringify({listings:parseMP(html),bronUrl:url,live:true})};
  }catch(e){return err(e.message,url);}
}
function err(msg,bronUrl){return{statusCode:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},body:JSON.stringify({error:msg,bronUrl,listings:[]})};}
function parseMP(html){
  const r=[],g=new Set(),re=/href="(\/(v|m)\/auto-s\/[^/]+\/[am]\d+[^"]*)"/g;let m;
  while((m=re.exec(html))!==null&&r.length<40){
    const href=m[1],url='https://www.marktplaats.nl'+href;if(g.has(url))continue;g.add(url);
    const ctx=html.substring(Math.max(0,m.index-200),m.index+2000);
    const pm=ctx.match(/€\s*([\d.]+)(?:,-|\s)/);if(!pm)continue;
    const prijs=parseInt(pm[1].replace(/\./g,''));if(!prijs||prijs<200)continue;
    const jm=ctx.match(/\b(20[0-2]\d|19[89]\d)\b/),km=ctx.match(/([\d.]{1,9})\s*km/i);
    let bf='';if(/[Ee]lektrisch/.test(ctx))bf='Elektrisch';else if(/[Hh]ybride/.test(ctx))bf='Hybride';else if(/[Dd]iesel/.test(ctx))bf='Diesel';else if(/[Bb]enzine/.test(ctx))bf='Benzine';
    const sl=href.match(/\/[am]\d+-(.+)$/);let titel=sl?decodeURIComponent(sl[1]).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()).trim().substring(0,70):'';
    if(!titel||titel.length<4)continue;
    const img=ctx.match(/src="(https:\/\/images\.marktplaats\.com[^"]+)"/);
    r.push({id:'mp-'+r.length,bron:'Marktplaats',titel,prijs,jaar:jm?parseInt(jm[1]):null,km:km?parseInt(km[1].replace(/\./g,'')):null,brandstof:bf,carrosserie:'',transmissie:'',locatie:'Nederland',url,imgSrc:img?img[1]:''});
  }return r;
}