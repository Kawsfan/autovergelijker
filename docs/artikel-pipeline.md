# Artikel-pipeline: 3 SEO/GEO-artikelen per week, met eindredactie

```
docs/artikel-planning.json ──► artikel-concept.yml (ma/wo/vr 05:17 UTC)
                                 │  marktdata.js     live cijfers uit data/listings-lean-*.json
                                 │  genereer-concept Claude schrijft volgens docs/seo-geo-artikel-template.md
                                 │  check-artikel    template + huisstijl, 1 automatische herstelronde
                                 ▼
                         PR "Artikelconcept: …"  (label artikel-concept, branch artikel/<slug>)
                                 │  deploy-preview + verificatielijst + marktdata-snapshot
                                 ▼
                     EINDREDACTIE  ── merge = publiceren
                                   ── bewerken in de PR = opnieuw gecheckt door PR-validatie
                                   ── sluiten zonder merge = afgewezen (onderwerp komt niet terug)
                                 ▼
                         artikel-publiceren.yml
                            publicatiedatum = merge-dag, index/sitemap/llms.txt, IndexNow
```

## Eenmalige setup

1. Repo-secret `ANTHROPIC_API_KEY` toevoegen (Settings → Secrets and variables → Actions).
2. Settings → Actions → General → **"Allow GitHub Actions to create and approve pull requests"** aanzetten.
3. Eerste run handmatig starten: Actions → *Artikelconcept (SEO/GEO)* → Run workflow.

## Wekelijks ritme

- Maandag, woensdag en vrijdag komt er een concept-PR. Gepland op 05:17 UTC, maar GitHub start
  geplande runs in de praktijk uren later (gezien: 7-8 uur), dus reken op de middag.
- Je krijgt per concept een mail (Resend, naar `ALERT_EMAIL`) met titel, intro, preview- en
  PR-link, en een review-aanvraag op GitHub. PR's van de Actions-bot geven anders geen melding.
- Staan er al 3 concepten onbeoordeeld open, dan slaat de run over. Zo stapelt de wachtrij niet op.
- Review per concept: ±10-15 minuten. Werk de verificatielijst in de PR-body af, check de preview en merge.

## Onderwerpen beheren

`docs/artikel-planning.json`: volgorde = prioriteit. De workflow pakt het eerste onderwerp zonder
`data/artikelen/<slug>.json` en zonder `artikel/<slug>`-branch. Vul aan wanneer er minder dan ~6 open staan
(= 2 weken buffer).

Typen:
- `modelgids`: één model, cijfers per bouwjaar (bv. tweedehands Golf kopen)
- `segmentlijst`: alleen filters, marktdata.js kiest de meest aangeboden modellen (bv. EV onder €20.000)
- `informatief`: algemene vraag met marktbrede cijfers als onderbouwing (bv. kilometerstand)

**Ervaringsverhalen (template §4) horen niet in de planning.** Een AI-concept zou de ervaring verzinnen.
Die schrijft een mens en gaan via een gewone PR, waar dezelfde formatcheck op draait.

## Handig

- Concept opnieuw laten schrijven: Run workflow met de slug ingevuld (overschrijft de branch).
- Afgewezen onderwerp toch opnieuw: verwijder de branch `artikel/<slug>`.
- Lokaal de prompt + marktdata bekijken zonder API-call:
  `node scripts/artikelen/genereer-concept.js --droog [--slug <slug>]`
- Een artikel handmatig checken: `node scripts/artikelen/check-artikel.js data/artikelen/<slug>.json`

## Wat de automatische check wel en niet afdwingt

Fout (blokkeert): ontbrekende velden, intro >90 woorden of met opwarmer, vage H2's, `<h1>/<h2>` in
sectie-HTML, <3 FAQ's, em-dash, verboden woorden (ontdek, uniek, revolutie, must-have, in dit artikel, …),
geen /occasions/-link, interne link naar een niet-bestaande pagina.

Waarschuwing (in de PR-body): lengte titel/meta/intro/artikel, >3 zinnen in de intro, geen cijfer in de intro.

Signaal (in de PR-body, sectie "Mogelijk andere modellen onder één modelnaam"): titelwoorden direct na de
modelnaam met een duidelijk afwijkende prijs, zoals "Yaris Cross" onder Yaris. Is het een ander model, voeg het
toe aan `VARIANTEN` in `scripts/artikelen/marktdata.js` en genereer het concept opnieuw (Run workflow met slug).
Het is een hint: Range Rover Sport en Golf Sportsvan had hij bijvoorbeeld niet gevonden.

Niet te automatiseren, dus aan de eindredactie: kloppen de cijfers en technische claims, en zit er een
echt onderscheidend inzicht in (template §5 "Expertise laten zien").
