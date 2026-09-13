#!/usr/bin/env node
// scripts/send-failure-alert.js
// Stuurt één waarschuwingsmail wanneer de scrape-workflow zelf faalt (een
// van de stappen "Scrape auto listings" t/m "Controleer scraper-gezondheid
// per bron" gooit een niet-nul exitcode). Draait als allerlaatste stap in
// scrape.yml met `if: failure()`, dus alleen wanneer de job al als
// mislukt gemarkeerd staat.
//
// Aanleiding: op 12 sep faalde de workflow ~6 uur lang onopgemerkt op
// "cannot pull with rebase: You have unstaged changes" (marktanalyse/
// ontbrak in de git add-lijst, zie PR #125) -- niemand zou dat gemerkt
// hebben zonder een toevallige handmatige check. check-scrape-health.js
// bewaakt alleen de kwaliteit per bron, niet of de workflow zelf uitvalt.
//
// Vereist twee secrets (GitHub Actions repo-secrets, nooit in code/chat):
//   RESEND_API_KEY  -- zelfde key als scripts/send-notifications.js.
//   ALERT_EMAIL     -- het e-mailadres dat de waarschuwing moet ontvangen.
// Ontbreekt een van de twee, dan slaat dit script zichzelf stilletjes over
// (exit 0) i.p.v. de (toch al gefaalde) workflow nóg roder te maken.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ALERT_EMAIL = process.env.ALERT_EMAIL;
const FROM_ADDRESS = process.env.NOTIFICATIONS_FROM || 'Carkijker <info@carkijker.nl>';

const REPO = process.env.GITHUB_REPOSITORY || 'onbekend';
const RUN_ID = process.env.GITHUB_RUN_ID || '';
const RUN_NUMBER = process.env.GITHUB_RUN_NUMBER || '?';
const SERVER_URL = process.env.GITHUB_SERVER_URL || 'https://github.com';
const WORKFLOW = process.env.GITHUB_WORKFLOW || 'scrape.yml';
const RUN_URL = RUN_ID ? (SERVER_URL + '/' + REPO + '/actions/runs/' + RUN_ID) : null;

if (!RESEND_API_KEY || !ALERT_EMAIL) {
  console.log('Failure-alert overgeslagen: RESEND_API_KEY / ALERT_EMAIL nog niet (volledig) geconfigureerd als secret.');
  process.exit(0);
}

async function main() {
  const onderwerp = '⚠️ Carkijker: scrape-workflow #' + RUN_NUMBER + ' gefaald';
  const html =
    '<p>De workflow <strong>' + WORKFLOW + '</strong> (run #' + RUN_NUMBER + ') op <code>' + REPO + '</code> is zojuist als <strong>mislukt</strong> afgerond.</p>' +
    (RUN_URL ? '<p><a href="' + RUN_URL + '">Bekijk de volledige run-log op GitHub &rarr;</a></p>' : '') +
    '<p>Dit betekent meestal dat data/occasions op main sinds deze run niet meer zijn bijgewerkt totdat het probleem is opgelost.</p>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [ALERT_EMAIL], subject: onderwerp, html: html }),
  });
  if (!res.ok) {
    // Bewust geen throw/exit 1: de workflow is al mislukt, dit script mag
    // dat niet "overschrijven" met een eigen (mogelijk verwarrende) fout.
    console.error('Kon geen failure-alert versturen via Resend: ' + res.status + ' ' + (await res.text()).slice(0, 300));
    return;
  }
  console.log('Failure-alert verstuurd naar ' + ALERT_EMAIL + ' voor run #' + RUN_NUMBER + '.');
}

main().catch(function(err) {
  console.error('Onverwachte fout in send-failure-alert.js: ' + (err && err.message));
});
