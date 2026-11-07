# Spire, extensia de Chrome

Spire este uliul care citește stilul unei pagini (culori, fonturi, texte, secțiuni) și îl duce în aplicația web, unde se construiește designul pe marca ta. Extensia pune aplicația (`/nou?din=extensie`) într-un `iframe` ancorat în dreapta paginii, 420 px lățime.

## Cum o încarci manual

1. `npm run dev` (aplicația rulează pe http://localhost:5173).
2. În Chrome: `chrome://extensions` → activează **Developer mode** → **Load unpacked** → alege folderul `chrome-extension/`.
3. Deschide un site, apasă iconița Spire (fixeaz-o din meniul puzzle).
4. Spire apare în dreapta paginii.

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
- `background.js`: la clic injectează `config.js` și `content.js` (`injectSpire(tabId)`).
- `content.js`: stratul din pagină, în shadow root (chenare de scanare, iframe).
- `overlay.css`: stilurile stratului, încărcate în shadow root.

## Testul

`npx playwright test --project extension`
