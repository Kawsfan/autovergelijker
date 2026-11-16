#!/usr/bin/env node
// scripts/artikelen/meld-concept.js
// Mailt de eindredactie zodra artikel-concept.yml een concept-PR heeft
// aangemaakt of bijgewerkt. Aanleiding: PR's van de GitHub Actions-bot geven
// de repo-eigenaar standaard geen mail/pushmelding, waardoor concepten
// (bv. de Yaris-gids, #185) dagen onopgemerkt bleven staan. De workflow vraagt
// daarnaast de eigenaar als reviewer aan, voor de melding binnen GitHub.
//
// Gebruikt dezelfde Resend-koppeling en secrets als scripts/send-failure-alert.js
// (RESEND_API_KEY, ALERT_EMAIL). Ontbreekt er een, dan slaat het script zichzelf
// over: een gemiste mail mag nooit de concept-run rood maken.
//
// Env: SLUG, PR_URL, STATUS (nieuw|bijgewerkt), PR_BODY (pad naar pr-body.md)
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
// Netlify-site van de deploy-previews (zie de netlify[bot]-comments op PR's).
const NETLIFY_SITE = 'classy-ganache-4cfb6b';

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Aantal open verificatiepunten uit de PR-body (sectie "Te verifiëren").
function telVerificatiepunten(prBody) {
  const m = String(prBody || '').match(/### Te verifi[eë]ren[^\n]*\n([\s\S]*?)(\n###|$)/);
  return m ? (m[1].match(/^- \[ \]/gm) || []).length : 0;
}

function bouwMail({ art, prUrl, status, nVerifieren }) {
  const prNummer = (String(prUrl).match(/\/pull\/(\d+)/) || [])[1];
  const preview = prNummer
    ? 'https://deploy-preview-' + prNummer + '--' + NETLIFY_SITE + '.netlify.app/artikelen/' + art.slug + '/'
    : null;
  const onderwerp = (status === 'bijgewerkt' ? 'Artikelconcept bijgewerkt: ' : 'Nieuw artikelconcept: ') + art.titel;
  const html =
    '<p>Er staat een ' + (status === 'bijgewerkt' ? 'bijgewerkt' : 'nieuw') + ' artikelconcept klaar voor review.</p>' +
    '<h2 style="font-size:18px;margin:16px 0 8px">' + esc(art.titel) + '</h2>' +
    '<blockquote style="border-left:4px solid #d14413;margin:0;padding:8px 12px;color:#333">' + esc(art.intro) + '</blockquote>' +
    '<p style="color:#666;font-size:13px">' + esc(art.categorie) + ' · ' + art.leestijdMinuten + ' min leestijd' +
    (nVerifieren ? ' · <strong>' + nVerifieren + ' claims om na te lopen</strong>' : '') + '</p>' +
    (preview ? '<p><a href="' + preview + '">Bekijk het artikel in de preview &rarr;</a><br><span style="color:#999;font-size:12px">De preview is ±2 minuten na deze mail klaar.</span></p>' : '') +
    '<p><a href="' + esc(prUrl) + '">Review en merge op GitHub &rarr;</a></p>' +
    '<p style="color:#666;font-size:13px">Mergen = publiceren. Afwijzen = de PR sluiten zonder merge.</p>';
  return { onderwerp, html, preview };
}

module.exports = { bouwMail, telVerificatiepunten };

async function main() {
  const { RESEND_API_KEY, ALERT_EMAIL, SLUG, PR_URL, STATUS, PR_BODY } = process.env;
  if (!RESEND_API_KEY || !ALERT_EMAIL) {
    console.log('Conceptmelding overgeslagen: RESEND_API_KEY / ALERT_EMAIL niet ingesteld.');
    return;
  }
  if (!SLUG || !PR_URL) { console.log('Conceptmelding overgeslagen: SLUG of PR_URL ontbreekt.'); return; }

  const art = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'artikelen', SLUG + '.json'), 'utf-8'));
  const prBody = PR_BODY && fs.existsSync(PR_BODY) ? fs.readFileSync(PR_BODY, 'utf-8') : '';
  const { onderwerp, html } = bouwMail({ art, prUrl: PR_URL, status: STATUS, nVerifieren: telVerificatiepunten(prBody) });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.NOTIFICATIONS_FROM || 'Carkijker <info@carkijker.nl>',
      to: [ALERT_EMAIL], subject: onderwerp, html,
    }),
  });
  if (!res.ok) {
    console.error('Conceptmelding niet verstuurd via Resend: ' + res.status + ' ' + (await res.text()).slice(0, 300));
    return;
  }
  console.log('Conceptmelding verstuurd voor ' + SLUG + '.');
}

if (require.main === module) {
  main().catch(e => console.error('Onverwachte fout in meld-concept.js: ' + (e && e.message)));
}
