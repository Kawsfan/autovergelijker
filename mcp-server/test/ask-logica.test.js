// mcp-server/test/ask-logica.test.js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ask = require('../src/ask-logica.js');

test('valideerVraag -- ontbrekend/leeg/te lang/geldig', () => {
  assert.equal(ask.valideerVraag(undefined).ok, false);
  assert.equal(ask.valideerVraag(123).ok, false);
  assert.equal(ask.valideerVraag('   ').ok, false);
  assert.equal(ask.valideerVraag('a'.repeat(ask.MAX_VRAAG_LENGTE + 1)).ok, false);

  var r = ask.valideerVraag('  Golf onder de 10000 euro  ');
  assert.equal(r.ok, true);
  assert.equal(r.vraag, 'Golf onder de 10000 euro');
});

test('voerAskLoop -- direct tekstantwoord zonder tool-gebruik', async () => {
  var anthropicCall = async () => ({ content: [{ type: 'text', text: 'Hoi, waarmee kan ik helpen?' }] });
  var toolCall = async () => { throw new Error('toolCall mag hier niet aangeroepen worden'); };

  var r = await ask.voerAskLoop('hoi', anthropicCall, toolCall, []);
  assert.equal(r.antwoord, 'Hoi, waarmee kan ik helpen?');
  assert.equal(r.resultaten, null);
});

test('voerAskLoop -- een tool-call ronde (search_listings), dan eindantwoord', async () => {
  var call = 0;
  var anthropicCall = async (berichten) => {
    call++;
    if (call === 1) {
      assert.deepEqual(berichten, [{ role: 'user', content: 'goedkope vw golf' }]);
      return {
        content: [{ type: 'tool_use', id: 'tu_1', name: 'search_listings', input: { merk: 'Volkswagen', model: 'Golf' } }],
      };
    }
    // Tweede ronde: de tool_result moet nu in de berichten staan.
    assert.equal(berichten.length, 3);
    assert.equal(berichten[2].content[0].tool_use_id, 'tu_1');
    return { content: [{ type: 'text', text: 'Hier zijn een paar Volkswagen Golfs.' }] };
  };
  var toolCall = async (naam, args) => {
    assert.equal(naam, 'search_listings');
    assert.deepEqual(args, { merk: 'Volkswagen', model: 'Golf' });
    return { ok: true, data: { totaalGevonden: 1, resultaten: [{ titel: 'VW Golf 1.4 TSI' }] } };
  };

  var r = await ask.voerAskLoop('goedkope vw golf', anthropicCall, toolCall, []);
  assert.equal(r.antwoord, 'Hier zijn een paar Volkswagen Golfs.');
  assert.deepEqual(r.resultaten, [{ titel: 'VW Golf 1.4 TSI' }]);
});

test('voerAskLoop -- mislukte tool-call wordt als is_error teruggegeven, geen crash', async () => {
  var call = 0;
  var anthropicCall = async () => {
    call++;
    if (call === 1) {
      return { content: [{ type: 'tool_use', id: 'tu_1', name: 'get_market_stats', input: { merk: 'Onbekendmerk' } }] };
    }
    return { content: [{ type: 'text', text: 'Daar heb ik geen marktdata voor.' }] };
  };
  var toolCall = async () => ({ ok: false, error: 'Geen marktdata gevonden.' });

  var r = await ask.voerAskLoop('stats voor onbekendmerk', anthropicCall, toolCall, []);
  assert.equal(r.antwoord, 'Daar heb ik geen marktdata voor.');
  assert.equal(r.resultaten, null);
});

test('voerAskLoop -- stopt na MAX_TOOL_ITERATIES met een eerlijke fallback', async () => {
  var pogingen = 0;
  var anthropicCall = async () => {
    pogingen++;
    return { content: [{ type: 'tool_use', id: 'tu_' + pogingen, name: 'search_listings', input: {} }] };
  };
  var toolCall = async () => ({ ok: true, data: { totaalGevonden: 0, resultaten: [] } });

  var r = await ask.voerAskLoop('blijf maar zoeken', anthropicCall, toolCall, []);
  assert.equal(pogingen, ask.MAX_TOOL_ITERATIES);
  assert.match(r.antwoord, /zoekstappen/);
  assert.deepEqual(r.resultaten, []);
});
