# Prompt: filmarea video-ului demo Spire (Marina Park)

Copiază tot ce e sub linie într-un asistent de cod deschis în acest repo.

---

Construiește filmarea automată a video-ului demo Spire cu Playwright, apoi montajul cu ffmpeg. Citește întâi `AGENTS.md`, `docs/PITCH.md`, `docs/DEMO-VIDEO.md`, `e2e/integrare.spec.ts` (de acolo iei pornirea Chromium cu extensia reală și injectarea) și `chrome-extension/README.md`.

## Ce iese

1. `public/pitch/demo.mp4`: **un singur video, ~1:10**, pentru slide-ul 8 din deck.
2. `docs/demo/demo-run.json`: timpii reali ai fiecărei scene și ai fiecărei așteptări.
3. `docs/demo/repere.md`: secunda la care începe fiecare scenă și fraza de voce, ca echipa să repete pe video.

MP4, H.264, 1920×1080, 30 fps, sub 50 MB, **fără sunet** și **fără subtitrări**. Echipa vorbește peste video, live, în sală.

## Povestea

Proprietarul campingului Marina Park din Vama Veche are un site și n-are designer. Pe Google găsește un afiș de camping care îi place. Spire ia marca de pe site-ul lui (logo, culori, poze) și citește stilul din afișul găsit. Afișul și clipul din campanie sunt create de echipă și se spune asta peste video. Garda verifică, omul aprobă și descarcă.

## Fișierele de pornire

- Site-ul: **https://www.marinapark.ro, live**. Fără copie locală, fără `context.route` pe el.
- Căutarea: `public/samples/spire/marina-park/cautare-google.png` (2000×1141), captura căutării noastre pe Google Imagini, cu previzualizarea Pinterest deschisă în dreapta.
- Referința: `public/samples/spire/marina-park/referinta-camping.png` (552×834), afișul „Adventures Team”, decupat.
- **Afișul campaniei: `public/samples/spire/demo-videos/afis-marina-park.png` (1080×1620), creat deja de echipă după referința de mai sus. Nu genera alt afiș și nu-l modifica.**
- Marca: `marinaParkBrand` din `src/lib/brand.ts` (logo, #006633, #D9AE3C).

## Constrângeri

- **Aplicația și extensia nu se modifică pentru filmare.** Tot ce e regie (cursor, evidențieri, carduri) stă într-un strat injectat de Playwright cu `context.addInitScript`, într-un element propriu (`#demo-director`, `pointer-events: none`, `z-index` maxim), nu în codul aplicației.
- **Afișul intră printr-o campanie salvată, nu prin interceptarea AI-ului.** Nu folosi `route` pe `/api/image` sau `/api/ai` ca să pară generat pe loc. Înainte de filmare, un script de pregătire (`scripts/demo-seed.mjs`) salvează în Supabase (tabela `records`, colecția `spire:campanii`, schema `Campaign` din `src/lib/campaigns.ts`) campania „Marina Park · Descoperă spiritul Vamii”, cu marca Marina Park, referința `referinta-camping.png` și afișul `afis-marina-park.png`. Scriptul e idempotent (id fix) și are pereche de ștergere.
- **Clipul promoțional e cel din repo:** `public/samples/spire/demo-videos/marina-park.mp4` (40 s, făcut de echipă, poster `marina-park.webp`). Nu se randează alt clip și nu se apasă „Pregătește video”: pagina campaniei nu păstrează clipurile după reîncărcare (`recoverJobs` în `src/lib/campaignQueue.ts`), iar aplicația nu se modifică. Clipul apare prin stratul de regie (`media`, mai jos), peste pagina campaniei.
- **Gemini real** (`AI_PROVIDER=gemini`, cheia din `.env`), dar cu un singur tip de apel: citirea referinței („Ce am văzut”). Rulează întâi cu `AI_PROVIDER=mock` până merge tot drumul, apoi o dată, de două ori, cu cheia. Dacă primești 429, oprește-te și spune; nu reîncerca în buclă.
- Fișierele noi stau în `scripts/demo/` și `playwright.demo.config.ts`, în afara lui `npm run check`. Comandă: `npm run demo:film` (filmarea) și `npm run demo:cut` (montajul).
- Aplicația pe `localhost` (`npm run dev`, portul din config), cu `?dev=0`. Fără chei, fără panoul echipei, fără notificări pe ecran.

## Filmarea

- `chromium.launchPersistentContext`, `channel: "chromium"`, **headed**, cu extensia reală pregătită ca în `e2e/integrare.spec.ts` (`APP_URL` spre localhost, `host_permissions` pentru marinapark.ro, 127.0.0.1 și localhost).
- `viewport` 1920×1080, `deviceScaleFactor: 1`, `recordVideo: { dir, size: 1920×1080 }`. Fiecare tab produce propriul fișier video; păstrează ordinea și timpul de start al fiecăruia în `demo-run.json`.
- Pagina de căutare e servită local la `http://127.0.0.1:<port>/demo/cautare.html` (creată de script în `scripts/demo/`, servită prin `context.route`): `cautare-google.png` pe toată lățimea, iar `referinta-camping.png` pus ca `<img alt="Camping Adventure Poster">` **exact peste** previzualizarea Pinterest (în captură: x 1375–1803, y 203–853 din 2000×1141; scalează cu lățimea ferestrei). Așa scanarea Spire găsește afișul ca element. Titlul tab-ului: „camping poster – Căutare Google”.
- Fiecare scenă scrie `{ id, start, end, waits: [{ label, start, end }] }` în `demo-run.json`, cu `performance.now()` raportat la startul fiecărui video.

## Stratul de regie (`scripts/demo/director.js`)

Injectat în fiecare pagină din `top` (nu în iframe-uri). Expune pe `window.__demo`:

- `cursor`: **mouse virtual** care arată ca un om folosind aplicația (detalii mai jos). Ripple coral (#FF6B57) la `mousedown`, 450 ms.
- `ring(selectorOrRect)`: inel coral de 3 px, pulsează o dată, 800 ms, înainte de un clic important.
- `spotlight(rect, ms)`: restul paginii se întunecă la 55%, ținta rămâne decupată cu colțuri de 16 px; intră și iese în 400 ms.
- `zoom(rect, scale, ms)`: `transform: scale()` pe `document.documentElement`, cu `transform-origin` în centrul țintei, ease-in-out 900 ms, revenire la fel. Maxim 1,25.
- `card(html, ms)`: card pe tot ecranul, fundal închis, Geist, fade 500 ms. Folosit doar pentru deschidere și final.
- `tag(text)`: etichetă mică în colțul din dreapta sus, pentru „Accelerat ×N”.
- `media(src, { from, ms })`: pagina se întunecă la 70%, iar clipul intră în centru, într-un cadru cu colțuri de 16 px și umbră (scale 0,92 → 1, 500 ms), pornit de la secunda `from`, fără sunet; după `ms` iese la fel. Clipul e servit de aplicație (aceeași origine).

### Mouse-ul virtual (`scripts/demo/mouse.ts`)

Playwright nu desenează cursorul și sare direct la țintă. Fă un modul care mișcă **mouse-ul real** al paginii (`page.mouse`), ca hover-ul, focusul și clicurile să fie adevărate, iar stratul de regie desenează cursorul exact unde e mouse-ul (ascultă `mousemove` în captură, pe `window`).

- **Aspect:** săgeata standard macOS, albă cu contur negru, 28 px, umbră fină. Se face mână (pointer) peste linkuri și butoane, după `getComputedStyle(el).cursor` al elementului de sub ea; bară de text peste câmpuri.
- **Drumul:** curbă Bézier cu un punct de control deviat lateral 5–15% din distanță, nu linie dreaptă. Viteza după legea lui Fitts: 350–1100 ms după distanță și mărimea țintei, accelerează și încetinește (ease-in-out), cu un mic depășit de 3–6 px și corecție înainte de țintă la drumurile lungi. Pas la ~16 ms (`page.mouse.move` cu un punct pe cadru).
- **Ținta:** nu centrul perfect al butonului, ci un punct aleator în zona din mijloc (40–60% pe ambele axe).
- **Clicul:** oprire 120–300 ms pe țintă (hover-ul se vede), `mouse.down`, 60–110 ms, `mouse.up`. Ripple la down.
- **Derularea:** cu rotița (`page.mouse.wheel`), în impulsuri de 80–140 px la 40–70 ms, cu încetinire la final. Fără `scrollIntoView` brusc: dacă ținta e în afara ecranului, mouse-ul derulează până la ea.
- **Tastarea:** clic în câmp întâi, apoi `keyboard.type` literă cu literă, 45–110 ms, cu pauză mai lungă după spațiu și virgulă.
- **Repausul:** în pauzele de voce mouse-ul nu îngheață și nu dansează: derivă 2–6 px, foarte lent, sau stă lângă elementul despre care se vorbește, fără să-l acopere.
- **Între tab-uri:** poziția mouse-ului se păstrează; noul tab pornește cu cursorul de unde a rămas.
- **Reproductibil:** toate valorile „aleatoare” vin dintr-un generator cu seed fix (`DEMO_SEED`), ca două rulări să arate la fel.
- API: `await mouse.click(locatorSauRect)`, `mouse.hover(...)`, `mouse.type(locator, text)`, `mouse.scrollTo(locatorSauY)`, `mouse.idle(ms)`. Scenele folosesc **doar** aceste funcții, niciodată `locator.click()` direct (ar sări cursorul).

Pentru elementele din extensie (shadow root `#spire-root`) și din iframe-ul panoului, ia `boundingBox()` în Playwright și trimite dreptunghiul la strat.

**Ritmul e pentru voce.** Fără subtitrări, ecranul trebuie să stea cât să se poată spune fraza. Fiecare scenă are pauza ei de voce (coloana „Țin”), în care nu se schimbă nimic, iar mouse-ul e în repaus (`mouse.idle`).

Pentru clicuri în iframe-ul panoului, ia `boundingBox()` al elementului din frame (e deja în coordonatele paginii) și dă-l lui `mouse.click`.

## Scenele

Un singur drum, ~1:10. Durata nu e strictă: scenele nu se scurtează ca să încapă într-un minut. „Timp” e ținta în video-ul final; „Voce” e ce spune echipa, aici ca să știi cât stă ecranul pe loc.

| # | Timp | Ce face scriptul | Evidențiere | Țin | Voce (orientativ) |
|---|---|---|---|---|---|
| 0 | 0:00–0:04 | Card: logo Marina Park, „Camping & Motel · Vama Veche”, peste o fotografie de pe site, întunecată | Fade din negru | 3 s | „Marina Park, un camping din Vama Veche. Au site, n-au designer.” |
| 1 | 0:04–0:12 | Deschide marinapark.ro live și așteaptă încărcarea. Cursorul trece pe rând peste logo și peste 2–3 poze (clădirea din piatră noaptea, hamacele, cortul), derulând cu rotița cât e nevoie, apoi înapoi sus. Fără Spire pe site și fără critică. | `ring` pe logo și pe fiecare poză, unul după altul, ~1,2 s fiecare | 2 s | „De aici Spire ia marca: logo-ul, culorile, pozele lor.” |
| 2 | 0:12–0:17 | Tab nou: pagina de căutare. Cursorul trece peste rezultate și se oprește pe afiș | `spotlight` pe afiș, 2,5 s | 3 s | „Pe Google a găsit un afiș care îi place.” |
| 3 | 0:17–0:23 | Injectează Spire pe căutare. „Scanează pagina”, așteaptă chenarul aprins pe afiș, strânge panoul, clic pe chenar | `ring` pe chenar | 2 s | „Îi arată lui Spire afișul. Fără prompt.” |
| 4 | 0:23–0:30 | Panoul: așteaptă „Ce am văzut” (răspunsul real Gemini despre referință) | `zoom` 1,2 pe listă | 3 s | „Spire citește așezarea: titlu de mână, poza mare, trei polaroiduri. Nu copiază pozele.” |
| 5 | 0:30–0:31 | Deschide în tab nou campania salvată, `/campanii/<id fix>` | Cross-fade 400 ms între tab-uri | — | — |
| 6 | 0:31–0:39 | Pagina campaniei, cu afișul `afis-marina-park.png`. Întâi `card` împărțit: referința stânga, afișul dreapta, 4 s; apoi revine la pagină | `spotlight` pe afiș după card | **4 s, liniște** | „Afișul l-am făcut noi: același stil, marca și pozele lor.” |
| 7 | 0:39–0:48 | Garda: arată bifele (culori, contrast, text exact) 2 s. Apoi schimbă telefonul pe un strat (`0723 690 941` → `0723 690 000`), tastat de mouse-ul virtual; bifa se face roșie, cu motivul; revine la textul aprobat și bifa e verde | `spotlight` pe bife; `zoom` 1,25 pe bifă când se schimbă | 3 s | „Asta nu e AI, e cod. Textul, culorile și contrastul se verifică, omul decide.” |
| 8 | 0:48–1:03 | **Clipul promoțional din repo, 15 s:** `media('/samples/spire/demo-videos/marina-park.mp4', { from, ms: 15000 })`, mare (cel puțin 80% din înălțimea ecranului). Alege cele mai bune 15 s din cele 40 (uită-te la cadre cu ffmpeg înainte): cu mișcare, cu pozele campingului și cu logo-ul sau numele Marina Park spre final | Intrarea și ieșirea clipului; mouse-ul stă ascuns cât rulează | tot clipul | „Și clipul promoțional, tot făcut de noi.” Restul, liber: echipa vorbește peste clip |
| 9 | 1:03–1:09 | „Descarcă PNG”, apoi card final: uliul Spire și adresa aplicației, scrisă mare (fără QR: Spire lucrează prin extensia de Chrome, nu pe telefon). Cardul e ultimul cadru și rămâne pe ecran după ce video-ul se oprește | `ring` pe buton; fade în card | 3 s | „Gata de postat.” |

**Afișul apare la 0:31**, înainte de secunda 40, cum cere `docs/PITCH.md`.

Pe marinapark.ro, găsește logo-ul și pozele în pagina live (`img` vizibile, după `src` sau `alt`), nu după coordonate fixe. Dacă una dintre cele trei poze nu e pe pagina principală, ia altă fotografie mare vizibilă. Inelele sunt regie: nu sugerează că Spire rulează pe site în acel moment.

Dacă extensia cere un brief ca să deschidă panoul pe pagina de căutare, completează-l, dar nu intră în video: taie curat între scenele 2 și 3.

Scena 7 depinde de ce are pagina campaniei azi (`src/pages/spire/CampaignWorkspace.tsx`, `src/modules/canvas/`). Dacă o acțiune nu există sau nu merge pe campania salvată, sari peste ea, lungește proporțional scenele 6 și 9 (clipul rămâne la 15 s), notează în `demo-run.json` și spune la final. Nu adăuga funcționalitate pentru video.

## Montajul (`scripts/demo/cut.mjs`, ffmpeg instalat cu brew)

1. Citește `demo-run.json` și video-urile `.webm` ale tab-urilor; le lipește în ordinea scenelor (cross-fade 400 ms la schimbarea tab-ului).
2. **Așteptările** (AI, randare) mai lungi de 2 s: accelerate cu `setpts` până încap în 2 s, iar ×N calculat din durata reală apare în colț (deja pus de `tag` la filmare, sau `drawtext` la montaj; alege una). Fără tăieturi ascunse în mijlocul unei acțiuni.
3. Durata țintă e ~1:10 și nu e strictă. Nu scurta scenele ca să încapă; scurtează doar așteptările (pasul 2). Clipul promoțional rămâne la 15 s.
4. Export: `-c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -r 30 -movflags +faststart -an`. Verifică cu `ffprobe` durata, rezoluția și mărimea.
5. Scrie `docs/demo/repere.md` din timpii reali ai montajului.

## Gata înseamnă

- `npm run demo:film` merge cap-coadă, headed, de două ori la rând, fără intervenție.
- Un singur video, ~1:10 (nu strict); afișul apare înainte de 0:40, iar fiecare scenă stă pe loc cât spune coloana „Țin”.
- Niciun cadru cu `?dev=1`, chei, erori sau „AI indisponibil”. Dacă apare un mesaj de eroare, rularea se refilmează, nu se ascunde la montaj.
- `npm run check` trece ca înainte (filmarea nu e în el).
- La final: calea video-ului, durata, câte apeluri Gemini a făcut rularea filmată și scenele sărite.
