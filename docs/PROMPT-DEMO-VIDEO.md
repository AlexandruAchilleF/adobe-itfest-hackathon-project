# Prompt: filmarea video-ului demo Spire (Marina Park)

Copiază tot ce e sub linie într-un asistent de cod deschis în acest repo.

---

Adu în checkout critica lui David din `origin/main` (commit `76260fc`), apoi refă filmarea și montajul după scenariul de mai jos. Citește întâi `AGENTS.md`, `docs/DEMO-VIDEO.md` și `chrome-extension/README.md`. Există deja și se refolosesc: `scripts/demo/director.js` (stratul de regie), `scripts/demo/mouse.ts` (mouse-ul virtual), `scripts/demo/film.ts`, `scripts/demo/cut.mjs`, `scripts/demo-seed.mjs`, `playwright.demo.config.ts`.

Critica e obligatorie în film. Ordinea nu se schimbă: **site → critică → aplicarea ajustărilor → scanare → clip → Google → Inspire → afiș → dashboard.**

## Starea repo-ului și integrarea cu David

- **Lucrează în același checkout, pe `main`, nu într-un worktree.** Nu face commit și nu da push fără să întrebi.
- **`public/pitch/demo.mp4` e vechi** și se înlocuiește. **`scripts/demo/film.ts` filmează scenariul vechi:** rescrie scenele, iar pornirea Chromium, ruta paginii de căutare, ruta mărcii și măsurarea timpilor rămân.
- **`origin/main` are cu un commit în față:** `76260fc`, de la David. Critica lui depinde de tot codul vechi al criticii, inclusiv brief-ul și permisiunea `storage`, deci scoaterea locală a criticii se anulează.

Fă integrarea exact așa, înainte de orice altceva:

1. Salvează o copie în scratchpad: `git diff HEAD --binary` și `tests/extensionBrief.test.ts`.
2. Readu de la `HEAD` (`git restore --source=HEAD --staged --worktree --`) doar aceste fișiere:
   - `chrome-extension/README.md`, `background.js`, `content.js`, `critique.js`, `manifest.json`, `tests/inspire.smoke.mjs`
   - `e2e/extension.spec.ts`, `e2e/fixtures/spire-site.html`, `e2e/integrare.spec.ts`, `e2e/spire.spec.ts`
   - `public/spire-extensie.zip`, `scripts/build-critique.mjs`, `src/index.css`
   - `src/lib/campaignQueue.ts`, `critique.ts`, `critiqueAi.ts`, `critiqueClient.ts`, `extensionBridge.ts`, `gaps.ts`, `landingCritique.ts`
   - `src/modules/mascot/MascotFigure.tsx`, `src/pages/spire/CampaignWorkspace.tsx`, `LandingMockups.tsx`, `LandingPage.tsx`, `NewCampaignPage.tsx`
   - `tests/campaignQueue.test.ts`, `tests/critique.test.ts`, `critiqueAi.test.ts`, `critiqueBrief.test.ts`, `critiqueBundle.test.ts`, `critiqueClient.test.ts`, `extensionPackage.test.ts`, `landingCritique.test.ts`
3. Șterge `tests/extensionBrief.test.ts`, pentru că testează `CampaignBrief`, care dispare.
4. În `package.json`, readu scriptul `ext:critique` și păstrează `demo:seed`, `demo:film`, `demo:cut`.
5. **Nu atinge** munca de pitch și filmare: `docs/*`, `.gitignore`, `src/pitch/deck.ts`, `src/pages/PitchPage.tsx`, `src/scenario/scenarios/spire.ts`, `tests/pitch.test.ts`, `playwright.demo.config.ts`, `public/pitch/`, `scripts/demo-seed.mjs`, `scripts/demo/`, `docs/demo/`.
6. Rulează `git merge --ff-only origin/main`. Dacă nu merge, oprește-te și spune.
7. Rulează `npm run check`. Dacă nu e verde din cauza integrării, repară minimal și spune ce ai schimbat.

Ce am aflat deja la filmare:
- Zoom-ul stă pe `body`. Pe `<html>`, Chromium rămâne cu pagina desenată tăiat după revenire.
- Injectarea caută tab-ul după adresa exactă, altfel nimerește alt tab de pe `127.0.0.1`.
- `captureVisibleTab` cere `<all_urls>` în copia extensiei, fiindcă nu există clic real pe iconiță.
- Mouse-ul nu trece peste pozele de pe marinapark.ro: la hover, site-ul pune peste ele un filtru galben. Rotița se dă de pe margine.
- Peste iframe, fereastra de sus nu primește `mousemove`, deci `mouse.ts` trimite poziția direct stratului de regie.
- ffmpeg-ul din brew n-are `drawtext`; eticheta ×N e un PNG.

## Critica și reparația, așa cum le-a construit David

Nu scrie `critiqueFix.ts`, contor sau „Repară tot”. Folosește drumul existent, fără să-l schimbi:

1. Meniul uliului are „Critică pagina”.
2. Critica trece prin AI (`critiqueWithAi`), în iframe-ul aplicației, și rulează cu **Gemini real**. Pe ecran nu trebuie să apară „Analiză simulată” sau „Verificări locale · AI indisponibil”.
3. Critica grupează problemele pe zone (meniu, secțiuni, carduri). Uliul zboară la fiecare zonă, cu contur și balon. Cursorul apasă „Următorul”.
4. Pe rezumat, panoul „Previzualizare Marina Park” are butonul „Aplică ajustările”.
5. Clicul pornește `setCritiquePreview(true)`, care aplică `marinaPreviewCss`, varianta aleasă de echipă: meniu, secțiuni, carduri, subsol. Apoi butonul alternează „Vezi înainte” și „Vezi după”.

**Pe ecran nu apare niciun contor sau scor.** Varianta CSS nu repară problemele una câte una și nu recalculează nimic, deci o cifră ar fi inventată. Dovada vizibilă e comparația înainte/după.

Selectorii din `marinaPreviewCss` sunt testați doar pe un fixture. Verifică întâi pe https://www.marinapark.ro live, cu capturi înainte și după, că schimbarea se vede la 1920×1080. Dacă nu se vede, oprește-te și spune.

Întrebările de brief din balonul uliului nu se filmează. După comparație, drumul merge spre „Fă o campanie”, cu ajustările rămase aplicate. Dacă deschiderea panoului le anulează sau cere răspunsuri, oprește-te și spune; nu schimba logica fără să întrebi.

## Ce se schimbă în cod

Se schimbă doar ce e mai jos, iar rezultatele pregătite pornesc numai cu semnalele de filmare. Fără semnal, comportamentul rămâne cel din `origin/main`, iar `npm run check` trece. Logica pură are teste în `tests/`.

### 1. Clipul din repo în panoul extensiei

Semnalul: `localStorage["spire:demo-rezultate"] = "1"`, pus de filmare cu `context.addInitScript`, inclusiv în iframe-ul panoului.

În `campaignTransport` (`src/lib/campaignQueue.ts`), pentru `kind === "video"` și cu semnalul pus: descarcă clipul din repo, fă din el un `blob:` și întoarce un rezultat care trece de `validateAssetResult`, cu `model: "mock"` și `simulated: true`. `plan` descrie scenele reale ale clipului. Cu semnalul pus, `CampaignWorkspace.tsx` nu afișează `VideoScript`. Progresul e cel real al descărcării.

### 2. Afișul din repo după Inspire

Semnalul: `DEMO_INSPIRE_RESULT` în `config.js`, doar în copia temporară a extensiei. `npm run ext:zip` și pachetul public rămân fără el, iar `tests/extensionPackage.test.ts` verifică asta.

În `generateInspire` (`chrome-extension/content.js`), cu semnalul pus: selecția și captura rămân reale, dar în locul apelului AI se afișează afișul din repo în panoul Inspire, fără linie de status. E un `<img>` direct, cu adresa din aplicație, pentru că `MAX_HTML` nu permite un data URL.

### 3. Dashboard-ul

În schema `Campaign` (`src/lib/campaigns.ts`) adaugă câmpul opțional `video: { url, poster } | null`. Campaniile vechi rămân valide. `CampaignPage.tsx` afișează clipul când există, iar `CampaignCard.tsx` arată un semn mic „Afiș + clip”.

`scripts/demo-seed.mjs` salvează în Supabase campania „Marina Park · Descoperă spiritul Vamii”, cu afișul, referința și clipul. Rămâne idempotent, cu id fix și pereche de ștergere. Garda se calculează cu `guardCampaign`.

Marca din `spire:marca` e încă Gelateria Pip. Filmarea dă Marina Park doar browserului ei, prin `context.route`, și scrie asta în `demo-run.json`.

## Ce iese

1. `public/pitch/demo.mp4`: **un singur video, ~1:20**, pentru slide-ul 8 din deck (`src/pitch/deck.ts`).
2. `docs/demo/demo-run.json`: timpii reali ai scenelor și ai așteptărilor, plus observațiile criticii din rularea filmată.
3. `docs/demo/repere.md`: secunda la care începe fiecare scenă și fraza de voce.

MP4, H.264, 1920×1080, 30 fps, sub 50 MB, **fără sunet** și **fără subtitrări**. Echipa vorbește peste video, live, în sală.

## Fișierele de pornire

- Site-ul: **https://www.marinapark.ro, live**. Fără copie locală, fără `context.route` pe el.
- Căutarea: `public/samples/spire/marina-park/cautare-google.png`, servită local de `scripts/demo/cautare.html`, cu `referinta-camping.png` ca `<img>` peste previzualizarea Pinterest.
- Clipul: `public/samples/spire/demo-videos/marina-park.mp4` (40 s, poster `marina-park.webp`). Nu se randează altul.
- Afișul: `public/samples/spire/demo-videos/afis-marina-park.png` (1080×1620). Nu se generează altul și nu se modifică.
- Marca: `marinaParkBrand` din `src/lib/brand.ts`.

## Scenele

„Timp” e ținta în video-ul final.

| # | Timp | Ce se vede | Regia și animația | Țin | Voce (orientativ) |
|---|---|---|---|---|---|
| 0 | 0:00–0:03 | Card: logo Marina Park, „Camping & Motel · Vama Veche”, peste o fotografie de pe site | Fade din negru; fotografia se mărește lent; logo-ul intră de jos | 2 s | „Marina Park, un camping din Vama Veche. Au site, n-au designer.” |
| 1 | 0:03–0:08 | marinapark.ro live. Uliul intră în zbor peste site. Cursorul vine la uliu, clic, se deschide meniul, clic pe „Critică pagina” | `ring` pe uliu; ripple la fiecare clic | 1 s | „Proprietarul pornește Spire chiar pe site-ul lui.” |
| 2 | 0:08–0:20 | „Analizez pagina…”, accelerat cu ×N. Uliul zboară la fiecare zonă găsită, cu contur și balon, cam 2 s pe oprire. Cursorul apasă „Următorul”, iar pagina derulează lin | `zoom` 1,15 pe prima zonă; ripple la clic | ultimul balon, 1 s | „Găsește problemele singur, zonă cu zonă.” |
| 3 | 0:20–0:30 | Rezumatul. Cursorul apasă „Aplică ajustările”: meniul, secțiunile și cardurile se schimbă. Apoi „Vezi înainte”, „Vezi după” și o derulare lină până la carduri | `spotlight` pe panoul de previzualizare; `ring` pe butoane | „după”, 2 s | „Cere rezolvarea și vede pagina refăcută: meniul, secțiunile, cardurile.” |
| 4 | 0:30–0:38 | Clic pe uliu, „Fă o campanie”, panoul alunecă din dreapta. „Scanează pagina”: linia trece peste site, chenarele se aprind, câmpurile brief-ului se completează pe rând | `spotlight` pe brief; așteptarea AI, accelerată cu ×N | 2 s | „Acum Spire citește pagina și extrage contextul. Nu scrie nimeni un prompt.” |
| 5 | 0:38–0:50 | Tastează în „Ce vrei să creăm?”: „Un clip scurt pentru vară”. „Pregătește video”. Bara de progres, apoi clipul apare în panou și se deschide mare în centru, 6 s | `ring` pe buton; `media` intră cu scalare de la panou, pornește de la secunda 28 | clipul | „Cere un clip direct din extensie și îl primește aici.” |
| 6 | 0:50–0:54 | Tranziție: uliul traversează ecranul și trece la tab-ul de căutare. Cursorul trece peste rezultate și se oprește pe afiș | `spotlight` pe afiș; `zoom` 1,1 | 1,5 s | „Pe Google găsește un afiș care îi place.” |
| 7 | 0:54–0:59 | Uliul coboară pe pagină. Meniu, „Inspire”. Trage selecția peste afiș cu cursorul | `ring` pe „Inspire”; chenarul selecției crește cu mișcarea mâinii | 1 s | „Îl selectează cu Inspire. Atât.” |
| 8 | 0:59–1:09 | Panoul Inspire arată afișul Marina Park. Apoi `card`: referința alunecă din stânga, afișul din dreapta, se opresc alături | `zoom` 1,15 pe afiș; cardul are fundal întunecat | **4 s, liniște** | „Aceeași așezare. Marca lor. Pozele lor.” |
| 9 | 1:09–1:17 | Aceeași tranziție cu uliul, spre `/campanii`. Cardurile intră decalat, iar cel Marina Park are semnul „Afiș + clip”. Clic pe el: pagina campaniei, cu afișul, clipul și verificările. Derulare lină | `ring` pe card; `spotlight` pe afiș, apoi pe clip | 2 s | „Tot ce a făcut îl găsește în dashboard, în campanii.” |
| 10 | 1:17–1:20 | Card final: uliul Spire și adresa aplicației. E ultimul cadru | Uliul aterizează lângă nume; fade în card | 2 s | „Spire. De la o pagină la o campanie, pe marca ta.” |

## Animații și cursor

- **Cursorul se mișcă mereu prin `mouse.ts`**, pe curbe, cu viteză variabilă și ripple la clic. Niciun salt și niciun `locator.click()`.
- **În coloana „Țin”, cursorul stă pe loc și nimic nu se schimbă pe ecran**, ca vocea să aibă timp.
- **Adaugă în `director.js`:** `birdWipe()` (uliul traversează ecranul, tranziția dintre tab-uri) și `split(stânga, dreapta)` (cardul din scena 8). Zoom-ul rămâne cel mult 1,25.
- **Toată regia stă în `#demo-director`**, în top layer. Zborul, conturul și schimbarea paginii sunt ale produsului, nu ale regiei.
- **Ritm:** nicio scenă nu stă pe un ecran static mai mult decât spune „Țin”. Mișcările au ease-in-out, fără tranziții decorative în plus.

## Constrângeri

- **Gemini real, două tipuri de apel:** critica și citirea paginii la scanare. Rulează întâi cu `AI_PROVIDER=mock` până merge tot drumul (acele repetiții nu sunt filmul final), apoi o dată, de două ori, cu cheia. La 429 te oprești și spui; fără reîncercări în buclă.
- Fișierele de filmare stau în afara lui `npm run check`. Comenzi: `npm run demo:film`, `npm run demo:cut`.
- Aplicația pe `localhost:5196`, cu `?dev=0`.
- Cookie-urile de pe marinapark.ro se acceptă înainte de scena 1, în afara video-ului. Pe poze, cursorul stă lângă ele.
- Scena 4 are nevoie de brief: dacă Gemini nu propune un produs, oprește rularea și spune.
- La scena 7, selecția pornește din `startInspire` și se face cu drag real. În timpul capturii, stratul de regie se ascunde odată cu Spire (`watchSpire`).
- **Scenele 2 și 3 nu se sar.** Dacă pică, oprești filmarea și spui. Observațiile Gemini pot diferi între rulări: nu le scrie de mână, iar scriptul găsește butoanele după nume, nu după numărul opririlor. În celelalte scene, ce nu merge notezi în `demo-run.json` și spui la final.
- Nu adăuga altă funcționalitate pentru video.

## Montajul

`scripts/demo/cut.mjs` rămâne: lipește scenele în ordine, cu cross-fade de 400 ms unde nu e `birdWipe`, și accelerează până la 2 s așteptările mai lungi, cu eticheta ×N randată ca PNG. Actualizează frazele de voce și verificările: **ajustările se aplică înainte de 0:32, clipul apare înainte de 0:50**. Export: `-c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -r 30 -movflags +faststart -an`.

## Gata înseamnă

- `npm run demo:film` merge cap-coadă, headed, de două ori la rând, fără intervenție.
- Un singur video, ~1:20, cu toate scenele în ordinea de mai sus.
- Critica se vede cu Gemini real, iar diferența înainte/după se vede clar pe marinapark.ro live.
- Niciun cadru cu `?dev=1`, chei, erori, „Analiză simulată” sau „AI indisponibil”. Dacă apare o eroare, rularea se refilmează.
- `npm run check` trece, iar `public/spire-extensie.zip` conține critica, dar nu și semnalul de filmare.
- La final: calea video-ului, durata, câte apeluri Gemini a făcut rularea filmată, ce a găsit critica și scenele sărite.
