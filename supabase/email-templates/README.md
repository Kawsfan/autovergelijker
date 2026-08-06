# Carkijker -- Supabase e-mailtemplates

Kant-en-klare, Carkijker-gestijlde e-mailtemplates voor Supabase Auth.

## Nu al actief gebruikt

Deze twee worden echt verstuurd door de huidige e-mail+wachtwoord-inlogflow
(`index.html` / `inloggen/index.html`) -- plaats ze als eerste:

| Bestand | Supabase-template | Subject-voorstel |
|---|---|---|
| `confirm-signup.html` | Confirm signup | Bevestig je Carkijker-account |
| `reset-password.html` | Reset Password | Wachtwoord opnieuw instellen -- Carkijker |

## Klaargezet voor later (nog niet nodig)

Deze worden door de site op dit moment niet verstuurd -- er is geen functie
die ze triggert. Alvast in dezelfde huisstijl klaargezet, zodat je ze
meteen kunt plakken zodra de bijbehorende functie er komt.

| Bestand | Supabase-template | Subject-voorstel | Wanneer nodig |
|---|---|---|---|
| `magic-link.html` | Magic Link | Je inloglink voor Carkijker | Als magic-link ooit weer wordt ingeschakeld naast/i.p.v. wachtwoord. |
| `invite-user.html` | Invite user | Je bent uitgenodigd voor Carkijker | Als je zelf gebruikers uitnodigt via de Supabase Admin API/dashboard. |
| `change-email-address.html` | Change Email Address | Bevestig je nieuwe e-mailadres -- Carkijker | Zodra de site een "wijzig e-mailadres"-functie krijgt. |
| `reauthentication.html` | Reauthentication | Je verificatiecode voor Carkijker | Zodra een gevoelige actie herverificatie vereist. |

## Installeren in Supabase

1. Ga naar het Supabase-dashboard van het project (`xbuznnkrkfdsjyjkarjo`) →
   **Authentication → Emails → Templates**.
2. Klik het gewenste template aan (bv. "Confirm signup"), plak de inhoud
   van het bijbehorende bestand in het "Message body"-veld (HTML-editor) en
   vul het voorgestelde **Subject** in (zie tabellen hierboven).
3. Klik op **Save**. Herhaal per template.

Let op: Supabase laat templates alleen bewerken als **custom SMTP** is
ingesteld (Authentication → Emails → SMTP Settings). Zonder eigen
SMTP-provider (bv. Resend) blijft Supabase het eigen, standaard sjabloon
gebruiken.

### Template-variabelen per type

- `confirm-signup.html`, `reset-password.html`, `magic-link.html`,
  `invite-user.html`: gebruiken `{{ .ConfirmationURL }}` -- Supabase's
  ingebouwde link die automatisch naar de juiste actie verwijst en al
  rekening houdt met de redirect-URL die de code meegeeft
  (`emailRedirectTo` / `redirectTo`).
- `change-email-address.html`: gebruikt daarnaast `{{ .NewEmail }}` (het
  nieuwe adres) en `{{ .Email }}` (het huidige/oude adres) in de tekst.
- `reauthentication.html`: gebruikt `{{ .Token }}` -- dit is een
  6-cijferige **code**, geen link. De gebruiker typt deze zelf in op de
  site; er zit dus bewust geen knop in dit template.

## Ontwerp

- Table-based HTML (geen flexbox/grid) en alle CSS inline, zodat de mail er
  ook goed uitziet in Outlook/Gmail e.d. -- moderne CSS wordt door veel
  e-mailclients genegeerd of geeft rendering-problemen.
- Exact dezelfde kleuren als de rest van de site (uit `index.html` /
  `inloggen/index.html`): donkere header (`#1a1a18` → `#2d2d2a`) met het
  "Car**kijker**"-wordmark (Car in `--oranje` `#d14413`, kijker in wit),
  oranje primaire knop (`#d14413`), gedimde tekst in `--muted` (`#6b6b60`),
  kaart met afgeronde hoeken en `--border` (`#e2e2da`) op een lichte
  achtergrond (`--bg` `#f5f5f0`).
- Duidelijke uitleg + een "negeer deze e-mail als je dit niet was"-regel in
  de footer, voor het geval iemand per ongeluk een e-mailadres invult dat
  niet van hen is.
