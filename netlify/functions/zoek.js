export const handler = async function(event) {
  const params = event.queryStringParameters || {};
  const MERK_SLUG = {'Volkswagen':'volkswagen','BMW':'bmw','Toyota':'toyota','Ford':'ford','Audi':'audi','Peugeot':'peugeot','Renault':'renault','Hyundai':'hyundai','Kia':'kia','Tesla':'tesla','Volvo':'volvo','Skoda':'skoda','Mercedes-Benz':'mercedes-benz','Seat':'seat','Opel':'opel','Fiat':'fiat','Honda':'honda','Mazda':'mazda','Nissan':'nissan','Citroen':'citroen','Dacia':'dacia','Mini':'mini','Land Rover':'land-rover','Porsche':'porsche'};
  let url = 'https://www.marktplaats.nl/l/auto-s/';
  if (params.merk && MERK_SLUG[params.merk]) url += MERK_SLUG[params.merk] + '/';
  if (params.carro) url += 'f/' + params.carro + '/';
  if (params.brandstof) url += 'f/' + params.brandstof + '/';
  const qp = [];
  if (params.model) qp.push('query=' + encodeURIComponent(params.model));
  if (params.prijsMax) qp.push('PriceCentsTo=' + (parseInt(params.prijsMax) * 100));
  if (qp.length) url += '?' + qp.join('&');
  try {
    const resp = await fetch(url, {headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36','Accept':'text/html','Accept-Language':'nl-NL,nl;q=0.9','Cache-Control':'no-cache'},redirect:'follow'});
    if (!resp.ok) return {statusCode:resp.status,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},body:JSON.stringify({error:'Status '+resp.status,bronUrl:url,listings:[]})};
    const html = await resp.text();
    return {statusCode:200,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},body:JSON.stringify({listings:parseerHTML(html),bronUrl:url})};
  } catch(err) {
    return {statusCode:500,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},body:JSON.stringify({error:err.message,bronUrl:url,listings:[]})};
  }
};
function parseerHTML(html){
  const listings=[],gezien=new Set();
  const re=/href="(\/(v|m)\/auto-s\/[^/]+\/[am]\d+[^"]*?)"/g;let m;
  while((m=re.exec(html))!==null&&listings.length<40){
    const href=m[1],fullUrl='https://www.marktplaats.nl'+href;
    if(gezien.has(fullUrl))continue;gezien.add(fullUrl);
    const ctx=html.substring(Math.max(0,m.index-200),m.index+2000);
    const pm=ctx.match(/€\s*([\d.]+)(?:,-|\s)/);if(!pm)continue;
    const prijs=parseInt(pm[1].replace(/\./g,''));if(!prijs||prijs<200||prijs>5000000)continue;
    const jm=ctx.match(/\b(20[0-2]\d|19[89]\d)\b/);const jaar=jm?parseInt(jm[1]):null;
    const km=ctx.match(/([\d.]{1,9})\s*km/i);
    let bf='';if(/[Ee]lektrisch/.test(ctx))bf='Elektrisch';else if(/[Hh]ybride/.test(ctx))bf='Hybride';else if(/[Dd]iesel/.test(ctx))bf='Diesel';else if(/[Bb]enzine/.test(ctx))bf='Benzine';
    let cr='';for(const[z,l]of[['Stationwagon','Stationwagon'],['Hatchback','Hatchback'],['SUV of Terreinwagen','SUV'],['Sedan','Sedan'],['Cabriolet','Cabrio']
