// lib/dealscore.js
// De dealscore-rekenmethode (v2: regressie op bouwjaar+km binnen merk+model),
// verplaatst uit scrape.js zodat de kern van het rekenwerk apart getest kan
// worden -- dit is het meest risicovolle stukje logica in de hele codebase
// (het bepaalt het getal dat elke bezoeker als "goede deal" te zien krijgt)
// en had tot nu toe geen enkele test. Zie artikelen/dealscore-uitgelegd voor
// de publieksuitleg en test/dealscore.test.js voor de tests.
//
// Node-only (require() vanuit scrape.js) -- deze wiskunde hoeft niet naar de
// browser, in tegenstelling tot lib/carkijker-core.js.
'use strict';

const BEKENDE_MERKEN = ['Tesla','BMW','Mercedes','Audi','Volkswagen','VW','Ford','Toyota','Renault','Peugeot','Opel','Kia','Hyundai','Volvo','Seat','Skoda','Nissan','Honda','Mazda','Dacia','Porsche','Fiat'];

// Fallback-merk-/modelherkenning uit de titel, voor listings zonder schoon
// merk/model-veld (zie groepKey()).
function extraheerMerkUitTitel(titel) {
  const s = (titel || '').toLowerCase();
  for (const m of BEKENDE_MERKEN) if (s.startsWith(m.toLowerCase())) return m.toLowerCase();
  return s.split(' ')[0];
}
function extraheerModelUitTitel(titel) {
  return ((titel || '').split(' ').slice(1, 3).join(' ')).toLowerCase();
}

// Groepeert bij voorkeur op de schone merk/model-velden (merk ~100%, model
// ~72% van de listings gevuld) i.p.v. uitsluitend een ruwe regex over de
// titel -- dat gaf voorheen te grove/inconsistente groepen omdat
// verschillende schrijfwijzes van dezelfde trim in aparte groepen
// belandden. Titel-parsing blijft fallback voor listings zonder model-veld.
function groepKey(l) {
  return (l.merk || extraheerMerkUitTitel(l.titel) || 'onbekend').toLowerCase() + '|' +
    (l.model ? l.model.toLowerCase() : extraheerModelUitTitel(l.titel));
}

// Gauss-Jordan-eliminatie (partial pivoting) voor het 3x3-stelsel van de
// OLS-regressie prijs = b0 + b1*bouwjaar + b2*log(km+1). Retourneert null
// bij een (bijna) singuliere matrix (bv. alle auto's in de groep exact
// hetzelfde bouwjaar en dezelfde km-stand).
function solveLinear3(A, b) {
  const M = A.map((rij, i) => rij.concat([b[i]]));
  for (let col = 0; col < 3; col++) {
    let piv = col;
    for (let r = col + 1; r < 3; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-9) return null;
    const tmp = M[col]; M[col] = M[piv]; M[piv] = tmp;
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c < 4; c++) M[r][c] -= f * M[col][c];
    }
  }
  return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
}

// Zet een z-score (afwijking t.o.v. de verwachte prijs, in aantal
// standaarddeviaties) om naar een dealscore 0-100. z=0 (precies de
// verwachte prijs) -> 50. Negatiever (goedkoper dan verwacht) -> hogere
// score. Geclipt aan de uiteinden zodat een extreme uitschieter niet buiten
// 0-100 valt.
function scoreVanZ(z) {
  return Math.round(Math.max(0, Math.min(100, ((-z + 3) / 6) * 100)));
}

// Drempel voor de "controleer deze advertentie extra goed"-badge, uitgedrukt
// in aantal (robuuste) standaarddeviaties ONDER de mediaanprijs van de groep
// -- zie berekenRobuusteStatistieken() voor waarom dit NIET dezelfde std is
// als bij de dealScore hierboven. Zo'n extreme afwijking is statistisch
// zeldzaam en een bekend kenmerk van "te mooi om waar te zijn"-fraude bij
// tweedehands auto's. Puur een prikkel om extra goed te kijken, geen
// beschuldiging: sommige van deze advertenties zijn gewoon een unieke
// koopje-vondst.
const VERDACHT_GOEDKOOP_STD_DREMPEL = 4;

function mediaan(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Robuuste mediaan + MAD (median absolute deviation, x1,4826 zodat die onder
// een normale verdeling vergelijkbaar is met een standaarddeviatie) i.p.v.
// gewoon gemiddelde/std. Bewust een APARTE statistiek t.o.v. gModel/gFlat
// hierboven: die twee nemen elke advertentie (dus ook potentiële
// uitschieters/fraudegevallen) mee in de berekening van hun EIGEN
// referentiepunt, waardoor een extreme uitschieter zijn eigen "verwachte
// prijs" en spreiding omhoog trekt en zichzelf zo aan detectie onttrekt
// (bevestigd tijdens het bouwen: een testprijs van 10% van de rest van de
// groep werd zo niet gevlagd). Mediaan/MAD zijn ongevoelig voor een enkele
// extreme uitschieter, waardoor die zichzelf niet kan "verstoppen".
function berekenRobuusteStatistieken(prijzen) {
  const m = mediaan(prijzen);
  const afwijkingen = prijzen.map(p => Math.abs(p - m));
  const mad = mediaan(afwijkingen) * 1.4826;
  return { mediaan: m, mad };
}

// Plat prijs-gemiddelde/std per groep -- fallback voor kleine groepen en
// listings zonder bouwjaar/km-stand.
function berekenGroepStatistieken(prijzen) {
  const gem = prijzen.reduce((a, b) => a + b, 0) / prijzen.length;
  const std = Math.sqrt(prijzen.map(p => (p - gem) ** 2).reduce((a, b) => a + b, 0) / prijzen.length);
  return { gem, std };
}

// OLS-regressiecoëfficiënten (bouwjaar + log(km) -> prijs) voor een set
// listings die allemaal bouwjaar én km-stand hebben. Retourneert null bij
// een singuliere matrix (zie solveLinear3).
function berekenRegressieCoef(items) {
  let n = 0, sJaar = 0, sLogKm = 0, sJaar2 = 0, sLogKm2 = 0, sJaarLogKm = 0, sPrijs = 0, sJaarPrijs = 0, sLogKmPrijs = 0;
  for (const l of items) {
    const j = l.jaar, lk = Math.log(l.km + 1), p = l.prijs;
    n++; sJaar += j; sLogKm += lk; sJaar2 += j * j; sLogKm2 += lk * lk; sJaarLogKm += j * lk;
    sPrijs += p; sJaarPrijs += j * p; sLogKmPrijs += lk * p;
  }
  const coef = solveLinear3(
    [[n, sJaar, sLogKm], [sJaar, sJaar2, sJaarLogKm], [sLogKm, sJaarLogKm, sLogKm2]],
    [sPrijs, sJaarPrijs, sLogKmPrijs]
  );
  if (!coef) return null;
  const [b0, b1, b2] = coef;
  const residuen = items.map(l => l.prijs - (b0 + b1 * l.jaar + b2 * Math.log(l.km + 1)));
  const rStd = Math.sqrt(residuen.reduce((a, r) => a + r * r, 0) / n);
  return { b0, b1, b2, std: rStd };
}

// Berekent en zet dealScore/dealBasis (en, waar zinvol, afschrijvingJaar/
// afschrijvingKm) op elk listing-object in-place -- zelfde gedrag als de
// oorspronkelijke inline versie in scrape.js. Retourneert een klein
// samenvattingsobject, alleen voor logging.
function berekenDealScores(listings) {
  const groepen = {};
  for (const l of listings) {
    if (l.prijs == null) continue;
    (groepen[groepKey(l)] = groepen[groepKey(l)] || []).push(l);
  }

  const gModel = {};    // regressiecoëfficiënten + residu-std per groep (bouwjaar+km-gecorrigeerd)
  const gFlat = {};     // plat prijs-gemiddelde/std per groep
  const gRobuust = {};  // mediaan/MAD per groep, uitsluitend voor de verdachtGoedkoop-badge

  for (const [key, items] of Object.entries(groepen)) {
    const prijzen = items.map(l => l.prijs);
    if (prijzen.length >= 3) gFlat[key] = berekenGroepStatistieken(prijzen);
    // Minimaal 5 prijzen voor een enigszins stabiele mediaan/MAD -- kleinere
    // groepen slaan de verdachtGoedkoop-check simpelweg over (geen crash,
    // geen valse positieven op een groep van 3-4 auto's).
    if (prijzen.length >= 5) gRobuust[key] = berekenRobuusteStatistieken(prijzen);

    // Regressie heeft genoeg vrijheidsgraden nodig om betrouwbaar te zijn (3
    // parameters) -- onder de 8 complete datapunten vertrouwen we 'm niet en
    // valt de groep terug op het platte gemiddelde hierboven.
    const compleet = items.filter(l => l.jaar != null && l.km != null);
    if (compleet.length < 8) continue;
    const coef = berekenRegressieCoef(compleet);
    if (coef && coef.std >= 200) gModel[key] = coef;
  }

  let regressie = 0, groepScore = 0, onbekend = 0;
  for (const l of listings) {
    if (l.prijs == null) { l.dealScore = 50; l.dealBasis = 'onbekend'; onbekend++; continue; }
    const key = groepKey(l);

    // Los van dealScore/dealBasis hieronder: de verdachtGoedkoop-badge werkt
    // uitsluitend op prijs (geen bouwjaar/km nodig) en op de robuuste
    // mediaan/MAD, dus ook advertenties zonder regressie-/groepsmodel (bv.
    // ontbrekend bouwjaar) kunnen 'm krijgen.
    const r = gRobuust[key];
    if (r && r.mad > 0 && l.prijs <= r.mediaan - VERDACHT_GOEDKOOP_STD_DREMPEL * r.mad) l.verdachtGoedkoop = true;

    const m = gModel[key];
    if (m && l.jaar != null && l.km != null) {
      const verwacht = m.b0 + m.b1 * l.jaar + m.b2 * Math.log(l.km + 1);
      const z = (l.prijs - verwacht) / m.std;
      l.dealScore = scoreVanZ(z);
      l.dealBasis = 'regressie';
      regressie++;
      // Afschrijvingscurve: dezelfde regressiecoëfficiënten die net de
      // verwachte prijs opleverden, hergebruikt om uit te drukken hoeveel
      // een auto van dit merk+model gemiddeld verliest per jaar (b1) en per
      // verdubbeling van de km-stand (b2, via Math.LN2). Alleen tonen als
      // het teken klopt (jonger/minder km -> duurder) -- een omgekeerd
      // teken duidt op een te ruizige/afwijkende groep (bv. youngtimers die
      // juist in waarde stijgen) waar deze simpele uitleg niet op past.
      if (m.b1 > 0) l.afschrijvingJaar = Math.round(m.b1);
      const kmVerlies = -m.b2 * Math.LN2;
      if (kmVerlies > 0) l.afschrijvingKm = Math.round(kmVerlies);
      continue;
    }
    const s = gFlat[key];
    if (!s || s.std < 200) { l.dealScore = 50; l.dealBasis = 'onbekend'; onbekend++; continue; }
    const z = (l.prijs - s.gem) / s.std;
    l.dealScore = scoreVanZ(z);
    l.dealBasis = 'groep';
    groepScore++;
  }

  return { regressie, groepScore, onbekend };
}

module.exports = {
  extraheerMerkUitTitel,
  extraheerModelUitTitel,
  groepKey,
  solveLinear3,
  scoreVanZ,
  berekenGroepStatistieken,
  berekenRegressieCoef,
  mediaan,
  berekenRobuusteStatistieken,
  berekenDealScores,
  VERDACHT_GOEDKOOP_STD_DREMPEL,
};
