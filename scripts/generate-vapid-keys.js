#!/usr/bin/env node
// scripts/generate-vapid-keys.js
// Eenmalig (of bij een sleutelwissel) lokaal draaien: node scripts/generate-vapid-keys.js
// Print een nieuw VAPID-sleutelpaar voor browser-pushmeldingen. De publieke
// sleutel gaat als window.VAPID_PUBLIC_KEY in index.html (<head>, veilig om
// te committen -- net als de Supabase anon-key), de privésleutel als
// VAPID_PRIVATE_KEY GitHub Actions-secret (NOOIT committen). Zie
// lib/webpush.js voor hoe beide gebruikt worden.
//
// Een nieuw sleutelpaar genereren maakt alle bestaande pushabonnementen
// ongeldig (de browser heeft ze afgesloten tegen de oude publieke sleutel) --
// bestaande gebruikers moeten dan opnieuw op "Pushmeldingen inschakelen"
// klikken. Alleen doen bij een (vermoede) sleutel-compromittering, niet
// routinematig.

const { generateVapidKeys } = require('../lib/webpush');

const keys = generateVapidKeys();
console.log('Nieuw VAPID-sleutelpaar:\n');
console.log('  1. Zet in index.html (<head>, vervang window.VAPID_PUBLIC_KEY):');
console.log('     ' + keys.publicKey);
console.log('\n  2. Zet als GitHub Actions-secret VAPID_PRIVATE_KEY (Settings > Secrets and variables > Actions):');
console.log('     ' + keys.privateKey);
console.log('\nDeze privésleutel wordt nergens anders getoond -- bewaar hem nu, of genereer bij verlies gewoon een nieuw paar.');
