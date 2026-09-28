# Carkijker MCP-server

Losse Cloudflare Worker die het Model Context Protocol (MCP) praat, zodat AI-agents
(Claude, ChatGPT, ...) rechtstreeks tegen Carkijker's occasion-data kunnen "praten"
i.p.v. zelf de losse JSON-bestanden van [`/voor-agents/`](https://carkijker.nl/voor-agents/)
te moeten parsen.

Geen eigen database of opslag: elke tool-call haalt gewoon de bestaande, publieke
JSON-bestanden van carkijker.nl zelf op (`/data/merken/<merk>.json`,
`/data/listings-top.json`, `/data/markt-history.json`) en filtert/sorteert
server-side in de Worker.

## Tools

| Tool | Wat |
|---|---|
| `search_listings` | Zoek/filter in het actuele aanbod (merk, model, prijs, jaar, km, brandstof, carrosserie, transmissie), gesorteerd op dealscore. |
| `get_market_stats` | Marktstatistieken per merk: gemiddelde/mediaan prijs, prijsrange, trend t.o.v. ~30 dagen terug. |
| `get_dealscore_uitleg` | Uitleg van de dealscore-methodiek. |

## Lokaal draaien / testen

```bash
cd mcp-server
npm install
npm run dev        # start een lokale Worker op http://localhost:8787
```

Pure logica (filteren/sorteren/marktstats, los van de Workers-runtime) heeft
eigen tests die meedraaien met de rest van de repo:

```bash
node --test         # vanuit de repo-root -- pakt ook mcp-server/test/*.test.js op
```

> Deze sessie kon `wrangler` zelf niet installeren (npm-registry geblokkeerd
> in de sandbox), dus een echte `wrangler dev`/`deploy`-run is hier niet
> getest. Doe dat als eerste check voor je live gaat.

## Deployen (Cloudflare-dashboard)

Dit is een **los** Worker-project, niet onderdeel van de bestaande
"Workers Builds: autovergelijker" (die blijft puur de statische site
deployen -- zie `.assetsignore`, die deze map daar nu expliciet van uitsluit).

1. Cloudflare-dashboard → Workers & Pages → **Create** → Workers → verbind met
   deze GitHub-repo (`Kawsfan/autovergelijker`).
2. Zet de **root directory** van dat project op `mcp-server`.
3. Build command: leeg laten (geen build-stap nodig, `wrangler.toml` +
   `src/index.js` is alles). Deploy command: `npx wrangler deploy`.
4. Na de eerste deploy krijg je een `*.workers.dev`-URL. Optioneel: koppel er
   een custom domain aan (bijv. `mcp.carkijker.nl`) via **Settings → Domains
   & Routes** op het nieuwe Worker-project.
5. Test de live endpoint, bijv.:
   ```bash
   curl -X POST https://<jouw-worker-url>/ \
     -H 'Content-Type: application/json' \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   ```

Zodra dit live staat: laat het weten, dan voeg ik de endpoint-URL toe aan
`/voor-agents/` en `llms.txt` zodat agents 'm ook daadwerkelijk vinden.
