# Instrucțiuni pentru asistenți AI de cod

Template de hackathon (12 ore, juriu Adobe): Vite + React 19 + TypeScript + Tailwind v4, funcții serverless în `api/` (Vercel).
UI-ul și comentariile sunt în română. Citește și `docs/PLAN-12H.md`. La start, echipa rulează `/brief`; înainte de pitch, `/juriu`.

## Înainte de orice schimbare
- Citește `docs/BRIEF.md`: brief-ul Adobe, ideea aleasă, cerințele și deciziile. Codul servește fraza de acolo și bifează cerințele din tabel.
- **Lentila juriului:** când propui sau alegi o idee, o funcționalitate, un text din UI, date de seed sau pitch-ul, aplică `docs/JURIU.md` și spune în răspuns ce întrebare mută și unde se vede în demo. Ce nu mută niciuna rămâne pentru „după hackathon”.
- Un flux complet, nu mai multe începute. Adaptează modulele existente (schema, seed, prompturi, texte) înainte să scrii module noi.

## Arhitectură
- `api/*.ts`: funcții serverless cu semnătură Web standard (`export function POST(request: Request): Response`). În dev sunt servite de `server/vite-api-plugin.ts`. Importurile relative din `api/` și `server/` folosesc extensia `.js`.
  - `api/ai.ts`: un singur endpoint AI (Gemini, Claude sau `mock`, implicit fără chei).
  - `api/geocode.ts`: adresă → coordonate (Nominatim, cu cache).
- `src/lib/ai.ts`: `ask({ prompt, schema, files, mock })` → `{ data }` validat cu Zod. Folosește-l pentru orice apel AI.
- `src/lib/documents.ts`: logică pură pentru PDF (linii, cuprins H1–H3, secțiuni, context cu `[p. N]`, `verifyCitations`). `src/modules/documents/pdfjs.ts` face citirea în browser. `src/lib/docAi.ts`: `askDocument`, `rankSections`.
- `src/lib/store.ts`: CRUD cu seed (`createCollection`, `useCollection`). Folosește Supabase (tabela `records`) sau localStorage.
- `src/lib/agent.ts` + `src/lib/useVoiceAgent.ts` + `src/components/ConfirmActions.tsx`: limbaj natural → acțiuni. `kind: "write"` cere confirmarea omului.
- `src/lib/design.ts` + `src/modules/canvas/`: designul editabil (Fabric.js v7). `src/lib/accessibility.ts`: audit WCAG, lizibilitate, `autoFixDesign`.
- Design: `docs/DESIGN.md`. Ecranele de lucru: un lucru odată, font Geist, coral doar pe acțiunea principală, stările ca punct + text (`StatusPill`), documentul ca hârtie (`DocPaper`) cu ștampilă după pas. Componente în `src/components/ui.tsx`: `Button`, `Card`, `PageHeader`, `Tag`, `Pill`. `Accent` și `Ribbon` doar pe prima pagină (povestea, `ScenarioHome.tsx`). Fără emoji ca icoane, fără dark mode, fără `font-mono` pentru cifre.
- `src/components/EditableText.tsx`: text propus de AI, editabil de om (pentru fișe, rapoarte, oferte). Pentru tipărire, ascunde UI-ul cu `print:hidden`.
- PDF-uri exemplu: HTML în `samples-src/` → `node scripts/make-sample-pdf.mjs samples-src/x.html` → `public/samples/x.pdf`.
- `src/modules/mascot/`: asistentul din colț (conversație, acțiuni, tur). Implicit e un buton sobru; personajul desenat (Țepi) apare doar cu `mascot.character: true` (copii, vârstnici, gamificare). Orice pagină nouă apelează `useMascotPage({ title, actions, context, tour })`: `actions` sunt `defineAction` (asistentul le rulează din conversație, cele `write` cer aprobarea), `tour` sunt pași `{ target, text }` legați de elemente cu `data-tour` (sau `<Card tour="…">`). `?tour=1` pornește turul la pitch. Navigarea între pagini e globală (`MascotDock` primește rutele din `App.tsx`). `ask()` îl pune automat pe „thinking” și „worried”; după o verificare folosește `mascot.say(mesaj, mood)` sau `moodForChecks(trecute, total)`. Doar pentru stări reale.
- `src/scenario/config.ts`: **scenariul activ** (`VITE_SCENARIO` alege din `SCENARIOS`; exemple: `deconturi`, `interne`, `sesizari`, `resurse`, `vecini`) (domeniul brief-ului: roluri, categorii, texte, puncte, ranguri, rapoarte, seed). Un scenariu e un fișier în `src/scenario/scenarios/`. Paginile nu au text de domeniu scris în ele: îl citesc din `scenario`. `src/scenario/model.ts`: schemele, colecțiile și `validateScenario`.
- `src/lib/flow.ts`: fluxul cererii, configurabil (stări, pași, rolul care face fiecare pas, retur cu motiv, „n-a mers”), pur. Scenariul îl descrie în `flow`. `src/lib/identity.ts`: roluri fără login (`useMe`, `?ca=<handle>`). `src/lib/live.tsx`: sincronizare live peste `rooms`.
- `src/lib/checks.ts`: verificări deterministe pentru documente (sumă, cod fiscal, dată, duplicate, plafoane). `src/lib/metrics.ts`: cronometrul procesului. `src/lib/notify.ts` + `api/notify.ts`: SMS/email cu mock.
- Paginile scenariului: `BoardPage.tsx` (`/cereri`, alias `/harta`), `ProcessPage.tsx` (`/cronometru`), `RecordPage.tsx` (`/fisa/:id`, de tipărit), `ProfilePage.tsx`, `LeaderboardPage.tsx`, `ReportPage.tsx` și `ConfirmPage.tsx` (telefon). Rețetele opționale: `DocsPage.tsx`, `DesignPage.tsx`, `AssistantPage.tsx`. Validarea: `BusinessPage.tsx`, `SurveyPage.tsx`.

## Reguli
- Fiecare `ask()` primește un `mock` realist, construit din inputul utilizatorului dacă se poate. Fiecare `defineAction` are `examples` și `mockArgs`.
- AI-ul propune, omul confirmă: acțiunile care modifică date sunt `kind: "write"`, iar datele extrase de AI se arată într-un formular de verificare înainte de salvare.
- Preferă verificări deterministe lângă AI: citate căutate în text, scoruri calculate, audit. Nu lăsa AI-ul să inventeze cifre.
- Cheile AI rămân pe server (fără prefix `VITE_`). În browser ajung doar `VITE_SUPABASE_*`, `VITE_ADOBE_PDF_CLIENT_ID`, `VITE_APP_NAME` și `VITE_MASCOT_*`.
- Fabric.js v7 are originea implicită în centru. Pentru x/y de tip stânga-sus, setează `originX: "left", originY: "top"`.
- O pagină nouă se adaugă în `src/App.tsx` (`Switch` și `NAV_GROUPS`). Paginile pentru telefon (`/view`, `/s`) sunt în `BARE`. Uneltele echipei (Rec, mod demo, resetare, paginile „Pentru echipă”) stau în `src/components/DevPanel.tsx`, vizibil doar cu `?dev=1`; nu puneți unelte sau note interne în paginile pe care le vede juriul.
- Logica pură stă separat de componente și are teste în `tests/`.

## Comenzi
- `npm run dev`, `npm run typecheck`, `npm test`, `npm run e2e`
- `npm run check`: tot, înainte de commit
