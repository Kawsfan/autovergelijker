// test/webpush.test.js
// Draai met: node --test
//
// Er is geen live browser-pushabonnement om lib/webpush.js tegen te testen
// (dat vereist een echte, geregistreerde service worker + push-service), dus
// de kern van deze test is een ONAFHANKELIJK herbouwde decrypt-functie
// (rechtstreeks uit RFC 8291, niet simpelweg encryptPayload() omgekeerd
// gekopieerd) die een payload versleuteld met encryptPayload() weer
// ontsleutelt met een zelf gegenereerd nep-"browser"-sleutelpaar. Als de
// HKDF-afleidingen, info-strings of byte-volgorde in lib/webpush.js ook
// maar één detail van de RFC afwijken, faalt de AES-GCM auth-tag-check hier
// hard -- dat geeft veel meer vertrouwen dan alleen "het commando crasht
// niet".
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const {
  generateVapidKeys, buildVapidJwt, encryptPayload, base64url, base64urlToBuffer,
} = require('../lib/webpush');

// Onafhankelijke ontsleuteling volgens RFC 8291, vanuit het perspectief van
// de "browser" (die het ecdh-privésleutel + auth secret bezit).
function decryptForTest(blob, uaPrivateEcdh, uaPublicBuf, authSecretBuf) {
  const salt = blob.slice(0, 16);
  const recordSize = blob.readUInt32BE(16);
  const idLen = blob.readUInt8(20);
  const asPublic = blob.slice(21, 21 + idLen);
  const ciphertext = blob.slice(21 + idLen);
  assert.equal(ciphertext.length, recordSize, 'recordSize in de header moet exact de ciphertext-lengte zijn (single-record bericht)');

  const sharedSecret = uaPrivateEcdh.computeSecret(asPublic);
  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0', 'ascii'), uaPublicBuf, asPublic]);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', sharedSecret, authSecretBuf, keyInfo, 32));
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0', 'ascii'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0', 'ascii'), 12));

  const tag = ciphertext.slice(ciphertext.length - 16);
  const body = ciphertext.slice(0, ciphertext.length - 16);
  const decipher = crypto.createDecipheriv('aes-128-gcm', cek, nonce);
  decipher.setAuthTag(tag);
  const record = Buffer.concat([decipher.update(body), decipher.final()]);
  // Laatste byte moet het delimiter-octet 0x02 zijn (geen padding gebruikt).
  assert.equal(record[record.length - 1], 0x02);
  return record.slice(0, record.length - 1);
}

function maakNepAbonnement() {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const authSecret = crypto.randomBytes(16);
  return {
    ecdh: ecdh,
    p256dh: base64url(ecdh.getPublicKey()),
    auth: base64url(authSecret),
    authSecretBuf: authSecret,
    publicBuf: ecdh.getPublicKey(),
  };
}

test('encryptPayload -- round-trip ontsleuteling volgens RFC 8291', async (t) => {
  await t.test('een korte JSON-payload komt exact terug na ontsleuteling', () => {
    const sub = maakNepAbonnement();
    const payload = Buffer.from(JSON.stringify({ title: 'Carkijker', body: 'Prijsdaling op je favoriet' }), 'utf8');
    const blob = encryptPayload(sub.p256dh, sub.auth, payload);
    const plain = decryptForTest(blob, sub.ecdh, sub.publicBuf, sub.authSecretBuf);
    assert.deepEqual(JSON.parse(plain.toString('utf8')), { title: 'Carkijker', body: 'Prijsdaling op je favoriet' });
  });

  await t.test('lege payload crasht niet en levert lege string op', () => {
    const sub = maakNepAbonnement();
    const blob = encryptPayload(sub.p256dh, sub.auth, Buffer.from('', 'utf8'));
    const plain = decryptForTest(blob, sub.ecdh, sub.publicBuf, sub.authSecretBuf);
    assert.equal(plain.length, 0);
  });

  await t.test('elke versleuteling gebruikt een verse ephemeral sleutel -- twee aanroepen geven verschillende output voor dezelfde payload', () => {
    const sub = maakNepAbonnement();
    const payload = Buffer.from('zelfde bericht', 'utf8');
    const blobA = encryptPayload(sub.p256dh, sub.auth, payload);
    const blobB = encryptPayload(sub.p256dh, sub.auth, payload);
    assert.notEqual(blobA.toString('hex'), blobB.toString('hex'));
    // Maar allebei moeten nog steeds correct ontsleutelen.
    assert.equal(decryptForTest(blobA, sub.ecdh, sub.publicBuf, sub.authSecretBuf).toString(), 'zelfde bericht');
    assert.equal(decryptForTest(blobB, sub.ecdh, sub.publicBuf, sub.authSecretBuf).toString(), 'zelfde bericht');
  });

  await t.test('ontsleutelen met het verkeerde auth secret faalt (auth-tag-check), levert geen stille foute data op', () => {
    const sub = maakNepAbonnement();
    const anderSub = maakNepAbonnement();
    const blob = encryptPayload(sub.p256dh, sub.auth, Buffer.from('geheim', 'utf8'));
    assert.throws(() => {
      decryptForTest(blob, sub.ecdh, sub.publicBuf, anderSub.authSecretBuf);
    });
  });
});

test('VAPID JWT (buildVapidJwt)', async (t) => {
  await t.test('genereert een geldig ES256-JWT dat verifieert met de bijbehorende publieke sleutel', () => {
    const keys = generateVapidKeys();
    const jwt = buildVapidJwt('https://fcm.googleapis.com', 'mailto:info@carkijker.nl', keys.publicKey, keys.privateKey);
    const delen = jwt.split('.');
    assert.equal(delen.length, 3);

    const header = JSON.parse(base64urlToBuffer(delen[0]).toString('utf8'));
    const claims = JSON.parse(base64urlToBuffer(delen[1]).toString('utf8'));
    assert.equal(header.alg, 'ES256');
    assert.equal(claims.aud, 'https://fcm.googleapis.com');
    assert.equal(claims.sub, 'mailto:info@carkijker.nl');
    assert.ok(claims.exp > Math.floor(Date.now() / 1000));

    // Signature verifiëren met een publieke-sleutel-object opgebouwd uit
    // dezelfde JWK-velden als _vapidPrivateKeyObject() intern gebruikt.
    const point = base64urlToBuffer(keys.publicKey);
    const x = point.slice(1, 33), y = point.slice(33, 65);
    const pubKeyObj = crypto.createPublicKey({
      key: { kty: 'EC', crv: 'P-256', x: base64url(x), y: base64url(y) },
      format: 'jwk',
    });
    const signingInput = delen[0] + '.' + delen[1];
    const sig = base64urlToBuffer(delen[2]);
    const ok = crypto.verify('sha256', Buffer.from(signingInput), { key: pubKeyObj, dsaEncoding: 'ieee-p1363' }, sig);
    assert.equal(ok, true);
  });

  await t.test('twee sleutelparen leveren verschillende, elk zelf-consistente sleutels op', () => {
    const a = generateVapidKeys();
    const b = generateVapidKeys();
    assert.notEqual(a.publicKey, b.publicKey);
    assert.notEqual(a.privateKey, b.privateKey);
  });
});
