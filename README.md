# ⚡ Hackathon Template (Adobe ITFest)

Piese gata de asamblat pentru un proiect **interactiv**, nu un dashboard, plus uneltele de business
pentru pitch. Fiecare modul merge singur. La hackathon alegeți ideea după temă și combinați câte o piesă din fiecare rând:

1. **Problema și cine plătește**: business canvas generat de AI și sondaj live de validare.
2. **Input neobișnuit**: mâini, față, corp, voce, sunet, telefonul ca controller, hardware.
3. **AI ca mecanism**: răspunsuri structurate și comenzi vocale care execută acțiuni.
4. **Rezultat editabil, luat acasă**: design editabil, QR, PDF.

> Citiți întâi [`docs/BUSINESS.md`](docs/BUSINESS.md): problemă, cumpărător, piață, adopție și structura pitch-ului de 3 minute.

**Totul merge fără nicio cheie.** AI-ul cade pe `mock`, multiplayer-ul pe tab-uri locale. Așa puteți dezvolta și repeta pitch-ul chiar dacă pică internetul.

### Business și pitch

| Modul | Ce face | Unde |
|---|---|---|
| **Business canvas** | AI-ul transformă ideea în problemă, utilizator vs. cumpărător, preț, piață bottom-up, adopție, concurență, riscuri și întrebările grele ale juriului. Export Markdown. | `src/lib/business.ts`, `/business` |
| **Sondaj de validare live** | QR, iar participanții și mentorii răspund de pe telefon. Primiți fraze de pitch („18 din 25 (72%) au spus Da”), export CSV și un rezumat AI. | `src/lib/survey.ts`, `/survey` |
| **Mod kiosk + contor** | `?kiosk=1`: ecran de start, reset după inactivitate, „🔥 N oameni au încercat azi”. | `src/modules/demo/` |
| **Înregistrare** | Butonul `⏺ Rec` filmează tab-ul cu sunet, pentru video-ul de rezervă. Merge și pentru cameră sau un canvas. | `src/modules/demo/recorder.ts` |

### Interacțiune

| Modul | Ce face | Unde |
|---|---|---|
| **Mâini + gesturi** | Urmărirea mâinilor în browser (MediaPipe): ciupit, pumn, palmă, arătător, V, swipe, cursor netezit, desen în aer. | `src/modules/camera/` |
| **Față + corp** | Zâmbet, clipit, wink, gura deschisă, sprâncene și direcția capului (cursor controlat cu capul, pentru accesibilitate), plus postura corpului (mâini sus, T-pose). | `useFace.ts`, `usePose.ts` |
| **Voce** | Vorbire → text și text → vorbire în română, gratuit (Web Speech API). | `src/modules/voice/` |
| **Sunet** | Bătăi din palme, nota cântată (Hz + notă), volum, benzi bass/mid/treble. | `src/modules/audio/` |
| **Telefonul ca controller** | QR, iar telefonul devine joystick, volan (giroscop), pad de desen, buton de vot sau tastatură. Ecranul mare decide layout-ul. | `src/modules/controller/`, `/screen` |
| **Hardware** | Web Serial către Arduino/ESP32: trimiți și primești linii de text. | `src/modules/hardware/serial.ts` |

### AI și output

| Modul | Ce face | Unde |
|---|---|---|
| **AI structurat** | `ask({ prompt, schema, files })` → JSON validat cu Zod. Gemini, Claude sau `mock`. Acceptă imagini și PDF. | `src/lib/ai.ts`, `server/` |
| **Comenzi vocale → acțiuni** | Definiți acțiunile aplicației cu `defineAction`, utilizatorul vorbește, iar AI-ul le alege, le execută și răspunde vocal. | `src/lib/agent.ts`, `/agent` |
| **Design editabil** | Pânză Fabric.js: AI-ul generează, omul editează. Undo/redo, export PNG/SVG/JSON. | `src/modules/canvas/`, `src/lib/design.ts` |
| **Share prin QR** | Juriul își ia rezultatul pe telefon. | `src/lib/share.ts`, `src/components/QrPanel.tsx` |
| **Multiplayer** | Camere cu cod/QR, jucători live, stare comună, mesaje. Supabase Realtime sau local între tab-uri. | `src/modules/rooms/` |
| **Adobe PDF** | Viewer oficial Adobe (PDF Embed API) + AI care răspunde cu pagina sursă. | `src/modules/adobe/` |
| **Add-on Adobe Express** | Puntea către Express: același `/api/ai` desenează pe pagina Express. *Opțional, netestat în Express.* | `adobe-express-addon/` |

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

Deschide http://localhost:5173. Pagina de start arată ce e configurat. `npm install` copiază și modelele MediaPipe (mâini, față, corp) în `public/mediapipe/`, ca să meargă și cu internet slab.

Cerințe: Node ≥ 22.18, Chrome sau Edge (pentru voce și Web Serial).

## De ce stack-ul ăsta

- **Vite + React + TypeScript**: cel mai cunoscut stack, așa că și asistenții AI de cod îl scriu cel mai bine. Pornește instant.
- **Totul în browser**, în afară de apelul AI. Camera, fața, corpul, sunetul și vocea rulează local: nu depind de Wi-Fi-ul din sală, nu costă nimic și nu trimit imagini nicăieri.
- **Un singur `npm run dev`**: funcțiile din `api/` (aceleași care rulează pe Vercel) sunt servite de Vite local.
- **Zod ca sursă unică de adevăr**: aceeași schemă devine JSON Schema pentru AI (structured outputs), validare în browser și tipuri TypeScript.
- **Logica pură separată de hook-uri**: gesturile, expresiile, postura, analiza audio, protocolul controller-ului și sondajul au teste unitare. Pragurile se ajustează într-un singur loc.

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

### Comenzi vocale → acțiuni
```ts
const actions = [
  defineAction({
    name: "add_text",
    description: "Adaugă un text pe pânză",
    args: z.object({ text: z.string(), color: z.string() }),
    run: ({ text, color }) => canvas.addElement(/* ... */),
    examples: ["scrie un titlu"], mockArgs: { text: "Salut", color: "#fff" }, // pentru modul demo
  }),
];
const agent = useVoiceAgent({ actions, context: () => "ce e acum pe ecran" });
agent.listen();            // sau agent.send("text scris")
```
Fiecare acțiune e validată separat: dacă AI-ul greșește una, celelalte se execută și eroarea apare în jurnal.

### Mâini, față, corp
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
useFace(cam.videoRef, { onEvent: (e) => e === "blink" && click() });   // smile, blink, wink-left, mouth-open...
usePose(cam.videoRef, { onFrame: (lm, pose) => pose === "both-arms-up" && jump() });
return <CameraView videoRef={cam.videoRef} hands={hands} />;
```

### Telefonul ca controller
```ts
// pe ecranul mare
const screen = useControllers(code, { layout: "gamepad", prompt: "Mișcă-te!", choices: [] });
screen.snapshots.current.get(playerId)?.joystick;     // {x, y} în bucla de joc
screen.setScreen({ layout: "choices", prompt: "Votează", choices: ["A", "B"] });
// telefoanele intră pe /controller?code=XXXX (QR: roomJoinUrl(code, "/controller"))
```
Layout-uri: `gamepad` (joystick + A/B), `tilt` (giroscop + A/B), `draw`, `choices`, `text`.

### Sunet și hardware
```ts
const mic = useMic({ onClap: next });  mic.start();  mic.frame?.note?.name  // „A4”
const board = await connectSerial(115200);  await board.writeLine("LED 255 0 0");
board.onLine((l) => console.log(l));
```

### Design editabil
```tsx
const ref = useRef<DesignCanvasHandle>(null);
const { data } = await ask({ system: designSystemPrompt(1080, 1350), prompt, schema: AiDesign });
<DesignCanvas ref={ref} design={data} onChange={setDesign} />
ref.current.exportPNG(2); ref.current.exportSVG(); ref.current.undo(); ref.current.addPath(pointsToPath(trail));
```

### Multiplayer
```ts
const room = useRoom<{ round: number }>(code, { name, initialState: { round: 1 } });
room.players; room.isHost;
room.setState(s => ({ round: s.round + 1 }));     // ajunge la toți
room.send("vote", 2); room.on("vote", (v, from) => …);
```

### Business canvas și sondaj
```ts
const { data } = await ask({ system: BUSINESS_SYSTEM_PROMPT, prompt: idee, schema: BusinessCanvas });
summarizeSurvey(questions, responses)[0].headline;  // „18 din 25 (72%) au răspuns «Da»”
```

### Voce
```ts
const speech = useSpeechRecognition({ lang: "ro-RO", onFinal: (text) => … });
speech.start(); await speak("Gata!");
```

## Rețetă: ideea voastră în 5 pași

1. **Business canvas** (`/business`): problemă, cine plătește, primul segment. Porniți sondajul de validare.
2. Creați `src/pages/IdeeaNoastraPage.tsx`. Porniți de la pagina cea mai apropiată.
3. Adăugați ruta în `src/App.tsx` (`<Route path="/idee" component={...} />` și o intrare în `NAV_GROUPS`).
4. Scrieți schema Zod pentru ce trebuie să întoarcă AI-ul și un `mock` realist pentru demo.
5. Construiți **un singur flux cap-coadă** înainte de orice extra.

## Configurare chei (opțional)

Toate se pun în `.env` (vezi `.env.example`). Reporniți `npm run dev` după ce le schimbați.

- **Gemini**: cheie de la https://aistudio.google.com/apikey → `GEMINI_API_KEY`. Dacă primiți 429, setați `GEMINI_MODEL` la un model `-flash-lite`.
- **Claude**: cheie de la https://platform.claude.com/settings/keys → `ANTHROPIC_API_KEY`. Implicit e `claude-opus-5-5` cu `ANTHROPIC_EFFORT=low`, ca răspunsurile să fie rapide la demo.
- **Supabase** (telefoane, sondaj, link-uri scurte în QR, contor partajat):
  1. Creați un proiect pe https://supabase.com și copiați URL-ul și cheia publică (anon/publishable) în `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
  2. Realtime (broadcast + presence) merge fără tabele, deci controller-ele, sondajul și multiplayer-ul merg imediat.
  3. Pentru QR cu imagini: *Storage → New bucket* `shares`, **public**, plus o politică care permite `insert` pentru rolul `anon` pe acel bucket.
  4. Pentru contorul „N oameni au încercat azi” partajat între dispozitive (*SQL Editor*):
     ```sql
     create table public.events (
       id bigint generated always as identity primary key,
       event text not null,
       data jsonb not null default '{}',
       created_at timestamptz not null default now()
     );
     alter table public.events enable row level security;
     create policy "insert anon" on public.events for insert to anon with check (true);
     create policy "read anon" on public.events for select to anon using (true);
     ```
     Fără tabelă, contorul numără local, în browser.
- **Adobe PDF Embed**: creați un Client ID gratuit, legat de domeniu (`localhost` pentru dev, domeniul Vercel pentru deploy) → `VITE_ADOBE_PDF_CLIENT_ID`.

## Deploy și telefoane

Camera, microfonul și giroscopul pe telefon cer **HTTPS**. Cel mai simplu e deploy-ul pe Vercel:

```bash
npx vercel
```

Setați aceleași variabile în *Vercel → Project → Settings → Environment Variables*. Funcțiile din `api/` devin endpoint-uri serverless automat, iar `vercel.json` trimite restul rutelor la aplicația React.

## Ziua hackathonului

- [ ] Întrebați organizatorii dacă e permis cod pregătit dinainte (template generic, public).
- [ ] `npm install` acasă, apoi verificați că `npm run check` trece.
- [ ] Cheile API testate și în `.env`, iar deploy-ul de test pe Vercel funcționează.
- [ ] Hotspot pe telefon ca rezervă pentru Wi-Fi.
- [ ] Business canvas generat și verificat de om, nu copiat orbește. Știți pe de rost cine plătește și cât.
- [ ] Sondajul de validare pornit dimineața, cu QR pe masă. La pitch aveți cifre reale.
- [ ] **Mod demo** (bifa din header sau `?demo=1`) ca plasă de siguranță la pitch.
- [ ] Video de 60 s cu fluxul principal (butonul `⏺ Rec`), ca backup.
- [ ] Pentru jurizarea la masă: deschideți aplicația cu `?kiosk=1`.
- [ ] Juriul trebuie să poată încerca singur produsul în primele 10 secunde.

## Comenzi

| Comandă | Ce face |
|---|---|
| `npm run dev` | Aplicația + `/api` local |
| `npm run build` | Typecheck + build de producție |
| `npm test` | Teste unitare (gesturi, față, corp, audio, controller, agent, sondaj, business, server AI, share) |
| `npm run e2e` | Teste în browser cu cameră și microfon false și AI mock. Rulați întâi `npx playwright install chromium` |
| `npm run check` | Toate cele de mai sus |
| `npm run addon:schema` | Regenerează schema pentru add-on-ul Express |

## Ce nu a fost testat

- Apelurile reale către Gemini și Claude: testele rulează cu `mock`. Codul urmează SDK-urile oficiale, dar verificați-l cu cheile voastre.
- Viewer-ul Adobe PDF cu un Client ID real și add-on-ul Adobe Express în Express.
- Supabase Realtime, Storage și tabela `events` cu un proiect real. Fallback-ul local e testat automat.
- Senzorii reali: giroscopul telefonului (iOS cere HTTPS și permisiune), Web Serial cu o placă, recunoașterea vocală în sală. Logica din spatele lor e testată cu date sintetice.
