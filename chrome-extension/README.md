# Spire, extensia de Chrome

Spire este uliul care citește stilul unei pagini (culori, fonturi, texte, secțiuni) și îl duce în aplicația web, unde se construiește designul pe marca ta. Din meniul uliului, „Fă o campanie” pune aplicația (`/nou?din=extensie`) într-un `iframe` ancorat în dreapta paginii, 480 px lățime.

## Cum o încarci manual

1. `npm run dev` (aplicația rulează pe http://localhost:5173).
2. În Chrome: `chrome://extensions` → activează **Developer mode** → **Load unpacked** → alege folderul `chrome-extension/`.
3. Deschide un site, apasă iconița Spire (fixeaz-o din meniul puzzle).
4. Uliul Spire apare pe pagină; clic pe el deschide meniul.

## Adresa aplicației (deploy)


`config.js` rămâne pe `http://localhost:5173`, pentru dezvoltare. Pachetul de descărcare are adresa publică: `npm run ext:zip` copiază extensia într-un folder temporar, pune în copie `APP_URL = "https://adobe-itfest-hackathon-project.vercel.app"` și scrie `public/spire-extensie.zip`, fără README și fără teste. ZIP-ul se comite; `tests/extensionPackage.test.ts` pică dacă rămâne în urma sursei.

## Permisiuni și de ce

- `activeTab`: acces temporar la fila pe care ai apăsat iconița, doar după clic.
- `scripting`: injectarea stratului Spire în acea filă.
- `storage`: răspunsuri păstrate explicit, separat pe originea site-ului.
- Fără `host_permissions` și fără scripturi declarate: nimic nu rulează pe site-uri până nu apeși iconița. `overlay.css` e resursă accesibilă din pagină (nu dă acces la site-uri).

## Fișierele

- `manifest.json`: Manifest V3, permisiunile, service worker-ul.
- `config.js`: `APP_URL` și `APP_ORIGIN`, pe `globalThis.SPIRE_CONFIG`; script clasic, folosit în fundal și în pagină.
- `background.js`: la clic injectează, în ordine, config.js, mascot-poses.js, critique.js, content.js (`injectSpire(tabId)`).
- `content.js`: stratul din pagină, în shadow root (chenare de scanare, iframe).
- `overlay.css`: referința stilurilor panoului și chenarelor; copia din content.js se aplică împreună cu stilurile uliului prin adoptedStyleSheets în shadow root, fără CSS extern. La modificarea panoului, ține copia sincronizată.

## Testul

`npx playwright test --project extension`

## Critica pe pagină

Clic pe iconiță arată uliul fără panou. „Critică pagina” citește cel mult 200 de elemente într-o parcurgere plafonată, pregătește opțional o captură JPEG curată (maximum 960 px) și cere o singură analiză prin aplicația configurată și endpoint-ul AI existent. Iframe-ul de transport rămâne ascuns până alegi campania. Așteptarea este plafonată: circa 2 secunde pentru aplicație, 10 pentru AI și cel mult 13 în total. Nu se configurează chei în extensie.

Turul arată cel mult cinci observații succinte; propunerile la condițional apar la final. „Următorul” avansează, „Oprește” anulează și ignoră răspunsurile întârziate. Rezultatul mock este etichetat „Analiză simulată”. Dacă aplicația/AI nu răspunde sau CSP blochează iframe-ul, turul folosește „Verificări locale · AI indisponibil”. Nu pretinde un audit complet sau verificări de interacțiune.

Compatibilitate: pagini HTTP(S) obișnuite; Chrome blochează injectarea pe pagini interne, Chrome Web Store și vizualizatorul PDF. Stilurile locale din shadow root rămân independente de CSP. Un `frame-src` restrictiv poate împiedica AI și campania; verificările locale continuă. Preferința de mișcare redusă este respectată.

### Regenerarea desenelor și regulilor

Din rădăcina proiectului:

```sh
npm run ext:poses
npm run ext:critique
```

Aceste comenzi regenerează `mascot-poses.js` din desenul React și `critique.js`
din regulile pure. Nu edita manual fișierele generate.

`npm run e2e -- --project=extension` pornește Chromium cu o copie temporară a extensiei.
Doar copia primește permisiuni pentru fixture și `globalThis.__spireTestSpeed = 0.08`
înaintea scriptului: duratele zborului, plimbării și balonului sunt accelerate.
Testul instrumentează numai copia pentru a citi faptele extrase. Extensia distribuită
folosește duratele normale și nu expune aceste fapte în DOM.

După critică, Spire propune cel mult trei modificări și întreabă ce promovezi, cui te adresezi și ce vrei să obții; pentru acțiuni neclare cere și textul butonului. „Păstrează răspunsurile” le salvează explicit în stocarea extensiei (`chrome.storage.local`), separat pe originea site-ului. „Uită răspunsurile” le șterge. Răspunsurile rămân editabile, iar erorile de stocare sunt afișate. Nu sunt scrise în localStorage-ul site-ului.

„Continuă cu o campanie” deschide aplicația configurată. Brief-ul (URL, titlu și răspunsuri) pleacă numai după `spire:brief-ready` de la iframe-ul aplicației, cu sursa și originea verificate. Aplicația validează limitele, arată câmpurile editabile și le folosește la generare și salvare; analiza unei referințe le păstrează. Campania pornește numai la „Fă campania”; deschiderea panoului nu scanează automat pagina.

## Sidebar-ul campaniei

După întrebări, „Continuă cu o campanie” arată propunerile detaliate și secțiunea de vizibilitate în căutările cu AI. Descrierea omului, răspunsurile și clarificările intră în snapshotul fiecărui material. Draftul și coada rămân în browser, separat pe site; un reload nu repetă automat generarea.

„Generează imagine” și „Propune logo” folosesc `/api/image`. Rezultatele mock sunt marcate ca simulate. „Pregătește video” folosește un clip de demo mapat explicit pe domeniu. Interfața îl arată după o animație de randare de circa 20 de secunde (`window.__spireVideoMs` o scurtează în teste), fără eticheta „clip pregătit anterior”; în date, rezultatul rămâne marcat `prerecorded`. Clipul are buton „Ecran complet”, iar iframe-ul din extensie permite fullscreen. Pentru `marinapark.ro`, clipul este local, la `public/samples/spire/demo-videos/marina-park.mp4` (40 s), preluat din portofoliul echipei Exedria. Domeniile fără clip configurat primesc o stare de indisponibilitate, nu un material inventat.

Adaptorul aplicației pentru critică și recomandări de căutare este `src/lib/critiqueClient.ts`. Contractele pure ale engine-ului și gateway-ul din service worker rămân compatibile în `src/lib/critiqueAi.ts` și `background.js`; turul și campania folosesc transportul corelat al aplicației, fără un al doilea apel AI.


## Inspire: selecție → cod → demo pe pagină

Din meniul uliului, **Inspire** pornește selecția cu mouse-ul. Trage un dreptunghi peste zona dorită; `Esc` anulează. Extensia trimite numai captura decupată și textele selectate la motorul AI configurat în `config.js`, prin gateway-ul existent din service worker.

Rezultatul HTML/CSS apare peste pagină într-un iframe cu `sandbox` fără permisiuni, fără scripturi și fără acces la rețea. Pagina originală rămâne intactă. **Vezi codul** arată documentul efectiv randat; **Selectează din nou** pornește o altă selecție. Modul mock este etichetat „Demo simulat”. Închiderea demo-ului ignoră răspunsurile întârziate.

Verificarea fluxului (Chromium, AI dublat controlat): `node chrome-extension/tests/inspire.smoke.mjs`. Acoperă selecție mică, Esc, captura decupată, generarea, CSS randat, izolarea HTML, eroare și reîncercare.
