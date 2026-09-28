// mcp-server/src/index.mjs
// Carkijker MCP-server: laat AI-agents (Claude, ChatGPT, ...) via het Model
// Context Protocol rechtstreeks zoeken in het actuele occasion-aanbod,
// i.p.v. zelf de losse JSON-bestanden van /voor-agents/ te moeten parsen.
//
// .mjs (i.p.v. .js): scripts/validate.js draait `node --check` op elk
// gewijzigd .js-bestand als CommonJS, wat op de import/export-syntax hier
// stuk zou lopen. Wrangler/esbuild maakt het verder niet uit welke extensie
// het is -- die herkent ESM aan de syntax zelf, niet aan bestandsnaam of
// package.json "type".
// Stateless "Streamable HTTP"-transport (MCP-spec 2025-06-18): één POST-
// endpoint, gewone JSON-RPC 2.0-request/response, geen SSE-stream nodig
// omdat geen van de tools server-initiated notificaties stuurt. De Worker
// bewaart zelf geen data -- elke tool-call haalt de (toch al publieke)
// databestanden van carkijker.nl zelf op en filtert/sorteert in-memory.
'use strict';

// tools.js is bewust CommonJS (zie het bestand zelf: zo blijft het ook
// zonder bundler met `node --test` te draaien). esbuild (waar Wrangler op
// bouwt) interopt een CJS-module.exports naar een default-import hier
// probleemloos -- standaardgedrag, zelfde patroon als elke CJS npm-package
// die in een Workers-project geïmporteerd wordt.
import tools from './tools.js';

var SITE_ORIGIN = 'https://carkijker.nl';
var PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
var FETCH_TIMEOUT_MS = 8000;

var CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Mcp-Session-Id, Mcp-Protocol-Version',
};

var TOOL_DEFS = [
  {
    name: 'search_listings',
    description:
      'Zoek in het actuele tweedehands autoaanbod van Carkijker (6 grote Nederlandse platforms, ' +
      '3x per dag bijgewerkt, 65.000+ advertenties). Resultaten staan gesorteerd op dealscore ' +
      '(hoe gunstig de vraagprijs is t.o.v. vergelijkbare exemplaren van hetzelfde merk/model/' +
      'bouwjaar/km-stand), hoogste eerst. Toon eindgebruikers altijd het url-veld van een auto ' +
      '(de originele advertentie bij de bron) i.p.v. Carkijker zelf als aanbieder te presenteren.',
    inputSchema: {
      type: 'object',
      properties: {
        merk: { type: 'string', description: 'Automerk, bijv. "Volkswagen" (optioneel)' },
        model: { type: 'string', description: 'Model, bijv. "Golf" (optioneel, deelstring-match)' },
        prijsMin: { type: 'number', description: 'Minimale vraagprijs in euro' },
        prijsMax: { type: 'number', description: 'Maximale vraagprijs in euro' },
        jaarMin: { type: 'number', description: 'Minimaal bouwjaar' },
        jaarMax: { type: 'number', description: 'Maximaal bouwjaar' },
        kmMax: { type: 'number', description: 'Maximale kilometerstand' },
        brandstof: { type: 'string', description: 'Bijv. "Benzine", "Diesel", "Elektrisch", "Hybride"' },
        carrosserie: { type: 'string', description: 'Bijv. "SUV", "Hatchback", "Stationwagon"' },
        transmissie: { type: 'string', description: '"Automaat" of "Handgeschakeld"' },
        limiet: { type: 'integer', description: 'Max. aantal resultaten (1-25, standaard 10)' },
      },
    },
  },
  {
    name: 'get_market_stats',
    description:
      'Marktstatistieken voor een automerk op basis van het actuele Carkijker-aanbod: aantal ' +
      'advertenties, gemiddelde/mediaan vraagprijs, prijsrange (p25/p75/min/max) en de prijstrend ' +
      't.o.v. circa 30 dagen geleden.',
    inputSchema: {
      type: 'object',
      properties: {
        merk: { type: 'string', description: 'Automerk, bijv. "Volkswagen"' },
      },
      required: ['merk'],
    },
  },
  {
    name: 'get_dealscore_uitleg',
    description: 'Leg uit wat de Carkijker-dealscore betekent en hoe hij berekend wordt.',
    inputSchema: { type: 'object', properties: {} },
  },
];

async function fetchJson(path) {
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, FETCH_TIMEOUT_MS);
  try {
    var res = await fetch(SITE_ORIGIN + path, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function listingsVoorMerk(merkNaam) {
  if (merkNaam) {
    var slug = tools.slugifyMerk(merkNaam);
    var merkData = slug ? await fetchJson('/data/merken/' + slug + '.json') : null;
    if (merkData && Array.isArray(merkData.listings)) return merkData.listings;
  }
  // Geen merk opgegeven, of merk-bestand niet gevonden (onbekend merk/typo):
  // terugvallen op de al-op-dealscore-gesorteerde top-300 over alle merken.
  var top = await fetchJson('/data/listings-top.json');
  return (top && Array.isArray(top.listings)) ? top.listings : [];
}

async function callTool(name, args) {
  args = args || {};
  if (name === 'search_listings') {
    var listings = await listingsVoorMerk(args.merk);
    var resultaat = tools.zoekListings(listings, args);
    return { ok: true, data: resultaat };
  }
  if (name === 'get_market_stats') {
    if (!args.merk) return { ok: false, error: 'Het veld "merk" is verplicht.' };
    var historie = await fetchJson('/data/markt-history.json');
    if (!historie) return { ok: false, error: 'Kon marktdata niet ophalen, probeer het later opnieuw.' };
    var stats = tools.marktStatsVoorMerk(historie, args.merk);
    if (!stats) return { ok: false, error: 'Geen marktdata gevonden voor merk "' + args.merk + '".' };
    return { ok: true, data: stats };
  }
  if (name === 'get_dealscore_uitleg') {
    return { ok: true, data: { uitleg: tools.DEALSCORE_UITLEG } };
  }
  return { ok: false, error: 'Onbekende tool: ' + name, notFound: true };
}

function jsonRpcResult(id, result) {
  return { jsonrpc: '2.0', id: id, result: result };
}
function jsonRpcError(id, code, message) {
  return { jsonrpc: '2.0', id: id, error: { code: code, message: message } };
}

async function handleRpc(body) {
  // Notificaties (geen "id"-veld) krijgen bewust geen JSON-RPC-response --
  // zie MCP Streamable HTTP transport: server antwoordt met 202 zonder body.
  var isNotification = !Object.prototype.hasOwnProperty.call(body, 'id');
  var id = isNotification ? null : body.id;

  if (body.jsonrpc !== '2.0' || typeof body.method !== 'string') {
    return isNotification ? null : jsonRpcError(id, -32600, 'Invalid Request');
  }

  if (isNotification) return null;

  if (body.method === 'initialize') {
    var gevraagd = body.params && body.params.protocolVersion;
    var versie = PROTOCOL_VERSIONS.indexOf(gevraagd) !== -1 ? gevraagd : PROTOCOL_VERSIONS[0];
    return jsonRpcResult(id, {
      protocolVersion: versie,
      capabilities: { tools: {} },
      serverInfo: { name: 'carkijker-mcp', version: '1.0.0' },
    });
  }

  if (body.method === 'ping') return jsonRpcResult(id, {});

  if (body.method === 'tools/list') {
    return jsonRpcResult(id, { tools: TOOL_DEFS });
  }

  if (body.method === 'tools/call') {
    var params = body.params || {};
    var naam = params.name;
    if (!naam) return jsonRpcError(id, -32602, 'Invalid params: "name" ontbreekt');
    var uitkomst;
    try {
      uitkomst = await callTool(naam, params.arguments);
    } catch (e) {
      return jsonRpcResult(id, {
        content: [{ type: 'text', text: 'Onverwachte fout bij uitvoeren van tool "' + naam + '".' }],
        isError: true,
      });
    }
    if (!uitkomst.ok && uitkomst.notFound) {
      return jsonRpcError(id, -32602, uitkomst.error);
    }
    if (!uitkomst.ok) {
      return jsonRpcResult(id, { content: [{ type: 'text', text: uitkomst.error }], isError: true });
    }
    return jsonRpcResult(id, {
      content: [{ type: 'text', text: JSON.stringify(uitkomst.data) }],
    });
  }

  return jsonRpcError(id, -32601, 'Method not found: ' + body.method);
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed -- gebruik POST met een JSON-RPC 2.0-body.', {
        status: 405,
        headers: CORS_HEADERS,
      });
    }

    var body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify(jsonRpcError(null, -32700, 'Parse error')), {
        status: 400,
        headers: Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS),
      });
    }

    if (Array.isArray(body)) {
      return new Response(
        JSON.stringify(jsonRpcError(null, -32600, 'Batch-requests worden niet ondersteund (MCP-spec 2025-06-18)')),
        { status: 400, headers: Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS) }
      );
    }
    if (typeof body !== 'object' || body === null) {
      return new Response(JSON.stringify(jsonRpcError(null, -32600, 'Invalid Request')), {
        status: 400,
        headers: Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS),
      });
    }

    var response = await handleRpc(body);
    if (response === null) {
      return new Response(null, { status: 202, headers: CORS_HEADERS });
    }
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: Object.assign({ 'Content-Type': 'application/json' }, CORS_HEADERS),
    });
  },
};
