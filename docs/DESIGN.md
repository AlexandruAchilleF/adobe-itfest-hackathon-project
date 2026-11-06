# Sistemul vizual

Tokenurile stau în `src/index.css`, componentele în `src/components/ui.tsx`. Două registre, aceleași culori:

- **Ecranele de lucru** (cereri, fișă, cronometru, profil, telefon) arată ca un produs real: un lucru de făcut pe ecran, datele care contează la vedere, fără decor.
- **Prima pagină** (`/`) e povestea pentru juriu, în stilul deskfirst.com: cer pictat, titlu în două voci, mișcare la derulare. Am luat principiile lor, nu imaginile, textele sau logo-ul.

## Paleta și fonturile

Valorile exacte (din `src/index.css`), ca să le folosiți și în afara aplicației: slide-uri, Figma, Adobe Express, Firefly.

| Token | Hex | Unde |
|---|---|---|
| `paper` | `#f6f5f2` | fundalul ecranelor de lucru |
| `cream` | `#fbf7f1` | secțiunile calde de pe prima pagină |
| `card` | `#ffffff` | cardurile |
| `line` | `#e5e3de` | bordurile |
| `ink` | `#1b2350` | textul și titlurile (bleumarin) |
| `ink-2` | `#3d4366` | textul secundar puternic |
| `muted` | `#646985` | textul secundar (contrast AA) |
| `coral` | `#c84a37` | doar acțiunea principală |
| `coral-bright` | `#e0614a` | cuvântul accentuat din titlu (serif) |
| `coral-deep` | `#a3392a` | panglica, cifra spusă de om |
| `ok` / `warn-dot` / `bad` | `#2f7d4f` / `#d9a03a` / `#b4372a` | stările, ca punct + text |
| cerul (`.sky`) | `#c7d1f2` → `#d9dbf5` → `#efe7f0` → `#fbf7f1` | gradient vertical cu nori albi și un pic de roz |
| noaptea (`.sky-night`) | `#1a2252` → `#26326e` → `#3a4a8c` | capitolul întunecat, slide-ul de demo |

- **Geist** (sans, `font-sans`): tot textul. Titluri semibold, tracking strâns (−0,035…−0,045em).
- **Fraunces** (serif, `font-serif`): doar cuvântul accentuat din titlu (`<Accent>`), panglica (`<Ribbon>`) și citatul cu cifra.
- Semnul aplicației: pătrat bleumarin rotunjit cu un pătrățel coral în mijloc (`Mark` din `src/App.tsx`).

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

## Pitch deck-ul (`/pitch`)

Deck-ul e o pagină a aplicației, în același sistem: cer pentru deschidere, „Cum merge” și încheiere; crem și hârtie pentru problemă, oameni, diferență, plătitor și brief; noaptea pentru demo (QR). Slide-ul are 1600×900 și se scalează la ecran.

- **Textele** vin din scenariul activ (numele, titlul cu accent, fraza, problema, cifra, rolurile, pașii fluxului, plătitorul). Ce nu e în scenariu (echipa, cerințele brief-ului, piața, ce s-a construit azi, ce urmează) se scrie în `PITCH`, în `src/pitch/deck.ts`. Ce lipsește apare pe slide ca o casetă punctată „De completat”.
- **Ordinea** urmează `docs/JURIU.md`: produsul → problema cu cifra → omul → cum merge → AI propune, codul verifică, omul confirmă → demo cu QR → cine plătește → cerințele brief-ului → încheierea.
- **Prezentare:** `/pitch` (sau din panoul echipei, `?dev=1`). ← → / Space / clicker, clic în dreapta sau stânga, `F` ecran complet, `/pitch#6` sare la slide-ul 6.
- **PDF:** `P` (sau Ctrl+P → „Salvează ca PDF”, cu „Grafică de fundal” bifată): o slide pe pagină, 16:9. Țineți PDF-ul pe stick, ca rezervă dacă pică rețeaua.
- **QR-ul** duce la `PITCH.demoUrl`; gol = adresa de pe care rulează deck-ul. Deschideți deck-ul de pe adresa Vercel, nu de pe localhost, altfel telefoanele juriului nu ajung la aplicație.

## Asistentul

Implicit e un buton rotund bleumarin în colț (conversație, acțiuni, tur ghidat). Personajul desenat (Țepi, un arici, `src/modules/mascot/MascotFigure.tsx`) apare doar cu `mascot.character: true`, pentru teme cu copii, vârstnici sau gamificare. Un personaj nou se desenează în același fișier și se potrivește cu paleta de mai sus (bleumarin, coral, cerul).

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
