# Prezentarea Spire: pitch-ul live, video-ul demo, întrebările

Formatul: 2 minute de pitch live, apoi video-ul demo de ~1:10, fără sunet și fără subtitrări, cu noi vorbind peste el. Nu inventăm nimic. Criteriile: `docs/JURIU.md`. Filmarea: `docs/DEMO-VIDEO.md`.

## Formatul

- **Pitch-ul live, 2:00:** hook cu sala, problema și banii, arhitectura. Vorbim pe deck (`/pitch`), cu clickerul.
- **Video-ul demo, ~1:10:** Marina Park, pe slide-ul 8. Rulează din deck, ca să nu schimbăm aplicația pe proiector.
- **Exemplele:** în pitch rămân machetele cu Gelateria Pip; în video apare Marina Park, un business real. Le legăm cu o singură frază, la trecerea spre video.
- **Fără QR:** Spire lucrează prin extensia de Chrome și nu avem nimic funcțional pe telefon. Adresa rămâne în text pe slide-ul final.
- **Împărțirea:** David deschide (hook, problema, piața) și ține video-ul; Alexandru ține arhitectura și garda. Două predări, nu mai multe.
- **Ținta:** circa 290 de cuvinte vorbite în 2 minute. Dacă depășim la repetiție, tăiem frazele marcate cu ✂, nu vorbim mai repede.

Ce mută fiecare bucată (`docs/JURIU.md`): hook-ul și problema → 1 Omul, 2 Durerea; piața → 3 Costul și plătitorul (bonusul +10); arhitectura și garda → 4 Diferența, 8 Integrările, 9 Fiabilitatea (65% din notă împreună cu Problem Solving); video-ul → 1 Omul, 6 Demo-ul.

## Ce este făcut de noi și ce face Spire

Spunem asta deschis, pe scenă și la întrebări:

- **Afișul Marina Park** (`demo-videos/afis-marina-park.png`) și **clipul Marina Park** (`demo-videos/marina-park.mp4`) sunt create de noi, pe 7 noiembrie 2026, cu fotografiile și textele de pe marinapark.ro.
- **Video-ul demo** arată aplicația reală și extensia reală. Afișul intră în el printr-o campanie salvată, iar clipul se pune peste pagină la montaj.
- **Aplicația** are propriul drum de generare: analiza, ilustrația, compunerea, garda și clipul randat în browser. Machetele din deck sunt exemple cu Gelateria Pip.

## Ce mai trebuie făcut

| Ordinea | Ce | Cine | De ce |
|---|---|---|---|
| 1 | Filmarea și montajul: `public/pitch/demo.mp4`, după `docs/PROMPT-DEMO-VIDEO.md` | David | Slide-ul 8 spune că lipsește până atunci |
| 2 | O rulare de la cap la coadă cu cheile reale, pe producție | Alexandru | Testele automate rulează fără chei AI |
| 3 | Două repetiții cu ceasul, peste video, apoi una în fața unui om din afară | amândoi | |

## Pitch-ul live, 2 minute

### 0:00–0:15 · Hook, cu sala (slide-ul 2, „Ghiciți”) · David

> Ridicați mâna: cine a văzut pe net un design și și-a zis „vreau și eu așa ceva, pe marca mea”? [pauză, mâinile sus]
> Acum ghiciți: câte prompturi îi trebuie unui chat ca să facă asta pentru o gelaterie, cu mascota ei și cu prețul corect? Unul? Cinci? Zece? [mâinile la fiecare]

Reținem ce a votat sala: revenim la ea înainte de video. Interacțiunea ține 10 secunde; dacă sala e tăcută, mergem mai departe după prima întrebare.

### 0:15–0:25 · Problema și cât costă azi (slide-ul 3) · David

> Fără designer, o firmă mică plătește azi între 500 și 3.500 de lei pe lună unui freelancer sau unei agenții, doar ca postările să arate a ei.

### 0:25–0:45 · Piața și cine plătește (slide-ul 4) · David

> În România sunt circa 930.000 de IMM-uri, aproape toate microîntreprinderi. Ipoteza noastră: plătește firma, cu un abonament mai mic decât un pachet de agenție, care pornește de la 99 de euro pe lună. Prețul nu l-am validat încă și nici costul pe rulare nu l-am măsurat. Îl testăm cu primii clienți-pilot.

### 0:45–0:55 · Ce face Spire (slide-ul 5) · David → Alexandru

> Spire e o extensie de Chrome. Se uită la pagina pe care ești, te întreabă trei lucruri și îți face kitul pe marca ta. Fără prompt. Alexandru vă arată cum.

### 0:55–1:25 · Arhitectura (slide-ul 6) · Alexandru

Slide-ul pornește cu Extensia aprinsă. Fiecare clic aprinde pasul următor, iar ultimul aprinde bucla, clipul și rezervele. Sunt șapte stări, deci șase clicuri până la imaginea completă.

> Avem o singură regulă: AI-ul propune, codul verifică, omul aprobă.
> Extensia citește pagina doar când apeși, cu permisiunea activeTab. Gemini scoate anatomia referinței: zonele, rolurile culorilor. Nu-l credem pe cuvânt: răspunsul trece printr-o schemă Zod. FLUX.2, pe Cloudflare, redesenează mascota în stilul referinței.
> Apoi intră codul: compune designul pe straturi editabile și îl trece prin gardă, iar omul are ultimul cuvânt.

### 1:25–1:50 · Garda (slide-ul 7) · Alexandru

> Garda compară prețul ca valoare și monedă, culorile cu Delta E, iar o amprentă dHash respinge copia. Ce pică se întoarce la AI, de cel mult două ori.
> Dacă Gemini e supraîncărcat, trecem pe alt model; dacă pică ilustrația, kitul iese cu mascota originală, iar garda o spune. ✂

Fiecare frază e o decizie cu motivul ei. Cifrele se verifică în cod înainte de repetiție: `src/lib/agentLoop.ts`, `server/providers/gemini.ts`, `THRESHOLDS` din `src/lib/guard.ts`.

### 1:50–2:00 · Trecerea la video (tot pe slide-ul 7) · David

> Ați ghicit [ce a votat sala]. Gelateria a fost exemplul nostru. Acum, un business real: Marina Park, din Vama Veche.

Clic: pornește video-ul.

### Peste video (slide-ul 8) · David

Video-ul n-are sunet și nici subtitrări. Frazele și momentele lor sunt în `docs/PROMPT-DEMO-VIDEO.md`; secundele exacte ies în `docs/demo/repere.md` după montaj. Fraza care nu lipsește, când apare afișul: „Afișul și clipul pentru Marina Park le-am făcut noi.”

### După video: slide-ul 9

„N-ai designer azi? Spire e aici.”, cu ce am construit azi, ce urmează, echipa și adresa în text. Stă pe ecran la întrebări.

## Deck-ul

| # | Slide | Timp | Ce arată |
|---|---|---|---|
| 1 | Coperta | înainte de start | Stă pe ecran cât urcăm; nu intră în cele 2 minute |
| 2 | Ghiciți | 0:00 | Referința și trei variante: 1, 5, 10+ |
| 3 | Problema | 0:15 | 500–3.500 lei pe lună, cu sursa, și durerile |
| 4 | Piața | 0:25 | 930.000, cu sursa; plătitorul ca ipoteză; pachetul de agenție |
| 5 | Cum funcționează | 0:45 | Machetele cu Gelateria Pip |
| 6 | Arhitectura | 0:55 | Pașii clic cu clic, apoi bucla, clipul și rezervele |
| 7 | Garda | 1:25 | Macheta prinde prețul și îl corectează |
| 8 | Video-ul | 2:00 | `public/pitch/demo.mp4`, pe tot ecranul, fără sunet. Dacă fișierul lipsește, slide-ul spune asta |
| 9 | Finalul | după video | Ce am construit, ce urmează, echipa, adresa |

## Cum arătăm că am înțeles

Fiecare fragment tehnic spune **o decizie și de ce**, nu o listă de tehnologii. „Folosim Zod” nu dovedește nimic; „nu ne bazăm pe răspuns, așa că îl validăm” dovedește.

- Pentru fiecare fragment, fiecare din noi poate răspunde la: de ce așa, ce alternativă am lăsat, când se strică. Răspunsurile nu se citesc.
- Cifrele vin din cod (pragurile din `THRESHOLDS`, numărul de reîncercări, cele 20 de secunde). Înainte de voce, se verifică textul de mai sus pe codul de la acea oră.
- Ce nu poate explica nimeni iese din pitch.
- Testul: fiecare ia un fișier din tabel, la întâmplare, și îl explică celuilalt în 30 de secunde.

## Varianta de 30 de secunde (pe hol, la mentori)

> Omul de marketing vede un design care îi place și vrea ceva la fel, pe marca lui, azi. În chat iese altă mascotă și alt preț. Spire apare peste site, se uită la design, pune două-trei întrebări și face kitul de campanie cu mascota și culorile mărcii. Codul verifică prețul, culorile și contrastul, iar omul aprobă.

Pentru varianta de 5 minute: arhitectura rămâne întreagă; adăugați toate întrebările din demo și un slide cu ce a prins garda în rulările reale.

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

Video-ul nu ține loc de ele: dacă după video urmează întrebări, aici se vede dacă am înțeles.

**1. „Adobe are deja Style Reference în Firefly și Brand Kit în Express. Google are Pomelli. De ce Spire?”**
Așa e, și nu concurăm cu un model de imagine; Firefly poate fi chiar generatorul nostru. Adăugăm trei lucruri: agentul stă pe site, în momentul inspirației, deci nu există prompt de scris; din referință extragem o anatomie, deci rezultatul are straturi editabile, nu e o imagine plată; iar garda deterministă verifică prețul și mențiunile. *[De confirmat azi cu încercarea din Pomelli și Firefly. Spuneți doar ce ați văzut.]*

**2. „Nu e asta copiere? Vedeți un design și îl clonați.”**
Copiem stilul și așezarea, intenționat, și spunem asta pe ecran. Ilustrația, textele, culorile și logo-ul sunt ale omului. Codul compară imaginea generată cu referința și respinge ce e aproape identic. În demo folosim o referință licențiată. Nu promitem originalitate certificată și nu dăm consultanță juridică: omul decide ce publică. Evitați cuvântul „concurent” pe scenă și în landing.

**3. „De ce Gemini și FLUX la un hackathon Adobe?”**
Le-am putut folosi azi: la Gemini, modelele de imagine cer plată, așa că ilustrația trece prin Cloudflare FLUX.2, care are o cotă gratuită. Generarea stă în spatele unui singur endpoint (`api/image.ts`), deci furnizorul se poate schimba. Firefly e pasul următor, pentru că e gândit pentru uz comercial. *[Dacă am cerut acces mentorilor, spunem și asta.]*

**4. „Ce e aici în plus față de un prompt?”**
Citirea paginii, marca salvată, straturi editabile, consecvența ofertei pe formate și verificări deterministe. Demonstrați: schimbați prețul și arătați bifa roșie. Niciun chat nu face asta.

**5. „Fără AI, mai există produsul?”**
Nu. Fără AI nu înțelegem referința și nu avem mascotă. Codul doar păzește.

**6. „Cât de bună e calitatea, măsurat?”**
Răspundeți cu cifrele din testul de generare: [x]/10 publicabile, judecat de [cine]; pe [M] referințe, [P]% au trecut garda după buclă, iar [Q]% au avut nevoie de reîncercare. Fără aceste cifre, spuneți că nu le aveți. Întrebarea e sigură de la un om de „Run and Operate”.

**7. „Ce se întâmplă dacă Gemini dă 429 sau pică în timpul unei rulări?”**
Depinde de pas. La analiză și texte, la 429, eroare de server sau 20 de secunde fără răspuns, trecem automat pe modelul Gemini de rezervă (`server/providers/gemini.ts`). Dacă pică ilustrația, kitul iese cu mascota originală, iar garda spune „generarea n-a reușit”. *[Verificați pe aplicație: opriți cheia și rulați.]* Trecerea pe Claude pentru text și vedere e azi manuală, din `AI_PROVIDER`: în `server/ai.ts` furnizorul se alege din configurație, nu după o eroare. Nu spuneți „failover între furnizori” decât dacă se implementează. Pentru imagine nu există al doilea furnizor, doar rezerva.

**8. „Ce faceți cu un model care minte în verificare?”**
Doar „seamănă cu mascota” e o verificare AI și e marcată „AI” pe ecran. Restul se calculează din design. Dacă garda pică, nu ajunge la om ca „verificat”.

**9. „Merge extensia pe orice site? Dar pe site-urile cu CSP sau pe Instagram?”**
Pe pagini care nu se pot citi, lucrăm pe pixeli și marcăm rolurile culorilor ca „ghicite”. *[De testat: un CSP strict poate bloca iframe-ul din strat; ar rămâne panoul lateral. Probați pe 5 site-uri mari și spuneți rezultatul real.]*

**10. „Ce date pleacă din browser? Ce permisiuni cere?”**
`activeTab` și `scripting`, deci nimic permanent. Pagina se citește doar la clic. Captura și textele merg la serverul nostru și la modelul AI, iar cheile rămân pe server. Nu sunt date de clienți. Spuneți deschis că azi nu avem conturi sau izolare între firme.

**11. „Cine plătește și cât?”**
*[Din interviuri.]* Fără cifră: „ipoteza e un abonament plătit de firmă, iar azi am aflat că [N] oameni dau [S] pe material; prețul nu e validat”.

**12. „Cum se scalează? Costuri la 1.000 de clienți?”**
Motorul e fără stare, pe funcții serverless. Costul variabil e imaginea generată, calculat pe rulare, deci prețul se poate lega de numărul de campanii. *[Doar dacă e adevărat când se pune întrebarea, adăugați: datele sunt în Supabase.]*

**13. „Ce ați scris azi și ce aveați?”**
Scheletul e de dinainte, Spire e de azi. Arătați `git log --since="2026-11-07 00:00"` și tabelul din README. Ora trebuie scrisă: fără ea, git pornește de la ora curentă din acea zi și seara lista iese aproape goală.

**14. „Ați scris asta cu AI? Explicați-mi fișierul ăsta.”**
Da, am folosit asistenți de cod, iar `AGENTS.md` e în repo. Deschideți fișierul cerut și explicați-l: ce primește, ce întoarce, cum se strică. Pentru asta e testul din „Cum arătăm că am înțeles”.

**15. „De unde vin pragurile din gardă?”**
Din `THRESHOLDS` (`src/lib/guard.ts`). Le-am ales noi; nu sunt calibrate pe un set de date. Pentru ilustrație folosim media distanțelor, nu maximul, ca să nu pice din cauza conturului și a umbrelor. *[Spuneți pe câte referințe le-ați încercat. Fără cifră: „nu sunt calibrate statistic”.]*

**16. „Ce se întâmplă dacă pagina scanată conține instrucțiuni pentru model?”**
Ce vine din pagină intră ca date, între delimitatori, iar prompturile le scrie codul (`src/lib/spireAi.ts`). Răspunsul trece prin schemă, nu are acces la nicio acțiune, iar garda și omul rămân după el. Nu spunem că e imposibil, spunem ce poate strica: cel mult un rezultat prost, pe care omul îl vede înainte de export.

**17. „Merge tot ce arătați? Afișul și clipul din video le-a generat Spire?”**
Da, aplicația și extensia merg: de la citirea paginii la gardă și export, iar `npm run check` le trece prin testele end-to-end. Afișul și clipul Marina Park sunt create de noi, nu generate în timpul filmării; le folosim ca să arătăm cum arată o campanie pentru un business real. *[Spuneți asta doar după rularea cu cheile reale de la „Ce mai trebuie făcut”.]*

**Regula:** când nu știți, spuneți „nu am măsurat asta încă”. La ingineri, „nu știu, dar uite cum aș măsura” câștigă în fața unui răspuns inventat. Oricine din echipă explică orice fișier din demo; ce nu poate explica nimeni iese din demo.

## Rezerve

Video-ul e prima variantă. Rândurile de după primul contează dacă prezentăm live sau dacă urmează un demo.

| Dacă | Atunci |
|---|---|
| Video-ul nu pornește | Altă copie (stick, telefon, link); apoi pitch-ul live, pe același text, cu slide-urile |
| Extensia nu se încarcă pe site | Pagina `/nou` cu încărcare de imagine; spuneți ce lipsește |
| Rețeaua pică | Hotspot; apoi `npm run dev` local cu Mod demo, spus ca atare |
| Gemini e lent | Rularea generată mai devreme, spus cu voce tare |
| Express nu merge | PNG, și nu pomeniți Express în demo |
| Totul pică live | Video-ul, apoi continuați cu slide-urile |

**Pe laptop înainte:** site-ul de demo deschis și testat, extensia instalată, zoom setat, notificările oprite, `?dev=0`, încărcătorul în priză, marca Pip încărcată, date curate. Telefonul cu hotspot pornit. PDF-ul deck-ului pe telefon.

## Repetițiile

1. **Înainte de voce, cu ceasul:** tot textul, fără oprire. Tăiați ce a depășit, nu vorbiți mai repede.
2. **Cu un om din afară, pe video-ul montat:** întrebați-l ce face produsul, pentru cine și ce garantează codul. Dacă nu poate spune, refaceți fragmentul.
3. **Întrebări:** câte un răspuns de 20 de secunde la toate cele 17, spus de fiecare, nu doar de cel care a scris partea aceea.
4. **Cu pană, doar dacă prezentăm și live:** cineva oprește rețeaua la secunda 50. Exersați trecerea pe rezervă.
