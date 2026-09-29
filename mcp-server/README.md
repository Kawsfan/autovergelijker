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
2. Projectnaam: alleen kleine letters/cijfers/streepjes (bijv. `carkijker-mcp`).
3. Build command: leeg laten. Deploy command:
   `npx wrangler deploy --config mcp-server/wrangler.toml`
   (root directory kan op `/` blijven staan -- de `--config`-vlag wijst
   wrangler direct naar de juiste map, ongeacht vanuit welke directory
   Cloudflare het commando uitvoert).
4. **Zet preview-builds uit.** Er is een aparte "Previews Base"-tab in
   Settings → Builds met een eigen "Preview command", die Cloudflare
   voor PR-/niet-productie-branches gebruikt i.p.v. het production
   deploy-commando. De default daarvan is het verouderde `npx wrangler
   preview` (vereist een `previews`-blok dat wij niet hebben), en dat
   veld overschrijven bleek niet te werken: zelfs na aanpassen en
   meerdere verse builds bleef Cloudflare het oude commando draaien --
   dus een echte fix van dat veld lukte niet vanuit deze sessie. Omdat
   deze Worker geen zinvolle per-PR-preview nodig heeft (stateless API,
   geen UI om te bekijken), is de pragmatische oplossing: zet de toggle
   **"Builds for Preview branches"** (bovenaan diezelfde "Previews
   Base"-tab) gewoon **uit**. Dan probeert Cloudflare niet meer te
   bouwen bij een PR-push, en verdwijnt de storende "Workers Builds:
   carkijker-mcp"-check op elke PR in deze repo -- productie-deploys via
   `main` (stap 3 hierboven) blijven onveranderd werken.
5. Na de eerste deploy krijg je een `*.workers.dev`-URL. Optioneel: koppel er
   een custom domain aan (bijv. `mcp.carkijker.nl`) via **Settings → Domains
   & Routes** op het nieuwe Worker-project.
6. Test de live endpoint, bijv.:
   ```bash
   curl -X POST https://<jouw-worker-url>/ \
     -H 'Content-Type: application/json' \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   ```

Zodra dit live staat: laat het weten, dan voeg ik de endpoint-URL toe aan
`/voor-agents/` en `llms.txt` zodat agents 'm ook daadwerkelijk vinden.
