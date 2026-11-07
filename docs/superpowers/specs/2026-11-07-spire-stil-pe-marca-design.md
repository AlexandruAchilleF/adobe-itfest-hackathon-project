# Spire: stilul care îți place, pe marca ta (spec)

Data: 7 noiembrie 2026 (ITFest × Adobe). Starea: direcția validată cu mentorii (10:xx). Echipa: 2 oameni: colegul pe extensie (Omul A), Alexandru pe motor (Omul B).
Numele: **Spire** (de la „inspire”) e și mascota, și produsul. Spire e uliul desenat din template (`src/modules/mascot/MascotFigure.tsx`), aici agentul care apare peste site.
Brief-ul, criteriile și deciziile: `docs/BRIEF.md`, `docs/JURIU.md`.

## 1. Ce construim, într-o frază

Un agent care trăiește peste orice site: omul de marketing vede un design care îi place, apasă iconița, Spire apare peste pagină, se uită la ea, îi arată ce a observat, îl întreabă 3–5 lucruri cu variante și reface elementul ales pe marca omului (mascota lui în același stil, culorile din brand guidelines, textele lui). Elementul poate fi o imagine (postare, banner, afiș, mascotă) sau o secțiune de site (de exemplu hero-ul unui landing page). Rezultatul e verificat de cod: o imagine devine design pe straturi, exportabil în Adobe Express; o secțiune de site devine secțiunea ta, cu previzualizare, PNG și cod HTML/CSS.

Ținta e o **campanie**, nu un site: Spire scanează pagina după elementele utile pentru o campanie (hero, bannere de ofertă, mascotă, CTA-uri, insigne de reducere), iar din stilul ales face un **kit de campanie** coerent pe marca omului: postare (1080×1350), story (1080×1920) și secțiunea hero pentru landing page, toate din aceeași anatomie. Site-ul întreg nu se reface (ar fi web design, nu marketing; v0, Lovable, Framer fac deja asta; risc de „copie”).

## 2. Pentru cine și ce durere

- **Omul:** cel care face marketing într-o firmă (mică, medie, mare), fără designer la îndemână, pe laptop. Pentru demo: o singură persoană, cu o marcă de demo cu mascotă (pinguin).
- **Durerea (de dovedit azi):** „postarea trebuie să iasă azi, n-am designer, ce fac eu arată amator și nu respectă brandul”. Referința e un brief vizual, nu ținta.
- **Dovada planificată:** test pe hol cu cronometru (câte prompturi și minute în ChatGPT/Firefly până la un rezultat publicabil, ce iese greșit) și 5 interviuri; cifrele intră în `business.evidence`. Nu le inventăm.
- **Referința din demo:** un stil pe care omul are dreptul să-l folosească (Adobe Stock / Firefly, sau propria campanie care a mers), nu un concurent.

## 3. Fluxul (un singur drum)

| Pas | Ce vede omul | Cine face | Secunda din demo |
|---|---|---|---|
| 0. Marca (o dată) | formular: logo, culori cu roluri (principală, accent, fundal, text), fonturi, ton, mențiuni obligatorii, mascota (poză/desen). Precompletat pentru demo | om | înainte |
| 1. Spire intră | iconița extensiei → Spire apare peste pagină | extensia | 0–5 |
| 2. Spire scanează | chenare care se aprind pe rând peste elementele paginii; Spire alege elementele utile pentru o campanie („am găsit 4: hero-ul, banner-ul de −20%, mascota, butonul principal”) și spune de ce merge fiecare | extensia (citirea paginii) + AI (alegerea și rezumatul) | 5–20 |
| 3. Omul alege stilul | clic pe unul din elementele găsite, pe alt element sau decupaj cu dreptunghi | om + extensia | 20–25 |
| 4. Anatomia | ce fel de element e (imagine sau secțiune de site), zonele (titlu, ofertă, CTA, ilustrație, logo), rolurile culorilor, stilul ilustrației, subiectul, de ce merge | AI cu vedere (+ structura citită din pagină, la secțiuni) | 25–35 |
| 5. Întrebările | 3–5 întrebări cu variante în balonul lui Spire (ce promovezi, oferta, CTA, ce formate din kit); mascota și culorile vin din marcă | cod (ce lipsește) + AI (variantele) | 35–50 |
| 6. Kitul de campanie | în panou: postarea, story-ul și hero-ul, cu așezarea din referință adaptată fiecărui format, culorile și fonturile mărcii pe roluri, mascota mărcii generată o dată în stilul referinței, textele. Demo: hero-ul unui site → kitul tău, cu pinguinul tău | cod + AI | 50–75 (wow) |
| 7. Garda | bife lângă fiecare format, plus regulile de conversie și consecvența ofertei între formate; ce pică se corectează automat de agent (cel mult 2 reîncercări) înainte să vadă omul | cod (+ o verificare AI marcată ca atare) | 75–90 |
| 8. Retuș | clic pe un strat, schimbi prețul → bifa devine roșie, apoi verde după corectare | om | 90–110 |
| 9. Export | imagine: PNG și Adobe Express (add-on sau Embed SDK, după test); secțiune de site: PNG (în Express ca imagine) și cod HTML/CSS de copiat | cod | 110–120 |

Ruta de rezervă și pentru telefon: aplicația web, pagina `/nou`, cu încărcare din galerie (doar imagini); pașii 4–9 sunt aceiași, fără pașii 1–3. Dacă la ora 6 secțiunea de site nu merge cap-coadă, demo-ul rămâne pe imagine (o postare cu mascota), iar secțiunea de site trece pe slide-ul cu ce urmează.

## 4. Arhitectura

Principiul: AI-ul face ce codul nu poate (înțelege pagina și referința, decide ce întreabă, scrie textele, desenează mascota, corectează după gardă); tot restul e logică pură, testată. Un singur motor, două corpuri: extensia și aplicația web.

### 4.1 Motorul (în aplicația web, `src/`)

Logică pură, în `src/lib/`, cu teste în `tests/`:

| Unitate | Intrare → ieșire | Depinde de |
|---|---|---|
| `brand.ts` | schema profilului mărcii + seed-ul de demo | Zod |
| `anatomy.ts` | schema `Anatomy`: `kind: "image" \| "section"`, formatul, `zones[]` (rol, casetă în coordonate 0–1, lungimea textului), `colorRoles` (fundal, principală, accent, text: hex + sursa „pagină”/„pixeli”), `illustration` (stilul, subiectul, caseta), `why[]` | Zod |
| `gaps.ts` | anatomie + marcă + răspunsuri → întrebările care lipsesc (deterministe), cu variantele propuse de AI | — |
| `compose.ts` | anatomie + marcă + răspunsuri + texte + ilustrație + format (postare, story, banner) → `Design` (schema din `design.ts`), culorile mărcii mapate pe roluri; zonele se reașază pe raportul formatului, păstrând ierarhia | `design.ts` |
| `campaign.ts` | elementele găsite pe pagină → cele utile pentru campanie (reguli: rol, mărime, poziție în primul ecran) ordonate; anatomie + formatele alese → kitul (o listă de rezultate, câte unul pe format) | `compose`, `restyle` |
| `color.ts` | hex ↔ Lab, distanța între culori, culorile dominante din pixeli | — |
| `similarity.ts` | amprenta perceptuală a unei imagini (din pixeli), distanța dintre amprente | — |
| `guard.ts` | design + marcă + răspunsuri + referință + ilustrație → listă de verificări `{ id, ok, mesaj, sursa: "cod" \| "ai" }` | `color`, `similarity`, `accessibility.ts` |
| `restyle.ts` | secțiunea citită din pagină (arbore de elemente cu stilurile calculate, textele, imaginile, casetele) + marcă + texte + ilustrație → secțiunea pe marca omului (HTML cu stiluri puse pe elemente) + lista înlocuirilor (culoare → culoare pe rol, font → font, text → text, imagine → imagine) | `color.ts` |
| `agentLoop.ts` | generează → `guard` → dacă pică ceva reparabil, corectează și regenerează (≤ 2) → rezultat + istoricul încercărilor | `guard`, apelurile AI injectate |

Verificările gărzii:
- textele și prețul de pe design sunt exact cele date de om;
- mențiunile obligatorii sunt prezente;
- fonturile sunt ale mărcii;
- culorile designului sunt din paleta mărcii; paleta ilustrației generate e aproape de culorile mărcii (prag pe distanța de culoare);
- ilustrația nouă nu e aproape identică cu cea din referință (prag pe distanța amprentelor);
- contrastul și lizibilitatea (`auditDesign`, `autoFixDesign` existente);
- regulile de conversie: CTA-ul există, se vede în primul ecran (la hero) sau în zona de jos a postării, are contrast ≥ 4,5:1 și o mărime minimă; titlul are cel mult un număr de cuvinte stabilit;
- consecvența kitului: oferta (preț, procent, dată) și CTA-ul sunt aceleași pe toate formatele;
- **verificare AI, marcată „AI”:** mascota generată seamănă cu mascota mărcii (AI cu vedere compară cele două imagini).

Pentru secțiunile de site, în plus: contrastul se calculează din culorile reale ale fiecărui text pe fundalul lui; nu rămâne nicio culoare, niciun font și niciun text din original (comparat cu lista citită din pagină); imaginile originale sunt toate înlocuite.

Compoziția e preluată intenționat (e stilul); pe ecran și la pitch spunem ce e nou (ilustrația, textele, culorile, logo-ul) și ce e preluat (așezarea). Nu promitem „originalitate certificată”.

Apelurile AI, fiecare cu `mock` realist:
1. `ask()` rezumatul paginii (texte, culori, fonturi citite + captura) → ce a văzut Spire, pentru balon.
2. `ask()` analiza elementului (decupaj + ce s-a citit de sub el) → `Anatomy` + variantele pentru întrebări.
3. `ask()` textele pe zone, încadrate în lungimea zonelor.
4. `api/image.ts` (nou) → modelul de imagine Gemini, cu referința (stilul) + mascota mărcii (subiectul) și o instrucțiune scrisă de cod: fundal transparent sau uniform, fără text. Mock: o mascotă generată dinainte, în `public/samples/`.
5. `ask()` verificarea „seamănă cu mascota mărcii”.

Paginile (în locul celor din scenariul vechi):

| Ruta | Ce e | Pentru cine |
|---|---|---|
| `/` | **landing page-ul** produsului: ce face Spire într-o frază, cămila → pinguinul (sau kitul) ca imagine-erou, cei 3 pași, garda, butonul „Instalează extensia” și „Încearcă fără extensie” (spre `/nou`). Construit din `ScenarioHome.tsx` și din textele scenariului | juriul, oricine vine din QR |
| `/marca` | profilul mărcii (formular, precompletat pentru demo) | omul de marketing |
| `/nou` | referință → anatomie → întrebări → kit + gardă → export; aceeași pagină se încarcă în extensie (`?din=extensie`) | omul de marketing, juriul de pe telefon |
| `/campanii` | **interfața în care ajung rezultatele din extensie**: lista campaniilor (referința, kitul, starea gărzii, data, site-ul de unde vine) | omul de marketing |
| `/campanii/:id` | o campanie: postarea, story-ul și hero-ul unul lângă altul, editare pe straturi, garda, exportul (PNG, Express, cod HTML/CSS) | omul de marketing |

Rezultatele ajung în `/campanii` prin `store.ts`: extensia încarcă aplicația din aceeași origine, deci ce salvează în extensie apare în aplicația web din același browser; cu Supabase, apare și pe alte dispozitive. Secțiunea de site se previzualizează într-un iframe izolat (`sandbox`), iar PNG-ul se face din previzualizare. Refolosim `DesignCanvas`, exportul, QR-ul, `store.ts`, mascota (`src/modules/mascot/`).

### 4.2 Extensia (`chrome-extension/`, Manifest V3)

- **Permisiuni:** `activeTab`, `scripting`, `sidePanel`; nimic permanent pe toate site-urile.
- **Scriptul din pagină:** un strat într-un shadow root, care desenează Spire și balonul, chenarele de „scanare” și decupajul; citește elementele (texte, culori și fonturi calculate, casete, linkuri) și un rezumat al paginii, cu limită de mărime.
- **Captura:** fundalul extensiei face `captureVisibleTab`; decupajul se face din captură.
- **Legătura cu motorul:** Spire, întrebările și designul sunt aplicația web (`/nou?din=extensie`), încărcată într-un iframe în stratul din pagină și în panoul lateral; datele trec prin `postMessage`. Logica nu se scrie de două ori.
- **Secțiunea de site:** la clic pe o secțiune, scriptul serializează arborele ei (elemente, stiluri calculate relevante, texte, imagini, casete), cu limită de noduri și de mărime, și îl trimite motorului.
- **Unde nu se poate citi pagina** (Instagram, Meta, secțiuni desenate pe canvas): Spire lucrează pe pixeli, iar rolurile culorilor sunt marcate „ghicite din pixeli”; o secțiune care nu se poate citi se tratează ca imagine.

### 4.3 Exportul și integrările

| Integrare | Ce schimbă | Rezervă |
|---|---|---|
| Gemini (text, vedere, imagine): **prima integrare, de azi** | analiza, textele, mascota | Claude pentru text/vedere; mock pentru tot |
| Chrome (extensia) | agentul peste orice site | aplicația web cu încărcare |
| Adobe Express | rezultatul editabil în Express | PNG (SVG doar pentru straturile vectoriale, cu ilustrația ca imagine; spus explicit) |
| Firefly Services (mai târziu, dacă obținem acces) | generare „commercially safe”, Style Reference | Gemini rămâne implicit |

Express: în prima oră testăm add-on-ul existent; dacă nu desenează nimic până la ora 3, încercăm Embed SDK (cere înregistrare și domeniu aprobat); altfel rămânem la PNG.

## 5. Când ceva pică

- AI-ul nu răspunde sau răspunde greșit: mesaj în balonul lui Spire + „Încearcă din nou”; Modul demo trece pe mock-uri.
- Generarea mascotei pică sau nu trece garda după 2 reîncercări: în zona ilustrației se pune mascota originală a mărcii, iar garda spune „ilustrația originală, generarea n-a reușit”.
- Pagina nu se poate citi: pixeli, rolurile culorilor marcate „ghicite”.
- Secțiunea refăcută arată diferit (fonturi din alte domenii, animații, stiluri complicate): previzualizarea se compară vizual cu originalul doar ca așezare; pentru demo alegem și testăm dinainte un site pe care merge.
- Rețeaua din sală: mock-uri realiste pentru fiecare apel, rezultatele bune din testul de generare salvate ca rezervă.

## 6. Teste și dovezi

- **Unitare:** `gaps`, `compose` (pe toate cele 3 formate), `campaign`, `restyle` (pe 2 secțiuni serializate de exemplu), `color`, `similarity`, `guard`, `agentLoop` (cu apeluri AI false), pe 3 anatomii de exemplu.
- **E2e (Playwright, mock):** aplicația web: referința exemplu → anatomie → răspunsuri → design cu bifele gărzii → retuș (prețul schimbat face bifa roșie) → export. Extensia, încărcată în Chromium: Spire apare peste o pagină locală de test (cu un hero și o mascotă), decupajul ajunge în aplicație, iar hero-ul refăcut nu mai conține culorile, fonturile și textele originale.
- **Manual, cu cheia reală (nu în `npm run check`):** 10 generări „stil + mascota mărcii”, prag ≥ 5/10 publicabile; 10–15 referințe reale, cu acuratețea anatomiei și rata de reușită după bucla de corectare (cifre pentru Technical Excellence).

## 7. Ce nu facem azi

- Video (storyboard + animatic) doar dacă fluxul static merge cap-coadă la ora 6.
- Logo-ul nu se adaptează.
- Site-uri sau pagini întregi (doar secțiunea hero azi), animațiile CSS/Lottie, biblioteca de inspirație, profiluri multiple de marcă pentru agenții, brand book PDF (după ora 6, dacă rămâne timp).
- Aprobarea responsabilului de brand.

## 8. Scenariul din template

Config-ul de scenariu rămâne stratul de texte, pitch și verificări (`/start`, `/pitch`, `tests/urme.test.ts`): un scenariu nou `src/scenario/scenarios/spire.ts` (id `spire`) cu `app`, `business` (dovezile goale până la interviuri), `roles` (omul de marketing), `flow` minim pentru materiale (ciornă → verificat → exportat, cu „garda a respins”), `mascot` (Spire, ca agent al produsului), `features` cu harta, punctele, rapoartele și modulele opționale oprite. Meniul juriului: Campanie nouă, Campanii, Marca (landing page-ul e `/`).

## 9. Ordinea de lucru și pragurile (echipă de 2)

Asistentul de cod scrie o mare parte din cod; cei doi oameni conduc câte o jumătate, testează pe date reale și fac validarea.

| Când | Omul A (colegul): extensia și pagina | Omul B (Alexandru): motorul, AI-ul și aplicația web |
|---|---|---|
| Ora 1 | stratul cu Spire peste pagină, scanarea cu chenare, decupajul | testul de generare (10 × „stil + mascota mărcii”, prag ≥ 5/10); marca de demo (seed cu pinguin) |
| Orele 2–4 | citirea paginii (elemente, stiluri, texte), legătura cu aplicația prin `postMessage` | `anatomy`, `gaps`, `compose` (postarea), `api/image.ts`, pagina `/nou` |
| Orele 4–6 | `campaign` (elementele utile), apoi `restyle` pentru hero | `guard`, `agentLoop`, story-ul din aceeași anatomie, `/campanii` și `/campanii/:id`, export PNG; o încercare de 30 de minute cu add-on-ul Express |
| Ora 6 | **prag:** drumul postare cu mascota merge cap-coadă cu mock, din extensie și din web. Ce nu merge iese din demo. | |
| Orele 6–9 | interviurile și testul cu cronometrul pe hol (amândoi, câte 30–45 de minute), cifrele în `business.evidence`; calitate, rezerve, cazurile în care AI-ul greșește | landing page-ul `/` (texte din scenariu, imaginea-erou din testul de generare); Firefly, dacă avem acces |
| Ora 9 | deploy, laptopul de juriu cu extensia instalată, video de rezervă, `/pitch` | |

Ce se taie primul dacă rămânem în urmă, în ordine: secțiunea hero, add-on-ul Express (rămâne PNG), story-ul, citirea fonturilor din pagină. Nu se taie: Spire peste pagină, postarea cu mascota, garda, rezervele.
