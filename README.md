# ⚡ Hackathon Template (Adobe ITFest)

Piese gata de asamblat pentru un proiect **interactiv**, nu un dashboard. Fiecare modul merge singur.
La hackathon alegeți ideea după temă și combinați 2–3 module. Logica specifică ideii o scrieți acolo.

| Modul | Ce face | Unde |
|---|---|---|
| **Cameră + gesturi** | Urmărirea mâinilor în browser (MediaPipe): ciupit, pumn, palmă, arătător, V, swipe, cursor netezit, desen în aer. Față (zâmbet, clipit) opțional. | `src/modules/camera/` |
| **Voce** | Vorbire → text și text → vorbire în română, gratuit (Web Speech API). | `src/modules/voice/` |
| **AI structurat** | `ask({ prompt, schema, files })` → JSON validat cu Zod. Gemini, Claude sau `mock`. Acceptă imagini și PDF. | `src/lib/ai.ts`, `server/` |
| **Design editabil** | Pânză Fabric.js: AI-ul generează, omul editează. Export PNG/SVG/JSON. | `src/modules/canvas/`, `src/lib/design.ts` |
| **Share prin QR** | Juriul își ia rezultatul pe telefon. | `src/lib/share.ts`, `src/components/QrPanel.tsx` |
| **Multiplayer** | Camere cu cod/QR, jucători live, stare comună, mesaje. Supabase Realtime sau local între tab-uri. | `src/modules/rooms/` |
| **Adobe PDF** | Viewer oficial Adobe (PDF Embed API) + AI care răspunde cu pagina sursă. | `src/modules/adobe/` |
| **Add-on Adobe Express** | Puntea către Express: același `/api/ai` desenează pe pagina Express. *Opțional, netestat în Express.* | `adobe-express-addon/` |

**Totul merge fără nicio cheie.** AI-ul cade pe `mock`, multiplayer-ul pe tab-uri locale. Așa puteți dezvolta și repeta pitch-ul chiar dacă pică internetul.

---

## Start rapid

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run dev
```

Deschide http://localhost:5173. Pagina de start arată ce e configurat. `npm install` copiază și modelele MediaPipe în `public/mediapipe/`, ca să meargă și cu internet slab.

Cerințe: Node ≥ 22.18, Chrome sau Edge (pentru voce).

## De ce stack-ul ăsta

- **Vite + React + TypeScript**: cel mai cunoscut stack, așa că și asistenții AI de cod îl scriu cel mai bine. Pornește instant.
- **Totul în browser**, în afară de apelul AI. Camera, gesturile și vocea rulează local: nu depind de Wi-Fi-ul din sală și nu costă nimic.
- **Un singur `npm run dev`**: funcțiile din `api/` (aceleași care rulează pe Vercel) sunt servite de Vite local, deci nu aveți nevoie de `vercel dev` sau de un al doilea server.
- **Zod ca sursă unică de adevăr**: aceeași schemă devine JSON Schema pentru AI (structured outputs), validare în browser și tipuri TypeScript.
- **Fabric.js** pentru design editabil: selecție, redimensionare, editare text și export SVG fără să le scrieți voi.
- **Gemini sau Claude**: Gemini are free tier, Claude e mai bun la layout-uri și raționament. Schimbați dintr-o variabilă de mediu.

## Cum folosești modulele

### AI structurat
```ts
import { z } from "zod";
import { ask } from "./lib/ai";

const Verdict = z.object({ score: z.number(), feedback: z.string() });
const { data } = await ask({
  prompt: "Notează designul de la 1 la 10 și spune de ce.",
  schema: Verdict,
  files: [camera.capture()],           // imagini (data URL) sau File/Blob, inclusiv PDF
  mock: { score: 7, feedback: "demo" } // ce primești în modul demo
});
data.score; // tipat
```
`askText({ prompt })` întoarce text liber. Cheile stau doar pe server (`/api/ai`) și nu ajung în browser.

### Cameră + gesturi
```tsx
const cam = useCamera();
const { hands } = useHands(cam.videoRef, {
  enabled: cam.status === "ready",
  onFrame: (hands) => {
    const h = hands[0];
    if (h?.gesture === "pinch") draw(h.pointer); // pointer: {x, y} 0..1, netezit
    if (h?.swipe === "left") nextSlide();
  },
});
return <CameraView videoRef={cam.videoRef} hands={hands} />;
```
Logica de gesturi e pură și testată (`gestures.ts`). Pragurile se pot ajusta acolo.

### Design editabil
```tsx
const ref = useRef<DesignCanvasHandle>(null);
const { data } = await ask({ system: designSystemPrompt(1080, 1350), prompt, schema: AiDesign });
<DesignCanvas ref={ref} design={data} onChange={setDesign} />
ref.current.exportPNG(2); ref.current.exportSVG(); ref.current.addPath(pointsToPath(trail));
```

### Multiplayer
```ts
const room = useRoom<{ round: number }>(code, { name, initialState: { round: 1 } });
room.players; room.isHost;
room.setState(s => ({ round: s.round + 1 }));     // ajunge la toți
room.send("vote", 2); room.on("vote", (v, from) => …);
```
QR pentru intrare: `<QrPanel url={roomJoinUrl(code)} />`.

### Voce
```ts
const speech = useSpeechRecognition({ lang: "ro-RO", onFinal: (text) => … });
speech.start(); await speak("Gata!");
```

## Rețetă: ideea voastră în 4 pași

1. Creați `src/pages/IdeeaNoastraPage.tsx`. Porniți de la pagina cea mai apropiată, de obicei `PipelinePage.tsx`.
2. Adăugați ruta în `src/App.tsx` (`<Route path="/idee" component={...} />` și o intrare în `NAV`).
3. Scrieți schema Zod pentru ce trebuie să întoarcă AI-ul și un `mock` realist pentru demo.
4. Construiți **un singur flux cap-coadă** înainte de orice extra.

## Configurare chei (opțional)

Toate se pun în `.env` (vezi `.env.example`). Reporniți `npm run dev` după ce le schimbați.

- **Gemini**: cheie de la https://aistudio.google.com/apikey → `GEMINI_API_KEY`. Dacă primiți 429, setați `GEMINI_MODEL` la un model `-flash-lite`.
- **Claude**: cheie de la https://platform.claude.com/settings/keys → `ANTHROPIC_API_KEY`. Implicit e `claude-opus-5-5` cu `ANTHROPIC_EFFORT=low`, ca răspunsurile să fie rapide la demo.
- **Supabase** (multiplayer între telefoane + link-uri scurte în QR):
  1. Creați un proiect pe https://supabase.com și copiați URL-ul și cheia publică (anon/publishable) în `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
  2. Realtime (broadcast + presence) merge fără tabele.
  3. Pentru QR cu imagini: *Storage → New bucket* `shares`, **public**, plus o politică care permite `insert` pentru rolul `anon` pe acel bucket.
- **Adobe PDF Embed**: creați un Client ID gratuit, legat de domeniu (`localhost` pentru dev, domeniul Vercel pentru deploy) → `VITE_ADOBE_PDF_CLIENT_ID`.

## Deploy și telefoane

Camera și microfonul pe telefon cer **HTTPS**. Cel mai simplu e deploy-ul pe Vercel:

```bash
npx vercel
```

Setați aceleași variabile în *Vercel → Project → Settings → Environment Variables*. Funcțiile din `api/` devin endpoint-uri serverless automat, iar `vercel.json` trimite restul rutelor la aplicația React.

Pe rețeaua locală, `npm run dev` ascultă și pe IP-ul laptopului (`host: true`). Asta e util pentru multiplayer de pe telefon, dar camera de pe telefon tot cere HTTPS.

## Ziua hackathonului

- [ ] Întrebați organizatorii dacă e permis cod pregătit dinainte (template generic, public).
- [ ] `npm install` acasă, apoi verificați că `npm run check` trece.
- [ ] Cheile API testate și în `.env`, iar deploy-ul de test pe Vercel funcționează.
- [ ] Hotspot pe telefon ca rezervă pentru Wi-Fi.
- [ ] **Mod demo** (bifa din header sau `?demo=1`) ca plasă de siguranță la pitch.
- [ ] Înregistrați un video de 60 s cu fluxul principal, ca backup.
- [ ] Juriul trebuie să poată încerca singur produsul în primele 10 secunde.

## Comenzi

| Comandă | Ce face |
|---|---|
| `npm run dev` | Aplicația + `/api` local |
| `npm run build` | Typecheck + build de producție |
| `npm test` | Teste unitare (gesturi, scheme, server AI, share) |
| `npm run e2e` | Teste în browser cu cameră falsă și AI mock. Rulați întâi `npx playwright install chromium` |
| `npm run check` | Toate cele de mai sus |
| `npm run addon:schema` | Regenerează schema pentru add-on-ul Express |

## Ce nu a fost testat

- Apelurile reale către Gemini și Claude: testele rulează cu `mock`. Codul urmează SDK-urile oficiale, dar verificați-l cu cheile voastre.
- Viewer-ul Adobe PDF cu un Client ID real și add-on-ul Adobe Express în Express.
- Supabase Realtime și Storage cu un proiect real. Fallback-ul local e testat automat.
