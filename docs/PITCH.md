# Prezentarea Spire: video-ul, repetițiile, întrebările

Ciornă scrisă la 10:30, refăcută la 12:30 după discuția cu organizatorii, când aplicația nu e încă gata. Ce e între `[paranteze]` se completează cu o cifră măsurată sau se scoate. Nu inventăm nimic. Criteriile: `docs/JURIU.md`.

## Formatul, după discuția cu organizatorii (12:30)

- **Se recomandă un videoclip de prezentare.** E recomandare, nu obligație, dar îl tratăm ca livrabilul principal. Nu mai e video-ul de rezervă de 60 de secunde.
- **Trebuie să vorbim mult despre arhitectură și partea tehnică** și să arătăm că am înțeles ce am construit.
- **Durata nu e fixată; ținta e în jur de 3 minute.** Lucrăm pe 2:45–3:15. Dacă trebuie tăiat, se taie din demo, nu din arhitectură.

**Nu știm încă, de întrebat acum:**

| Întrebarea | Ce schimbă |
|---|---|
| Video-ul se trimite înainte sau se rulează în fața juriului? Până la ce oră și unde? | Ora la care trebuie să fie gata; acum presupunem 19:30 |
| Urmează întrebări sau un demo live după video? | Dacă da, rămân valabile telefonul juriului (`docs/DEMO.md`) și rezervele de jos |
| Există limite de format (mărime, link, MP4)? | Exportul |

## Ce trebuie făcut până la prezentare

| Când | Ce | Criteriul mutat |
|---|---|---|
| **Acum** | Cele trei întrebări de mai sus, plus acces la Firefly de la mentorii Adobe | Integrări; programul de jos |
| **Acum, cât rulează implementarea** | 5 interviuri și testul cu cronometrul (secțiunea de mai jos) | Problem Solving: fără cifră, întrebarea 2 are maximum 2 din 5 |
| Acum, 15 min | Același brief în Pomelli și în Firefly/Express, cu capturi | Răspunsul la cea mai grea întrebare |
| Până la 14:00 | Decizia despre buclă și despre costul calculat (`cost.ts` nu există încă) | Problem Solving, bonusul +10 |
| 14:00 | Primul `/juriu`, pe aplicația reală | Toate |
| 14:00–17:00 | Același test cu cronometrul, în Spire, cu cheia reală. Fiecare își ia partea din arhitectură și o spune fără foaie | Cifra din video, Technical Excellence |
| 16:00 | Schema de arhitectură și slide-urile care lipsesc. Slide-ul de arhitectură e `/pitch#7`; schema din video se poate lua de acolo. `/pitch` nu are încă slide de cost | Technical Excellence |
| **17:00** | **Îngheț pe drumul din video.** Ce se schimbă pe ecran după captură face video-ul să mintă | Demo |
| 17:00–18:00 | Capturile, cu cheia reală, pe versiunea publicată; deploy | Demo, Technical Excellence |
| 18:00–19:00 | Vocea și montajul. În paralel, celălalt repetă întrebările grele | Toate |
| 19:00–19:30 | Video-ul văzut cu ceasul și de un om din afară, apoi refăcut ce nu e clar | Toate |
| **19:30** | **MP4-ul final, în toate locurile** (lista de la „Producția video-ului”) | Demo |
| 19:30–19:45 | Întrebările grele, cu voce tare | Technical Excellence |

## Video-ul de 3 minute

Aproape jumătate din timp e arhitectură (85 de secunde, plus garda din demo). Vorbim amândoi: colegul spune partea extensiei, pe care a scris-o, iar Alexandru motorul. Se vorbește pe rularea reală, nu pe slide-uri în gol. Textul vorbit are acum circa 440 de cuvinte, adică la limită pentru 3 minute. Nu e cronometrat încă: dacă depășește, se taie, nu se vorbește mai repede.

### 0:00–0:10: rezultatul, înainte de orice explicație

Pe ecran: în stânga referința, în dreapta kitul Gelateriei Pip, cu bifele gărzii.

> Asta e un design văzut pe un site. Asta e aceeași idee de stil, pe marca unei gelaterii, cu mascota ei, fără un prompt scris. Se numește Spire.

### 0:10–0:25: omul și durerea

> Omul de marketing dintr-o firmă mică are de scos postarea azi, iar designerul e ocupat sau nu există. Am rugat [N] oameni să refacă un material în ChatGPT sau Firefly: în medie [Y] minute și [Z] prompturi, iar [W] din [N] rezultate nu respectau marca.

Dacă nu avem măcar 3 oameni care chiar fac marketing, spunem exact pe cine am testat. „Am testat pe 6 participanți, 2 din marketing” rezistă. O cifră umflată nu rezistă la prima întrebare.

### 0:25–1:05: demo-ul, un singur drum, tăiat la montaj

| Timp | Pe ecran | Se spune |
|---|---|---|
| 0:25 | Clic pe iconiță, Spire apare peste site, chenarele se aprind | „Sunt pe un site care îmi place. Spire nu primește un prompt, se uită la pagină.” |
| 0:32 | Clic pe hero, anatomia, două întrebări | „Înțelege zonele și rolurile culorilor și întreabă doar ce nu știe: oferta și formatele.” |
| 0:42 | Generarea, accelerată, cu eticheta „×[N]” pe ecran | „Redesenează mascota în stilul referinței și compune kitul. Am accelerat: în realitate durează [X] secunde.” |
| **0:50** | **Kitul apare, cu bifele** (momentul wow) | Două secunde fără voce. |
| 0:53 | Schimbați prețul pe un strat: bifa devine roșie; corectați: verde | „Asta nu e AI, e cod. Prețul de pe material trebuie să fie cel aprobat, iar omul are ultimul cuvânt.” |
| 1:02 | Descărcarea PNG | Fără voce. Express apare doar dacă merge la ora capturii; azi, în Spire, exportul e PNG. |

Montajul poate tăia și accelera, dar nu poate arăta ce nu există. Rularea e cu cheia reală, iar accelerarea are etichetă pe ecran. Dacă vreun cadru vine din modul demo, scrie asta pe el.

### 1:05–2:30: arhitectura

Pe ecran alternează schema, cu pasul curent aprins, și codul real, mărit, 3–5 secunde pe fragment. Schema: `pagina → extensia citește → AI: anatomie, texte, ilustrație → cod: compunere, gardă → buclă → om → export`.

| Timp | Cine | Pe ecran | Se spune |
|---|---|---|---|
| 1:05 | Coleg | Schema; `chrome-extension/manifest.json` | „Extensia cere doar `activeTab`, `scripting` și `sidePanel` și citește pagina doar la clic. Stratul stă într-un shadow root, ca să nu se amestece cu site-ul. E un singur motor, cu două intrări: extensia și aplicația web. Cheile stau pe server.” |
| 1:20 | Coleg | `src/lib/spireAi.ts`, `src/lib/anatomy.ts` | „Modelul întoarce anatomia referinței: zone, roluri, culori. Nu ne bazăm pe răspuns: îl validăm cu o schemă Zod. Textul paginii intră ca date între delimitatori, nu ca instrucțiuni.” |
| 1:33 | Alexandru | `src/lib/guard.ts`, `src/lib/color.ts`, `src/lib/similarity.ts` | „Compunerea și garda sunt cod. Prețul se compară ca valoare și monedă. Culorile, cu Delta E în spațiul Lab, fiindcă distanța RGB nu seamănă cu ce vede ochiul. O amprentă dHash respinge ce e prea aproape de referință. Singura verificare AI e mascota și e marcată ca atare.” |
| 1:52 | Alexandru | `src/lib/agentLoop.ts` | „Bucla de agent e o funcție pură, cu apelurile AI injectate, deci o testăm fără rețea. Dacă pică ceva reparabil, reîncearcă de cel mult două ori, știind ce a picat. Ilustrația se redesenează doar dacă a picat ea.” |
| 2:06 | Alexandru | `server/providers/gemini.ts`, `server/image.ts`, terminalul cu testele | „Gemini face analiza și textele; dacă e supraîncărcat sau tace 20 de secunde, trecem pe alt model. Ilustrația vine de la FLUX.2 pe Cloudflare, cu cotă gratuită, printr-un singur endpoint. Dacă pică sau nu trece garda, kitul iese cu mascota originală. Avem [N] teste.” |
| 2:21 | Coleg | `git log`, tabelul din README | „Am pornit de la un schelet al nostru; Spire e scris azi. Nu avem încă al doilea furnizor de imagine, conturi sau izolare între firme.” |

Limitele și scheletul se spun înainte să fim întrebați (`docs/AMBALARE.md`, secțiunea 5). La ingineri, un „nu avem încă” spus de noi câștigă credibilitate. La 12:30, `npm test` arată 341 de teste unitare trecute, inclusiv cele din template; cifra se reia la captură, cu `npm run check`.

Integrările, cu ce pierdem fără fiecare (pe slide, nu spuse): Gemini (fără el nu există analiza; rezerva e alt model, apoi modul demo), Cloudflare FLUX.2 (fără el nu există mascota în stil; rezerva e mascota originală), Chrome (locul unde apare inspirația; rezerva e pagina web).

### Cum arătăm că am înțeles

Fiecare fragment tehnic spune **o decizie și de ce**, nu o listă de tehnologii. „Folosim Zod” nu dovedește nimic; „nu ne bazăm pe răspuns, așa că îl validăm” dovedește.

- Pentru fiecare fragment, fiecare din noi poate răspunde la: de ce așa, ce alternativă am lăsat, când se strică. Răspunsurile nu se citesc.
- Cifrele vin din cod (pragurile din `THRESHOLDS`, numărul de reîncercări, cele 20 de secunde). Înainte de voce, se verifică textul de mai sus pe codul de la acea oră.
- Ce nu poate explica nimeni iese din video.
- Testul: fiecare ia un fișier din tabel, la întâmplare, și îl explică celuilalt în 30 de secunde.

### 2:30–2:45: cost și valoare

> O rulare costă [~X] cenți, din consumul măsurat: textele, plus până la trei imagini, dacă bucla reîncearcă. Economia: [Y – Y'] minute pe material, la [Z] lei pe oră, adică [V] lei. Plătitorul e firma, cu abonament.

**La 12:30 aplicația nu calculează costul:** `cost.ts` din `docs/DEMO.md` nu există. Fie se construiește, și se arată pe ecran, fie se spune „estimat din log”. Prețul de imagine se ia de la Cloudflare, de pe pagina oficială, nu de la Gemini: ilustrația nu mai trece prin Gemini.

### 2:45–3:00: închiderea

> Azi merge pe imagini și hero. În 30 de zile: [doi clienți-pilot din interviuri], generare cu Firefly, ca rezultatul să fie sigur comercial, și add-on publicat în marketplace-ul Express. Spire nu înlocuiește designerul. Îl ajută pe omul care azi n-are unul.

Ultimul cadru: QR-ul și adresa, 3–4 secunde fără voce, ca să poată fi scanat.

### Producția video-ului

- **Captura:** toată fereastra, cu Cmd+Shift+5 sau QuickTime, la 1080p. Butonul `⏺ Rec` din panoul echipei e bun pentru cadre scurte, dar pe ecran prinde doar sunetul tab-ului, nu microfonul.
- **Vocea:** separat, în liniște, cu căști cu microfon, după captură. Se taie imaginea pe voce, nu invers.
- **Codul pe ecran:** font mare, 3–5 linii evidențiate. Un fișier întreg, derulat, nu se poate citi.
- **Subtitrări** pentru termenii tehnici: sonorul din sală e necunoscut.
- **Locuri pentru MP4:** laptop, stick, telefon, link nelistat. Încercați-l o dată pe proiector, cu sunet, dacă se poate.
- **Pe ecran:** fără notificări, fără chei în `.env` vizibile, fără panoul echipei (`?dev=0`).

## Varianta de 30 de secunde (pe hol, la mentori)

> Omul de marketing vede un design care îi place și vrea ceva la fel, pe marca lui, azi. În chat îi ia [Y] minute și tot iese greșit. Spire apare peste site, se uită la design, pune două-trei întrebări și face kitul de campanie cu mascota și culorile mărcii. Codul verifică prețul, culorile și contrastul, iar omul aprobă. Fiecare rulare costă câțiva cenți.

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
`activeTab`, `scripting` și `sidePanel`, deci nimic permanent. Pagina se citește doar la clic. Captura și textele merg la serverul nostru și la modelul AI, iar cheile rămân pe server. Nu sunt date de clienți. Spuneți deschis că azi nu avem conturi sau izolare între firme.

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

**Regula:** când nu știți, spuneți „nu am măsurat asta încă”. La ingineri, „nu știu, dar uite cum aș măsura” câștigă în fața unui răspuns inventat. Oricine din echipă explică orice fișier din demo; ce nu poate explica nimeni iese din demo.

## Rezerve

Video-ul e prima variantă. Rândurile de după primul contează dacă prezentăm live sau dacă urmează un demo.

| Dacă | Atunci |
|---|---|
| Video-ul nu pornește sau nu se aude | Altă copie (stick, telefon, link); apoi pitch-ul live, pe același text, cu slide-urile |
| Extensia nu se încarcă pe site | Pagina `/nou` cu încărcare de imagine; spuneți ce lipsește |
| Rețeaua pică | Hotspot; apoi `npm run dev` local cu Mod demo, spus ca atare |
| Gemini e lent | Rularea generată mai devreme, spus cu voce tare |
| Express nu merge | PNG, și nu pomeniți Express în demo |
| Totul pică live | Video-ul, apoi continuați cu slide-urile |

**Pe laptop înainte:** site-ul de demo deschis și testat, extensia instalată, zoom setat, notificările oprite, `?dev=0`, încărcătorul în priză, marca Pip încărcată, date curate. Telefonul cu hotspot pornit. PDF-ul deck-ului pe telefon.

## Repetițiile

1. **Înainte de voce, cu ceasul:** tot textul, fără oprire. Tăiați ce a depășit, nu vorbiți mai repede.
2. **Cu un om din afară, pe video-ul montat:** întrebați-l ce face produsul, pentru cine și ce garantează codul. Dacă nu poate spune, refaceți fragmentul.
3. **Întrebări:** câte un răspuns de 20 de secunde la toate cele 16, spus de fiecare, nu doar de cel care a scris partea aceea.
4. **Cu pană, doar dacă prezentăm și live:** cineva oprește rețeaua la secunda 50. Exersați trecerea pe rezervă.
