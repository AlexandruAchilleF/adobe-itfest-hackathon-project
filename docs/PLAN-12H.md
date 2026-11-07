# Planul pentru cele 12 ore

Bazat pe cercetare (≈30 de câștigători de 12–24 h, hackathoanele Adobe 2024–2026, ITFest) și pe verdictul consiliului.
Pe scurt: **un om, un input haotic, o transformare AI, un rezultat editabil**, plus dovezi de la oameni reali.

## Ce notează juriul Adobe

Criteriile oficiale din prezentarea Adobe de la ITFest 2026: Problem Solving 25%, AI-Driven Innovation 25%, Third-Party Integrations 15%, Technical Excellence 25%, Product Experience & Demo 10%, plus bonus Cost vs. Value până la 10 puncte.
Întrebările care le mută, întrebările grele și cum le aplicați la fiecare decizie: [`JURIU.md`](JURIU.md). Deciziile echipei se notează în [`BRIEF.md`](BRIEF.md).
Cu Claude Code: `/juriu` la ora 6 și înainte de pitch.

## Rolurile (stabilite înainte)

| Rol | Ce face | La pitch |
|---|---|---|
| **Produs + validare** | interviuri pe hol, sondajul, business canvas, cifrele | spune problema și dovada |
| **Flux principal** | adaptează rețeta: schema, prompturile, datele de seed | rulează demo-ul |
| **AI + date** | prompturi, mock-uri realiste, cazuri în care AI-ul greșește | explică arhitectura în video, răspunde la întrebări tehnice |
| **Pitch + polish** (la 4 oameni) | slide-uri, video-ul de prezentare, deploy, UI | ține timpul |

La 2–3 oameni, rolurile 3 și 4 se împart între ceilalți.

## Programul zilei

La ITFest × Adobe 2026 se lucrează de la **08:00 la 20:00**, iar jurizarea începe la 20:00. Deci 0:00 = 08:00, oprirea funcționalităților (6:00) = 14:00, înghețul de cod (10:30) = 18:30. Fiți gata de prezentare la 19:45.

| Ora | Ce faceți |
|---|---|
| 0:00–0:30 | Brief-ul → `/brief` → alegeți ideea și rețeta din tabelul de mai sus → o frază: „Ajutăm [cine] să [ce] fără [durere]”. |
| 0:30–1:30 | **Fără cod.** 5 interviuri pe hol cu participanți și mentori, plus business canvas (`/business`) și sondajul pornit (`/survey`, QR pe masă). În paralel, cineva schimbă schema și datele de seed. |
| 1:30–6:00 | Un singur flux, cap-coadă. La 6:00 trebuie să meargă, chiar dacă e urât. |
| 6:00 | **Nu se mai adaugă funcționalități.** |
| 6:00–9:00 | Calitate: prompturi, mock-uri pentru fiecare apel AI, cazurile în care AI-ul greșește, pasul de confirmare vizibil. |
| 9:00–10:00 | Deploy pe Vercel, testat pe telefon, slide-uri cu cifrele din sondaj, schema de arhitectură. La 9:00 (17:00) se îngheață drumul din video; capturile se fac pe versiunea publicată. |
| 10:00–11:30 | Vocea și montajul video-ului de prezentare (`docs/PITCH.md`). MP4-ul final la 11:30 (19:30). |
| 10:30–12:00 | **Îngheț de cod.** Video-ul văzut cu ceasul și de un om din afară, repetiții și răspunsuri la întrebările grele. |

## Prezentarea (în jur de 3 minute)

Organizatorii recomandă un videoclip de prezentare, de circa 3 minute (durata nu e fixată), cu mult accent pe arhitectură și pe partea tehnică. Textul complet pentru Spire e în `docs/PITCH.md`. Dacă trebuie tăiat, se taie din demo, nu din arhitectură.

| Timp | Conținut |
|---|---|
| 0:00–0:10 | Rezultatul și identitatea într-o frază. |
| 0:10–0:25 | Persoana și durerea, cu dovada: „11 din 14 oameni întrebați azi…”. |
| 0:25–1:05 | Demo-ul, un singur flux, tăiat la montaj. Arătați ce decide AI-ul și pasul în care omul confirmă sau corectează. (Problem Solving, AI, Demo) |
| 1:05–2:30 | **Arhitectura și integrările**, pe rularea reală: decizia și motivul ei, ce API face ce, ce se întâmplă când pică unul, testele, limitele. (Technical Excellence 25%, Integrations 15%) |
| 2:30–2:45 | Costul pe rulare vs. ce aduce sau economisește, calculat de cod; cine plătește. (bonus Cost vs. Value) |
| 2:45–3:00 | Ce urmează: un plan pe 30 de zile (de exemplu publicarea în marketplace-ul Express). QR-ul pe ultimul cadru. |

Slide-urile sunt în aplicație, la `/pitch`, pe aceleași teme (checklist: `docs/AMBALARE.md`, secțiunea 3). Aveți pregătite și o variantă de 30 de secunde și una de 5 minute.

## Plan de avarie

| Ce se strică | Ce faceți |
|---|---|
| Internetul din sală | hotspot de pe telefon; aplicația rulează local cu `npm run dev` |
| Cota sau cheia AI (eroare 429/401) | schimbați `AI_PROVIDER` (gemini ↔ anthropic), iar la nevoie bifați **Mod demo**: răspunsuri simulate realiste |
| AI-ul răspunde prost la demo | citatele neverificate apar marcate cu ✗, nimic nu se modifică fără aprobare. Spuneți asta, e un punct forte. |
| Demo-ul pică de tot | video-ul de prezentare |
| Adobe PDF Embed nu se încarcă | viewer-ul trece automat pe pdf.js |
| Supabase nu merge | datele rămân în browser (localStorage), sondajul merge între tab-uri |
