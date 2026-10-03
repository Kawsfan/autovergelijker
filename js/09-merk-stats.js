
  function _renderMerkStats(listings){
  var el=document.getElementById('merk-stats-grid');
  if(!el||!listings||!listings.length)return;
  var byMerk={};
  listings.forEach(function(a){
    var m=a.merk||extraheerMerk(a.titel||'');
    if(!m)return;
    if(!byMerk[m])byMerk[m]=[];
    byMerk[m].push(a);
  });
  var merken=Object.entries(byMerk).sort(function(a,b){return b[1].length-a[1].length;}).slice(0,8);
  el.innerHTML=merken.map(function(entry){
    var merk=entry[0],autos=entry[1];
    var prijzen=autos.filter(function(a){return a.prijs;}).map(function(a){return a.prijs;}).sort(function(a,b){return a-b;});
    var kms=autos.filter(function(a){return a.km;}).map(function(a){return a.km;}).sort(function(a,b){return a-b;});
    var gem=prijzen.length?Math.round(prijzen.reduce(function(s,v){return s+v;},0)/prijzen.length):null;
    var medKm=kms.length?kms[Math.floor(kms.length/2)]:null;
    var goedkoop=autos.filter(function(a){return a.prijs;}).reduce(function(m,a){return(!m||a.prijs<m.prijs)?a:m;},null);
    var trend=autos.filter(function(a){return a.prijsHistorie&&a.prijsHistorie.length>1;});
    var dalend=trend.filter(function(a){var ph=a.prijsHistorie;return ph[ph.length-1].prijs<ph[0].prijs;}).length;
    var fmt=function(n){return n.toLocaleString('nl-NL');};
    var rows=[
      gem?('<div><dt>Gem. vraagprijs</dt><dd>\u20ac '+fmt(gem)+'</dd></div>'):'',
      medKm?('<div><dt>Mediaan km-stand</dt><dd>'+fmt(medKm)+' km</dd></div>'):'',
      goedkoop?('<div><dt>Goedkoopste nu</dt><dd>\u20ac '+fmt(goedkoop.prijs)+(goedkoop.jaar?' ('+goedkoop.jaar+')':'')+'</dd></div>'):'',
      trend.length?('<div><dt>Prijsdaling (30d)</dt><dd>'+dalend+' van '+trend.length+'</dd></div>'):''
    ].filter(Boolean).join('');
    return '<article class="merk-stat-card"><h3>'+merk+' <span class="merk-count">'+autos.length+' occasions</span></h3><dl>'+rows+'</dl></article>';
  }).join('');
}
function _renderMerkenLinks(listings){var el=document.getElementById("merken-links-grid");if(!el||!listings||!listings.length)return;
// Zelfde lijst als MERKEN_DISPLAY in generate-occasions.js (server-side) --
// bewust hier gedupliceerd i.p.v. gedeeld, zelfde patroon als de bestaande
// merken-links-grid/16-cap-koppeling tussen deze twee bestanden. Vult vooral
// de meerwoordige merken correct (anders wordt bv. "Alfa Romeo" via de
// generieke fallback hieronder "Alfa romeo").
var D={bmw:"BMW",vw:"Volkswagen",volkswagen:"Volkswagen",audi:"Audi",mercedes:"Mercedes-Benz","mercedes-benz":"Mercedes-Benz",toyota:"Toyota",ford:"Ford",opel:"Opel",renault:"Renault",peugeot:"Peugeot",honda:"Honda",nissan:"Nissan",mazda:"Mazda",kia:"Kia",hyundai:"Hyundai",seat:"SEAT",skoda:"Skoda",volvo:"Volvo",tesla:"Tesla",mini:"MINI",fiat:"Fiat",porsche:"Porsche",dacia:"Dacia",citroen:"Citroen",polestar:"Polestar",suzuki:"Suzuki",mitsubishi:"Mitsubishi",alfa:"Alfa Romeo","alfa-romeo":"Alfa Romeo","alfa romeo":"Alfa Romeo",jeep:"Jeep","land rover":"Land Rover","land-rover":"Land Rover","aston martin":"Aston Martin","aston-martin":"Aston Martin","lynk & co":"Lynk & Co","lynk-co":"Lynk & Co"};
// Zelfde slugify als generate-occasions.js slugifyMerk() (server-side) --
// bewust hier gedupliceerd, zelfde patroon als de D-lijst hierboven. Root
// cause van de "Page with redirect"-meldingen in Google Search Console
// (sep '26): deze links wezen rechtstreeks naar de rauwe merknaam (met
// spaties/"&"/diakrieten), wat niet overeenkwam met de daadwerkelijke,
// geslugifyde pagina-URL.
function _slugifyMerk(naam){return String(naam||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");}
var c={};listings.forEach(function(a){var m=(a.merk||"").toLowerCase().trim();if(m)c[m]=(c[m]||0)+1;});
// Geen slice(0,16) meer -- zie generate-occasions.js updateHomepageMerkenLinks()
// voor waarom: anders bleven 47 van de 63 merk-pagina's (en alles daaronder)
// onbereikbaar via een klikbare link vanaf de homepage.
var top=Object.entries(c).filter(function(e){return e[1]>=3;}).sort(function(a,b){return b[1]-a[1];});
el.innerHTML=top.map(function(e){var slug=_slugifyMerk(e[0]);var d=D[slug]||D[e[0]]||(slug.charAt(0).toUpperCase()+slug.slice(1));return'<a href="/occasions/'+slug+'/" style="display:inline-flex;align-items:center;gap:.3rem;background:#fff;border:1px solid #e5e5ea;border-radius:20px;padding:.3rem .9rem;font-size:.83rem;color:#1a56db;text-decoration:none">'+d+' <span style="color:#aaa;font-size:.75rem">('+e[1]+')</span></a>';}).join("");}

function _injectCarSchema(cars) {
    var old = document.getElementById("_ld-cars");
    if (old) old.remove();
    var top = cars.filter(function(a){ return a.prijs && (a.merk || extraheerMerk(a.titel||'')); }).slice(0, 24);
    if (!top.length) return;
    var items = top.map(function(a, i) {
      var merk = a.merk || extraheerMerk(a.titel||'') || '';
      var parts = [
        a.jaar ? 'Bouwjaar ' + a.jaar : '',
        a.km ? a.km.toLocaleString('nl-NL') + ' km' : '',
        a.brandstof || '',
        a.transmissie || '',
        a.bron ? 'Via ' + a.bron : ''
      ].filter(Boolean);
      var desc = merk + (parts.length ? '  ' + parts.join(', ') + '.' : '.');
      var item = {
        "@type": "Car",
        "name": a.titel || (merk + (a.jaar ? ' ' + a.jaar : '')),
        "description": desc,
        "brand": { "@type": "Brand", "name": merk },
        "offers": {
          "@type": "Offer",
          "price": a.prijs,
          "priceCurrency": "EUR",
          "availability": "https://schema.org/InStock"
        }
      };
      if (a.url) item.offers.url = a.url;
      if (a.jaar) item.vehicleModelDate = String(a.jaar);
      if (a.km) item.mileageFromOdometer = { "@type": "QuantitativeValue", "value": a.km, "unitCode": "KMT" };
      if (a.brandstof) item.fuelType = a.brandstof;
      if (a.transmissie) item.vehicleTransmission = a.transmissie;
      return { "@type": "ListItem", "position": i + 1, "item": item };
    });
    var ld = { "@context": "https://schema.org", "@type": "ItemList",
      "name": "Tweedehands auto's - Carkijker",
      "description": "Actueel aanbod tweedehands auto's van 6 Nederlandse platforms",
      "numberOfItems": cars.length,
      "itemListElement": items };
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.id = "_ld-cars";
    s.textContent = JSON.stringify(ld);
    document.head.appendChild(s);
  }
