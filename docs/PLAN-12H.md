# Planul pentru cele 12 ore

Bazat pe cercetare (≈30 de câștigători de 12–24 h, hackathoanele Adobe 2024–2026, ITFest) și pe verdictul consiliului.
Pe scurt: **un om, un input haotic, o transformare AI, un rezultat editabil**, plus dovezi de la oameni reali.

## Ce notează juriul Adobe

Criteriile, întrebările grele și cum le aplicați la fiecare decizie: [`JURIU.md`](JURIU.md). Deciziile echipei se notează în [`BRIEF.md`](BRIEF.md).
Cu Claude Code: `/brief` la start (brief → cerințe bifabile → 3 idei punctate), `/juriu` la ora 6 și înainte de pitch.

## Brief-ul → piesele din template

La ITFest, Adobe a dat de fiecare dată un scenariu cu funcționalități opționale numite (2023: ResourceWise, cu hartă și gamificare; 2024, dedus: raportare live pe hartă). Nu alegeți o „rețetă” după cuvinte-cheie: mapați fiecare cerință pe o piesă. Pașii sunt în `docs/BRIEF.md` („Prima oră”), piesele în `README.md`.

| Dacă brief-ul seamănă cu… | Porniți de la scenariul | Ce schimbați |
|---|---|---|
| un proces între oameni dintr-o organizație (aprobări, cereri interne, deconturi, documente) | `deconturi` | `roles`, `flow`, `documents.rules`, `seed` |
| oameni care au ceva și oameni care au nevoie, pe o hartă (resurse, voluntariat) | `resurse` | `roles`, `flow`, `categories`, `reports`, `points`, `seed` |
| cereri interne: IT, HR, onboarding, aprobări fără documente | `interne` | `roles`, `flow`, `categories`, `seed` |
| raportare în timp real, la locația curentă (sesizări, incidente, ce vezi acum) | `sesizari` | `reports.types`, `flow`, `roles`, `seed` |
| citit și înțeles documente lungi | modulul `/docs` + `flow` pentru ce urmează după citire | documentul, întrebările |
| un material creativ sau accesibilitate | modulul `/design` | brief-ul, formatul, regulile auditului |

Cel mai ieftin indiciu despre temă: întrebați ce s-a prezentat la workshopul Adobe de la ITFest din 22 octombrie.

## Rolurile (stabilite înainte)

| Rol | Ce face | La pitch |
|---|---|---|
| **Produs + validare** | interviuri pe hol, sondajul, business canvas, cifrele | spune problema și dovada |
| **Flux principal** | adaptează rețeta: schema, prompturile, datele de seed | rulează demo-ul |
| **AI + date** | prompturi, mock-uri realiste, cazuri în care AI-ul greșește | răspunde la întrebări tehnice |
| **Pitch + polish** (la 4 oameni) | slide-uri, video de rezervă, deploy, UI | ține timpul |

La 2–3 oameni, rolurile 3 și 4 se împart între ceilalți.

## Programul zilei

| Ora | Ce faceți |
|---|---|
| 0:00–0:30 | Brief-ul → `/brief` → alegeți ideea și rețeta din tabelul de mai sus → o frază: „Ajutăm [cine] să [ce] fără [durere]”. |
| 0:30–1:30 | **Fără cod.** 5 interviuri pe hol cu participanți și mentori, plus business canvas (`/business`) și sondajul pornit (`/survey`, QR pe masă). În paralel, cineva schimbă schema și datele de seed. |
| 1:30–6:00 | Un singur flux, cap-coadă. La 6:00 trebuie să meargă, chiar dacă e urât. |
| 6:00 | **Nu se mai adaugă funcționalități.** |
| 6:00–9:00 | Calitate: prompturi, mock-uri pentru fiecare apel AI, cazurile în care AI-ul greșește, pasul de confirmare vizibil. |
| 9:00–10:30 | Deploy pe Vercel, testat pe telefon, video de 60 s cu `⏺ Rec`, slide-uri cu cifrele din sondaj. |
| 10:30–12:00 | **Îngheț de cod.** Cel puțin 3 repetiții de pitch și răspunsuri la întrebările grele. |

## Pitch-ul (3 minute)

| Timp | Conținut |
|---|---|
| 0:00–0:10 | Identitatea într-o frază și categoria în care intrați. |
| 0:10–0:30 | Persoana și durerea, cu dovada: „11 din 14 oameni întrebați azi…”. |
| 0:30–2:00 | Demo live, un singur flux. Ideal, cineva din juriu încearcă. Arătați pasul în care omul confirmă sau corectează. |
| 2:00–2:20 | Ce folosiți de la Adobe (PDF Embed, add-on Express) și de ce AI-ul e folosit responsabil. |
| 2:20–2:45 | Cine plătește, cât, primul segment de piață, numărat de jos în sus. |
| 2:45–3:00 | Ce urmează: un plan pe 30 de zile (de exemplu publicarea în marketplace-ul Express). |

Slide-urile sunt în aplicație, la `/pitch`, pe aceleași teme (checklist: `docs/AMBALARE.md`, secțiunea 3). Aveți pregătite și o variantă de 30 de secunde și una de 5 minute.

## Plan de avarie

| Ce se strică | Ce faceți |
|---|---|
| Internetul din sală | hotspot de pe telefon; aplicația rulează local cu `npm run dev` |
| Cota sau cheia AI (eroare 429/401) | schimbați `AI_PROVIDER` (gemini ↔ anthropic), iar la nevoie bifați **Mod demo**: răspunsuri simulate realiste |
| AI-ul răspunde prost la demo | citatele neverificate apar marcate cu ✗, nimic nu se modifică fără aprobare. Spuneți asta, e un punct forte. |
| Demo-ul pică de tot | video-ul de 60 s înregistrat cu `⏺ Rec` |
| Adobe PDF Embed nu se încarcă | viewer-ul trece automat pe pdf.js |
| Supabase nu merge | datele rămân în browser (localStorage), sondajul merge între tab-uri |

## Testul înainte de eveniment

Repetiție completă pe tema „Resource Wise” (ITFest 2023): 4 ore de construit și 3 minute de pitch, cronometrate. Adaptarea config-ului, făcută de asistent, e descrisă în `docs/REPETITIE-2023.md`; repetați-o voi, cu ceasul pornit.
Fiecare membru explică cu voce tare un fișier din nucleu: `src/lib/ai.ts`, `src/lib/documents.ts`, `src/lib/agent.ts` sau `src/lib/store.ts`.
**Ce nu poate explica nimeni din echipă se scoate.**
