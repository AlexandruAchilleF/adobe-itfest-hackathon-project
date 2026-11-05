# Revizuirea template-ului (5 noiembrie 2026)

Două lentile: un jurat Adobe care vede aplicația 3 minute și un coleg care primește un brief necunoscut și are 2 ore să-l adapteze.
Criteriile sunt cele din [`JURIU.md`](JURIU.md). Concluzia pe scurt: nucleul tehnic e bun, dar template-ul era organizat în jurul a patru produse cu domenii fixe. Briefurile ITFest cer altceva: un scenariu cu roluri, o cerere care trece prin mai mulți oameni și funcționalități opționale numite explicit.

## Ce vedea un jurat (înainte de schimbări)

| Ce vede | De ce costă puncte | Întrebarea din lentilă |
|---|---|---|
| Pagina `/` e ghidul template-ului: „Un om, un input haotic…”, un tabel cu șanse în procente pentru teme | Juriul vede că a deschis un template, nu un produs. Procentele sunt estimări, nu date. | 6 Demo-ul, 7 Brief-ul |
| Meniul are Documente, Design editabil, Asistent, Hartă, AI | Patru produse începute în loc de un flux. „AI” e o unealtă de dezvoltare. | 6 Demo-ul |
| ⚡ „Hackathon Template” în antet | Semnul cel mai vizibil de boilerplate | 6 Demo-ul |
| Pe hartă, oricine apasă „rezolvat” pe orice nevoie | Nu există cine dă și cine primește, deci nu există buclă. Nimeni nu confirmă, nimic nu poate eșua. | 5 Bucla |
| Nicio funcționalitate de gamificare, notificare sau raport live | Exact ce au cerut briefurile din 2023 și 2024 | 7 Brief-ul |
| Țepi, ariciul, pe fiecare pagină, cu tur | Simpatic, dar nu ține de nicio temă. Persona lui spune „arici” chiar și după redenumire. | 1 Omul (doar dacă publicul o cere) |

## Ce încurca echipa în primele 2 ore

1. **Domeniul era în trei locuri.** `src/recipes/needs.ts` avea schema și seed-ul, dar textele („Adaugă o nevoie”, „Cine poate ajuta?”, placeholderul cu „cantina de pe Calea Moșilor”), prompturile și mock-urile erau scrise direct în `MapPage.tsx` și `AssistantPage.tsx`. Schimbarea domeniului însemna editarea a trei fișiere și a testelor e2e.
2. **Statusurile `deschis / în lucru / rezolvat`** nu au actor. Pentru un brief ca ResourceWise trebuia scris de la zero ciclul cererii.
3. **Două roluri pe două telefoane nu mergeau fără Supabase.** `memoryBackend` ține datele în memoria tab-ului, deci al doilea tab nu vedea schimbările primului. Demo-ul „donatorul acceptă, adăpostul vede” cădea exact când Supabase nu merge.
4. **Bug:** `useRoom` intra într-o buclă de render („Maximum update depth exceeded”) când primea `meta` ca obiect scris direct în apel. Se vedea în testul sondajului: zeci de erori în consolă și un telefon care se încălzește.
5. **Tabelul „tema → rețeta”** din `PLAN-12H.md` și din pagina de start împingea echipa să aleagă o rețetă după cuvinte-cheie, nu să mapeze fiecare cerință din brief.
6. **Lipsea declarația „construit înainte / construit azi”** și o listă cu urmele domeniului exemplu de șters. Un jurat care vede „pături pentru Gara de Nord” într-o aplicație despre altceva știe imediat că e template.

## Ce era bun și rămâne

- `ask()` cu Zod și `mock`, modul demo, `defineAction` cu confirmare pentru `write`, auditul determinist, recorderul. Sunt plasa de siguranță.
- `store.ts` e generic. `rooms` (Supabase Realtime cu BroadcastChannel ca rezervă) era folosit doar de sondaj, dar e exact ce trebuie pentru harta live.
- Sondajul și business canvas-ul. Răspund la întrebările 2 și 3, la care codul nu poate ajuta altfel.

## Ce s-a schimbat (P0, în ordine)

| # | Schimbare | Fișiere | Întrebarea mutată | Unde se vede în demo |
|---|---|---|---|---|
| 1 | Config de scenariu: domeniul, rolurile, textele, seed-ul, punctele, rangurile și tipurile de raport stau într-un fișier | `src/scenario/` | 7 Brief-ul (adaptare rapidă) | toate paginile vorbesc limba brief-ului |
| 2 | Roluri fără login și ciclul cererii: creat → acceptat → livrat → confirmat, plus „nu am primit” și suspendare | `src/lib/lifecycle.ts`, `src/lib/identity.ts` | 5 Bucla | secunda 30–90: donatorul acceptă, adăpostul confirmă |
| 3 | Gamificare calculată de cod: puncte, ranguri, ramă de profil, clasament, dashboard | `src/lib/gamification.ts` | 7 Brief-ul (2023 a cerut-o explicit) | după confirmare: punctele și rangul cresc |
| 4 | Raport rapid la locația curentă, cu oră, live pe hartă | `src/lib/reports.ts`, `src/lib/live.ts`, `/raport` | 6 Demo-ul (juriul raportează de pe telefon) | QR pe hartă, punctul apare live |
| 5 | Notificare SMS/email cu mock, link spre confirmare | `api/notify.ts`, `server/notify.ts` | 5 Bucla | „SMS trimis către adăpost”, link `/c/:id` |
| 6 | Rețetele în „Module opționale”, mascota și turul din config | `src/App.tsx`, `src/scenario/` | 6 Demo-ul (un singur drum) | meniul are doar fluxul scenariului |
| 7 | Kit de ambalare: „construit înainte / construit azi”, checklist pentru seed | `README.md`, `docs/AMBALARE.md` | semnalele bune din `JURIU.md` | README-ul pe care îl citește juriul |

Repetiția pe brief-ul ResourceWise și ce a ieșit din ea: [`REPETITIE-2023.md`](REPETITIE-2023.md).
