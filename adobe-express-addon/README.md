# Add-on Adobe Express (opțional)

Dacă tema hackathonului cere ceva *în* Adobe Express, aici e puntea: add-on-ul cere
un design de la **același** `/api/ai` din template și îl desenează direct pe pagina
Express, ca obiecte editabile (dreptunghiuri, elipse, linii, text).

> ⚠️ Codul urmează documentația oficială ([Project Anatomy](https://developer.adobe.com/express/add-ons/docs/guides/getting-started/addon-project-anatomy),
> [Communication APIs](https://developer.adobe.com/express/add-ons/docs/references/document-sandbox/communication/),
> [Use Text](https://developer.adobe.com/express/add-ons/docs/guides/learn/how_to/use_text)), dar **nu a fost rulat în Express**.
> Testați-l înainte de eveniment și verificați numele metodelor marcate cu `VERIFICĂ`.

## Pași

1. Activează modul developer în Adobe Express: *Settings → Add-on Development*.
2. Creează proiectul cu CLI-ul oficial, pe template-ul cu document sandbox:
   ```bash
   npx @adobe/create-ccweb-add-on express-addon --template javascript-with-document-sandbox
   ```
3. Înlocuiește `src/ui/index.js`, `src/sandbox/code.js` și `src/index.html` cu fișierele din folderul ăsta.
4. În `src/ui/index.js` setează `API_BASE` la URL-ul aplicației (local: `http://localhost:5173`, sau deploy-ul Vercel).
   `/api/ai` are deja CORS pentru `*.wxp.adobe-addons.com` și `localhost`.
5. Pornește: `npm run build && npm run start`, apoi în Express: *Add-ons → Your add-ons → Add-on testing* și conectează-te la `https://localhost:5241`.

## Cum funcționează

```
iframe UI (src/ui/index.js)                document sandbox (src/sandbox/code.js)
  ├─ fetch(API_BASE + "/api/ai")             └─ runtime.exposeApi({ drawDesign })
  │    → JSON Design (aceeași schemă ca            → editor.createRectangle / createEllipse /
  │      src/lib/design.ts din template)              createLine / createText
  └─ sandboxProxy.drawDesign(design) ───────────────►
```

Schema JSON a designului e generată din `AiDesign` (Zod) — vezi `src/ui/design-schema.json`.
Dacă schimbați schema în template, regenerați fișierul:

```bash
npm run addon:schema
```
