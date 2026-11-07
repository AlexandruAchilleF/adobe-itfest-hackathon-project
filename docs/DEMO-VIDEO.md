# Video-ul demo: Marina Park, filmat cu Playwright

Stare: scenariu decis; filmarea și montajul nu sunt făcute încă.

## Povestea, într-o frază

Proprietarul campingului Marina Park din Vama Veche are un site, n-are designer. Vede pe Google un afiș de camping care îi place. Spire citește afișul găsit și marca de pe site. Afișul și clipul din video sunt create de noi, iar pe scenă spunem asta. Codul verifică, omul aprobă.

Întrebările mutate (`docs/JURIU.md`): **1 Omul** (un business real, cu acordul proprietarului), **4 Diferența** (stilul vine din internet, marca din site, fără prompt), **6 Demo-ul** (tot drumul, pe aplicația reală), **9 Fiabilitatea** (garda și aprobarea omului se văd pe ecran).

## Formatul

**Un singur video, ~1:10**, pentru slide-ul 8 din deck (`public/pitch/demo.mp4`), fără sunet și fără subtitrări: echipa vorbește peste el, live. Scenele, timpii și frazele de voce: `docs/PROMPT-DEMO-VIDEO.md`.

## Cum arată „animat” fără să mințim

Tot ce se mișcă peste pagină e un strat de regie injectat de Playwright (`addInitScript`), separat de aplicație. Aplicația și extensia rulează neatinse.

- **Cursor vizibil**, cu drum curb și încetinire la țintă (Playwright nu desenează cursorul), plus ripple la clic.
- **Spotlight**: restul paginii se întunecă, ținta rămâne decupată, cu colțuri rotunde.
- **Zoom lin** pe zona care contează, revenire după 2–3 secunde.
- **Carduri** de deschidere și final, pagini HTML proprii, în stilul primei pagini.
- **Ritm de om**: tastare cu 40–70 ms pe literă, pauze de citire de 1,2–2 s.

## Regulile filmării

- **Rulare reală, cu Gemini.** Citirea referinței vine din rularea filmată. Dacă ceva pică, refacem rularea întreagă; nu lipim bucăți din rulări diferite.
- **Afișul și clipul sunt create de noi** (`demo-videos/afis-marina-park.png`, `demo-videos/marina-park.mp4`) și spunem asta peste video. Nu le prezentăm ca generate pe loc de Spire.
- **Accelerarea are etichetă.** Scriptul notează timpii reali ai fiecărui pas într-un JSON; montajul taie așteptarea și pune ×N din acele cifre.
- **Referința e a altcuiva** (șablon Envato, cu filigran): spunem „stilul unui afiș găsit”, păstrăm doar așezarea, nu fotografiile lui.
- Fără `?dev=1`, fără chei vizibile, fără notificări.

## Cum se filmează

1. `scripts/demo-video.spec.ts` (în afara lui `npm run check`): Chromium cu extensia reală, fereastră 1920×1080, `recordVideo`, aplicația pe localhost cu `AI_PROVIDER=gemini`.
2. Pagina de căutare: `cautare-google.png` pe tot ecranul, cu afișul `referinta-camping.png` pus ca `<img>` exact peste previzualizarea Pinterest, ca scanarea Spire să-l găsească ca element. E o captură a căutării noastre, servită local, nu Google live.
3. Scriptul scrie `demo-run.json`: începutul și sfârșitul fiecărei scene, timpii generării.
4. Montajul (`scripts/demo/cut.mjs`, cu ffmpeg): taie, accelerează cu etichetă, adaugă cardurile, scoate un MP4 H.264 1080p de ~1:10, fără sunet, sub 50 MB.
5. Trei rulări, alegem cea mai curată.

Asset-uri, în `public/samples/spire/marina-park/`: `logo.png`, `cautare-google.png` (căutarea pe Google Imagini), `referinta-camping.png` (afișul de referință, decupat). Afișul compus de echipă: `public/samples/spire/demo-videos/afis-marina-park.png`.

## Decis (17:20)

1. **marinapark.ro live**, fără copie locală.
2. **Afișul e cel creat deja de noi după referință** (`demo-videos/afis-marina-park.png`). Nu se generează altul; intră în video printr-o campanie salvată, nu prin interceptarea AI-ului.
3. **Fără subtitrări și fără sunet:** echipa vorbește peste video, live. Ecranul stă pe loc cât se spune fraza.
4. **Mouse virtual** care mișcă mouse-ul real al paginii, pe drum curb, cu hover, rotiță și tastare de om.
5. **ffmpeg** instalat (9.0.2, brew).
6. **Un singur video, ~1:10**, nu strict: scenele nu se scurtează ca să încapă. Clipul promoțional ține 15 s. Fără varianta lungă.
7. **Clipul promoțional e cel din repo** (`demo-videos/marina-park.mp4`), nu unul randat la filmare.
8. **Fără critica paginii:** nu schimbă rezultatul. Pe site arătăm doar ce ia Spire de acolo: logo-ul, culorile, pozele.

Promptul complet pentru filmare și montaj: `docs/PROMPT-DEMO-VIDEO.md`.
