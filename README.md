# Carkijker 🚗

Vergelijk tweedehands auto's uit heel Nederland op één plek. 3x per dag automatisch bijgewerkt vanuit zeven grote advertentiesites.

## Live site

**[carkijker.nl](https://carkijker.nl/)**

## Bronnen

| Bron | Type |
|------|------|
| [Marktplaats](https://www.marktplaats.nl) | Particulier & dealer |
| [Gaspedaal](https://www.gaspedaal.nl) | Dealer |
| [AutoScout24](https://www.autoscout24.nl) | Dealer |
| [AutoTrack](https://www.autotrack.nl) | Dealer |
| [AutoTrader](https://www.autotrader.nl) | Dealer |
| [ViaBovag](https://www.viabovag.nl) | BOVAG-gecertificeerd |
| [AutoWereld](https://www.autowereld.nl) | Dealer |

## Functies

- 🔍 Zoek en filter op merk, model, prijs, kilometerstand, bouwjaar en brandstof
- 🏷️ Gekleurde labels per advertentiesite, en particulier/dealer-badge waar te herleiden
- 📉 Prijshistorie per advertentie, met een apart "prijsverlagingen"-overzicht
- 🕓 "Dagen online"-badge op basis van wanneer een advertentie voor het eerst is gezien
- 🔄 3x per dag automatisch bijgewerkt via GitHub Actions (06:00 / 12:00 / 18:00 UTC)
- ⚡ Razendsnel — geen server, geen database, gewoon statische JSON
- 🗺️ Landingspagina's per merk, model en stad (`/occasions/...`), plus een paar redactionele artikelen (`/artikelen/...`)
- 📊 Dagelijkse gezondheidscheck per bron — de workflow faalt zichtbaar als een bron wegvalt of fors inzakt
- 🔁 Retry-logica: mislukte requests worden tot 3x opnieuw geprobeerd

## Hoe werkt het?

Drie keer per dag draait er een Node.js-scraper op GitHub Actions. Die haalt advertenties op uit de zeven bronnen, genereert de merk/model/stad-landingspagina's en artikelen, en commit alles terug naar `main`. De website laadt de JSON-bestanden direct in — geen server, geen database.

```
GitHub Actions (06:00 / 12:00 / 18:00 UTC, concurrency-guard voorkomt overlap)
    └─ node scripts/scrape.js
    │     ├─ Marktplaats, Gaspedaal, AutoScout24, AutoTrack, AutoTrader, ViaBovag, AutoWereld
    │     ├─ fetchWithRetry (3x backoff bij fouten)
    │     ├─ merge met bestaande data + cutoff (advertenties die >7 dagen niet
    │     │  meer gezien zijn vallen weg)
    │     ├─ data/listings.json       ← actuele advertenties + prijshistorie
    │     ├─ data/listings-top.json   ← lichte selectie voor snelle homepage-load
    │     ├─ data/scrape-report.json  ← aantal nieuwe advertenties per bron, laatste run
    │     └─ data/scrape-health.json  ← dagelijkse tellingen per bron, voor de gezondheidscheck
    ├─ node generate-occasions.js     → occasions/<merk>/<model|stad>/index.html + sitemap.xml
    ├─ node generate-artikelen.js     → artikelen/<slug>/index.html + llms.txt
    ├─ commit + push naar main
    └─ node scripts/check-scrape-health.js
          → faalt de workflow zichtbaar bij een bron die wegvalt of >50% inzakt
            t.o.v. de vorige run, of al 2+ dagen op 0 staat
```

## Techniek

- **Frontend**: Vanilla HTML/CSS/JS — geen frameworks
- **Scraper**: Node.js met `fetch` + exponential backoff retry
- **Hosting**: Cloudflare Workers (static assets) voor productie; Netlify voor PR-deploy-previews
- **CI/CD**: GitHub Actions — dagelijkse scraper + `validate.yml` voor PR-validatie

## Lokaal draaien

```bash
git clone https://github.com/Kawsfan/autovergelijker.git
cd autovergelijker
node scripts/scrape.js          # scraper draaien
node generate-occasions.js      # merk/model/stad-pagina's + sitemap genereren
node generate-artikelen.js      # artikel-pagina's genereren
node scripts/validate.js        # gegenereerde bestanden valideren
# open index.html in je browser
```
