# Uli: stilul care îți place, pe marca ta (spec)

Data: 7 noiembrie 2026 (ITFest × Adobe). Starea: de aprobat de echipă. Numele produsului e de lucru, de confirmat.
Brief-ul, criteriile și deciziile: `docs/BRIEF.md`, `docs/JURIU.md`.

## 1. Ce construim, într-o frază

Un agent care trăiește peste orice site: omul de marketing vede un design care îi place, apasă iconița, uliul apare peste pagină, se uită la ea, îi arată ce a observat, îl întreabă 3–5 lucruri cu variante și reface elementul ales pe marca omului (mascota lui în același stil, culorile din brand guidelines, textele lui), într-un design pe straturi, verificat de cod și exportabil în Adobe Express.

## 2. Pentru cine și ce durere

- **Omul:** cel care face marketing într-o firmă (mică, medie, mare), fără designer la îndemână, pe laptop. Pentru demo: o singură persoană, cu o marcă de demo cu mascotă (pinguin).
- **Durerea (de dovedit azi):** „postarea trebuie să iasă azi, n-am designer, ce fac eu arată amator și nu respectă brandul”. Referința e un brief vizual, nu ținta.
- **Dovada planificată:** test pe hol cu cronometru (câte prompturi și minute în ChatGPT/Firefly până la un rezultat publicabil, ce iese greșit) și 5 interviuri; cifrele intră în `business.evidence`. Nu le inventăm.
- **Referința din demo:** un stil pe care omul are dreptul să-l folosească (Adobe Stock / Firefly, sau propria campanie care a mers), nu un concurent.

## 3. Fluxul (un singur drum)

| Pas | Ce vede omul | Cine face | Secunda din demo |
|---|---|---|---|
| 0. Marca (o dată) | formular: logo, culori cu roluri (principală, accent, fundal, text), fonturi, ton, mențiuni obligatorii, mascota (poză/desen). Precompletat pentru demo | om | înainte |
| 1. Uliul intră | iconița extensiei → uliul apare peste pagină | extensia | 0–5 |
| 2. Uliul se uită | chenare care se aprind pe rând peste elementele paginii; în balon, ce a văzut („mascota lor e desenată plat, cu contur gros; culori: roșu, crem”) | extensia (citirea paginii) + AI (rezumat) | 5–20 |
| 3. Omul arată elementul | clic pe element sau decupaj cu dreptunghi | om + extensia | 20–25 |
| 4. Anatomia | zonele (titlu, ofertă, CTA, ilustrație, logo), rolurile culorilor, stilul ilustrației, subiectul, de ce merge | AI cu vedere | 25–35 |
| 5. Întrebările | 3–5 întrebări cu variante în balonul uliului (ce promovezi, oferta, CTA, canalul); mascota și culorile vin din marcă | cod (ce lipsește) + AI (variantele) | 35–50 |
| 6. Designul | în panou: așezarea din referință, culorile mărcii pe roluri, mascota mărcii generată în stilul referinței, textele | cod + AI | 50–75 (wow) |
| 7. Garda | bife lângă design; ce pică se corectează automat de agent (cel mult 2 reîncercări) înainte să vadă omul | cod (+ o verificare AI marcată ca atare) | 75–90 |
| 8. Retuș | clic pe un strat, schimbi prețul → bifa devine roșie, apoi verde după corectare | om | 90–110 |
| 9. Export | PNG; Adobe Express (add-on sau Embed SDK, după test) | cod | 110–120 |

Ruta de rezervă și pentru telefon: aplicația web, pagina `/nou`, cu încărcare din galerie; pașii 4–9 sunt aceiași, fără pașii 1–3.

## 4. Arhitectura

Principiul: AI-ul face ce codul nu poate (înțelege pagina și referința, decide ce întreabă, scrie textele, desenează mascota, corectează după gardă); tot restul e logică pură, testată. Un singur motor, două corpuri: extensia și aplicația web.

### 4.1 Motorul (în aplicația web, `src/`)

Logică pură, în `src/lib/`, cu teste în `tests/`:

| Unitate | Intrare → ieșire | Depinde de |
|---|---|---|
| `brand.ts` | schema profilului mărcii + seed-ul de demo | Zod |
| `anatomy.ts` | schema `Anatomy`: `kind: "image"`, formatul, `zones[]` (rol, casetă în coordonate 0–1, lungimea textului), `colorRoles` (fundal, principală, accent, text: hex + sursa „pagină”/„pixeli”), `illustration` (stilul, subiectul, caseta), `why[]` | Zod |
| `gaps.ts` | anatomie + marcă + răspunsuri → întrebările care lipsesc (deterministe), cu variantele propuse de AI | — |
| `compose.ts` | anatomie + marcă + răspunsuri + texte + ilustrație → `Design` (schema din `design.ts`), culorile mărcii mapate pe roluri | `design.ts` |
| `color.ts` | hex ↔ Lab, distanța între culori, culorile dominante din pixeli | — |
| `similarity.ts` | amprenta perceptuală a unei imagini (din pixeli), distanța dintre amprente | — |
| `guard.ts` | design + marcă + răspunsuri + referință + ilustrație → listă de verificări `{ id, ok, mesaj, sursa: "cod" \| "ai" }` | `color`, `similarity`, `accessibility.ts` |
| `agentLoop.ts` | generează → `guard` → dacă pică ceva reparabil, corectează și regenerează (≤ 2) → rezultat + istoricul încercărilor | `guard`, apelurile AI injectate |

Verificările gărzii:
- textele și prețul de pe design sunt exact cele date de om;
- mențiunile obligatorii sunt prezente;
- fonturile sunt ale mărcii;
- culorile designului sunt din paleta mărcii; paleta ilustrației generate e aproape de culorile mărcii (prag pe distanța de culoare);
- ilustrația nouă nu e aproape identică cu cea din referință (prag pe distanța amprentelor);
- contrastul și lizibilitatea (`auditDesign`, `autoFixDesign` existente);
- **verificare AI, marcată „AI”:** mascota generată seamănă cu mascota mărcii (AI cu vedere compară cele două imagini).

Compoziția e preluată intenționat (e stilul); pe ecran și la pitch spunem ce e nou (ilustrația, textele, culorile, logo-ul) și ce e preluat (așezarea). Nu promitem „originalitate certificată”.

Apelurile AI, fiecare cu `mock` realist:
1. `ask()` rezumatul paginii (texte, culori, fonturi citite + captura) → ce a văzut uliul, pentru balon.
2. `ask()` analiza elementului (decupaj + ce s-a citit de sub el) → `Anatomy` + variantele pentru întrebări.
3. `ask()` textele pe zone, încadrate în lungimea zonelor.
4. `api/image.ts` (nou) → modelul de imagine Gemini, cu referința (stilul) + mascota mărcii (subiectul) și o instrucțiune scrisă de cod: fundal transparent sau uniform, fără text. Mock: o mascotă generată dinainte, în `public/samples/`.
5. `ask()` verificarea „seamănă cu mascota mărcii”.

Paginile (în locul celor din scenariul vechi): `/marca`, `/nou` (referință → anatomie → întrebări → design + gardă → export), `/materiale` (lista). Refolosim `DesignCanvas`, exportul, QR-ul, `store.ts`, mascota (`src/modules/mascot/`).

### 4.2 Extensia (`chrome-extension/`, Manifest V3)

- **Permisiuni:** `activeTab`, `scripting`, `sidePanel`; nimic permanent pe toate site-urile.
- **Scriptul din pagină:** un strat într-un shadow root, care desenează uliul și balonul, chenarele de „scanare” și decupajul; citește elementele (texte, culori și fonturi calculate, casete, linkuri) și un rezumat al paginii, cu limită de mărime.
- **Captura:** fundalul extensiei face `captureVisibleTab`; decupajul se face din captură.
- **Legătura cu motorul:** uliul, întrebările și designul sunt aplicația web (`/nou?din=extensie`), încărcată într-un iframe în stratul din pagină și în panoul lateral; datele trec prin `postMessage`. Logica nu se scrie de două ori.
- **Unde nu se poate citi pagina** (Instagram, Meta): uliul lucrează pe pixeli, iar rolurile culorilor sunt marcate „ghicite din pixeli”.

### 4.3 Exportul și integrările

| Integrare | Ce schimbă | Rezervă |
|---|---|---|
| Gemini (text, vedere, imagine) | analiza, textele, mascota | Claude pentru text/vedere; mock pentru tot |
| Chrome (extensia) | agentul peste orice site | aplicația web cu încărcare |
| Adobe Express | rezultatul editabil în Express | PNG (SVG doar pentru straturile vectoriale, cu ilustrația ca imagine; spus explicit) |
| Firefly Services (de verificat accesul) | generare „commercially safe”, Style Reference | Gemini |

Express: în prima oră testăm add-on-ul existent; dacă nu desenează nimic până la ora 3, încercăm Embed SDK (cere înregistrare și domeniu aprobat); altfel rămânem la PNG.

## 5. Când ceva pică

- AI-ul nu răspunde sau răspunde greșit: mesaj în balonul uliului + „Încearcă din nou”; Modul demo trece pe mock-uri.
- Generarea mascotei pică sau nu trece garda după 2 reîncercări: în zona ilustrației se pune mascota originală a mărcii, iar garda spune „ilustrația originală, generarea n-a reușit”.
- Pagina nu se poate citi: pixeli, rolurile culorilor marcate „ghicite”.
- Rețeaua din sală: mock-uri realiste pentru fiecare apel, rezultatele bune din testul de generare salvate ca rezervă.

## 6. Teste și dovezi

- **Unitare:** `gaps`, `compose`, `color`, `similarity`, `guard`, `agentLoop` (cu apeluri AI false), pe 3 anatomii de exemplu.
- **E2e (Playwright, mock):** aplicația web: referința exemplu → anatomie → răspunsuri → design cu bifele gărzii → retuș (prețul schimbat face bifa roșie) → export. Extensia, încărcată în Chromium: uliul apare peste o pagină locală de test și decupajul ajunge în aplicație.
- **Manual, cu cheia reală (nu în `npm run check`):** 10 generări „stil + mascota mărcii”, prag ≥ 5/10 publicabile; 10–15 referințe reale, cu acuratețea anatomiei și rata de reușită după bucla de corectare (cifre pentru Technical Excellence).

## 7. Ce nu facem azi

- Video (storyboard + animatic) doar dacă fluxul static merge cap-coadă la ora 6.
- Logo-ul nu se adaptează.
- Interfața site-ului ca HTML, animațiile CSS/Lottie, biblioteca de inspirație, profiluri multiple de marcă pentru agenții, brand book PDF (după ora 6, dacă rămâne timp).
- Aprobarea responsabilului de brand.

## 8. Scenariul din template

Config-ul de scenariu rămâne stratul de texte, pitch și verificări (`/start`, `/pitch`, `tests/urme.test.ts`): un scenariu nou `src/scenario/scenarios/uli.ts` (id `uli`) cu `app`, `business` (dovezile goale până la interviuri), `roles` (omul de marketing), `flow` minim pentru materiale (ciornă → verificat → exportat, cu „garda a respins”), `mascot` (uliul, ca agent al produsului), `features` cu harta, punctele, rapoartele și modulele opționale oprite. Meniul juriului: Marca, Material nou, Materiale.

## 9. Ordinea de lucru și pragurile

1. Ora 1: testul de generare (în paralel cu stratul extensiei și cu schemele `brand` / `anatomy`).
2. Până la ora 6: drumul cap-coadă cu mock, în aplicația web și în extensie.
3. Ora 6: nu mai adăugăm funcționalități (excepție: video, doar dacă tot fluxul merge).
4. Ora 9: deploy, test pe laptopul de juriu cu extensia instalată, video de rezervă.
