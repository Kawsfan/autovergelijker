# AutoVergelijker 🚗

Vergelijk tweedehands auto's uit heel Nederland op één plek. Dagelijks bijgewerkt vanuit vijf grote advertentiesites.

## Live site

**[kawsfan.github.io/autovergelijker](https://kawsfan.github.io/autovergelijker/)**

## Bronnen

| Bron | Type |
|------|------|
| [Marktplaats](https://www.marktplaats.nl) | Particulier & dealer |
| [Gaspedaal](https://www.gaspedaal.nl) | Dealer |
| [AutoTrack](https://www.autotrack.nl) | Dealer |
| [AutoScout24](https://www.autoscout24.nl) | Dealer |
| [ViaBovag](https://www.viabovag.nl) | BOVAG-gecertificeerd |

## Functies

- 🔍 Zoek op merk, model, prijs, kilometerstand, jaar en brandstof
- 🏷️ Gekleurde labels per advertentiesite
- 🔄 Dagelijks bijgewerkt via een automatische scraper (GitHub Actions)
- ⚡ Razendsnel — geen server, geen database, gewoon statische JSON
- 📊 Dagelijks scrape-rapport per bron (via `data/scrape-report.json`)
- 🔁 Retry-logica: mislukte requests worden tot 3x opnieuw geprobeerd

## Hoe werkt het?

Elke nacht draait er een Node.js scraper op GitHub Actions. Die haalt advertenties op uit de vijf bronnen en slaat ze op in `data/cars.json`. De website laadt dit bestand direct in — geen server, geen database.

```
GitHub Actions (dagelijks 06:00 UTC)
    └─ node scripts/scrape.js
         ├─ Marktplaats, Gaspedaal, AutoTrack, AutoScout24, ViaBovag
         ├─ fetchWithRetry (3x backoff bij fouten)
         ├─ data/cars.json  ← advertenties
         └─ data/scrape-report.json  ← statistieken per bron
```

## Techniek

- **Frontend**: Vanilla HTML/CSS/JS — geen frameworks
- **Scraper**: Node.js met fetch + exponential backoff retry
- **Hosting**: GitHub Pages
- **CI/CD**: GitHub Actions

## Lokaal draaien

```bash
git clone https://github.com/Kawsfan/autovergelijker.git
cd autovergelijker
node scripts/scrape.js   # scraper draaien
# open index.html in je browser
```
