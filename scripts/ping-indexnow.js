#!/usr/bin/env node
// scripts/ping-indexnow.js
// Meldt bij Bing/IndexNow welke URL's zijn bijgewerkt, direct na elke
// scraperun. IndexNow is een gedeeld protocol (Bing, Yandex, Seznam, en
// sinds kort ook gebruikt om Bing's index te voeden die weer onder Copilot/
// Bing Chat zit) -- één ping bereikt in principe alle deelnemende
// zoekmachines. Zonder dit moet Bing zelf op eigen tempo langskomen om te
// merken dat een marktanalyse-pagina een nieuwe prijstrend heeft, wat voor
// een site die 3x/daags verandert een onnodige vertraging in indexering is.
//
// Verificatie: https://carkijker.nl/<key>.txt moet exact de key bevatten
// (zie keyLocation hieronder). Dat bestand staat in de repo-root naast
// robots.txt/llms.txt en wordt gewoon als static asset meegedeployed.
//
// Draait na "Genereer artikelen pagina's" in scrape.yml, dus sitemap.xml is
// op dat moment altijd de meest recente. We sturen de volledige sitemap
// i.p.v. alleen de URL's die deze run wijzigden -- eenvoudiger dan door elke
// generator heen bijhouden wat er precies veranderde, en IndexNow straft
// herhaalde meldingen van ongewijzigde URL's niet af (het is bedoeld om
// vaker dan nodig aan te roepen, niet zuiniger).
//
// Faalt dit (geen internet, IndexNow ligt eruit, whatever) dan mag dat nooit
// de scraperun zelf rood laten zien -- vandaar overal try/catch en exit 0.

const fs = require('fs');
const path = require('path');
const https = require('https');

const HOST = 'carkijker.nl';
const KEY = 'be86488e15bb350cf585d18660b076d1';
const KEY_LOCATION = 'https://carkijker.nl/' + KEY + '.txt';
const SITEMAP_PATH = path.join(__dirname, '..', 'sitemap.xml');
const ENDPOINT = 'api.indexnow.org';
// IndexNow accepteert max 10.000 URL's per aanroep. Ruim boven de ~830
// pagina's die deze site nu heeft, maar geknipt voor de toekomst.
const MAX_URLS = 10000;

function pingIndexNow(urlList) {
  return new Promise(function (resolve) {
    const body = JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urlList });
    const req = https.request(
      {
        hostname: ENDPOINT,
        path: '/indexnow',
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) },
        timeout: 15000,
      },
      function (res) {
        // IndexNow antwoordt 200 (verwerkt) of 202 (geaccepteerd, nog niet
        // verwerkt) bij succes -- beide zijn prima, alles daarboven is een fout.
        resolve({ ok: res.statusCode < 300, status: res.statusCode });
        res.resume();
      }
    );
    req.on('timeout', function () { req.destroy(); resolve({ ok: false, status: 'timeout' }); });
    req.on('error', function (err) { resolve({ ok: false, status: err.message }); });
    req.write(body);
    req.end();
  });
}

async function main() {
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.log('IndexNow-melding overgeslagen: sitemap.xml niet gevonden.');
    return;
  }
  const sitemap = fs.readFileSync(SITEMAP_PATH, 'utf-8');
  const urls = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)).map(function (m) { return m[1]; });
  if (!urls.length) {
    console.log('IndexNow-melding overgeslagen: geen URL\'s in sitemap.xml gevonden.');
    return;
  }

  for (let i = 0; i < urls.length; i += MAX_URLS) {
    const batch = urls.slice(i, i + MAX_URLS);
    const result = await pingIndexNow(batch);
    if (result.ok) {
      console.log('IndexNow: ' + batch.length + ' URL\'s gemeld (status ' + result.status + ').');
    } else {
      console.warn('IndexNow-melding mislukt (status ' + result.status + ') -- niet fataal, volgende run probeert opnieuw.');
    }
  }
}

main().catch(function (err) {
  console.error('Onverwachte fout in ping-indexnow.js (niet fataal): ' + (err && err.message));
});
