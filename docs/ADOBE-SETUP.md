# Pregătirea integrărilor Adobe (de făcut ÎNAINTE de hackathon)

Trei integrări Adobe, în ordinea importanței:

| | Ce e | Cost | Risc la demo |
|---|---|---|---|
| **A. Add-on Adobe Express** | Aplicația voastră rulează *în* Adobe Express | gratuit, fără aprobare | mic |
| **B. Adobe PDF Embed API** | Viewer-ul oficial Adobe pentru PDF în aplicația voastră (există deja în template) | gratuit | mic |
| **C. Adobe Express Embed SDK** | Editorul Adobe Express deschis *din* aplicația voastră | gratuit pentru evaluare și testare | mediu: HTTPS, domenii, login Adobe |

Toate trei cer un **Adobe ID** gratuit. Creați-l acum pe adresa pe care o veți folosi la eveniment și logați-vă cu el pe laptopul de demo.

---

## A. Add-on Adobe Express (recomandat)

Sursa: [Development Tools](https://developer.adobe.com/express/add-ons/docs/guides/getting_started/local_development/dev_tooling/), [Private Distribution Link](https://developer.adobe.com/express/add-ons/docs/guides/build/distribute/private-dist).

1. **Activați modul developer (o singură dată).** Deschideți https://new.express.adobe.com, apăsați avatarul, apoi ⚙️ **Settings**. Activați **Add-on Development** și acceptați Developer Terms of Use.
2. **Creați proiectul** (Node 20+), din folderul în care țineți proiectele:
   ```bash
   npx @adobe/create-ccweb-add-on express-addon --template javascript-with-document-sandbox
   ```
   Dacă CLI-ul pare vechi, rulați întâi `npx clear-npx-cache`.
3. **Puneți fișierele din template.** Copiați peste proiectul nou `adobe-express-addon/src/index.html`, `src/ui/index.js`, `src/sandbox/code.js` și `src/ui/design-schema.json`. În `src/ui/index.js` setați `API_BASE` la adresa aplicației: `http://localhost:5173` local, sau domeniul de pe Vercel.
4. **Porniți add-on-ul:**
   ```bash
   cd express-addon && npm run build && npm run start
   ```
   Serverul pornește pe `https://localhost:5241`. Dacă browserul avertizează despre certificat, deschideți adresa o dată și acceptați.
5. **Încărcați-l în Express.** Deschideți un document, apoi **Add-ons → Your add-ons → Add-on testing**. Introduceți `https://localhost:5241` și bifați acordul. Add-on-ul apare în panoul din stânga.
6. **Pentru juriu: link privat.** Faceți `npm run build && npm run package` (verificați numele scriptului în `package.json`-ul generat de CLI), care produce un zip de cel mult 50 MB, cu `manifest.json` în rădăcină. Din același meniu de add-on-uri creați un listing, încărcați zip-ul, apoi **Create private link** și copiați link-ul. Oricine are link-ul poate instala add-on-ul.

> Numele exacte ale meniurilor din pașii 5–6 pot diferi puțin în interfața curentă; urmați ghidurile Adobe de mai sus dacă nu le găsiți.
> Codul din `adobe-express-addon/` urmează documentația, dar **nu a fost rulat în Express**. Testați pașii 4–5 până joi. Liniile marcate `VERIFICĂ` sunt cele la care am fost cel mai puțin sigur de numele metodelor.

## B. Adobe PDF Embed API (există deja în template, la `/pdf`)

> Pașii de mai jos nu i-am verificat pe interfața curentă. Dacă nu găsiți PDF Embed API în consolă, folosiți butonul „Get credentials” de pe https://developer.adobe.com/document-services/apis/pdf-embed/.

1. Mergeți la https://developer.adobe.com/console și logați-vă.
2. **Create project**, apoi **Add API** și alegeți **PDF Embed API**.
3. La **Allowed domain** scrieți `localhost` pentru dezvoltare. Pentru deploy faceți o a doua credențială, cu domeniul de pe Vercel (de exemplu `numele-vostru.vercel.app`).
4. Copiați **Client ID** în `.env`, în linia `VITE_ADOBE_PDF_CLIENT_ID=...`, apoi reporniți `npm run dev`. Pe pagina `/pdf` încărcați un PDF ca să verificați.

## C. Adobe Express Embed SDK (bonus opțional)

Sursa: [Quickstart](https://developer.adobe.com/express/embed-sdk/docs/guides/quickstart/), [Edit Image](https://developer.adobe.com/express/embed-sdk/docs/guides/tutorials/edit-image). Folosiți doar **v4**: v1 și v2 au ajuns la end-of-life pe 12 mai 2025.

**Cheia (cam 10 minute):**
1. Pe orice pagină din documentația Embed SDK apăsați **Get credentials** (sus, în dreapta). Alternativ, în https://developer.adobe.com/console mergeți la **APIs and services**, căutați cardul **Adobe Express Embed SDK** și apăsați **Create project**.
2. Logați-vă cu Adobe ID.
3. **Credential name:** puneți numele aplicației, de exemplu `Hackathon ITFest`. Trebuie să fie **exact** același cu `appName` din cod.
4. **Allowed domains:** cel mult 5. Puneți:
   - `localhost:5173` (dev)
   - domeniul stabil de pe Vercel, de exemplu `numele-vostru.vercel.app`. Nu folosiți URL-urile de preview, care se schimbă la fiecare deploy.
5. Acceptați Terms of Use, apoi **Create credential**. Cheia apare la **Credential details**.
6. Domeniile se schimbă ulterior din linkul **API Key**, prin **Edit credential** și **Save**.

**Ce trebuie știut:**
- **HTTPS e obligatoriu, inclusiv pe localhost.** Adobe scrie că „all connections must be secure (HTTPS) for both production and development”. Aplicația din template rulează local pe HTTP, deci pentru Embed testați pe deploy-ul Vercel, care are HTTPS, sau adăugați `vite-plugin-mkcert`, ca în exemplul oficial.
- Documentația nu spune nimic despre o aprobare pentru cheia de test. Dacă cheia nu merge în aceeași zi, renunțați la Embed. Nu e critic.
- Eroarea „Adobe Express is not available” înseamnă cheie sau domeniu greșit.
- Unele acțiuni premium (de exemplu `gen-fill`, `remove-object`) consumă Generative Credits din contul Adobe al utilizatorului.

**Testul rapid, cu exemplul oficial (cam 15 minute):**
```bash
git clone https://github.com/AdobeDocs/embed-sdk-samples.git
cd embed-sdk-samples/code-samples/tutorials/embed-sdk-edit-image
npm install
```
Redenumiți `src/.env.example` în `.env`, puneți `VITE_API_KEY="cheia-voastră"`, adăugați `localhost:5555` la Allowed domains, apoi:
```bash
npm run start
```
Dacă editorul se deschide peste imagine și „Save image” întoarce imaginea editată, cheia e bună.

**Codul de integrare (pentru referință):**
```html
<script src="https://cc-embed.adobe.com/sdk/v4/CCEverywhere.js"></script>
```
```js
const { module } = await window.CCEverywhere.initialize({
  clientId: import.meta.env.VITE_ADOBE_EMBED_CLIENT_ID,
  appName: "Hackathon ITFest",            // = Credential name
});
module.editImage(
  { asset: { type: "image", name: "Design", dataType: "blob", data: pngBlob } },
  {
    appVersion: "2",
    callbacks: {
      onPublish: async (intent, publishParams) => {
        const editedDataUrl = publishParams.asset[0].data; // imaginea editată, base64
      },
      onCancel: () => {},
      onError: (err) => console.error(err),
    },
  },
  [
    { id: "download", label: "Download", action: { target: "download" }, style: { uiType: "button" } },
    { id: "save", label: "Salvează în aplicație", action: { target: "publish" }, style: { uiType: "button" } },
  ],
);
```
`pngBlob` vine din `ref.current.exportPNGBlob()` (pânza din template). Dacă o integrăm în template, cheia intră în `VITE_ADOBE_EMBED_CLIENT_ID`, care se adaugă la lista de variabile permise în browser din `AGENTS.md`.

---

## Checklist până joi

- [ ] Adobe ID creat și logat pe laptopul de demo
- [ ] A: modul developer activat, add-on-ul încărcat în Express (pașii 1–5) și link privat creat
- [ ] B: Client ID PDF Embed pentru `localhost` și pentru domeniul Vercel
- [ ] C (opțional): cheie Embed creată, exemplul oficial merge
- [ ] Un video de rezervă pentru fiecare flux Adobe
