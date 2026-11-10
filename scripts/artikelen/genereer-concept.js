#!/usr/bin/env node
// scripts/artikelen/genereer-concept.js
// Schrijft één artikelCONCEPT volgens docs/seo-geo-artikel-template.md, op
// basis van het volgende onderwerp uit docs/artikel-planning.json en de live
// Carkijker-marktdata. Publiceert niets: de workflow artikel-concept.yml zet
// het resultaat in een PR, en pas een merge door de eindredacteur zet het
// live (human in the loop). Zie docs/artikel-pipeline.md.
//
// Gebruik:
//   node scripts/artikelen/genereer-concept.js [--slug <slug>] [--overslaan a,b] [--pr-body pad.md]
//   node scripts/artikelen/genereer-concept.js --droog   (alleen prompt + marktdata tonen, geen API-call)
//
// Vereist ANTHROPIC_API_KEY (repo-secret) en `npm install --no-save @anthropic-ai/sdk`
// (de site zelf heeft bewust 0 dependencies, dus geen package.json in de root).
'use strict';

const fs = require('fs');
const path = require('path');
const { laadListings, berekenMarktdata } = require('./marktdata');
const { checkArtikel, woorden } = require('./check-artikel');

const ROOT = path.join(__dirname, '..', '..');
const ART_DIR = path.join(ROOT, 'data', 'artikelen');
const PLANNING = path.join(ROOT, 'docs', 'artikel-planning.json');
const TEMPLATE = path.join(ROOT, 'docs', 'seo-geo-artikel-template.md');
const VOORBEELD = 'beste-stationwagens-onder-15000-euro';
const MODEL = process.env.ARTIKEL_MODEL || 'claude-opus-5-5';

const CATEGORIEEN = { 'Kopen': 'kopen', 'Verkopen': 'verkopen', 'Elektrisch rijden': 'elektrisch-rijden', 'Kosten': 'kosten', 'Onderhoud': 'onderhoud' };

function args() {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--droog') o.droog = true;
    else if (a[i].startsWith('--')) o[a[i].slice(2)] = a[++i];
  }
  return o;
}

function kiesOnderwerp(planning, opties) {
  const overslaan = new Set(String(opties.overslaan || '').split(',').map(s => s.trim()).filter(Boolean));
  const open = planning.onderwerpen.filter(o =>
    !fs.existsSync(path.join(ART_DIR, o.slug + '.json')) && !overslaan.has(o.slug));
  if (opties.slug) return planning.onderwerpen.find(o => o.slug === opties.slug) || null;
  return open[0] || null;
}

function bestaandeArtikelen() {
  return fs.readdirSync(ART_DIR).filter(f => f.endsWith('.json')).map(f => {
    const a = JSON.parse(fs.readFileSync(path.join(ART_DIR, f), 'utf-8'));
    return { url: '/artikelen/' + a.slug + '/', titel: a.titel, categorie: a.categorie };
  });
}

function systeemPrompt(template, voorbeeld) {
  return `Je bent eindredacteur van Carkijker.nl, een Nederlandse zoekmachine die het tweedehands auto-aanbod van alle grote platforms bundelt. Je schrijft koop- en informatiegidsen die goed scoren in Google én letterlijk geciteerd worden door ChatGPT, Perplexity en Google AI Overviews.

Je volgt het onderstaande redactietemplate strikt. Het is leidend boven je eigen voorkeuren.

<template>
${template}
</template>

Aanvullende huisregels:
- Taal: Nederlands, B1, je/jouw. Transparant en betrouwbaar, geen verkooptaal.
- Gebruik NOOIT: "ontdek", "uniek", "revolutie/revolutionair", "must-have", "in dit artikel", "wist je dat", "kortom", "naadloos", "game changer", en geen vraag-opener als "Op zoek naar ...?".
- Gebruik GEEN em-dash (—). Gebruik een dubbele punt, komma of nieuwe zin. Een gewoon koppelteken in samenstellingen en bereiken (10-15%) mag wel.
- Bedragen als €11.500 (punt als duizendtal-scheiding), kilometers als 98.000 km.
- Geen persoonlijke ervaringen verzinnen en geen ik-vorm. Dit is een gids van de redactie, geen ervaringsverhaal (template §5 geldt, §4 niet).

Feiten en cijfers (belangrijkste regel):
- Marktcijfers (aantallen, prijzen, kilometerstanden, verdelingen) haal je UITSLUITEND uit het meegeleverde <marktdata>-blok. Noem bij elk cijferblok de steekproef en de peildatum, bijvoorbeeld "op basis van 753 advertenties op Carkijker (peildatum 10 november 2026)". Verzin of extrapoleer geen marktcijfers.
- Spreek van "mediaan" of "middelste vraagprijs" waar de data een mediaan is, niet van "gemiddeld".
- Technische kennis (generaties, motoren, bekende mankementen, WLTP-actieradius, kofferinhoud, garantievoorwaarden) mag uit je eigen kennis komen, maar alleen als je er zeker van bent, en dan specifiek: onderdeel + bouwjaren. Twijfel je, laat het weg. Elke technische claim die de eindredacteur moet natrekken, zet je in "redactieNotities".
- Regelgeving, subsidies, belastingen en nieuwprijzen veranderen: noem ze alleen als het onderwerp erom vraagt, en zet ze altijd in "redactieNotities" om te verifiëren.

HTML in secties[].html:
- Alleen <p>, <h3>, <ul>, <ol>, <li>, <strong>, <a href="...">. Geen <h1>/<h2> (de "kop" wordt de H2), geen inline styles, geen tabellen.
- Interne links: alleen naar URL's die in <linkdoelen> staan. Link de eerste natuurlijke vermelding van elk model naar zijn occasion-URL. Externe links alleen naar officiële bronnen (rdw.nl, rijksoverheid.nl, belastingdienst.nl) en alleen als het echt iets toevoegt.
- Beschrijvende linkteksten, nooit "klik hier".

Structuur van de JSON (zie het voorbeeld):
- "intro" = de directe-antwoord-alinea uit template §2: 40-60 woorden, max 3 zinnen, met minstens één hard cijfer en de exacte zoekterm. Het intro-blok wordt direct onder de H1 getoond.
- "secties": 4-7 H2-secties, elk answer-first. H3's voor uitsplitsing per bouwjaar/generatie/onderdeel.
- Laatste sectie: een korte verantwoording van de cijfers (bron, peildatum, uitgesloten verdacht goedkope advertenties, cijfers bewegen mee met het aanbod) met een link naar het actuele aanbod.
- "faq": 3-5 vragen die mensen letterlijk zo intikken, met zelfstandige antwoorden van 1-3 zinnen (worden FAQPage-schema).
- "gerelateerd": 2-3 links (occasion-pagina eerst, dan relevante artikelen/tools).
- "metaDescription": 120-155 tekens, met het hoofdzoekwoord en een concreet cijfer.
- "titel": de H1, max ~65 tekens, met het hoofdzoekwoord vooraan.
- Totale lengte lopende tekst: 900-1.400 woorden.

Voorbeeld van een bestaand gepubliceerd artikel (alleen voor de JSON-structuur en toon; de nieuwe tekst houdt zich strenger aan het template dan dit voorbeeld):
<voorbeeld>
${voorbeeld}
</voorbeeld>`;
}

function gebruikersPrompt(item, marktdata, linkdoelen) {
  return `Schrijf het artikelconcept voor dit onderwerp uit de redactieplanning:

<onderwerp>
${JSON.stringify(item, null, 2)}
</onderwerp>

<marktdata>
${JSON.stringify(marktdata, null, 2)}
</marktdata>

<linkdoelen>
${linkdoelen.map(l => '- ' + l.url + (l.titel ? '  (' + l.titel + ')' : '')).join('\n')}
</linkdoelen>

Gebruik slug "${item.slug}". Kies categorie uit: ${Object.keys(CATEGORIEEN).join(', ')}.
Gebruik de invalshoek uit het onderwerp als je Information Gain: iets wat de lezer niet al op tien andere sites vindt.`;
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['slug', 'titel', 'metaDescription', 'categorie', 'intro', 'secties', 'faq', 'gerelateerd', 'redactieNotities'],
  properties: {
    slug: { type: 'string' },
    titel: { type: 'string' },
    metaDescription: { type: 'string' },
    categorie: { type: 'string', enum: Object.keys(CATEGORIEEN) },
    intro: { type: 'string' },
    secties: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['kop', 'html'], properties: { kop: { type: 'string' }, html: { type: 'string' } } },
    },
    faq: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['vraag', 'antwoord'], properties: { vraag: { type: 'string' }, antwoord: { type: 'string' } } },
    },
    gerelateerd: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['label', 'url'], properties: { label: { type: 'string' }, url: { type: 'string' } } },
    },
    redactieNotities: {
      type: 'array',
      description: 'Claims die de eindredacteur moet verifiëren vóór publicatie (technische feiten, regelgeving, prijzen nieuw).',
      items: { type: 'string' },
    },
  },
};

async function vraagClaude(client, system, berichten) {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    // Opus 5.5 staat standaard op effort "medium"; een gids met cijferwerk
    // en strakke stijlregels heeft baat bij "high".
    output_config: { effort: 'high', format: { type: 'json_schema', schema: SCHEMA } },
    // Weigert het model (veiligheidsclassificatie, zeldzaam bij autocontent),
    // dan neemt de API zelf een fallbackmodel -- anders zou de geplande run
    // stil zonder concept eindigen.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    messages: berichten,
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('Model weigerde het verzoek: ' + JSON.stringify(msg.stop_details));
  if (msg.stop_reason === 'max_tokens') throw new Error('Output afgekapt (max_tokens)');
  const txt = msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return { msg, json: JSON.parse(txt) };
}

function naarArtikel(out, item, vandaag) {
  const art = {
    slug: item.slug,
    titel: out.titel,
    metaDescription: out.metaDescription,
    categorie: out.categorie,
    categorieSlug: CATEGORIEEN[out.categorie] || 'kopen',
    gepubliceerd: vandaag,
    bijgewerkt: vandaag,
    auteur: 'Carkijker redactie',
    leestijdMinuten: 1,
    intro: out.intro,
    secties: out.secties,
    faq: out.faq,
    gerelateerd: out.gerelateerd,
  };
  const w = woorden(art.intro) + art.secties.reduce((n, s) => n + woorden(s.html), 0);
  art.leestijdMinuten = Math.max(2, Math.round(w / 200));
  return art;
}

function prBody(item, art, check, notities, marktdata) {
  const fmt = n => n == null ? 'n.b.' : '€' + n.toLocaleString('nl-NL');
  const rijen = marktdata.modellen.map(m =>
    '| ' + m.merk + ' ' + (m.model || '') + ' | ' + m.aantal + ' | ' + fmt(m.prijs.p25) + ' | ' + fmt(m.prijs.mediaan) + ' | ' + fmt(m.prijs.p75) +
    ' | ' + (m.kilometerstand.mediaan != null ? m.kilometerstand.mediaan.toLocaleString('nl-NL') + ' km' : 'n.b.') + ' |').join('\n');
  return `## Artikelconcept: ${art.titel}

**Hoofdzoekwoord:** \`${item.hoofdzoekwoord}\` · **Type:** ${item.type} · **Categorie:** ${art.categorie} · **${check.woorden} woorden** (${art.leestijdMinuten} min)

> ${art.intro}

Preview: zie de Netlify/Cloudflare deploy-preview hieronder, pad \`/artikelen/${art.slug}/\`.

### Te verifiëren door de eindredactie
${notities.length ? notities.map(n => '- [ ] ' + n).join('\n') : '- [ ] (model meldde geen te verifiëren claims, controleer toch de technische feiten)'}

### Publicatiechecklist (template §7)
- [ ] Openingsalinea geeft het directe antwoord met minstens één hard cijfer
- [ ] Elk marktcijfer klopt met de snapshot hieronder (steekproef + peildatum genoemd)
- [ ] Technische claims zijn specifiek (onderdeel + bouwjaren) en kloppen
- [ ] Minstens één onderscheidend inzicht dat niet op elke andere site staat
- [ ] Toon: B1, je/jouw, geen marketingtaal, merk/model expliciet benoemd
- [ ] Links in de preview werken

**Akkoord?** Mergen = publiceren. De publicatieworkflow zet de publicatiedatum op de merge-dag, werkt de artikelindex, sitemap en llms.txt bij en meldt de URL bij IndexNow.
**Aanpassen?** Bewerk \`data/artikelen/${art.slug}.json\` in deze PR (de PR-validatie checkt het format opnieuw).
**Afwijzen?** Sluit de PR zonder merge. Het onderwerp wordt dan niet opnieuw opgepakt zolang de branch \`artikel/${art.slug}\` bestaat.

${check.waarschuwingen.length ? '### Automatische formatcheck: waarschuwingen\n' + check.waarschuwingen.map(w => '- ' + w).join('\n') + '\n' : '### Automatische formatcheck: geen waarschuwingen\n'}
<details><summary>Marktdata-snapshot (peildatum ${marktdata.peildatum}${marktdata.selectie ? ', ' + marktdata.totaalInSelectie + ' advertenties in selectie' : ''})</summary>

Filters: \`${JSON.stringify(marktdata.filters)}\`

| Model | Aantal | P25 | Mediaan | P75 | Mediaan km |
|---|---|---|---|---|---|
${rijen}

</details>

<details><summary>Invalshoek uit de planning</summary>

${item.invalshoek}

</details>

_Concept gegenereerd via \`scripts/artikelen/genereer-concept.js\`._
`;
}

async function main(opties, client) {
  const planning = JSON.parse(fs.readFileSync(PLANNING, 'utf-8'));
  const item = kiesOnderwerp(planning, opties);
  if (!item) { console.log('Geen open onderwerp in docs/artikel-planning.json. Vul de planning aan.'); return; }
  console.log('Onderwerp: ' + item.slug);

  const { rows, bijgewerkt } = laadListings();
  const vandaag = new Date().toISOString().slice(0, 10);
  const marktdata = berekenMarktdata(rows, item, { peildatum: (bijgewerkt || vandaag).slice(0, 10) });

  const linkdoelen = [];
  marktdata.modellen.forEach(m => {
    if (m.occasionUrl) linkdoelen.push({ url: m.occasionUrl, titel: 'occasions ' + m.merk + ' ' + (m.model || '') });
    if (m.marktanalyseUrl) linkdoelen.push({ url: m.marktanalyseUrl, titel: 'marktanalyse/prijstrend ' + m.merk + ' ' + (m.model || '') });
  });
  [['/occasions/', 'volledig occasion-aanbod'], ['/tco/', 'TCO-calculator: totale kosten per maand'], ['/kentekencheck/', 'kentekencheck (RDW, APK, terugroepacties)'],
    ['/inruilwaarde/', 'inruilwaarde berekenen']].forEach(([url, titel]) => {
    if (fs.existsSync(path.join(ROOT, url, 'index.html'))) linkdoelen.push({ url, titel });
  });
  bestaandeArtikelen().forEach(a => linkdoelen.push(a));

  const template = fs.readFileSync(TEMPLATE, 'utf-8');
  const voorbeeld = fs.readFileSync(path.join(ART_DIR, VOORBEELD + '.json'), 'utf-8');
  const system = systeemPrompt(template, voorbeeld);
  const berichten = [{ role: 'user', content: gebruikersPrompt(item, marktdata, linkdoelen) }];

  if (opties.droog) {
    console.log(berichten[0].content);
    console.log('\n(systeemprompt: ' + system.length + ' tekens; geen API-call gedaan)');
    return;
  }

  if (!client) {
    const Anthropic = require('@anthropic-ai/sdk');
    client = new Anthropic();
  }

  let { msg, json } = await vraagClaude(client, system, berichten);
  let art = naarArtikel(json, item, vandaag);
  let check = checkArtikel(art);

  // Eén herstelronde: de formatcheck-fouten gaan terug naar het model. Lukt
  // het daarna nog niet, dan faalt de run (geen half-werkend concept in een PR).
  if (check.fouten.length) {
    console.log('Formatfouten in eerste versie, herstelronde:\n  ' + check.fouten.join('\n  '));
    berichten.push({ role: 'assistant', content: msg.content });
    berichten.push({ role: 'user', content: 'De automatische formatcheck vond deze fouten. Lever het volledige artikel opnieuw aan met alles hersteld en verder ongewijzigd:\n- ' + check.fouten.join('\n- ') });
    ({ msg, json } = await vraagClaude(client, system, berichten));
    art = naarArtikel(json, item, vandaag);
    check = checkArtikel(art);
  }
  if (check.fouten.length) {
    console.error('Concept haalt de formatcheck niet:\n  ' + check.fouten.join('\n  '));
    process.exit(1);
  }

  fs.writeFileSync(path.join(ART_DIR, item.slug + '.json'), JSON.stringify(art, null, 2) + '\n', 'utf-8');
  console.log('Geschreven: data/artikelen/' + item.slug + '.json (' + check.woorden + ' woorden)');
  check.waarschuwingen.forEach(w => console.log('  ! ' + w));

  if (opties['pr-body']) fs.writeFileSync(opties['pr-body'], prBody(item, art, check, json.redactieNotities || [], marktdata), 'utf-8');
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, 'slug=' + item.slug + '\ntitel=' + art.titel.replace(/\n/g, ' ') + '\n');
  }
}

module.exports = { main, kiesOnderwerp, naarArtikel, SCHEMA };

if (require.main === module) {
  main(args()).catch(e => { console.error(e); process.exit(1); });
}
