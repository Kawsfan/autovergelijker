#!/usr/bin/env node
// scripts/import-artikelen-naar-headlessify.js
//
// EENMALIG lokaal te draaien, vóór sync-headlessify-artikelen.js voor het
// eerst in de workflow gebruikt wordt: leest de huidige data/artikelen/*.json
// en zet ze als documents in Headlessify (Supabase). Zonder deze stap
// verwijdert de sync straks alle drie bestaande artikelen, want die bestaan
// dan nog niet als 'published' document in Headlessify.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/import-artikelen-naar-headlessify.js
//
// Idempotent qua content (upsert op project_id+type_slug+slug+locale).
// published_at wordt uit het bestaande "gepubliceerd"-veld gezet en blijft
// bij elke herhaalde run gelijk. updated_at wordt door de
// documents_set_updated_at-trigger in Headlessify bij een tweede run
// overschreven met "nu" i.p.v. het oorspronkelijke "bijgewerkt" opnieuw toe
// te passen -- verwacht, want een her-import ís een wijziging.

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ART_DIR = path.join(__dirname, '..', 'data', 'artikelen');
const PROJECT_SLUG = 'carkijker';
const TYPE_SLUG = 'artikel';

// Deze velden leven als losse kolom (slug) of worden afgeleid uit
// published_at/updated_at (gepubliceerd/bijgewerkt) i.p.v. in het
// schema-veld 'data' -- zie headlessify/docs/ARCHITECTURE.md.
// categorieSlug wordt niet meegenomen: nergens in de site gelezen.
const NIET_MEENEMEN = new Set(['slug', 'categorieSlug', 'gepubliceerd', 'bijgewerkt']);

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Zet SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY voor je dit script draait.');
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
  if (!projects.length) {
    throw new Error(`Project '${PROJECT_SLUG}' niet gevonden -- migraties al gedraaid in Supabase?`);
  }
  const projectId = projects[0].id;

  const files = fs.readdirSync(ART_DIR).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const art = JSON.parse(fs.readFileSync(path.join(ART_DIR, file), 'utf8'));

    const data = {};
    for (const [key, value] of Object.entries(art)) {
      if (!NIET_MEENEMEN.has(key)) data[key] = value;
    }

    const payload = {
      project_id: projectId,
      type_slug: TYPE_SLUG,
      slug: art.slug,
      data,
      status: 'published',
      published_at: toIso(art.gepubliceerd),
      updated_at: toIso(art.bijgewerkt || art.gepubliceerd),
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/documents?on_conflict=project_id,type_slug,slug,locale`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Import van ${file} mislukt (${res.status}): ${await res.text()}`);
    console.log(`Geïmporteerd: ${art.slug}`);
  }

  console.log(`Klaar. ${files.length} artikel(en) geïmporteerd naar Headlessify.`);
}

function toIso(dateOnly) {
  return dateOnly ? `${dateOnly}T12:00:00Z` : new Date().toISOString();
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
