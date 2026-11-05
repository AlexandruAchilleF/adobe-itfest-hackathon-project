# Instrucțiuni pentru asistenți AI de cod

Template de hackathon (12 ore, juriu Adobe): Vite + React 19 + TypeScript + Tailwind v4, funcții serverless în `api/` (Vercel).
UI-ul și comentariile sunt în română. Citește și `docs/PLAN-12H.md`.

## Principiul
Un om, un input haotic, o transformare AI, un rezultat editabil. **Nu adăuga funcționalități în afara fluxului cerut.**
Adaptează rețeta existentă: schema, datele de seed, prompturile, textele din UI.

## Arhitectură
- `api/*.ts`: funcții serverless cu semnătură Web standard (`export function POST(request: Request): Response`). În dev sunt servite de `server/vite-api-plugin.ts`. Importurile relative din `api/` și `server/` folosesc extensia `.js`.
  - `api/ai.ts`: un singur endpoint AI (Gemini, Claude sau `mock`, implicit fără chei).
  - `api/geocode.ts`: adresă → coordonate (Nominatim, cu cache).
- `src/lib/ai.ts`: `ask({ prompt, schema, files, mock })` → `{ data }` validat cu Zod. Folosește-l pentru orice apel AI.
- `src/lib/documents.ts`: logică pură pentru PDF (linii, cuprins H1–H3, secțiuni, context cu `[p. N]`, `verifyCitations`). `src/modules/documents/pdfjs.ts` face citirea în browser. `src/lib/docAi.ts`: `askDocument`, `rankSections`.
- `src/lib/store.ts`: CRUD cu seed (`createCollection`, `useCollection`). Folosește Supabase (tabela `records`) sau localStorage.
- `src/lib/agent.ts` + `src/lib/useVoiceAgent.ts` + `src/components/ConfirmActions.tsx`: limbaj natural → acțiuni. `kind: "write"` cere confirmarea omului.
- `src/lib/design.ts` + `src/modules/canvas/`: designul editabil (Fabric.js v7). `src/lib/accessibility.ts`: audit WCAG, lizibilitate, `autoFixDesign`.
- `src/components/EditableText.tsx`: text propus de AI, editabil de om (pentru fișe, rapoarte, oferte). Pentru tipărire, ascunde UI-ul cu `print:hidden`.
- PDF-uri exemplu: HTML în `samples-src/` → `node scripts/make-sample-pdf.mjs samples-src/x.html` → `public/samples/x.pdf`.
- `src/modules/mascot/`: mascota (Țepi), stratul care face ideea memorabilă. Orice pagină nouă apelează `useMascotPage({ title, actions, context, tour })`: `actions` sunt `defineAction` (Țepi le rulează din conversație, cele `write` cer aprobarea), `tour` sunt pași `{ target, text }` legați de elemente cu `data-tour` (sau `<Card tour="…">`). `?tour=1` pornește turul la pitch. Navigarea între pagini e globală (`MascotDock` primește rutele din `App.tsx`). `ask()` o pune automat pe „thinking” și „worried”; după o verificare folosește `mascot.say(mesaj, mood)` sau `moodForChecks(trecute, total)`. Nu o folosi ca decor: doar pentru stări reale.
- `src/recipes/needs.ts`: domeniul exemplu (schemă, seed, scor). Acesta se schimbă după temă.
- Rețetele: `src/pages/DocsPage.tsx`, `DesignPage.tsx`, `AssistantPage.tsx`, `MapPage.tsx`. Validarea: `BusinessPage.tsx`, `SurveyPage.tsx`.

## Reguli
- Fiecare `ask()` primește un `mock` realist, construit din inputul utilizatorului dacă se poate. Fiecare `defineAction` are `examples` și `mockArgs`.
- AI-ul propune, omul confirmă: acțiunile care modifică date sunt `kind: "write"`, iar datele extrase de AI se arată într-un formular de verificare înainte de salvare.
- Preferă verificări deterministe lângă AI: citate căutate în text, scoruri calculate, audit. Nu lăsa AI-ul să inventeze cifre.
- Cheile AI rămân pe server (fără prefix `VITE_`). În browser ajung doar `VITE_SUPABASE_*`, `VITE_ADOBE_PDF_CLIENT_ID`, `VITE_APP_NAME` și `VITE_MASCOT_*`.
- Fabric.js v7 are originea implicită în centru. Pentru x/y de tip stânga-sus, setează `originX: "left", originY: "top"`.
- O pagină nouă se adaugă în `src/App.tsx` (`Switch` și `NAV_GROUPS`). Paginile pentru telefon (`/view`, `/s`) sunt în `BARE`.
- Logica pură stă separat de componente și are teste în `tests/`.

## Comenzi
- `npm run dev`, `npm run typecheck`, `npm test`, `npm run e2e`
- `npm run check`: tot, înainte de commit
