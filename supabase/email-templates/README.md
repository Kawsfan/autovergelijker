# Carkijker -- Supabase e-mailtemplates

Twee kant-en-klare, Carkijker-gestijlde e-mailtemplates voor Supabase Auth,
passend bij de nieuwe e-mail+wachtwoord-inlogflow (`index.html` /
`inloggen/index.html`).

- `confirm-signup.html` -- verstuurd na registreren, om het e-mailadres te bevestigen.
- `reset-password.html` -- verstuurd na "Wachtwoord vergeten?", met de resetlink.

## Installeren in Supabase

1. Ga naar het Supabase-dashboard van het project (`xbuznnkrkfdsjyjkarjo`) →
   **Authentication → Emails → Templates**.
2. Open **Confirm signup**, plak de inhoud van `confirm-signup.html` in het
   "Message body"-veld (HTML-editor) en zet als **Subject**:
   `Bevestig je Carkijker-account`.
3. Open **Reset Password**, plak de inhoud van `reset-password.html` erin en
   zet als **Subject**: `Wachtwoord opnieuw instellen -- Carkijker`.
4. Klik telkens op **Save**.

De templates gebruiken alleen `{{ .ConfirmationURL }}` -- Supabase's
ingebouwde template-variabele die automatisch verwijst naar de juiste actie
(bevestigen resp. wachtwoord resetten) en die al rekening houdt met de
redirect-URL die de code meegeeft (`emailRedirectTo` / `redirectTo`).

## Ontwerp

- Table-based HTML (geen flexbox/grid) en alle CSS inline, zodat de mail er
  ook goed uitziet in Outlook/Gmail e.d. -- moderne CSS wordt door veel
  e-mailclients genegeerd of geeft rendering-problemen.
- Zelfde huisstijl als de rest van de site: donkere header met het
  "Car**kijker**"-wordmark (Car in oranje `#e8703f`, kijker in wit), oranje
  primaire knop (`#d14413`), kaart met afgeronde hoeken op een lichte
  achtergrond (`#f5f5f0`).
- Duidelijke uitleg + een "negeer deze e-mail als je dit niet was"-regel in
  de footer, voor het geval iemand per ongeluk een e-mailadres invult dat
  niet van hen is.

## Overige templates (optioneel, niet meegeleverd)

De **Magic Link**-template wordt door de site niet meer gebruikt (vervangen
door e-mail+wachtwoord) en hoeft dus niet aangepast te worden -- de
standaard-Supabase-versie blijft daar gewoon staan, tenzij je magic-link
later weer inschakelt.
