// mcp-server/src/ask-logica.js
// Pure orchestratie-logica voor de publieke AI-zoekassistent (/ask op de
// carkijker-mcp Worker, Route B: "vraag het in gewone taal" voor bezoekers
// van carkijker.nl, naast de MCP-tools die al voor AI-agents bestaan).
// Bewust zonder fetch/Anthropic SDK/Workers-runtime, zodat dit met
// `node --test` te testen is zonder netwerk -- zie ask-logica.test.js.
// anthropicCall en toolCall worden als functies meegegeven (dependency
// injection) i.p.v. hier geimporteerd, zodat de orchestratie-stappen
// (wanneer stoppen, wat met een tool_use-blok te doen) los getest kunnen
// worden van de echte Anthropic Messages API en de echte tool-uitvoering.
'use strict';

var MAX_TOOL_ITERATIES = 4;
var MAX_VRAAG_LENGTE = 500;

var SYSTEEM_PROMPT =
  'Je bent de Carkijker-zoekassistent. Je helpt Nederlandse bezoekers van carkijker.nl een ' +
  'tweedehands auto vinden via natuurlijke taal, met de beschikbare tools. Regels: ' +
  '1) Gebruik ALTIJD search_listings om auto’s te vinden -- verzin nooit zelf advertenties, ' +
  'prijzen of kenmerken. ' +
  '2) Antwoord kort en concreet in het Nederlands, maximaal een paar zinnen toelichting. ' +
  '3) Noem bij een aanbevolen auto altijd dat de bezoeker de originele advertentie bij de bron ' +
  'kan bekijken (de resultaten-kaarten tonen die link al, dus herhaal de url niet letterlijk in de tekst). ' +
  '4) Carkijker is een vergelijker, geen verkoper -- presenteer jezelf nooit als de aanbieder van de auto. ' +
  '5) Levert een zoekopdracht niets concreets op? Zeg dat eerlijk i.p.v. iets te verzinnen.';

// valideerVraag: enige validatie die ook zonder Anthropic-call nuttig is --
// voorkomt dat een lege, kapotte of absurd lange request de duurdere
// AI-call ooit bereikt.
function valideerVraag(vraag) {
  if (typeof vraag !== 'string') {
    return { ok: false, error: 'Het veld "vraag" ontbreekt of is geen tekst.' };
  }
  var schoon = vraag.trim();
  if (!schoon) return { ok: false, error: 'Vraag is leeg.' };
  if (schoon.length > MAX_VRAAG_LENGTE) {
    return { ok: false, error: 'Vraag is te lang (max ' + MAX_VRAAG_LENGTE + ' tekens).' };
  }
  return { ok: true, vraag: schoon };
}

// voerAskLoop: het "agentic tool-use"-gesprek met Claude. Stopt zodra een
// antwoord zonder tool_use-blokken terugkomt, of na MAX_TOOL_ITERATIES
// rondes (voorkomt een oneindige/kostbare loop als het model blijft
// doorzoeken zonder ooit een eindantwoord te geven).
async function voerAskLoop(vraag, anthropicCall, toolCall, toolDefs) {
  var berichten = [{ role: 'user', content: vraag }];
  var laatsteZoekresultaat = null;

  for (var i = 0; i < MAX_TOOL_ITERATIES; i++) {
    var response = await anthropicCall(berichten, toolDefs);
    var inhoud = response.content || [];
    var toolUses = inhoud.filter(function (b) { return b.type === 'tool_use'; });

    if (!toolUses.length) {
      var tekstBlok = inhoud.find(function (b) { return b.type === 'text'; });
      return { antwoord: tekstBlok ? tekstBlok.text : '', resultaten: laatsteZoekresultaat };
    }

    berichten.push({ role: 'assistant', content: inhoud });
    var toolResults = [];
    for (var j = 0; j < toolUses.length; j++) {
      var tu = toolUses[j];
      var uitkomst = await toolCall(tu.name, tu.input);
      if (tu.name === 'search_listings' && uitkomst.ok) {
        laatsteZoekresultaat = uitkomst.data.resultaten;
      }
      toolResults.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: JSON.stringify(uitkomst.ok ? uitkomst.data : { error: uitkomst.error }),
        is_error: !uitkomst.ok,
      });
    }
    berichten.push({ role: 'user', content: toolResults });
  }

  return {
    antwoord: 'Kon binnen het aantal zoekstappen geen eenduidig antwoord vinden. ' +
      'Probeer je vraag specifieker te stellen (bijv. met merk, prijs of bouwjaar).',
    resultaten: laatsteZoekresultaat,
  };
}

module.exports = {
  SYSTEEM_PROMPT: SYSTEEM_PROMPT,
  MAX_TOOL_ITERATIES: MAX_TOOL_ITERATIES,
  MAX_VRAAG_LENGTE: MAX_VRAAG_LENGTE,
  valideerVraag: valideerVraag,
  voerAskLoop: voerAskLoop,
};
