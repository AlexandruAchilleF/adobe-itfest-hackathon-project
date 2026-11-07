# Sistemul vizual

Tokenurile stau în `src/index.css`, componentele în `src/components/ui.tsx`. Două registre, aceleași culori:

- **Ecranele de lucru** (`/acasa`, `/campanii`, `/campanii/:id`, `/nou`, `/marca`) arată ca un spațiu de lucru: același limbaj ca landingul, mai simplu. Un lucru de făcut pe ecran, datele care contează la vedere.
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
- Semnul aplicației: uliul (`public/landing/hawk-mark.svg`), în header și pe landing.

## Ecranele de lucru

| Regula | Cum o aplicați |
|---|---|
| **Drumul** | Acasă → Campanii → o campanie → pagina de lucru. „Campanie nouă” e butonul din header, în afara meniului. |
| **Fundalul** | `.app-sky`, doar în Shell-ul din `src/App.tsx`: cerul de pe landing, deja blurat și voalat în crem, care ajunge la `paper` jos (`public/landing/workspace.webp`, generat cu `npm run ui:bg`). Scriptul oprește generarea dacă textul `muted` coboară sub 4,5:1 pe vreun pixel. Nu apare pe `/`, `/pitch`, `/view`, `/s` și în panoul din extensie. Cardurile rămân albe și opace. |
| **Headerul** | `.app-nav`: pastila de pe landing, opacă și fără blur. Stânga, uliul și numele, spre `/acasa`. Linkurile vin din `scenario.nav`. Dreapta, un buton. Pe telefon, linkurile stau în meniul de sub pastilă. |
| **Un lucru odată** | Acasă are trei lucruri: pornirea, campaniile recente, marca. Fără statistici, grafice sau fluxuri de activitate, pentru care n-avem date reale. |
| **Galeria** | `CampaignCard`: miniatura e designul făcut (`DesignPreview`), plus titlul, sursa și data. Starea apare doar când cere ceva („2 verificări de revăzut”). |
| **Pagina de lucru** | Pe ecran mare încape în înălțime, fără scroll pe pagină (`.work-page`), cu textele derulând în coloana lor. Bara de sus rămâne la vedere. Garda e o linie (`GuardLine`) care se deschide la cerere și singură când pică ceva. |
| **Un font, o scară** | Geist peste tot (`font-sans`). Text de bază 15px, meta 13–14px, titluri 20/28/32px. Cifre cu `tabular-nums`, aliniate la dreapta în liste. |
| **Culori cu sens** | `paper` (fundal), `card` (alb), `line`, `ink` (text, bleumarin), `muted` (text secundar, contrast AA). **Coral doar pe acțiunea principală** (`btn-primary`), câte una pe ecran. În aplicație, coralul e pe „Campanie nouă”, deci acțiunile paginii (Descarcă PNG, Salvează marca) sunt bleumarin (`btn-ink`). Pe `/nou`, butonul din header devine neutru și coralul trece pe pasul curent. Stările: `ok`, `warn`, `bad`, doar ca punct + text. |
| **Starea** | `<StatusPill>`: punct de culoare + textul stării. Una pe rând, niciodată culoarea singură. |
| **Componente** | `Button` (`primary`, `ink`, `secondary`, `ghost`, `danger`), `Card`, `PageHeader` (titlu simplu, fără accent), `Tag`, `Pill`, `ErrorNote`. Rotunjire 10–14px, o singură umbră discretă. |
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
- **Coperta** are în stânga uliul de pază desenat ca graf (`src/pitch/HawkMark.tsx`), cu privirea spre titlu: noduri mici și linii foarte fine, ochiul auriu ca nod central, noduri mai mari la articulații, coada coral în evantai. Stă pe o linie de rețea care vine din afara slide-ului, cu câțiva „oameni” legați de ea (cei coral sunt confirmați): uliul veghează rețeaua. E varianta sobră a mascotei. Se oprește cu `PITCH.coverMark: false`. Graful se regenerează cu `node scripts/hawk-graph/generate.cjs` (silueta și lanțurile pe anatomie sunt în `scripts/hawk-graph/build.browser.js`).
- **Ordinea** urmează `docs/JURIU.md`: produsul → problema cu cifra → omul → cum merge → AI propune, codul verifică, omul confirmă → demo cu QR → arhitectura → cine plătește → cerințele brief-ului → încheierea.
- **Prezentare:** `/pitch` (sau din panoul echipei, `?dev=1`). ← → / Space / clicker, clic în dreapta sau stânga, `F` ecran complet, `/pitch#6` sare la slide-ul 6.
- **PDF:** `P` (sau Ctrl+P → „Salvează ca PDF”, cu „Grafică de fundal” bifată): o slide pe pagină, 16:9. Țineți PDF-ul pe stick, ca rezervă dacă pică rețeaua.
- **QR-ul** duce la `PITCH.demoUrl`; gol = adresa de pe care rulează deck-ul. Deschideți deck-ul de pe adresa Vercel, nu de pe localhost, altfel telefoanele juriului nu ajung la aplicație.

## Asistentul

Implicit e un buton rotund bleumarin în colț (conversație, acțiuni, tur ghidat), mic (40 px, personajul 56 px), ca să nu acopere conținutul. Personajul desenat (Uli, `src/modules/mascot/MascotFigure.tsx`) apare doar cu `mascot.character: true`, pentru teme cu copii, vârstnici sau gamificare.

Uli e un uliu care zboară spre privitor, întors puțin spre dreapta. Ce îl face recognoscibil, de păstrat la orice retușare:

- **silueta**: aripile larg deschise, brațul urcă spre încheietură, mâna coboară; cinci pene primare desfăcute, cu goluri doar la vârf;
- **fața**: creștet turtit, sprâncene osoase care coboară spre cioc, ochi aurii spre lateral (stângul mai mare, e mai aproape), ciocul încovoiat pe gușa crem;
- **coada** roșcată în evantai, din care se văd doar festele de sub corp; culoarea ei e `mascot.color` din scenariu;
- **stil**: doar forme pline în paleta de mai sus (bleumarin în trei tonuri pentru volum, crem, auriu); fără gradienți, fără `feGaussianBlur` sau alte filtre, fără texturi. Lumina vine de sus-stânga: muchia aripii apropiate și creștetul au o fâșie mai deschisă (`rim`).

Stările se văd din postură, nu doar din față: bucuria ridică aripile, îngrijorarea le lasă în jos și ridică sprâncenele, ascultarea înclină capul.

În extensie, uliul are un contur alb subțire (filtru pe desen, nu în SVG), ca să se vadă și pe site-uri cu fundal închis.

**Panoul din extensie** (480 px, `/nou?din=extensie`): sus, fix, uliul cu replica lui; după brief, dedesubt, navigarea pe secțiuni (Observații, Brief, Materiale; Design doar după ce alegi un chenar de pe pagină). În bara panoului, **Inspire** te lasă să tragi un dreptunghi peste pagină; zona e recreată în HTML/CSS și apare în panou, la scara ei, cu comutare Recreat / Original, ecran complet și cod de copiat. Fiecare secțiune are un titlu, o frază și un singur card, fără carduri în carduri. **Balonul de brief** de pe site pune o singură întrebare odată; răspunsurile date rămân sus ca etichete pe care le apeși ca să te întorci, iar la final apare un rezumat cu „Continuă cu o campanie”.

Mișcarea (în `src/index.css`, copiată în foaia din `chrome-extension/content.js`): aripile pivotează din umăr; în zbor coborârea e mai rapidă decât ridicarea, iar corpul urcă pe coborâre; la schimbarea direcției se întoarce cu fața spre unde zboară. Așezat, respiră, clipește (uneori de două ori), se uită în jur și mișcă scurt din coadă, cu o umbră sub gheare. Bucuria sare, îngrijorarea se scutură, confetti pleacă din corp. Grupurile animabile din desen: `mascot-wing` (și `mascot-wing-far`), `mascot-head`, `mascot-tail`, `mascot-bit`. Fără stiluri inline în SVG (CSP-ul unor site-uri le blochează în extensie). Cu „mișcare redusă” rămân doar schimbările de stare, fără deplasare.

## Uneltele echipei

Înregistrarea video, modul demo, starea AI, resetarea datelor și paginile „Pentru echipă” stau în panoul din `src/components/DevPanel.tsx`, care apare doar cu `?dev=1` (rămâne pornit în browser până la `?dev=0`). Juriul nu le vede.

## Ce nu folosim

- emoji ca icoane; folosiți puncte de culoare, text sau SVG-uri simple;
- coral pe altceva decât acțiunea principală (titlurile, cifrele și linkurile sunt bleumarin);
- două semnale de stare pe același rând, pastile pe orice;
- text gri sub contrastul 4,5:1, text sub 12px;
- gradienți CSS, sticlă (`backdrop-blur`), `filter: blur` pe tot ecranul, umbre colorate pe ecranele de lucru. Singurul fundal pictat de acolo e `workspace.webp`, de mai sus;
- pe ecranele de lucru: cerul clar, serif-ul coral, panglicile, ilustrațiile mari. Acestea rămân pe landing;
- dark mode; `font-mono` pentru cifre (în afară de bonul desenat);
- text intern sau pentru juriu vizibil în aplicație (notele pentru echipă apar doar cu `?dev=1`).

## Cod vechi

Paginile scrise înainte folosesc `slate-*` și `text-accent`. Scala e remapată în `src/index.css` (950 = fundalul, 900 = cardul, 800/700 = liniile, 400 = textul secundar, 100 = textul), iar `accent` e bleumarin. În cod nou folosiți tokenurile semantice.
