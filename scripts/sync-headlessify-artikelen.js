#!/usr/bin/env node
// scripts/sync-headlessify-artikelen.js
//
// Haalt gepubliceerde 'artikel'-documenten op uit Headlessify (Supabase) en
// schrijft ze weg als data/artikelen/<slug>.json, in exact de vorm die
// generate-artikelen.js verwacht. Draait in GitHub Actions vóór
// generate-artikelen.js (zie .github/workflows/scrape.yml) -- de generator
// zelf hoeft hier niets voor aangepast.
//
// categorieSlug wordt bewust niet meer geschreven: nergens in deze repo
// gelezen (gecheckt), dus dode data -- zie headlessify/docs/ARCHITECTURE.md.
//
// Bewust een no-op (waarschuwing + exit 0) zolang SUPABASE_URL of
// SUPABASE_SERVICE_ROLE_KEY niet gezet zijn, zodat deze stap de bestaande
// workflow niet breekt voordat Headlessify daadwerkelijk in gebruik is.
// Zodra dat wel zo is, is data/artikelen/ niet meer de bron van waarheid --
// draai dan eerst eenmalig scripts/import-artikelen-naar-headlessify.js,
// anders verdwijnen de huidige hand-geschreven artikelen (dit script
// verwijdert bestanden die niet meer als 'published' terugkomen).

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OUT_DIR = path.join(__dirname, '..', 'data', 'artikelen');
const PROJECT_SLUG = 'carkijker';
const TYPE_SLUG = 'artikel';

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.log(
      'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY niet gezet -- sync overgeslagen, data/artikelen/ blijft ongewijzigd.'
    );
    return;
  }

  const headers = {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };

  const projects = await getJson(
    `${SUPABASE_URL}/rest/v1/projects?select=id&slug=eq.${PROJECT_SLUG}`,
    headers
  );
  if (!projects.length) throw new Error(`Project '${PROJECT_SLUG}' niet gevonden in Supabase.`);
  const projectId = projects[0].id;

  const docs = await getJson(
    `${SUPABASE_URL}/rest/v1/documents?select=slug,data,published_at,updated_at` +
      `&project_id=eq.${projectId}&type_slug=eq.${TYPE_SLUG}&status=eq.published&deleted_at=is.null`,
    headers
  );

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const geschreven = new Set();
  for (const doc of docs) {
    const artikel = {
      slug: doc.slug,
      ...doc.data,
      gepubliceerd: toDateOnly(doc.published_at) || toDateOnly(doc.updated_at),
      bijgewerkt: toDateOnly(doc.updated_at),
    };
    const bestand = `${doc.slug}.json`;
    fs.writeFileSync(path.join(OUT_DIR, bestand), JSON.stringify(artikel, null, 2) + '\n');
    geschreven.add(bestand);
  }

  // Alles wat niet meer als 'published' terugkomt uit Headlessify hoort ook
  // niet meer op de site te staan -- Supabase is vanaf hier de bron van
  // waarheid, geen los-bijgehouden kopie.
  for (const file of fs.readdirSync(OUT_DIR)) {
    if (file.endsWith('.json') && !geschreven.has(file)) {
      fs.unlinkSync(path.join(OUT_DIR, file));
      console.log(`Verwijderd (niet meer published in Headlessify): ${file}`);
    }
  }

  console.log(`${docs.length} artikel(en) gesynchroniseerd uit Headlessify naar ${OUT_DIR}.`);
}

function toDateOnly(iso) {
  return iso ? iso.slice(0, 10) : null;
}

async function getJson(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Supabase-fout (${res.status}) bij ${url}: ${await res.text()}`);
  return res.json();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
