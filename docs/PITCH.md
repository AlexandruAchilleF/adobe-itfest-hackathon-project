# Prezentarea Spire: pitch-ul live, video-ul demo, întrebările

Formatul final: 2 minute de pitch live, apoi 1 minut de video demo. Ce e între `[paranteze]` se completează cu o cifră măsurată sau se scoate. Nu inventăm nimic. Criteriile: `docs/JURIU.md`.

## Formatul: 2 minute live, apoi 1 minut de video

- **Pitch-ul live, 2:00:** hook cu sala, problema și banii, arhitectura. Vorbim pe deck (`/pitch`), cu clickerul.
- **Video-ul demo, 1:00:** un singur drum prin produs, fără arhitectură (am spus-o live). Rulează din deck, pe slide-ul lui, ca să nu schimbăm aplicația pe proiector.
- **Împărțirea:** David deschide (hook, problema, piața) și închide; Alexandru ține arhitectura și costul. Două predări, nu mai multe.
- **Ținta:** circa 290 de cuvinte vorbite în 2 minute. Dacă depășim la repetiție, tăiem frazele marcate cu ✂, nu vorbim mai repede.

Ce mută fiecare bucată (`docs/JURIU.md`): hook-ul și problema → 1 Omul, 2 Durerea; piața și costul → 3 Costul și plătitorul (bonusul +10); arhitectura și garda → 4 Diferența, 8 Integrările, 9 Fiabilitatea (65% din notă împreună cu Problem Solving); video-ul → 6 Demo-ul.

## Ce trebuie făcut înainte

| Ordinea | Ce | Cine | De ce |
|---|---|---|---|
| 1 | **Testul cu chatul, cronometrat:** aceeași referință și fișa Gelateriei Pip, în ChatGPT sau Gemini, până iese o postare publicabilă sau 10 minute. Notăm prompturile, minutele și ce a ieșit greșit; păstrăm captura | oricine | Cifra [Y] din hook. Fără ea, fraza cu „noi am încercat” iese |
| 2 | **Costul pe rulare:** `src/lib/cost.ts`, funcție pură cu test: tokenii Gemini + imaginile FLUX.2 (1–3, după buclă), la prețurile oficiale de pe paginile Google și Cloudflare, cu data | Alexandru | Cifra [X] de pe slide-ul de cost; bonusul +10. Fără ea, slide-ul spune „nu l-am măsurat încă” |
| 3 | Deck-ul, după secțiunea de mai jos | Alexandru | |
| 4 | Captura video-ului, pe producție, cu cheia reală | David | |
| 5 | Două repetiții cu ceasul, apoi una în fața unui om din afară | amândoi | |

## Pitch-ul live, 2 minute

### 0:00–0:15 · Hook, cu sala (slide-ul „Ghiciți”) · David

Pe ecran: doar referința, postarea cu ceai rece și cămila, ca pe un site.

> Ridicați mâna: cine a văzut pe net un design și și-a zis „vreau și eu așa ceva, pe marca mea”? [pauză, mâinile sus]
> Acum ghiciți: câte prompturi îi trebuie unui chat ca să facă asta pentru o gelaterie, cu mascota ei și cu prețul corect? Unul? Cinci? Zece? [mâinile la fiecare]

Reținem ce a votat sala: revenim la ea la final. Interacțiunea ține 10 secunde, nu mai mult; dacă sala e tăcută, mergem mai departe după prima întrebare.

### 0:15–0:30 · Problema și cât costă azi (slide-ul „Problema”) · David

> Noi am încercat: [Y] prompturi, [Z] minute, și tot a ieșit cu altă mascotă și alt preț. ✂
> Așa că o firmă mică plătește azi 500 până la 3.500 de lei pe lună unui freelancer sau unei agenții, doar ca postările să arate a ei.

### 0:30–0:45 · Piața și cine plătește (slide-ul „Piața”) · David

> În România sunt circa 930.000 de IMM-uri, aproape toate microîntreprinderi, adică fără designer. Plătitorul e firma, cu un abonament mai mic decât un singur pachet de agenție. Prețul nu l-am validat încă: îl testăm cu primii clienți-pilot.

Nu spunem un preț inventat. Dacă avem până atunci o cifră din interviuri, intră aici.

### 0:45–0:55 · Ce face Spire (slide-ul „Cum funcționează”) · David → Alexandru

> Spire e o extensie de Chrome. Se uită la pagina pe care ești, te întreabă trei lucruri și îți face kitul pe marca ta. Fără prompt. Alexandru vă arată cum.

### 0:55–1:35 · Arhitectura (slide-urile „Arhitectura” și „Garda”) · Alexandru

Pe slide-ul de arhitectură, fiecare clic aprinde pasul despre care vorbim.

> Avem o singură regulă: AI-ul propune, codul verifică, omul aprobă.
> Extensia citește pagina doar când apeși, cu permisiunea activeTab. Gemini scoate anatomia referinței: zonele, rolurile culorilor. Nu-l credem pe cuvânt: răspunsul trece printr-o schemă Zod. FLUX.2, pe Cloudflare, redesenează mascota în stilul referinței.
> Apoi intră codul. Compune designul pe straturi editabile și îl trece prin gardă: prețul se compară ca valoare și monedă, culorile cu Delta E, iar o amprentă dHash respinge copia. Ce pică se întoarce la AI, de cel mult două ori.
> Și când pică ceva: dacă Gemini e supraîncărcat, trecem pe alt model după 20 de secunde; dacă pică ilustrația, kitul iese cu mascota originală, iar garda o spune. ✂

Fiecare frază e o decizie cu motivul ei, nu o listă de tehnologii. Cifrele (două încercări, 20 de secunde, pragurile) se verifică în cod înainte de repetiție: `src/lib/agentLoop.ts`, `server/providers/gemini.ts`, `THRESHOLDS` din `src/lib/guard.ts`.

### 1:35–1:50 · Cost și valoare (slide-ul „Cost și valoare”) · Alexandru

> O rulare ne costă [X], calculat din prețurile publice ale Gemini și Cloudflare. Un pachet de agenție pornește de la 99 de euro pe lună pentru 8 postări. Pasul următor: Firefly ca generator, sigur pentru uz comercial, și Spire ca add-on în Adobe Express.

Fără `cost.ts`: „Costul pe rulare nu l-am măsurat încă; e dominat de imagini, iar bucla generează cel mult trei.” Nu dăm o cifră din burtă.

### 1:50–2:00 · Trecerea la video (slide-ul „Acum, filmul”) · David

> Ați ghicit [ce a votat sala] prompturi. Uitați-vă câte scrie Spire. Și scanați codul: puteți încerca în timp ce rulează.

Clic: pornește video-ul de pe slide.

### După video: slide-ul de final

„N-ai designer azi? Spire e aici.”, cu ce am construit azi, ce urmează, echipa și adresa. Stă pe ecran la întrebări.

## Cum actualizăm deck-ul

Ordinea nouă, cu timpul pe fiecare slide:

| # | Slide | Timp | Ce se schimbă |
|---|---|---|---|
| 0 | Coperta | înainte de start | Rămâne ca acum. Stă pe ecran cât urcăm; nu intră în cele 2 minute |
| 1 | **Ghiciți** (nou) | 0:00 | Referința mare, într-o fereastră de browser, și întrebarea „Câte prompturi, pentru o gelaterie cu mascota ei?”, cu trei pastile: 1 · 5 · 10+. Fără răspuns pe slide |
| 2 | Problema | 0:15 | Cifra de cost (500–3.500 lei) devine elementul mare; durerile rămân dedesubt. [Y] prompturi, dacă o avem, intră lângă ea |
| 3 | **Piața** (fostul „Cine plătește”) | 0:30 | Mutat înainte; „930.000” mare, cu sursa; plătitorul și ipoteza de preț dedesubt |
| 4 | Cum funcționează | 0:45 | Rămâne ca acum |
| 5 | Arhitectura | 0:55 | **Clic cu clic:** fiecare clic aprinde pasul următor (extensia → analiza → ilustrația → compunerea → garda → omul); bucla și rezervele apar la ultimul clic |
| 6 | Garda | 1:15 | Rămâne ca acum (macheta prinde prețul și îl corectează) |
| 7 | **Cost și valoare** (nou) | 1:35 | Stânga: costul pe rulare (din `cost.ts`, sau „nemăsurat încă”); dreapta: pachetul de agenție, 99 €/lună pentru 8 postări, cu sursa; jos: Firefly și add-on-ul Express |
| 8 | **Acum, filmul** (fostul „Încercați voi”) | 1:50 | Titlul nou, QR-ul rămâne |
| 9 | **Video-ul** (nou) | 2:00 | Slide pe tot ecranul cu `public/pitch/demo.mp4`; pornește la intrarea pe slide, cu sunet, fără controale. Dacă fișierul lipsește, slide-ul spune asta, nu rămâne negru |
| 10 | Finalul | după video | Rămâne ca acum |

Scoatem „Înainte și după”: rezultatul se vede în video, iar referința e deja pe slide-ul 1.

Plus, pentru repetiții: **notițele vorbitorului** în `deck.ts` (textul de mai sus, pe fiecare slide) și o **vedere de prezentator** (`/pitch?prezentator=1`): slide-ul curent, următorul, notițele și un ceas de 2:00 care se înroșește după timp. Doar dacă rămâne timp după celelalte; ceasul de pe telefon face aceeași treabă.

## Video-ul demo, 1 minut

Un singur drum, pe producție, cu cheia reală: site-ul de demo → kitul Gelateriei Pip → garda → exportul. Fără arhitectură și fără critica paginii; nu încap într-un minut.

| Timp | Pe ecran | Text pe ecran (subtitrare) | Voce (opțional) |
|---|---|---|---|
| 0:00–0:06 | Site-ul de demo deschis; clic pe iconița Spire; uliul apare peste pagină | „Un site care îți place.” | „Sunt pe un site care îmi place.” |
| 0:06–0:16 | Scanarea: chenarele se aprind pe hero, ofertă, mascotă; clic pe „Fă o campanie” | „Spire citește pagina. Fără prompt.” | „Spire nu primește un prompt. Se uită la pagină.” |
| 0:16–0:26 | Cele trei întrebări, răspunse cu câte un clic | „Trei întrebări. Restul vine din marcă.” | „Mă întreabă doar oferta, îndemnul și formatele.” |
| 0:26–0:34 | Generarea, accelerată, cu eticheta „×[N]” în colț | „Accelerat ×[N]. În realitate: [S] secunde.” | — |
| **0:34–0:40** | **Kitul apare: postarea și story-ul, cu Pip în stilul referinței, și bifele gărzii** | „Pe marca ta.” | Două secunde de liniște |
| 0:40–0:50 | Schimbăm prețul pe un strat → bifa se face roșie → îl corectăm → verde | „Asta nu e AI. E cod.” | „Prețul trebuie să fie cel aprobat. Codul verifică, omul decide.” |
| 0:50–0:55 | Descărcarea PNG; fișierul apare | „Gata de postat.” | — |
| 0:55–1:00 | Cadrul final: logo-ul cu uliu, adresa și QR-ul | „adobe-itfest-hackathon-project.vercel.app” | — |

**Reguli:**
- Montajul poate tăia și accelera, dar nu arată ce nu există. Accelerarea are etichetă, iar [N] și [S] sunt măsurate la captură.
- Subtitrările sunt obligatorii (sonorul din sală e necunoscut); vocea e un bonus. Dacă vocea nu iese curată, rămân doar subtitrările și o muzică discretă.
- Momentul wow (kitul cu bifele) apare înainte de secunda 40.
- Dacă vreun cadru vine din modul demo, scrie asta pe el.

**Captura:** Chrome curat, fără alte extensii vizibile, zoom 110%, notificările oprite, `?dev=0`, fereastra la 1920×1080, cu Cmd+Shift+5 sau QuickTime. Facem 2–3 rulări întregi și montăm din cea mai curată; nu lipim bucăți din rulări diferite pe același pas (s-ar schimba kitul între cadre).

**Exportul:** MP4, 1080p, H.264, sub 50 MB, salvat ca `public/pitch/demo.mp4` (merge în deck) și separat pe laptop, stick, telefon și un link nelistat.

## Cum arătăm că am înțeles

Fiecare fragment tehnic spune **o decizie și de ce**, nu o listă de tehnologii. „Folosim Zod” nu dovedește nimic; „nu ne bazăm pe răspuns, așa că îl validăm” dovedește.

- Pentru fiecare fragment, fiecare din noi poate răspunde la: de ce așa, ce alternativă am lăsat, când se strică. Răspunsurile nu se citesc.
- Cifrele vin din cod (pragurile din `THRESHOLDS`, numărul de reîncercări, cele 20 de secunde). Înainte de voce, se verifică textul de mai sus pe codul de la acea oră.
- Ce nu poate explica nimeni iese din pitch.
- Testul: fiecare ia un fișier din tabel, la întâmplare, și îl explică celuilalt în 30 de secunde.

## Producția video-ului

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
