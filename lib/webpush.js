// lib/webpush.js
// Zelfgebouwde, dependency-vrije implementatie van Web Push (RFC 8291
// payload-encryptie + RFC 8292 VAPID) -- in lijn met de rest van dit project
// (0 dependencies, zie het ontbreken van een package.json). Geen npm
// "web-push"-package nodig: alles hieronder is te bouwen met Node's
// ingebouwde crypto-module (ECDH, HKDF, AES-128-GCM, ECDSA).
//
// Gebruikt door scripts/send-notifications.js om favorieten-prijsdalingen en
// nieuwe zoekagent-matches ook als browser-pushmelding te versturen (naast
// de bestaande e-maildigest), aan gebruikers die daarvoor hebben ingelogd en
// pushmeldingen hebben ingeschakeld (zie index.html, tabel
// push_subscriptions in supabase/schema.sql).
'use strict';

const crypto = require('crypto');

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64urlToBuffer(str) {
  str = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

// Genereert een nieuw VAPID-sleutelpaar (ECDSA P-256). publicKey is de
// ongecomprimeerde EC-punt-representatie (65 bytes: 0x04 || x || y),
// privateKey de rauwe 32-byte scalar 'd' -- allebei base64url, hetzelfde
// formaat als de npm "web-push"-package gebruikt (zodat bestaande
// documentatie/tools over VAPID-sleutels ook hier van toepassing blijven).
// Alleen bedoeld om ÉÉN keer te draaien (zie scripts/generate-vapid-keys.js)
// -- het resultaat wordt als GitHub Actions-secret opgeslagen, niet
// gecommit.
function generateVapidKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pubJwk = publicKey.export({ format: 'jwk' });
  const privJwk = privateKey.export({ format: 'jwk' });
  const pubPoint = Buffer.concat([Buffer.from([0x04]), base64urlToBuffer(pubJwk.x), base64urlToBuffer(pubJwk.y)]);
  return {
    publicKey: base64url(pubPoint),
    privateKey: base64url(base64urlToBuffer(privJwk.d)),
  };
}

// Herbouwt een ondertekenbaar privé-sleutelobject uit de opgeslagen
// publicKey (bevat x/y) + privateKey (d) -- crypto.sign() heeft een volledig
// JWK-sleutelobject nodig, niet los een scalar.
function _vapidPrivateKeyObject(publicKeyB64, privateKeyB64) {
  const point = base64urlToBuffer(publicKeyB64);
  const x = point.slice(1, 33), y = point.slice(33, 65);
  const d = base64urlToBuffer(privateKeyB64);
  const jwk = { kty: 'EC', crv: 'P-256', x: base64url(x), y: base64url(y), d: base64url(d) };
  return crypto.createPrivateKey({ key: jwk, format: 'jwk' });
}

// Bouwt en ondertekent een VAPID-JWT (RFC 8292): een ES256-JWT met 'aud'
// (de origin van de push-service, bv. https://fcm.googleapis.com) en 'sub'
// (een mailto:-adres of URL waarop de push-service je kan bereiken bij
// misbruik). dsaEncoding:'ieee-p1363' is essentieel -- crypto.sign() geeft
// bij EC-sleutels standaard een DER-ge-encodeerde ASN.1-signature, maar JWS/
// ES256 verwacht de rauwe r||s-representatie (64 bytes: elk 32 bytes).
function buildVapidJwt(audience, subject, publicKeyB64, privateKeyB64) {
  const header = { typ: 'JWT', alg: 'ES256' };
  const claims = { aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject };
  const signingInput = base64url(Buffer.from(JSON.stringify(header))) + '.' + base64url(Buffer.from(JSON.stringify(claims)));
  const key = _vapidPrivateKeyObject(publicKeyB64, privateKeyB64);
  const sig = crypto.sign('sha256', Buffer.from(signingInput), { key: key, dsaEncoding: 'ieee-p1363' });
  return signingInput + '.' + base64url(sig);
}

// Versleutelt een payload voor één push-abonnement volgens RFC 8291
// ("aes128gcm" content-encoding), met een verse ephemeral ECDH-sleutel per
// bericht (zoals de RFC vereist -- nooit hergebruiken tussen berichten).
// p256dhB64/authB64 komen rechtstreeks van de browser's
// PushSubscription.toJSON().keys (zie index.html).
//
// Twee-staps HKDF, exact zoals RFC 8291 par. 3.3-3.4 voorschrijft:
//   1. ikm = HKDF(salt=auth_secret, ikm=ecdh_shared_secret, info=key_info, 32)
//   2. cek/nonce = HKDF(salt=salt16, ikm=ikm, info=<eigen label>, 16/12)
// Node's crypto.hkdfSync() doet zelf al extract+expand in één aanroep; om
// stap 2 twee keer (voor cek én nonce) met dezelfde onderliggende PRK maar
// verschillende 'info' te kunnen doen, roepen we 'm simpelweg twee keer aan
// met hetzelfde (salt, ikm) -- de extract-stap is een zuivere functie van
// (salt, ikm) en levert dus allebei de keren dezelfde PRK op, alleen de
// info-afhankelijke expand-uitkomst verschilt. Zie test/webpush.test.js voor
// een onafhankelijke decrypt-round-trip die dit verifieert.
function encryptPayload(p256dhB64, authB64, payloadBuf) {
  const uaPublic = base64urlToBuffer(p256dhB64); // 65 bytes, de browser's publieke sleutel
  const authSecret = base64urlToBuffer(authB64); // 16 bytes

  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const asPublic = ecdh.getPublicKey(); // onze (server-)ephemeral publieke sleutel, 65 bytes
  const sharedSecret = ecdh.computeSecret(uaPublic);

  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0', 'ascii'), uaPublic, asPublic]);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', sharedSecret, authSecret, keyInfo, 32));

  const salt = crypto.randomBytes(16);
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0', 'ascii'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0', 'ascii'), 12));

  // Delimiter-octet 0x02 na de plaintext (RFC 8188 par. 2) -- geen padding
  // nodig voor deze korte, vast-formaat meldingen.
  const record = Buffer.concat([payloadBuf, Buffer.from([0x02])]);
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const ciphertext = Buffer.concat([cipher.update(record), cipher.final(), cipher.getAuthTag()]);

  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(ciphertext.length, 0);
  const header = Buffer.concat([salt, recordSize, Buffer.from([asPublic.length]), asPublic]);
  return Buffer.concat([header, ciphertext]);
}

// Verstuurt één pushmelding naar één abonnement. Gooit nooit zelf (de caller
// beslist wat te doen met een niet-ok response, zie
// scripts/send-notifications.js -- een 404/410 betekent "abonnement niet
// meer geldig", en moet de rij in push_subscriptions laten verwijderen).
async function sendWebPush(subscription, payloadObj, vapidKeys, subject) {
  const audience = new URL(subscription.endpoint).origin;
  const jwt = buildVapidJwt(audience, subject, vapidKeys.publicKey, vapidKeys.privateKey);
  const body = encryptPayload(subscription.p256dh, subscription.auth, Buffer.from(JSON.stringify(payloadObj), 'utf8'));
  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
      Authorization: 'vapid t=' + jwt + ', k=' + vapidKeys.publicKey,
    },
    body: body,
  });
}

module.exports = {
  generateVapidKeys: generateVapidKeys,
  buildVapidJwt: buildVapidJwt,
  encryptPayload: encryptPayload,
  sendWebPush: sendWebPush,
  base64url: base64url,
  base64urlToBuffer: base64urlToBuffer,
};
