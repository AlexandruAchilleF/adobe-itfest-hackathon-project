# ⚡ Hackathon Template (Adobe ITFest 2026)

Template pentru un hackathon de 12 ore, construit pe ce au în comun proiectele câștigătoare:
**un om, un input haotic, o transformare AI, un rezultat editabil**, plus dovezi de la oameni reali.

Nu e un produs. E o pornire rapidă: patru **rețete** (fluxuri complete, testate) pentru temele cele mai probabile și uneltele de validare pentru pitch. La hackathon alegeți **o** rețetă după temă și îi schimbați domeniul.

> 📋 Citiți întâi: [`docs/PLAN-12H.md`](docs/PLAN-12H.md) (tema → rețeta, rolurile, programul pe ore, pitch-ul, planul de avarie),
> [`docs/PROBLEME.md`](docs/PROBLEME.md) (probleme reale de validat înainte) și [`docs/BUSINESS.md`](docs/BUSINESS.md) (cine plătește, piață, adopție).
> Integrările Adobe se pregătesc dinainte: [`docs/ADOBE-SETUP.md`](docs/ADOBE-SETUP.md).

## Rețetele

| Rețetă | Fluxul | Tema | Fișiere |
|---|---|---|---|
| **Documente → răspunsuri verificate** (`/docs`) | PDF → structură JSON locală (titlu, H1–H3, pagini) → întrebare → răspuns cu **citate verificate în text** → salt la pagină → secțiunile utile pentru o persona | documente, „Rethink Reading”, educație (~25%) | `src/lib/documents.ts`, `src/lib/docAi.ts`, `src/pages/DocsPage.tsx` |
| **Input haotic → design editabil** (`/design`) | text / voce / poză → design propus de AI → editare → **audit de lizibilitate și contrast** + reparare automată → PNG/SVG/QR | creativ, comunicare, accesibilitate (~17%) | `src/pages/DesignPage.tsx`, `src/lib/accessibility.ts` |
| **Asistent cu confirmare** (`/assistant`) | cerere în limbaj natural (scris sau vocal) → acțiuni pe date reale → **omul aprobă orice modificare** | asistent AI, agenți (~25%) | `src/lib/agent.ts`, `src/pages/AssistantPage.tsx` |
| **Hartă + potrivire** (`/map`) | nevoi pe hartă (CRUD cu date de seed) → adăugare în limbaj natural, verificată de om → potrivire ofertă ↔ nevoie cu **scor determinist** + explicație AI | civic, Smart City, resurse (~20%) | `src/lib/store.ts`, `src/recipes/needs.ts`, `src/pages/MapPage.tsx` |

Toate patru răspund la întrebarea „ce se întâmplă când AI-ul greșește?”: citatele se verifică în text, designul trece printr-un audit determinist, iar modificările așteaptă aprobarea omului.

## Validare și pitch

| Unealtă | Ce face |
|---|---|
| **Business canvas** (`/business`) | AI-ul transformă ideea în problemă, utilizator vs. cumpărător, preț, piață numărată de jos în sus, adopție, concurență, riscuri și întrebările grele ale juriului. Export Markdown. |
| **Sondaj live** (`/survey`) | QR pe masă; oamenii răspund de pe telefon. Rezultatul e o frază de pitch: „11 din 14 (79%) au răspuns Da”. Export CSV. |
| **⏺ Rec** (în meniu) | înregistrează tab-ul cu sunet, pentru video-ul de rezervă |
| **Țepi, mascota** (colțul din dreapta-jos) | un arici care arată ce face AI-ul: se gândește la orice apel, se bucură când sursele sunt verificate, se îngrijorează când AI-ul a greșit, ascultă când vorbești. Face vizibil răspunsul la „ce se întâmplă când AI-ul greșește?” și dă produsului o identitate. Nume și culoare: `VITE_MASCOT_NAME`, `VITE_MASCOT_COLOR`; din cod: `mascot.say("…", "happy")`. |
| **Mod demo** (bifa din meniu sau `?demo=1`) | răspunsuri AI simulate, realiste: merge fără internet și fără chei |

## Start rapid

```bash
npm install
```

```bash
npm run dev
```

Deschideți http://localhost:5173. Fără nicio cheie, totul merge în mod demo. Cheile se pun în `.env`, după modelul din `.env.example`. Cerințe: Node ≥ 22.18, Chrome.

## Cum adaptați o rețetă (în primele 2 ore)

1. **Schema.** Schimbați câmpurile din schema Zod a domeniului. De exemplu, în `src/recipes/needs.ts`, „nevoi” devin „sesizări” sau „cereri”.
2. **Datele de seed.** Puneți 8–10 înregistrări realiste din domeniul temei, ca demo-ul să arate plin din prima secundă.
3. **Prompturile și mock-urile.** Fiecare `ask()` are un `mock` realist, pentru modul demo.
4. **Textele din UI.** Formulați pornind de la omul din problemă, nu de la tehnologie.

Prompt de start pentru asistentul AI de cod:

```
Citește AGENTS.md și docs/PLAN-12H.md. Tema e: <tema>. Problema validată: <cine> pierde <ce> pentru că <de ce>.
Adaptează rețeta /<rețeta>: schimbă schema și datele de seed pentru domeniul ăsta, păstrează pasul de confirmare
și mock-urile. Nu adăuga funcționalități noi. Rulează npm run check la final.
```

## Piesele de bază

```ts
// AI cu răspuns structurat și validat (Gemini / Claude / mock), cu imagini sau PDF
const { data } = await ask({ prompt, schema: ZodSchema, files: [pdfOrImage], mock: exemplu });

// Documente
const doc = await parsePdf(file);                   // pagini + { title, outline: [{ level, text, page }] }
const r = await askDocument(doc, "întrebare");      // r.citations[i].verified / corrected
await rankSections(doc, persona, sarcina);

// Date persistente cu seed (Supabase sau localStorage)
const items = createCollection("nevoi", Schema, seed);
const { items, add, update, remove } = useCollection(items);

// Acțiuni din limbaj natural, cu confirmare
defineAction({ name, kind: "read" | "write", description, args: zodObject, run, examples, mockArgs });
const agent = useVoiceAgent({ actions, context });  // + <ConfirmActions pending={agent.pending} />

// Text propus de AI, corectat de om (crește pe mai multe rânduri, se tipărește curat)
<EditableText value={text} onChange={setText} />

// Design editabil + audit
<DesignCanvas ref={ref} design={design} onChange={setDesign} />
auditDesign(design, latimeCm);  autoFixDesign(design, { physicalWidthCm, distanceM });
```

## Tipărire și PDF

`window.print()` tipărește doar conținutul paginii: meniul și antetul au `print:hidden`. Puneți `print:hidden` și pe panourile cu butoane. PDF-uri exemplu noi (pentru demo și teste) se fac din HTML:

```bash
node scripts/make-sample-pdf.mjs samples-src/fisierul-vostru.html
```

## Configurare (opțional)

- **Gemini:** `GEMINI_API_KEY` (are free tier). Dacă primiți 429, setați `GEMINI_MODEL` la un model `-flash-lite`.
- **Claude:** `ANTHROPIC_API_KEY` (implicit `claude-opus-5-5`, cu `ANTHROPIC_EFFORT=low` pentru răspunsuri rapide).
- **Adobe PDF Embed:** `VITE_ADOBE_PDF_CLIENT_ID`. Fără el, documentele se afișează cu pdf.js. Pașii sunt în `docs/ADOBE-SETUP.md`.
- **Supabase** (date partajate între dispozitive, sondaj între telefoane, link-uri scurte în QR): `VITE_SUPABASE_URL` și `VITE_SUPABASE_ANON_KEY`. Rulați în *SQL Editor*:
  ```sql
  create table public.records (
    id uuid primary key default gen_random_uuid(),
    collection text not null,
    data jsonb not null,
    created_at timestamptz not null default now()
  );
  create index on public.records (collection, created_at);
  alter table public.records enable row level security;
  -- doar pentru demo: oricine are cheia publică poate citi și scrie
  create policy "demo all" on public.records for all to anon using (true) with check (true);
  ```
  Fără Supabase, datele rămân în browser (localStorage), iar sondajul merge între tab-urile aceluiași browser.

## Deploy

```bash
npx vercel
```

Setați aceleași variabile în *Vercel → Project → Settings → Environment Variables*. Pe telefon, camera și microfonul cer HTTPS, deci folosiți adresa de pe Vercel.

## Comenzi

| Comandă | Ce face |
|---|---|
| `npm run dev` | aplicația + `/api` local |
| `npm run build` | typecheck + build de producție |
| `npm test` | teste unitare (documente cu pdf.js real, store, agent cu confirmare, audit și reparare, server AI, sondaj) |
| `npm run e2e` | cele 4 rețete și validarea, în browser, cu AI mock și fără internet. Prima dată: `npx playwright install chromium` |
| `npm run check` | toate cele de mai sus |

## Ce e în altă parte

- Un proiect complet construit din template, ca test, e pe ramura **`dry-run`** (fișă adaptată din lecție). Rezultatele testului: [`docs/DRY-RUN.md`](docs/DRY-RUN.md).

- Modulele de interacțiune (mâini, față, corp, sunet, Arduino, telefon-controller, mockup în perspectivă, kiosk) sunt pe ramura **`effects`**. Aduceți-le înapoi doar dacă tema le cere explicit, de exemplu accesibilitate fără mâini.
- Add-on-ul Adobe Express: `adobe-express-addon/` și `docs/ADOBE-SETUP.md`.

## Ce nu a fost testat

- Apelurile reale către Gemini și Claude: testele folosesc `mock`.
- Adobe PDF Embed cu un Client ID real, add-on-ul în Express, Supabase cu un proiect real.
- Geocodarea reală prin Nominatim: în teste e simulată.
