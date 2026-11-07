# Spire, extensia de Chrome

Spire este uliul care citește stilul unei pagini (culori, fonturi, texte, secțiuni) și îl duce în aplicația web, unde se construiește designul pe marca ta. Din meniul uliului, „Fă o campanie” pune aplicația (`/nou?din=extensie`) într-un `iframe` ancorat în dreapta paginii, 420 px lățime.

## Cum o încarci manual

1. `npm run dev` (aplicația rulează pe http://localhost:5173).
2. În Chrome: `chrome://extensions` → activează **Developer mode** → **Load unpacked** → alege folderul `chrome-extension/`.
3. Deschide un site, apasă iconița Spire (fixeaz-o din meniul puzzle).
4. Uliul Spire apare pe pagină; clic pe el deschide meniul.

## Adresa aplicației (deploy)

În `config.js` schimbi `APP_URL` din `http://localhost:5173` pe adresa Vercel, apoi reîncarci extensia din `chrome://extensions` (butonul de reîncărcare).

## Permisiuni și de ce

- `activeTab`: acces temporar la fila pe care ai apăsat iconița, doar după clic.
- `scripting`: injectarea stratului Spire în acea filă.
- `sidePanel`: panoul lateral (aceeași aplicație).
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

Clic pe iconiță arată uliul, fără să încarce aplicația. Uliul se plimbă și aterizează pe
elemente; clic pe el deschide meniul. „Critică pagina” verifică pagina local, apoi te
duce pe rând la elementele cu probleme. Balonul arată problema și un remediu scurt.
Căutarea cu AI este menționată doar la recomandarea privind datele structurate.
„Următorul” avansează imediat;
altfel avansează după aproximativ 8 secunde. „Oprește” întrerupe turul.
Escape închide meniul. Un nou clic pe iconița extensiei ascunde sau arată stratul.
„Fă o campanie” deschide panoul existent cu aplicația la `/nou?din=extensie`.

Critica este deterministă, fără apel AI, cheie sau rețea. Citește cel mult 200 de
elemente dintr-o parcurgere plafonată la 5000 de noduri și arată cel mult 8 observații.
Nu pretinde o evaluare completă de design sau un audit de accesibilitate.
Fundalurile cu imagini ori transparență parțială sunt omise din verificarea de contrast.

Compatibilitate: pagini HTTP(S) obișnuite; Chrome nu permite injectarea pe pagini
interne (`chrome://`), Chrome Web Store sau vizualizatorul PDF. Stilurile locale sunt
în foi construite în shadow root (`adoptedStyleSheets`), astfel încât critica rămâne
independentă de CSP și de iframe. Un site cu `frame-src` restrictiv poate bloca panoul
campaniei. Respectă preferința sistemului pentru mișcare redusă.

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
