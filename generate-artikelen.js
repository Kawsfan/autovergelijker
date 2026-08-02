#!/usr/bin/env node
// generate-artikelen.js
// Genereert statische HTML-pagina's voor /artikelen/* vanuit data/artikelen/*.json

const fs   = require('fs');
const path = require('path');

const ART_DIR      = path.join(__dirname, 'data', 'artikelen');
const OUT_DIR       = path.join(__dirname, 'artikelen');
const SITE_ORIGIN   = 'https://carkijker.nl';
const GA_SNIPPET =
  '<script async src="https://www.googletagmanager.com/gtag/js?id=G-TD2KWCXTV3"><\/script>' +
  '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}' +
  "gtag('js',new Date());gtag('config','G-TD2KWCXTV3');<\/script>";

function fmtDatum(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function slugifyKop(kop) {
  return kop.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

const STYLE = `*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Segoe UI",Arial,sans-serif;background:#f5f5f0;color:#333;line-height:1.6}
nav{background:rgba(255,255,255,.96);border-bottom:1px solid rgba(0,0,0,.08);padding:0 1.1rem;height:56px;display:flex;align-items:center;gap:.9rem;position:sticky;top:0;z-index:200;box-shadow:0 1px 0 rgba(0,0,0,.04);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);font-size:.875rem;overflow-x:auto;white-space:nowrap}
.logo{font-size:1.15rem;font-weight:800;color:#d14413;letter-spacing:-.5px;text-decoration:none;flex-shrink:0}
.logo span{color:#1a1a2e}
nav a{color:#d14413;text-decoration:none}
nav a+a::before{content:" › ";color:#aaa;margin:0 .3rem}
.container{max-width:760px;margin:0 auto;padding:2rem 1rem 3rem}
.cat-badge{display:inline-block;background:#fff3e0;color:#d14413;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:.3rem .7rem;border-radius:20px;margin-bottom:.9rem}
h1{font-size:1.9rem;font-weight:800;line-height:1.25;margin-bottom:.9rem;color:#1a1a2e}
.byline{display:flex;flex-wrap:wrap;gap:.4rem 1rem;font-size:.82rem;color:#777;margin-bottom:1.75rem;padding-bottom:1.5rem;border-bottom:1px solid rgba(0,0,0,.08)}
.byline b{color:#444}
.intro{font-size:1.08rem;color:#333;background:#fff;border-left:4px solid #d14413;border-radius:0 10px 10px 0;padding:1.1rem 1.3rem;margin-bottom:2rem;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.toc{display:block;position:static;height:auto;overflow:visible;white-space:normal;backdrop-filter:none;-webkit-backdrop-filter:none;background:#fff;border:1px solid rgba(0,0,0,.07);border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.06);padding:1.1rem 1.4rem;margin-bottom:2rem}
.toc-title{font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#888;margin-bottom:.6rem}
.toc ol{padding-left:1.1rem}
.toc li{font-size:.9rem;margin-bottom:.35rem}
.toc a{color:#d14413;text-decoration:none}
.toc a:hover{text-decoration:underline}
article section{margin-bottom:1.9rem}
article h2{font-size:1.25rem;font-weight:700;margin-bottom:.6rem;color:#1a1a2e;scroll-margin-top:1rem}
article p{font-size:.98rem;color:#333;margin-bottom:.8rem}
article a{color:#d14413}
.faq-sectie{margin-top:2.5rem;background:#fff;border:1px solid rgba(0,0,0,.07);border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.06);padding:1.4rem 1.6rem}
.faq-sectie h2{font-size:1.1rem;font-weight:700;margin-bottom:1rem;color:#1a1a2e}
details{border-top:1px solid #eee;padding:.85rem 0}
details:first-of-type{border-top:none}
summary{font-weight:600;cursor:pointer;font-size:.92rem;color:#222}
summary::marker{color:#d14413}
details p{margin-top:.5rem;font-size:.88rem;color:#444}
.gerelateerd-cta{margin-top:2rem;text-align:center;background:#d14413;border-radius:12px;padding:1.6rem}
.gerelateerd-cta p{color:#fff;font-size:.95rem;margin-bottom:.8rem;font-weight:600}
.gerelateerd-cta a{display:inline-block;background:#fff;color:#d14413;font-weight:700;font-size:.9rem;padding:.6rem 1.4rem;border-radius:8px;text-decoration:none}
.back-link{display:inline-block;margin-top:2.5rem;color:#d14413;font-size:.875rem;text-decoration:none;font-weight:600}`;

function buildArtikelPage(art) {
  const canonicalPath = '/artikelen/' + art.slug + '/';
  const toc = art.secties.map(s => ({ kop: s.kop, id: slugifyKop(s.kop) }));

  const schema = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: art.titel, description: art.metaDescription,
    datePublished: art.gepubliceerd, dateModified: art.bijgewerkt,
    author: { '@type': 'Organization', name: art.auteur },
    publisher: { '@type': 'Organization', name: 'Carkijker' },
    mainEntityOfPage: SITE_ORIGIN + canonicalPath,
  };
  const bcSchema = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Carkijker', item: SITE_ORIGIN + '/' },
      { '@type': 'ListItem', position: 2, name: 'Artikelen', item: SITE_ORIGIN + '/artikelen/' },
      { '@type': 'ListItem', position: 3, name: art.titel, item: SITE_ORIGIN + canonicalPath },
    ],
  };
  const faqSchema = art.faq && art.faq.length ? {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: art.faq.map(f => ({
      '@type': 'Question', name: f.vraag,
      acceptedAnswer: { '@type': 'Answer', text: f.antwoord },
    })),
  } : null;

  const tocHtml = toc.length > 1
    ? '<nav class="toc" aria-label="Inhoudsopgave"><div class="toc-title">Inhoud</div><ol>' +
      toc.map(t => '<li><a href="#' + t.id + '">' + t.kop + '</a></li>').join('') +
      '</ol></nav>'
    : '';

  const secties = art.secties.map((s, i) =>
    '<section><h2 id="' + toc[i].id + '">' + s.kop + '</h2>' + s.html + '</section>'
  ).join('\n');

  const faqHtml = art.faq && art.faq.length
    ? '<div class="faq-sectie"><h2>Veelgestelde vragen</h2>' +
      art.faq.map(f => '<details><summary>' + f.vraag + '</summary><p>' + f.antwoord + '</p></details>').join('') +
      '</div>'
    : '';

  const geoText = 'Bronnen: Carkijker aggregeert dagelijks tweedehands auto-aanbod van Marktplaats, AutoScout24, Gaspedaal en ViaBOVAG. Dit artikel is geschreven door de Carkijker-redactie en wordt bijgewerkt zodra relevante regelgeving of marktomstandigheden wijzigen.';

  return '<!DOCTYPE html>\n<html lang="nl">\n<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '  ' + GA_SNIPPET + '\n' +
    '  <title>' + art.titel + ' | Carkijker</title>\n' +
    '  <meta name="description" content="' + art.metaDescription + '">\n' +
    '  <meta name="robots" content="index, follow">\n' +
    '  <link rel="canonical" href="' + SITE_ORIGIN + canonicalPath + '">\n' +
    '  <meta property="og:type" content="article">\n' +
    '  <meta property="og:title" content="' + art.titel + '">\n' +
    '  <meta property="og:description" content="' + art.metaDescription + '">\n' +
    '  <meta property="og:url" content="' + SITE_ORIGIN + canonicalPath + '">\n' +
    '  <script type="application/ld+json">' + JSON.stringify(schema) + '<\/script>\n' +
    '  <script type="application/ld+json">' + JSON.stringify(bcSchema) + '<\/script>\n' +
    (faqSchema ? '  <script type="application/ld+json">' + JSON.stringify(faqSchema) + '<\/script>\n' : '') +
    '  <style>' + STYLE + '<\/style>\n' +
    '</head>\n<body>\n' +
    '  <nav><a href="/" class="logo">Car<span>kijker</span></a><a href="/artikelen/">Artikelen</a><a href="' + canonicalPath + '">' + art.titel + '</a></nav>\n' +
    '  <div class="container">\n' +
    '    <span class="cat-badge">' + art.categorie + '</span>\n' +
    '    <h1>' + art.titel + '</h1>\n' +
    '    <div class="byline"><span>Door <b>' + art.auteur + '</b></span><span>Gepubliceerd ' + fmtDatum(art.gepubliceerd) + '</span>' +
    (art.bijgewerkt !== art.gepubliceerd ? '<span>Bijgewerkt ' + fmtDatum(art.bijgewerkt) + '</span>' : '') +
    '<span>' + art.leestijdMinuten + ' min leestijd</span></div>\n' +
    '    <p class="intro">' + art.intro + '</p>\n' +
    '    ' + tocHtml + '\n' +
    '    <article>\n' + secties + '\n    </article>\n' +
    '    ' + faqHtml + '\n' +
    (art.gerelateerd ? '    <div class="gerelateerd-cta"><p>Op zoek naar je volgende auto?</p><a href="' + art.gerelateerd.url + '">' + art.gerelateerd.label + ' &rarr;</a></div>\n' : '') +
    '    <p style="margin-top:1.5rem;font-size:.78rem;color:#999">' + geoText + '</p>\n' +
    '    <a href="/artikelen/" class="back-link">&larr; Alle artikelen</a>\n' +
    '  </div>\n</body>\n</html>';
}

function buildIndexPage(artikelen) {
  const cards = artikelen.map(a =>
    '<a class="art-card" href="/artikelen/' + a.slug + '/">' +
    '<span class="cat-badge">' + a.categorie + '</span>' +
    '<h2>' + a.titel + '</h2>' +
    '<p>' + a.metaDescription + '</p>' +
    '<span class="art-meta">' + fmtDatum(a.bijgewerkt) + ' &middot; ' + a.leestijdMinuten + ' min</span>' +
    '</a>'
  ).join('\n');

  const indexStyle = STYLE + `
.container{max-width:900px}
.art-grid{display:grid;gap:1rem;margin-top:1.5rem}
.art-card{display:block;background:#fff;border:1px solid rgba(0,0,0,.07);border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.04);padding:1.3rem 1.5rem;text-decoration:none;color:inherit;transition:box-shadow .15s}
.art-card:hover{box-shadow:0 4px 16px rgba(0,0,0,.1)}
.art-card h2{font-size:1.15rem;font-weight:700;margin:.5rem 0 .4rem;color:#1a1a2e}
.art-card p{font-size:.9rem;color:#555;margin-bottom:.6rem}
.art-meta{font-size:.78rem;color:#999}`;

  return '<!DOCTYPE html>\n<html lang="nl">\n<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '  ' + GA_SNIPPET + '\n' +
    '  <title>Artikelen over auto kopen, verkopen en onderhoud | Carkijker</title>\n' +
    '  <meta name="description" content="Praktische gidsen over tweedehands auto kopen, verkopen en onderhoud. Checklists en tips van de Carkijker-redactie, gebaseerd op actuele marktdata.">\n' +
    '  <link rel="canonical" href="' + SITE_ORIGIN + '/artikelen/">\n' +
    '  <style>' + indexStyle + '<\/style>\n' +
    '</head>\n<body>\n' +
    '  <nav><a href="/" class="logo">Car<span>kijker</span></a><a href="/artikelen/">Artikelen</a></nav>\n' +
    '  <div class="container">\n' +
    '    <h1>Artikelen</h1>\n' +
    '    <p class="subtitle" style="color:#666;font-size:.9rem;margin-top:.3rem">Praktische gidsen over auto kopen, verkopen en onderhoud &mdash; geschreven door de Carkijker-redactie.</p>\n' +
    '    <div class="art-grid">' + cards + '</div>\n' +
    '    <a href="/" class="back-link">&larr; Terug naar live zoeken</a>\n' +
    '  </div>\n</body>\n</html>';
}

function main() {
  if (!fs.existsSync(ART_DIR)) { console.log('Geen data/artikelen/ map, niets te doen.'); return; }
  const files = fs.readdirSync(ART_DIR).filter(f => f.endsWith('.json'));
  if (!files.length) { console.log('Geen artikelen gevonden.'); return; }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const artikelen = [];

  for (const file of files) {
    const art = JSON.parse(fs.readFileSync(path.join(ART_DIR, file), 'utf-8'));
    const dir = path.join(OUT_DIR, art.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), buildArtikelPage(art), 'utf-8');
    artikelen.push(art);
    console.log('  [OK] /artikelen/' + art.slug + '/');
  }

  artikelen.sort((a, b) => new Date(b.bijgewerkt) - new Date(a.bijgewerkt));
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), buildIndexPage(artikelen), 'utf-8');
  console.log('  [OK] /artikelen/ (index, ' + artikelen.length + ' artikelen)');

  // Sitemap bijwerken
  const sitemapPath = path.join(process.cwd(), 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    let sitemap = fs.readFileSync(sitemapPath, 'utf-8');
    const today = new Date().toISOString().slice(0, 10);
    const urls = ['artikelen/'].concat(artikelen.map(a => 'artikelen/' + a.slug + '/'));
    let added = 0;
    for (const u of urls) {
      const full = SITE_ORIGIN + '/' + u;
      if (!sitemap.includes(full)) {
        const prio = u === 'artikelen/' ? '0.7' : '0.6';
        const entry = '  <url><loc>' + full + '</loc><lastmod>' + today + '</lastmod><changefreq>monthly</changefreq><priority>' + prio + '</priority></url>';
        sitemap = sitemap.replace('</urlset>', entry + '\n</urlset>');
        added++;
      }
    }
    if (added) fs.writeFileSync(sitemapPath, sitemap, 'utf-8');
    console.log('Sitemap bijgewerkt: ' + added + ' nieuwe artikel-URLs');
  }

  // llms.txt bijwerken — sectie tussen markers wordt elke run herschreven,
  // zodat nieuwe artikelen (die er wekelijks bijkomen) automatisch verschijnen.
  const llmsPath = path.join(process.cwd(), 'llms.txt');
  if (fs.existsSync(llmsPath)) {
    let llms = fs.readFileSync(llmsPath, 'utf-8');
    const startMarker = '<!-- ARTIKELEN:START -->';
    const endMarker = '<!-- ARTIKELEN:END -->';
    if (llms.includes(startMarker) && llms.includes(endMarker)) {
      const sectie = '## Artikelen\n\n' +
        artikelen.map(a => '- [' + a.titel + '](' + SITE_ORIGIN + '/artikelen/' + a.slug + '/): ' + a.metaDescription).join('\n') + '\n';
      const before = llms.slice(0, llms.indexOf(startMarker) + startMarker.length);
      const after = llms.slice(llms.indexOf(endMarker));
      llms = before + '\n' + sectie + '\n' + after;
      fs.writeFileSync(llmsPath, llms, 'utf-8');
      console.log('llms.txt bijgewerkt: ' + artikelen.length + ' artikelen');
    }
  }
}

main();
