# Plan pentru 12 ore

Fiecare idee de mai jos e verificată pe template: piesele grele există și au teste.
Ce scrieți la hackathon e **logica ideii**: prompturi, scheme, reguli de joc și UI-ul paginii.
Estimările presupun 3–4 oameni și un asistent AI de cod (Claude Code, Cursor, Copilot) care citește `AGENTS.md`.

## Programul zilei (orice idee)

| Ora | Ce faceți | Cine |
|---|---|---|
| 0:00–0:45 | Tema anunțată → alegeți ideea → business canvas (`/business`) → porniți sondajul (`/survey`) | toți |
| 0:45–1:00 | Împărțiți: **A** = pagina principală, **B** = AI (prompt + schemă + mock), **C** = input/senzori, **D** = pitch și validare | toți |
| 1:00–6:00 | Construiți **un singur flux cap-coadă**. La 6:00 trebuie să meargă urât, dar complet. | A, B, C |
| 1:00–6:00 | Strângeți răspunsuri la sondaj (20+), scrieți slide-urile, căutați 2–3 cifre de piață | D |
| 6:00–9:00 | Calitate: prompturi mai bune, cazuri care se strică, mod demo pentru fiecare apel AI | A, B, C |
| 9:00–10:30 | Polish vizual, deploy pe Vercel, testat pe telefoane, `⏺ Rec` cu video-ul de rezervă | toți |
| 10:30–12:00 | **Îngheț de cod.** Repetiții de pitch (minim 3), răspunsuri la întrebările grele | toți |

Regula de aur: **la ora 6 nu se mai adaugă funcționalități noi.**

---

## 1. Clientul imposibil: simulator de clienți pentru designeri

**Fluxul demo:** primești un brief → editezi pe pânză → apeși „Arată clientului” → clientul AI se uită la design, răspunde vocal cu feedback (uneori contradictoriu) → după 3 runde primești un scor la comunicare și la cum ai aplicat feedback-ul.

| Piesă | Din template | De scris |
|---|---|---|
| Pânza editabilă + export imagine | `DesignCanvas`, `exportPNG()` | — |
| Clientul „vede” designul | `ask({ files: [png] })` | schema `ClientReply { mood, feedback, demands[] }` + persona |
| Voce (client vorbește, designerul răspunde) | `speak()`, `useSpeechRecognition` | — |
| Verificări obiective (contrast, lizibilitate) | `auditDesign()` | le treceți în prompt, ca feedback-ul să fie corect |
| Scor final | `ask()` | schema `Score { communication, design, notes[] }` |

**Fișiere noi:** `src/pages/ClientPage.tsx` (~200 linii), `src/lib/client.ts` (persona-uri, scheme, ~80 linii).
**Risc principal:** clientul AI sună generic. **Soluție:** 3 persona-uri scrise de mână („patronul de pizzerie care vrea totul mai mare”), cu cerințe ascunse.
**Estimare flux complet:** 4–5 ore.

## 2. Editor de design fără mâini (accesibilitate)

**Fluxul demo:** cineva din juriu face un afiș cu mâinile la spate: capul mută cursorul, privirea ținută 1 s pe un buton îl apasă, wink = apucă/lasă, iar vocea dă comenzi („scrie Concert vineri, mare, alb”).

| Piesă | Din template | De scris |
|---|---|---|
| Cursor controlat cu capul + click prin menținere + drag | `useFace` + `usePointerCursor` (demo complet în `/body`) | calibrare (sensibilitate, zonă moartă) |
| Comenzi vocale → acțiuni pe pânză | `defineAction` + `useVoiceAgent` (demo în `/agent`) | 2–3 acțiuni în plus (aliniere, duplicare) |
| Pânza | `DesignCanvas`, undo/redo | butoane mari (min 64px) pentru ținte ușoare |
| Verificare accesibilitate rezultat | `auditDesign()` | — |

**Fișiere noi:** `src/pages/HandsFreePage.tsx` (~150 linii) care combină `/body` și `/agent`.
**Risc principal:** cursorul tremură sau lumina e slabă. **Soluție:** calibrare la start („uită-te în centru 2 s”) și mărirea zonei moarte.
**Estimare flux complet:** 3–4 ore. Restul timpului merge pe calibrare și pe testarea cu oameni.

## 3. Proba de stradă: afișul în locul real

**Fluxul demo:** fotografiezi bannerul din sală → atingi 4 colțuri → apare designul tău acolo → tragi slider-ul la 8 m → textul devine ilizibil → „Repară automat” mărește textele până trec auditul → AI-ul explică ce s-a schimbat.

| Piesă | Din template | De scris |
|---|---|---|
| Poză + 4 colțuri + perspectivă | `/mockup`, `drawImageToQuad()` | — |
| Simulare distanță + daltonism | `distanceBlurPx()`, `simulateImageData()` | — |
| Audit WCAG + lizibilitate | `auditDesign()` | — |
| Repară automat | `Design` JSON | funcție care mărește `fontSize` până trece auditul (~40 linii) |
| Critica AI pe imaginea compusă | `ask({ files })` (există în `/mockup`) | prompt specific clientului (tipografie, primărie) |

**Fișiere noi:** extindeți `MockupPage.tsx` sau faceți o copie (~100 linii noi).
**Risc principal:** poza făcută în sală e strâmbă sau întunecată. **Soluție:** aveți 3 poze bune pregătite pe telefon.
**Estimare flux complet:** 2–3 ore. E ideea cu cel mai mult timp rămas pentru business și polish.

## 4. Sala decide: designul construit live de public

**Fluxul demo:** QR pe ecran → 10–30 de telefoane intră → fiecare primește un element al afișului și îl mută cu joystick-ul → votează între 3 variante generate de AI → afișul final apare pe ecran și se descarcă prin QR.

| Piesă | Din template | De scris |
|---|---|---|
| Telefoane ca controllere + vot | `useControllers`, layout-urile `gamepad` și `choices` (demo în `/screen`) | atribuirea unui element per jucător |
| Variante generate | `ask({ schema: AiDesign })` ×3 | — |
| Afișul pe ecran + QR | `DesignCanvas`, `shareDesign()` | mutarea elementelor din `snapshots` (~60 linii) |

**Fișiere noi:** `src/pages/CrowdPage.tsx` (~200 linii).
**Risc principal:** Wi-Fi-ul din sală. **Soluție:** Supabase + hotspot și testat dinainte cu 5 telefoane.
**Estimare flux complet:** 4–5 ore.

---

## Prompt de start pentru asistentul AI de cod

```
Citește AGENTS.md. Vreau o pagină nouă /<ruta> pentru ideea: <descriere în 2 propoziții>.
Fluxul: <pas 1> → <pas 2> → <pas 3>.
Refolosește: <modulele din tabelul de mai sus>.
Fiecare apel ask() are schemă Zod și mock realist. Nu modifica modulele din src/modules,
doar compune-le. Adaugă ruta în App.tsx (Switch + NAV_GROUPS). Rulează npm run typecheck la final.
```
