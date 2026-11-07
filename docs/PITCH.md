# Pitch-ul Spire: textul, repetițiile, întrebările

Ciornă scrisă la 10:30, când aplicația nu e încă gata. Ce e între `[paranteze]` se completează cu o cifră măsurată sau se scoate. Nu inventăm nimic. Criteriile: `docs/JURIU.md`.

## Ce trebuie făcut până la pitch

| Când | Ce | Criteriul mutat |
|---|---|---|
| **Acum, cât rulează implementarea** | 5 interviuri și testul cu cronometrul (secțiunea de mai jos) | Problem Solving: fără cifră, întrebarea 2 are maximum 2 din 5 |
| Acum | Întrebați mentorii Adobe de acces la Firefly și cât durează pitch-ul real | Integrări; tot textul de mai jos e pe 3 minute |
| Acum, 15 min | Același brief în Pomelli și în Firefly/Express, cu capturi | Răspunsul la cea mai grea întrebare |
| Până la 14:00 | Decizia despre buclă și despre costul calculat | Problem Solving, bonusul +10 |
| 14:00 | Primul `/juriu`, pe aplicația reală | Toate |
| 14:00–17:00 | Același test cu cronometrul, de data asta în Spire, cu cheia reală | Cifra din pitch |
| 17:00–18:30 | Deck-ul (`PITCH` și slide-urile care lipsesc), video de rezervă, deploy | Demo, Technical Excellence |
| 18:30–19:45 | Minimum 3 repetiții cu ceasul, apoi întrebările grele | Toate |

## Pitch-ul de 3 minute

Doi vorbitori: cine conduce demo-ul nu vorbește în același timp. Propunere: colegul conduce demo-ul (extensia e a lui), Alexandru spune povestea și arhitectura.

### 0:00–0:12: rezultatul, înainte de orice explicație

Pe ecran: în stânga referința, în dreapta kitul Gelateriei Pip, cu bifele gărzii.

> Asta e un design văzut pe un site. Asta e aceeași idee de stil, pe marca unei gelaterii, cu mascota ei. A ieșit în [X] minute, fără designer și fără să scriem un prompt. Se numește Spire.

### 0:12–0:30: omul și durerea

> Gândiți-vă la omul de marketing dintr-o firmă mică. Postarea trebuie să iasă azi, iar designerul e ocupat sau nu există. Azi am rugat [N] oameni care fac marketing să refacă un material în ChatGPT sau Firefly: le-a luat în medie [Y] minute și [Z] prompturi, iar [W] din [N] rezultate nu respectau marca. [Nume, rol] ne-a spus: „[citat scurt]”.

Dacă nu avem măcar 3 oameni care chiar fac marketing, spunem exact pe cine am testat. „Am testat pe 6 participanți, 2 din marketing” rezistă. O cifră umflată nu rezistă la prima întrebare.

### 0:30–1:40: demo-ul live, un singur drum

Spec-ul are 120 de secunde pentru demo, iar pitch-ul are 70. Cele de mai jos sunt tăieturile; se probează cu ceasul.

| Timp | Ce se face | Ce se spune |
|---|---|---|
| 0:30 | Clic pe iconiță, Spire apare peste site, chenarele se aprind | „Sunt pe un site care îmi place. Spire nu primește un prompt, se uită la pagină.” |
| 0:38 | Spire spune ce a găsit; clic pe hero | „A ales ce e util pentru o campanie și spune de ce.” |
| 0:43 | Anatomia, apoi 2 întrebări din cele 3–5 | „Înțelege zonele și rolurile culorilor. Întreabă doar ce nu știe: oferta și ce formate vreau. Culorile și mascota le are din marcă.” |
| 0:55 | Se generează kitul | „Acum redesenează Pip în stilul referinței și așază postarea, story-ul și hero-ul. Bucla de agent verifică rezultatul și corectează singură, de cel mult două ori, înainte să-l vedem noi.” |
| **~1:10** | **Kitul apare, cu bifele** (momentul wow) | Tăceți două secunde. |
| 1:15 | Schimbați prețul pe un strat: bifa devine roșie; corectați: verde | „Asta nu e AI. E cod. Prețul de pe material trebuie să fie cel aprobat. Omul are ultimul cuvânt, iar codul nu-l lasă să publice din greșeală altă ofertă.” |
| 1:30 | Export | „[Se deschide în Adobe Express / PNG și cod HTML pentru hero.]” Spuneți doar ce merge la acea oră. |

Timpul real de generare se măsoară azi. Dacă depășește 15 secunde, demo-ul pornește de pe o rulare gata generată și spuneți asta cu voce tare: „ca să nu așteptăm, asta e rularea de acum 10 minute; o puteți încerca live pe telefon”.

### 1:40–2:10: arhitectura

Slide cu schema: `pagina → citire (extensie) → AI: anatomie, texte, mascotă → cod: compoziție, gardă → om → export`.

> AI-ul face ce codul nu poate: înțelege referința, scrie textele, desenează mascota. Tot restul e logică pură, cu teste: compoziția, comparația de culori, amprenta care ne spune că imaginea nu e aproape identică cu referința. Fiecare răspuns AI e validat cu o schemă. Dacă pică generarea, punem mascota originală și garda o spune pe față. Dacă pică rețeaua, avem un mod demo cu răspunsuri simulate. [N] teste trec; pe [M] referințe reale, [P]% au trecut garda după buclă.

Integrările, cu ce pierdem fără fiecare: Gemini (fără el nu există produsul), Chrome (locul unde apare inspirația; rezerva e pagina web), Adobe Express (locul unde omul continuă editarea; rezerva e PNG).

> Am pornit de la un schelet al nostru pentru hackathoane: AI cu schemă și mock, stocare, mascotă. Tot ce e Spire s-a scris azi și se vede în git log.

Fraza asta se spune înainte să fim întrebați (`docs/AMBALARE.md`, secțiunea 5).

### 2:10–2:35: cost și valoare

> O rulare costă [~X] cenți: o imagine sau până la trei, dacă bucla reîncearcă, plus textele. Aplicația calculează asta pe fiecare campanie. Economia: [Y – Y'] minute pe material, la [Z] lei pe oră, adică [V] lei. [Rol] ne-a spus că plătește azi [S] pe un material. Plătitorul e firma, cu abonament.

Reperul de cost: `gemini-2.5-flash-image` e raportat la circa 0,039 $ pe imagine, deci 0,04–0,12 $ pe rulare doar pentru imagine. Sursa e secundară, așa că verificați pe pagina oficială și folosiți consumul real din log.

### 2:35–3:00: închiderea

> Azi merge pe imagini și hero. În 30 de zile: [doi clienți-pilot din interviuri], generare cu Firefly, ca rezultatul să fie sigur comercial, și add-on publicat în marketplace-ul Express. Spire nu înlocuiește designerul. Îl ajută pe omul care azi n-are unul.
>
> Scanați codul și încercați pe telefon.

Slide-ul cu QR rămâne pe ecran în timpul întrebărilor.

## Varianta de 30 de secunde (pe hol, la mentori)

> Omul de marketing vede un design care îi place și vrea ceva la fel, pe marca lui, azi. În chat îi ia [Y] minute și tot iese greșit. Spire apare peste site, se uită la design, pune două-trei întrebări și face kitul de campanie cu mascota și culorile mărcii. Codul verifică prețul, culorile și contrastul, iar omul aprobă. Fiecare rulare costă câțiva cenți.

Pentru varianta de 5 minute: lăsați demo-ul să aibă toate întrebările, plus încă un slide cu ce a prins garda în rulările reale.

## Testul de azi: de aici vine cifra din pitch

**Cu cine.** În ordine: oameni care lucrează în marketing (mentori, staff ITFest, sponsori, 3–4 cunoscuți sunați acum), apoi orice participant, marcat ca atare.

**Întrebări despre trecut, fără să spuneți ideea înainte:**

1. Ultima dată când ai refăcut un material după ceva văzut: ce era, cine l-a făcut, cât a durat?
2. Câte materiale statice ai făcut luna trecută? Câte a făcut un designer sau o agenție?
3. Cât a costat ultimul material dat în afară?
4. Ai încercat ChatGPT, Firefly sau Canva pentru asta? De câte ori ai reîncercat și ce a ieșit greșit?
5. Ce ai plătit deja ca să scapi de problema asta?

Încheiați cu „Pe cine altcineva să întreb?” și cereți voie să-i spuneți numele sau rolul pe scenă. Un „ar fi tare” de la un mentor nu e dovadă.

**Cronometrul (10 minute de om).** Dați-le: o referință licențiată, fișa Gelateriei Pip (culori, mascota, oferta exactă). Sarcina: „Fă o postare pe care ai publica-o, în ChatGPT, Gemini sau Firefly.” Se oprește la 10 minute sau când omul zice „gata”.

Notați:

| Om și rol | Unealta | Minute | Prompturi | Mascota corectă? | Culori corecte? | Text și preț exacte? | Ar publica? |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

Păstrați capturile: un rezultat greșit cu textul „20%” deformat e cea mai bună imagine din slide-ul cu problema. După 14:00, același tabel cu Spire, cu cheia reală. Comparația dintre cele două e cifra pitch-ului.

Cifrele merg în `docs/BRIEF.md` („Dovezi de la oameni reali”) și în `spire.ts` (`business.evidence`).

## Întrebările grele

Juriul e probabil format din ingineri de date și de producție. Răspunsul scurt primul, detaliul doar dacă sunt întrebați.

**1. „Adobe are deja Style Reference în Firefly și Brand Kit în Express. Google are Pomelli. De ce Spire?”**
Așa e, și nu concurăm cu un model de imagine; Firefly poate fi chiar generatorul nostru. Adăugăm trei lucruri: agentul stă pe site, în momentul inspirației, deci nu există prompt de scris; din referință extragem o anatomie, deci rezultatul are straturi editabile, nu e o imagine plată; iar garda deterministă verifică prețul și mențiunile. *[De confirmat azi cu încercarea din Pomelli și Firefly. Spuneți doar ce ați văzut.]*

**2. „Nu e asta copiere? Vedeți un design și îl clonați.”**
Copiem stilul și așezarea, intenționat, și spunem asta pe ecran. Ilustrația, textele, culorile și logo-ul sunt ale omului. Codul compară imaginea generată cu referința și respinge ce e aproape identic. În demo folosim o referință licențiată. Nu promitem originalitate certificată și nu dăm consultanță juridică: omul decide ce publică. Evitați cuvântul „concurent” pe scenă și în landing.

**3. „De ce Gemini la un hackathon Adobe?”**
L-am putut folosi azi. Generarea stă în spatele unui singur endpoint (`api/image.ts`), deci furnizorul se poate schimba. Firefly e pasul următor, pentru că e gândit pentru uz comercial. *[Dacă am cerut acces mentorilor, spunem și asta.]*

**4. „Ce e aici în plus față de un prompt?”**
Citirea paginii, marca salvată, straturi editabile, consecvența ofertei pe formate și verificări deterministe. Demonstrați: schimbați prețul și arătați bifa roșie. Niciun chat nu face asta.

**5. „Fără AI, mai există produsul?”**
Nu. Fără AI nu înțelegem referința și nu avem mascotă. Codul doar păzește.

**6. „Cât de bună e calitatea, măsurat?”**
Răspundeți cu cifrele din testul de generare: [x]/10 publicabile, judecat de [cine]; pe [M] referințe, [P]% au trecut garda după buclă, iar [Q]% au avut nevoie de reîncercare. Fără aceste cifre, spuneți că nu le aveți. Întrebarea e sigură de la un om de „Run and Operate”.

**7. „Ce se întâmplă dacă Gemini dă 429 sau pică în timpul unei rulări?”**
Mesaj în balon și „Încearcă din nou”; dacă generarea eșuează de două ori, mascota originală, iar garda spune asta. *[Verificați pe aplicație: opriți cheia și rulați.]* Trecerea pe Claude pentru text și vedere e azi manuală, din `AI_PROVIDER`: în `server/ai.ts` furnizorul se alege din configurație, nu după o eroare. Nu spuneți „failover automat” decât dacă se implementează. Pentru imagine nu există al doilea furnizor, doar rezerva.

**8. „Ce faceți cu un model care minte în verificare?”**
Doar „seamănă cu mascota” e o verificare AI și e marcată „AI” pe ecran. Restul se calculează din design. Dacă garda pică, nu ajunge la om ca „verificat”.

**9. „Merge extensia pe orice site? Dar pe site-urile cu CSP sau pe Instagram?”**
Pe pagini care nu se pot citi, lucrăm pe pixeli și marcăm rolurile culorilor ca „ghicite”. *[De testat: un CSP strict poate bloca iframe-ul din strat; ar rămâne panoul lateral. Probați pe 5 site-uri mari și spuneți rezultatul real.]*

**10. „Ce date pleacă din browser? Ce permisiuni cere?”**
`activeTab`, `scripting` și `sidePanel`, deci nimic permanent. Pagina se citește doar la clic. Captura și textele merg la serverul nostru și la modelul AI, iar cheile rămân pe server. Nu sunt date de clienți. Spuneți deschis că azi nu avem conturi sau izolare între firme.

**11. „Cine plătește și cât?”**
*[Din interviuri.]* Fără cifră: „ipoteza e un abonament plătit de firmă, iar azi am aflat că [N] oameni dau [S] pe material; prețul nu e validat”.

**12. „Cum se scalează? Costuri la 1.000 de clienți?”**
Motorul e fără stare, pe funcții serverless. Costul variabil e imaginea generată, calculat pe rulare, deci prețul se poate lega de numărul de campanii. *[Doar dacă e adevărat când se pune întrebarea, adăugați: datele sunt în Supabase.]*

**13. „Ce ați scris azi și ce aveați?”**
Scheletul e de dinainte, Spire e de azi. Arătați `git log --since=2026-11-07` și tabelul din README.

**Regula:** când nu știți, spuneți „nu am măsurat asta încă”. La ingineri, „nu știu, dar uite cum aș măsura” câștigă în fața unui răspuns inventat. Oricine din echipă explică orice fișier din demo; ce nu poate explica nimeni iese din demo.

## Rezerve pe scenă

| Dacă | Atunci |
|---|---|
| Extensia nu se încarcă pe site | Pagina `/nou` cu încărcare de imagine; spuneți ce lipsește |
| Rețeaua pică | Hotspot; apoi `npm run dev` local cu Mod demo, spus ca atare |
| Gemini e lent | Rularea generată mai devreme, spus cu voce tare |
| Express nu merge | PNG, și nu pomeniți Express în demo |
| Totul pică | Video-ul de 60 de secunde, apoi continuați cu slide-urile |

**Pe laptop înainte:** site-ul de demo deschis și testat, extensia instalată, zoom setat, notificările oprite, `?dev=0`, încărcătorul în priză, marca Pip încărcată, date curate. Telefonul cu hotspot pornit. PDF-ul deck-ului pe telefon.

## Repetițiile

1. **Ora 18:30, cu ceasul:** tot, fără oprire. Tăiați ce a depășit, nu vorbiți mai repede.
2. **Cu pană:** cineva oprește rețeaua la secunda 50. Exersați trecerea pe rezervă.
3. **Cu un om din afară:** după pitch, întrebați-l ce face produsul și pentru cine. Dacă nu poate spune, schimbați prima frază.
4. **Întrebări:** câte un răspuns de 20 de secunde la toate cele 13, spus de fiecare, nu doar de cel care a scris partea aceea.
