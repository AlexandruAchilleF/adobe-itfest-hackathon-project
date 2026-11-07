# Prezentarea Spire: pitch-ul live, video-ul demo, întrebările

Formatul: 2 minute de pitch live, apoi video-ul demo de 1:36, fără sunet și fără subtitrări, cu noi vorbind peste el. Nu inventăm nimic. Criteriile: `docs/JURIU.md`. Filmarea: `docs/DEMO-VIDEO.md`.

## Formatul

- **Pitch-ul live, 2:00:** hook cu sala, problema și banii, arhitectura. Vorbim pe deck (`/pitch`), cu clickerul.
- **Video-ul demo, 1:36:** Marina Park, pe slide-ul 8. Rulează din deck, ca să nu schimbăm aplicația pe proiector.
- **Exemplele:** în pitch rămân machetele cu Gelateria Pip; în video apare Marina Park, un business real. Le legăm cu o singură frază, la trecerea spre video.
- **Fără QR:** Spire lucrează prin extensia de Chrome și nu avem nimic funcțional pe telefon. Adresa rămâne în text pe slide-ul final.
- **Împărțirea:** David deschide (hook, problema, piața) și ține video-ul; Alexandru ține arhitectura și garda. Două predări, nu mai multe.
- **Ținta:** circa 290 de cuvinte vorbite în 2 minute. Dacă depășim la repetiție, tăiem frazele marcate cu ✂, nu vorbim mai repede.

Ce mută fiecare bucată (`docs/JURIU.md`): hook-ul și problema → 1 Omul, 2 Durerea; piața → 3 Costul și plătitorul (bonusul +10); arhitectura și garda → 4 Diferența, 8 Integrările, 9 Fiabilitatea (65% din notă împreună cu Problem Solving); video-ul → 1 Omul, 6 Demo-ul.

## Ce este făcut de noi și ce face Spire

Spunem asta deschis, pe scenă și la întrebări:

- **Afișul Marina Park** (`public/samples/spire/demo-videos/afis-marina-park.png`) și **clipul Marina Park** (`public/samples/spire/demo-videos/marina-park.mp4`) sunt create de noi, pe 7 noiembrie 2026, cu fotografiile și textele de pe marinapark.ro.
- **Video-ul demo** arată aplicația reală și extensia reală, dar a fost filmat cu AI-ul în mod simulat (`docs/demo/repere.md`). Afișul intră în el printr-o campanie salvată, iar clipul se pune peste pagină la montaj.
- **Aplicația** are propriul drum de generare: citirea designului, desenul, compunerea, garda și clipul randat în browser. Machetele din deck sunt exemple cu Gelateria Pip.

## Ce s-a verificat pe producție (7 noiembrie 2026)

- `/api/health`: Gemini are cheie, Claude nu. Codul clipului cere Claude, dar fără cheie răspunde Gemini. De aceea pe slide și pe scenă nu pomenim Claude.
- Un apel scurt la `/api/ai` a răspuns de pe modelul de rezervă (`gemini-3.5-flash`), după 22 s: rezerva merge, iar modelul principal n-a răspuns la timp în acel apel.

## Repetițiile rămase

Două repetiții cu ceasul, peste video, apoi una în fața unui om din afară.

## Pitch-ul live, 2 minute

Vorbim scurt și sigur. Fiecare frază tehnică spune o decizie și motivul ei, iar ce n-am măsurat spunem deschis.

Vorbim ca între oameni, scurt și sigur. Ce n-am măsurat spunem deschis.

### 0:00–0:15 · Hook, cu sala (slide-ul 2, „Ghiciți”) · David

> Ridicați mâna dacă ați văzut pe net un design și v-ați zis: vreau și eu așa ceva, pentru firma mea. [pauză, mâinile sus]
> Bun. Câte prompturi îi trebuie unui chat ca să facă asta pentru o gelaterie, cu culorile ei și cu prețul corect? Unul? Cinci? Zece? [mâinile la fiecare]

Revenim la vot înainte de video. Dacă sala e tăcută, mergem mai departe după prima întrebare.

### 0:15–0:25 · Problema (slide-ul 3) · David

> Dacă nu vrei să stai la prompturi, plătești pe cineva: între 500 și 3.500 de lei pe lună, pentru un freelancer sau o agenție mică.

### 0:25–0:40 · Piața și cine plătește (slide-ul 4) · David

> În România sunt cam 930.000 de firme mici și mijlocii. Credem că ar plăti un abonament mai ieftin decât o agenție, unde pachetele încep de la 99 de euro pe lună. Prețul nu l-am testat încă și nici cât ne costă o rulare n-am măsurat.

### 0:40–0:48 · Ce face Spire (slide-ul 5) · David → Alexandru

> Spire e o extensie de Chrome. Te uiți la o pagină care îți place, apeși, răspunzi la trei întrebări și primești postarea și story-ul, în culorile firmei tale. Alexandru vă arată cum.

### 0:48–1:25 · Arhitectura (slide-ul 6) · Alexandru

Slide-ul pornește cu „Citește” aprins. Patru clicuri până la imaginea completă, marcate mai jos.

> Avem o regulă simplă: AI-ul propune, codul verifică, omul aprobă.
> Extensia vede pagina doar după ce apeși pe ea.
> **[clic]** Gemini se uită la design și scrie textele, iar FLUX.2 creează elementele vizuale. Dacă Gemini răspunde în altă formă decât am cerut, aruncăm răspunsul.
> **[clic]** Modelul de imagine creează doar elementele vizuale. Textul și prețul le așază codul, ca straturi separate. Dintr-o singură imagine n-am putea verifica nimic. Așa, codul citește fiecare cifră.
> **[clic]** Omul schimbă ce vrea, vede iar verificarea și descarcă.
> **[clic]** Ce nu trece se reface, de cel mult două ori. Dacă nu răspunde Gemini, trecem pe alt model. Dacă nu iese un element vizual, punem imaginea originală și spunem asta pe ecran.

### 1:25–1:50 · Garda (slide-ul 7) · Alexandru

> Un chat îți poate scrie alt preț și nu te anunță. La noi, codul compară prețul cu ce ai dat tu, măsoară cât de departe sunt culorile de ale tale, vede dacă textul se citește și respinge elementul vizual care seamănă prea tare cu originalul.
> În tot proiectul avem 492 de teste unitare și 73 end-to-end, și rulează fără chei AI. ✂

Sursele din cod: `src/lib/agentLoop.ts`, `src/lib/campaigns.ts`, `src/lib/compose.ts`, `src/lib/guard.ts`, `server/providers/gemini.ts`. Numărul de teste e cel de la ultima rulare; dacă s-a schimbat codul, rulați `npm run check` și spuneți cifra nouă.

### 1:50–2:00 · Trecerea la video (tot pe slide-ul 7) · David

> Ați ghicit câte prompturi îi trebuie unui chat. În Spire nu scrii niciunul. Acum, un loc real: Marina Park, din Vama Veche.

Clic: pornește video-ul.

### Peste video (slide-ul 8) · David

Video-ul n-are sunet și nici subtitrări. Vocea, pe secunde, din `docs/demo/repere.md`. Secundele sunt de la montajul actual: după un montaj nou, le luați din `repere.md` regenerat.

| Începe la | Ce spunem |
|---|---|
| 0:00 | Marina Park e un camping din Vama Veche. Au site, dar n-au designer. |
| 0:04 | De pe site, Spire le ia logo-ul, culorile și pozele. |
| 0:20 | Pe Google găsesc un afiș care le place. |
| 0:24 | Îl arată lui Spire. Nu scriu niciun prompt. |
| 0:36 | Spire vede cum e făcut afișul: titlu scris de mână, o poză mare, trei polaroiduri. Pozele nu le copiază. |
| 0:43 | Stilul e al afișului, dar marca și pozele sunt ale lor. Afișul și clipul pentru Marina Park le-am făcut noi. |
| 0:52 | Partea asta nu e AI, e cod. Verifică textul, culorile și contrastul, iar omul decide. |
| 1:11 | Din aceeași campanie iese și un clip promoțional. |
| 1:28 | Și e gata de postat. |

### După video: slide-ul 9

„N-ai designer azi? Spire e aici.”, cu ce am construit azi, ce urmează, echipa și adresa în text. Stă pe ecran la întrebări. David închide:

> Urmează trei lucruri: generare cu Firefly, un add-on pentru Adobe Express și primii clienți. Vrem să continuăm proiectul. Ce întrebări aveți?

## Ce învățăm pe de rost

- David are patru repere, în ordine: mâinile sus, 500–3.500 de lei, 930.000 cu prețul netestat, apoi „Alexandru vă arată”
- Alexandru are patru verbe: citește, propune, verifică, aprobă. Fiecare clic aprinde verbul următor.
- Fraza pe care nu o pierdem: „Dintr-o singură imagine n-am putea verifica nimic. Așa, codul citește fiecare cifră.”
- Dacă rămânem fără timp, tăiem fraza cu ✂ și păstrăm arhitectura întreagă.

## Deck-ul

| # | Slide | Timp | Ce arată |
|---|---|---|---|
| 1 | Coperta | înainte de start | Stă pe ecran cât urcăm; nu intră în cele 2 minute |
| 2 | Ghiciți | 0:00 | Referința și trei variante: 1, 5, 10+ |
| 3 | Problema | 0:15 | 500–3.500 lei pe lună, cu sursa, și durerile |
| 4 | Piața | 0:25 | 930.000, cu sursa; plătitorul ca ipoteză; pachetul de agenție |
| 5 | Cum funcționează | 0:45 | Machetele cu Gelateria Pip |
| 6 | Arhitectura | 0:55 | Cei patru pași clic cu clic, apoi bucla și ce se întâmplă când pică ceva |
| 7 | Garda | 1:25 | Macheta prinde prețul și îl corectează |
| 8 | Video-ul | 2:00 | `public/pitch/demo.mp4`, pe tot ecranul, fără sunet |
| 9 | Finalul | după video | Ce am construit, ce urmează, echipa, adresa |

## Cum arătăm că am înțeles

Fiecare fragment tehnic spune **o decizie și de ce**, nu o listă de tehnologii. „Folosim Zod” nu dovedește nimic; „nu ne bazăm pe răspuns, așa că îl validăm” dovedește.

- Pentru fiecare fragment, fiecare din noi poate răspunde la: de ce așa, ce alternativă am lăsat, când se strică. Răspunsurile nu se citesc.
- Cifrele vin din cod (pragurile din `THRESHOLDS`, cele două reîncercări, cele 20 de secunde).
- Ce nu poate explica nimeni iese din pitch.
- Testul: fiecare ia un fișier din tabel, la întâmplare, și îl explică celuilalt în 30 de secunde.

## Varianta de 30 de secunde (pe hol, la mentori)

> Omul de marketing vede un design care îi place și vrea ceva la fel, pe marca lui, azi. În chat ies alte culori și alt preț. Spire apare peste site, se uită la design, pune două-trei întrebări și face materialele campaniei pe culorile mărcii. Codul verifică prețul, culorile și contrastul, iar omul aprobă.

Pentru varianta de 5 minute: arhitectura rămâne întreagă; adăugați toate întrebările din demo și un slide cu ce a prins garda în rulările reale.

## Termenii din spatele slide-urilor

Nu apar pe slide și nu îi spunem din proprie inițiativă. Dacă întreabă juriul:

| Termen | Ce este | Unde e în cod |
|---|---|---|
| **Zod** | Biblioteca ce verifică dacă răspunsul AI-ului are forma cerută. Dacă nu, îl respinge. | `ask()` din `src/lib/ai.ts` |
| **Delta E** | Măsoară cât de diferite sunt două culori, așa cum le vede ochiul. Pragul nostru: 12 pentru culorile designului, 25 ca medie pentru desen. | `THRESHOLDS` din `src/lib/guard.ts` |
| **dHash** | Amprenta unei imagini. Două amprente apropiate înseamnă că desenul e aproape o copie. Respingem sub distanța 10. | `THRESHOLDS` din `src/lib/guard.ts` |
| **activeTab** | Permisiunea Chrome prin care extensia vede pagina doar după ce apeși. | `chrome-extension/manifest.json` |

## Întrebările grele

Juriul e probabil format din ingineri de date și de producție. Răspunsul scurt primul, detaliul doar dacă sunt întrebați.

Video-ul nu ține loc de ele: dacă după video urmează întrebări, aici se vede dacă am înțeles.

**1. „Adobe are deja Style Reference în Firefly și Brand Kit în Express. Google are Pomelli. De ce Spire?”**
Nu concurăm cu un model de imagine; Firefly poate fi chiar generatorul nostru. Adăugăm trei lucruri: agentul stă pe site, în momentul inspirației, deci nu există prompt de scris; din referință citim așezarea, deci rezultatul are straturi editabile, nu e o imagine plată; iar codul verifică prețul și mențiunile. N-am făcut o comparație cap la cap cu ele, deci nu spunem ce fac ele mai prost.

**2. „Nu e asta copiere? Vedeți un design și îl clonați.”**
Copiem stilul și așezarea, intenționat, și spunem asta pe ecran. Ilustrația, textele, culorile și logo-ul sunt ale omului. Codul compară imaginea generată cu referința și respinge ce e aproape identic. În demo folosim o referință licențiată. Nu promitem originalitate certificată și nu dăm consultanță juridică: omul decide ce publică. Evitați cuvântul „concurent” pe scenă și în landing.

**3. „De ce Gemini și FLUX la un hackathon Adobe?”**
Le-am putut folosi azi: la Gemini, modelele de imagine cer plată, așa că ilustrația trece prin Cloudflare FLUX.2, care are o cotă gratuită. Generarea stă în spatele unui singur endpoint (`api/image.ts`), deci furnizorul se poate schimba. Firefly e pasul următor, pentru că e gândit pentru uz comercial.

**4. „Ce e aici în plus față de un prompt?”**
Citirea paginii, marca salvată, straturi editabile, aceeași ofertă pe toate formatele și verificări făcute de cod. Dacă prețul de pe design nu e cel dat de om, codul îl prinde.

**5. „Fără AI, mai există produsul?”**
Nu. Fără AI nu înțelegem referința și nu avem elemente vizuale. Codul doar păzește.

**6. „Cât de bună e calitatea, măsurat?”**
Nu am măsurat încă. Aș măsura așa: pe un set de referințe, câte materiale trec verificarea, câte au nevoie de reîncercare și câte ar publica un om de marketing. Întrebarea e sigură de la un om de „Run and Operate”.

**7. „Ce se întâmplă dacă Gemini dă 429 sau pică în timpul unei rulări?”**
Depinde de pas. La analiză și texte, la 429, eroare de server sau 20 de secunde fără răspuns, trecem automat pe modelul Gemini de rezervă (`server/providers/gemini.ts`). Dacă pică un element vizual, kitul iese cu imaginea originală, iar garda spune „generarea n-a reușit”. Furnizorul AI se alege din configurație (`server/ai.ts`), nu după o eroare, deci nu spuneți „failover între furnizori”. Pentru imagine nu există al doilea furnizor, doar rezerva.

**7b. „Clipul cine îl scrie?”**
Codul cere Claude (`src/lib/campaignVideo.ts`), dar pe producție nu e setată cheia, așa că azi răspunde Gemini. Scenariul trece prin verificarea din `src/lib/videoPlan.ts`, iar dacă pică folosim un scenariu de rezervă. Browserul randează clipul.

**8. „Ce faceți cu un model care minte în verificare?”**
Doar verificarea care compară imaginea generată cu cea din marcă e făcută de AI și e marcată „AI” pe ecran. Restul se calculează din design. Dacă garda pică, nu ajunge la om ca „verificat”.

**9. „Merge extensia pe orice site? Dar pe site-urile cu CSP sau pe Instagram?”**
Nu am testat sistematic pe site-uri mari. Pe pagini care nu se pot citi, lucrăm pe pixeli și marcăm rolurile culorilor ca „ghicite”. Un CSP strict poate bloca panoul, care e un iframe.

**10. „Ce date pleacă din browser? Ce permisiuni cere?”**
`activeTab`, `scripting` și `storage`, deci niciun acces permanent la pagini. Pagina se citește doar la clic. Captura și textele merg la serverul nostru și la modelul AI, iar cheile rămân pe server. Nu sunt date de clienți. Spuneți deschis că azi nu avem conturi sau izolare între firme.

**11. „Cine plătește și cât?”**
Ipoteza e un abonament plătit de firmă, mai mic decât pachetul de agenție de la 99 de euro pe lună. Prețul nu e validat și nu avem încă cifre de la oameni de marketing.

**12. „Cum se scalează? Costuri la 1.000 de clienți?”**
Motorul e fără stare, pe funcții serverless, iar datele pot sta în Supabase. Costul pe rulare nu l-am măsurat încă: îl calculăm din apelurile AI și din imaginile generate, apoi legăm prețul de numărul de campanii.

**13. „Ce ați scris azi și ce aveați?”**
Scheletul e de dinainte, Spire e de azi. Arătați `git log --since="2026-11-07 00:00"` și tabelul din README. Ora trebuie scrisă: fără ea, git pornește de la ora curentă din acea zi și seara lista iese aproape goală.

**14. „Ați scris asta cu AI? Explicați-mi fișierul ăsta.”**
Da, am folosit asistenți de cod, iar `AGENTS.md` e în repo. Deschideți fișierul cerut și explicați-l: ce primește, ce întoarce, cum se strică. Pentru asta e testul din „Cum arătăm că am înțeles”.

**15. „De unde vin pragurile din gardă?”**
Din `THRESHOLDS` (`src/lib/guard.ts`). Le-am ales noi; nu sunt calibrate pe un set de date. Pentru ilustrație folosim media distanțelor, nu maximul, ca să nu pice din cauza conturului și a umbrelor. Nu sunt calibrate statistic.

**16. „Ce se întâmplă dacă pagina scanată conține instrucțiuni pentru model?”**
Ce vine din pagină intră ca date, între delimitatori, iar prompturile le scrie codul (`src/lib/spireAi.ts`). Răspunsul trece prin schemă, nu are acces la nicio acțiune, iar garda și omul rămân după el. Nu spunem că e imposibil, spunem ce poate strica: cel mult un rezultat prost, pe care omul îl vede înainte de export.

**17. „Merge tot ce arătați? Afișul și clipul din video le-a generat Spire?”**
Aplicația și extensia sunt reale, iar testele end-to-end le trec de la citirea paginii la gardă și export, fără chei AI. Video-ul a fost filmat cu AI-ul în mod simulat. Afișul și clipul Marina Park sunt create de noi, nu generate în timpul filmării; le folosim ca să arătăm cum arată o campanie pentru un business real. Pe producție am verificat separat apelurile la Gemini și FLUX.2, nu un drum complet de la cap la coadă.

**18. „De unde «zece prompturi» de pe slide?”**
E o imagine a problemei, nu o măsurătoare. Nu am cronometrat oameni. De aceea întrebăm sala și nu dăm o cifră.

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
