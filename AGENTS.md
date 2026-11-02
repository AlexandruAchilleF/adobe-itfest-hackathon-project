# Instrucțiuni pentru asistenți AI de cod

Template de hackathon: Vite + React 19 + TypeScript + Tailwind v4, funcții serverless în `api/` (Vercel).
UI-ul și comentariile sunt în română.

## Arhitectură
- `api/*.ts`: funcții serverless cu semnătură Web standard (`export function POST(request: Request): Response`). În dev sunt servite de `server/vite-api-plugin.ts`, iar pe Vercel rulează nativ. Importurile relative din `api/` și `server/` folosesc extensia `.js`.
- `server/ai.ts`: un singur endpoint AI. Furnizorii sunt în `server/providers/` (gemini, anthropic), iar `mock` e implicit fără chei. Schema primită se normalizează în `server/schema.ts`.
- `shared/ai-contract.ts`: tipurile cererii și răspunsului AI, comune clientului și serverului.
- `src/lib/ai.ts`: `ask({ prompt, schema: ZodSchema, files, mock })` → `{ data }` validat. Folosește-l pentru orice apel AI și nu face `fetch` direct.
- `src/lib/design.ts`: formatul `Design` (rect, circle, text, line, path, image) și `AiDesign` (subsetul pe care îl generează AI-ul). Toate câmpurile din `AiDesign` sunt obligatorii, pentru compatibilitate cu structured outputs.
- `src/modules/*`: module independente (camera: mâini/față/corp, voice, audio, controller, canvas, rooms, adobe, demo: kiosk/recorder/stats, hardware). Paginile din `src/pages/` sunt demo-uri și exemple de folosire.
- `src/lib/agent.ts`: comenzi în limbaj natural → acțiuni (`defineAction`, `runAgent`, `useVoiceAgent`). Pentru control vocal sau text al aplicației, adaugă acțiuni, nu un parser propriu.
- `src/lib/business.ts` și `src/lib/survey.ts`: business canvas (schemă Zod) și agregarea sondajului de validare.
- Logica pură (gesturi, față, corp, audio, protocol controller, sondaj) e separată de hook-uri și are teste în `tests/`. Păstrează separarea asta.
- Paginile deschise pe telefon din QR (`/view`, `/controller`, `/s`) sunt în lista `BARE` din `App.tsx` și nu au meniu.

## Reguli
- Orice apel `ask()` nou primește un `mock` realist, ca modul demo (`?demo=1`) să meargă offline. Orice `defineAction` primește `examples` și `mockArgs`.
- Ecranul mare care deține starea unei camere folosește `useRoom(..., { authority: true })`.
- Cheile AI rămân pe server (fără prefix `VITE_`). În browser ajung doar `VITE_SUPABASE_*`, `VITE_ADOBE_PDF_CLIENT_ID` și `VITE_APP_NAME`.
- Nu face `setState` la fiecare cadru video. Pune logica per-cadru în `onFrame` din `useHands` și desenează pe `<canvas>` cu `requestAnimationFrame`.
- Fabric.js v7 are originea implicită în centru. Când creezi obiecte cu x/y ca stânga-sus, setează `originX: "left", originY: "top"`.
- O pagină nouă se adaugă ca rută în `src/App.tsx` (`Switch` și `NAV_GROUPS`).

## Comenzi
- `npm run dev`: aplicația + `/api`
- `npm run typecheck`, `npm test` (vitest), `npm run e2e` (Playwright, cameră falsă, AI mock)
- `npm run check`: tot înainte de commit
