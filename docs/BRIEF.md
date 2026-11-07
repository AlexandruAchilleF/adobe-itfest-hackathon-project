# Brief-ul și deciziile echipei

Se completează la start (cu `/brief` sau de mână) și se actualizează toată ziua. Asistentul AI îl citește înainte de orice schimbare.
Criteriile sunt în `docs/JURIU.md`.

## Prima oră, pas cu pas

1. **0:00–0:10.** Lipiți textul exact al brief-ului mai jos. Fiecare propoziție care cere ceva și fiecare „you can include…” devine un rând în tabelul de cerințe.
2. **0:10–0:20.** Pentru fiecare cerință, piesa din template care o acoperă (vezi tabelul din `README.md`): roluri și pași → `flow`; documente → `documents`; „hartă”, „în apropiere” → `features.map`; „puncte”, „recompense” → `features.gamification`; „în timp real”, „unde ești” → `reports`; „notificare” → `notify` pe pași; „cât durează”, „eficiență” → `/cronometru`. Ce nu se potrivește cu nicio piesă se notează separat: acolo e munca zilei.
3. **0:20–0:30.** Trei idei, fiecare trecută prin trei filtre: (a) o problemă cu o cifră spusă de un om, (b) un plătitor care plătește deja pentru ea, (c) cel puțin două lucruri pe care codul le face în plus față de un prompt (verificare, mai mulți oameni legați, buclă închisă, măsurare, rezultat editabil). Alegeți una. Fraza ei devine `app.tagline`.
4. **0:30–1:30.** Doi oameni pe hol la interviuri (5 întrebări despre trecut, cu cifre). Un om copiază un scenariu exemplu și schimbă config-ul (`docs/AMBALARE.md`, secțiunea 1). La 1:30, `npm test` trece și fluxul merge cu fiecare rol.
5. **Tot timpul:** o buclă în plus față de ce cere brief-ul, care se închide în lumea reală (confirmarea celui care a primit și o cale pentru „n-a mers”). Asta a diferențiat câștigătorul din 2023.

## Brief-ul Adobe (textul exact)

> Marketing reimagined -  Build the next generation of ai powered marketing tools

Brief-ul are o singură frază și nicio listă „you can include…”. Întrebare deschisă pentru echipă: au mai dat organizatorii text (funcționalități opționale, un exemplu de utilizator, ce s-a arătat la workshopul Adobe din 22 octombrie)? Dacă da, se adaugă aici și în tabel.

## Cerințele din brief

| # | Cerință (din brief) | Obligatorie / opțională | Piesa din template care o acoperă | Unde se vede în demo | Gata |
|---|---|---|---|---|---|
| C1 | „marketing … tools”: unealta servește munca de marketing (materiale, campanii, clienți atrași) | obligatorie | `/design` (formate postare, story, banner, afiș A4; canvas Fabric editabil; export PNG/SVG), add-on-ul Adobe Express (`adobe-express-addon/`) | de stabilit după alegerea ideii | ☐ |
| C2 | „ai powered”: AI-ul face o parte reală din muncă | obligatorie | `ask()` cu schemă și `mock` (`src/lib/ai.ts`), input din text, voce sau poză (`/design`) | de stabilit | ☐ |
| C3 | „Build”: o unealtă care merge, nu un concept | obligatorie | deploy Vercel, testele e2e, link/QR pentru juriu (`src/lib/share.ts`, `QrPanel`) | de stabilit | ☐ |
| C4 | „reimagined”: marketingul făcut altfel, nu același proces cu AI lipit pe el | obligatorie (criteriul de unicitate) | parțial: auditul determinist (`src/lib/accessibility.ts`), fluxul cu confirmarea omului (`src/lib/flow.ts`) | de stabilit | ☐ |
| C5 | „next generation”: face ce n-ar face un prompt în ChatGPT sau un generator de azi | obligatorie (criteriul de unicitate) | parțial: verificări deterministe, mai mulți oameni legați, buclă închisă, măsurare (`src/lib/metrics.ts`) | de stabilit | ☐ |

### Ce nu acoperă nicio piesă (munca zilei)

- **Verificări de marketing deterministe**: regulile mărcii (paleta, logo-ul, mențiunile obligatorii) și concordanța ofertei (prețul, procentul, data de final, codul scrise pe material = oferta introdusă de om; ofertă expirată). Azi `checks.ts` verifică bonuri, iar `accessibility.ts` doar contrastul și lizibilitatea.
- **Măsurarea rezultatului în lumea reală**: cine a văzut materialul și a venit (scanări, coduri folosite), legată de material. Azi QR-ul duce doar la design (`/view`).
- **Un brief → mai multe formate coerente** (postare + story + afiș din aceeași ofertă). Azi `/design` generează un singur format odată.
- **Add-on-ul Adobe Express rulat de fapt în Express**: codul există, dar n-a fost testat (`docs/ADOBE-SETUP.md`).
- `/design` e azi în panoul echipei (`?dev=1`), nu în meniul juriului.

## Ideea aleasă

- **Fraza:** Ajutăm _[omul]_ să _[ce]_ fără _[durerea]_.
- **Omul:**
- **Durerea (cifra și sursa):**
- **Plătitorul:**
- **Diferența față de ChatGPT:**
- **Bucla în lumea reală:**
- **Momentul wow (secunda din demo):**

## Ideile respinse

| Idee | De ce nu |
|---|---|
| _(se completează după ce alege echipa dintre cele 3 de mai jos)_ | |

## Ideile propuse (de ales de echipă)

Notele 1–5 sunt pe cele 7 întrebări din `docs/JURIU.md`. Nicio cifră nu e încă de la un om real: Durerea și Plătitorul rămân ipoteze până la interviuri.

| | 1. Afișul care își numără clienții | 2. Aprobarea materialelor agenție ↔ client | 3. Reclama verificată pe surse |
|---|---|---|---|
| Fraza | Ajutăm patronul unei cafenele să facă promoția zilei în 2 minute și să știe câți clienți a adus, fără grafician și fără să ghicească | Ajutăm account managerul unei agenții să ia aprobarea clientului fără runde de emailuri | Ajutăm brand managerul să publice reclame în care fiecare afirmație are sursă, fără să aștepte avocatul |
| 1 Omul | 4: patronul, dimineața, înainte de deschidere | 4: account managerul, când trimite 12 vizuale | 4: brand managerul, înainte de lansare |
| 2 Durerea | 3: ipoteză (bani pe freelancer, promoții nemăsurate) | 3: ipoteză (zile pierdute pe feedback) | 3: ipoteză (reclame respinse, amenzi) |
| 3 Plătitorul | 3: afaceri mici care plătesc deja freelanceri sau Canva | 4: agenții care plătesc deja unelte de aprobare | 4: firme care plătesc deja consultanți juridici |
| 4 Diferența | 4: verificarea ofertei și auditul de lizibilitate în cod, coduri unice numărate | 4: reguli de marcă verificate de cod, retur cu motiv, cronometru | 5: fiecare afirmație căutată ca citat în fișa produsului (`verifyCitations`) |
| 5 Bucla | 4: afiș → scanare → cod → casierul confirmă „folosit” sau „cod respins” | 4: trimis → aprobat sau retur cu motiv → publicat | 3: verificat → aprobat de juridic → publicat; măsurarea după publicare lipsește |
| 6 Demo-ul | 5: juriul scanează afișul de pe ecran cu telefonul și vede cifra crescând | 3: B2B, puțin vizual | 4: ✗ pe „elimină 100% din bacterii”, reformulare, ✓ |
| 7 Brief-ul | 4: marketing măsurat offline, AI + om + cod | 2: mai mult flux de lucru decât „AI powered” | 4: marketing responsabil, AI + verificare |
| **Total** | **27** | **24** | **27** |
| Filtrul (a) cifră de la om | de adus: cum măsoară azi o promoție, cât plătesc pentru materiale | de adus: câte runde, câte zile | de adus: câte reclame respinse sau întârziate |
| Filtrul (b) plătitor existent | ipoteză plauzibilă, de verificat | da (piață de unelte de aprobare) | da (consultanță juridică) |
| Filtrul (c) ≥ 2 lucruri peste un prompt | da: verificare, buclă, măsurare, rezultat editabil | da: verificare, mai mulți oameni, buclă, măsurare | da: verificare, rezultat editabil, aprobare |

## Dovezi de la oameni reali

| Cine | Ce a spus (cifre) |
|---|---|
| | |

## Jurnal de decizii

| Ora | Decizia | Ce criteriu mută |
|---|---|---|
| 08:xx | Template copiat, `npm run check` trece (158 unitare, 29 e2e) | — |
| 08:xx | Verdict: B (rețeta `/design`), cu bucla din `flow`; de confirmat după alegerea ideii | 4, 5, 7 |
