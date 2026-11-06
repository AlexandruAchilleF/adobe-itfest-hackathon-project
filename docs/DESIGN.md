# Sistemul vizual

Tokenurile stau în `src/index.css`, componentele în `src/components/ui.tsx`. Două registre, aceleași culori:

- **Ecranele de lucru** (cereri, fișă, cronometru, profil, telefon) arată ca un produs real: un lucru de făcut pe ecran, datele care contează la vedere, fără decor.
- **Prima pagină** (`/`) e povestea pentru juriu, în stilul deskfirst.com: cer pictat, titlu în două voci, mișcare la derulare. Am luat principiile lor, nu imaginile, textele sau logo-ul.

## Ecranele de lucru

| Regula | Cum o aplicați |
|---|---|
| **Un lucru odată** | Sus e cererea care te așteaptă (documentul, suma, verificările, butoanele pasului). Dedesubt, restul, pe câte un rând. Vezi `src/pages/BoardPage.tsx`. |
| **Un font, o scară** | Geist peste tot (`font-sans`). Text de bază 15px, meta 13–14px, titluri 20/28/32px. Cifre cu `tabular-nums`, aliniate la dreapta în liste. |
| **Culori cu sens** | `paper` (fundal), `card` (alb), `line`, `ink` (text, bleumarin), `muted` (text secundar, contrast AA). **Coral doar pe acțiunea principală** (`btn-primary`), câte una pe ecran. Stările: `ok`, `warn`, `bad`, doar ca punct + text. |
| **Starea** | `<StatusPill>`: punct de culoare + textul stării. Una pe rând, niciodată culoarea singură. |
| **Componente** | `Button` (`primary`, `secondary`, `ghost`, `danger`), `Card`, `PageHeader` (titlu simplu, fără accent), `Tag`, `Pill`, `ErrorNote`. Rotunjire 10–14px, o singură umbră discretă. |
| **Documentul ca obiect** | `<DocPaper>` desenează bonul/factura ca hârtie termică (singurul loc cu font monospațiat). După un pas făcut de om apare ștampila (`.stamp`) cu noua stare. |
| **Stări goale** | Fiecare listă are text pentru „nimic aici”; cardul de focus are „Nimic nu te așteaptă acum”. |

## Prima pagină (povestea)

`src/pages/ScenarioHome.tsx`, în ordinea în care o vede juriul:

1. **Cerul** (`.sky`): fraza tăiată (`app.notThis`), titlul cu un cuvânt în serif coral (`<Accent text="Banii pe bonuri, *în zile.*" />`), caseta în care cererea se scrie singură (`useTypewriter`), butoanele de rol cu „treaptă” (`btn-story`). În dreapta, **produsul ca erou**: documentul și cardul primei cereri din seed, plutind. Cu `app.heroImage` puneți în locul lor o ilustrație proprie.
2. **Cifra** spusă de un om real (`business.evidence[0]`), în serif coral.
3. **Drumul la derulare**: pașii fluxului (`happyPath`) în stânga; în dreapta, macheta stă pe loc și se schimbă cu estompare (`.morph`), iar stațiile de jos se aprind.
4. **Capitolul întunecat** (`.sky-night`): textul de pe bon se scrie, apoi verificările reale (`checkDocument`) apar una câte una.
5. **Cifrele** calculate din date și alegerea rolului.

`<Ribbon>` și `<Accent>` sunt doar pentru prima pagină: câte o panglică pe secțiune, cel mult un cuvânt accentuat pe titlu.

### Ilustrația din cer, cu Adobe Firefly

Dacă vreți o ilustrație în loc de produs, generați-o în Firefly și puneți-o în `public/hero.png`, apoi `app.heroImage: "/hero.png"`. Prompt de stil, de adaptat la domeniu:

> Editorial illustration, soft painted clouds in pale periwinkle and blush pink, [obiectul domeniului: a taxi receipt / a water bottle / a street lamp] floating gently, warm light, high detail, no text, no logos, plenty of empty sky on the left for a headline

## Asistentul

Implicit e un buton rotund bleumarin în colț (conversație, acțiuni, tur ghidat). Personajul desenat (arici) apare doar cu `mascot.character: true`, pentru teme cu copii, vârstnici sau gamificare.

## Uneltele echipei

Înregistrarea video, modul demo, starea AI, resetarea datelor și paginile „Pentru echipă” stau în panoul din `src/components/DevPanel.tsx`, care apare doar cu `?dev=1` (rămâne pornit în browser până la `?dev=0`). Juriul nu le vede.

## Ce nu folosim

- emoji ca icoane; folosiți puncte de culoare, text sau SVG-uri simple;
- coral pe altceva decât acțiunea principală (titlurile, cifrele și linkurile sunt bleumarin);
- două semnale de stare pe același rând, pastile pe orice;
- text gri sub contrastul 4,5:1, text sub 12px;
- gradienți, sticlă (`backdrop-blur`), umbre colorate pe ecranele de lucru (cerul e doar pe prima pagină);
- dark mode; `font-mono` pentru cifre (în afară de bonul desenat);
- text intern sau pentru juriu vizibil în aplicație (notele pentru echipă apar doar cu `?dev=1`).

## Cod vechi

Paginile scrise înainte folosesc `slate-*` și `text-accent`. Scala e remapată în `src/index.css` (950 = fundalul, 900 = cardul, 800/700 = liniile, 400 = textul secundar, 100 = textul), iar `accent` e bleumarin. În cod nou folosiți tokenurile semantice.
