# Brief-ul și deciziile echipei

Se completează la start (cu `/brief` sau de mână) și se actualizează toată ziua. Asistentul AI îl citește înainte de orice schimbare.
Criteriile, cu ponderile oficiale, sunt în `docs/JURIU.md`.

## Prima oră, pas cu pas

1. **0:00–0:10.** Lipiți textul exact al brief-ului mai jos. Fiecare propoziție care cere ceva și fiecare „you can include…” devine un rând în tabelul de cerințe.
2. **0:10–0:20.** Pentru fiecare cerință, piesa din template care o acoperă (vezi tabelul din `README.md`): roluri și pași → `flow`; documente → `documents`; „hartă”, „în apropiere” → `features.map`; „puncte”, „recompense” → `features.gamification`; „în timp real”, „unde ești” → `reports`; „notificare” → `notify` pe pași; „cât durează”, „eficiență” → `/cronometru`. Ce nu se potrivește cu nicio piesă se notează separat: acolo e munca zilei.
3. **0:20–0:30.** Trei idei, fiecare trecută prin trei filtre: (a) o problemă cu o cifră spusă de un om, (b) un plătitor care plătește deja pentru ea, (c) cel puțin două lucruri pe care codul le face în plus față de un prompt (verificare, mai mulți oameni legați, buclă închisă, măsurare, rezultat editabil). Alegeți una. Fraza ei devine `app.tagline`.
4. **0:30–1:30.** Doi oameni pe hol la interviuri (5 întrebări despre trecut, cu cifre). Un om copiază un scenariu exemplu și schimbă config-ul (`docs/AMBALARE.md`, secțiunea 1). La 1:30, `npm test` trece și fluxul merge cu fiecare rol.
5. **Tot timpul:** o buclă în plus față de ce cere brief-ul, care se închide în lumea reală (confirmarea celui care a primit și o cale pentru „n-a mers”). Asta a diferențiat câștigătorul din 2023.

## Brief-ul Adobe (textul exact)

Din prezentarea Adobe de la deschidere (slide-ul „Hackathon Theme”):

> **Marketing Reimagined**
> Build the Next Generation of AI-Powered Marketing Tools

Nu există o listă „you can include…”. Prezentarea dă în schimb două lucruri care țin loc de ea: criteriile cu ponderi (mai jos) și felul în care Adobe își descrie propriul marketing.

### Contextul din prezentare (ce înțelege Adobe prin „marketing reimagined”)

- **Adobe CXO** (Customer Experience Orchestration): „De la tool-uri operate manual la AI Agents care analizează, decid și execută procese de marketing.”
  - *01 Data Foundation* (AEP, Analytics, AJO, Target): „Unifică datele și profilurile clienților în timp real.”
  - *02 Decisioning & Optimization* (Adobe CXO AI Engines): „AI Agents analizează contextul, protejează brandul și aleg strategii.”
  - *03 Real-Time Execution* (Target, GenStudio): „Generează conținut, personalizează experiențe și optimizează conversii.”
- **Adobe CNP** (Creativity & Productivity): Photoshop, Illustrator, Adobe Express, Adobe Stock; Acrobat Reader, Adobe Sign.
- Prezentatorii (și probabil juriul tehnic): Alexandru Petrescu (Sr. Software Engineer, AEP Data Distiller) și Marius Necșoiu (Sr. Software Engineer, Run and Operate). Adică oameni de date și de fiabilitate în producție.

### Criteriile de jurizare (slide-ul „Criterii de Jurizare”)

| Pondere | Criteriul | Textul de pe slide |
|---|---|---|
| 25% | Problem Solving | O problemă reală de marketing, rezolvată cu impact. |
| 25% | AI-Driven Innovation | AI-ul este esențial pentru produs, nu doar un add-on. |
| 15% | Third-Party Integrations | API-uri și servicii externe integrate cu sens. |
| 25% | Technical Excellence | Arhitectură solidă, implementare și fiabilitate. |
| 10% | Product Experience & Demo | Experiență intuitivă și prototip demonstrabil. |
| +10 | Bonus: Cost vs. Value | Costuri estimate vs. economii sau profit. |

## Cerințele din brief

Obligatoriile vin din temă și din criterii; opționalele sunt cele trei straturi CXO, pe care le tratăm ca pe un „you can include…”.

| # | Cerință | Obligatorie / opțională | Piesa din template care o acoperă | Unde se vede în demo | Gata |
|---|---|---|---|---|---|
| C1 | O problemă **reală de marketing**, rezolvată cu impact (25%) | obligatorie | nicio piesă de domeniu: scenariul nou (`src/scenario/scenarios/<nume>.ts`); dovezile din `business.evidence` (`/start`) | de stabilit după alegerea ideii | ☐ |
| C2 | **AI esențial**, nu add-on (25%); „AI Agents care analizează, decid și execută” | obligatorie | `ask()` cu schemă și `mock` (`src/lib/ai.ts`), agentul cu acțiuni (`src/lib/agent.ts`), generarea de design (`/design`) | de stabilit | ☐ |
| C3 | **Integrări** cu API-uri și servicii externe, cu sens (15%) | obligatorie | Gemini / Claude (`api/ai.ts`), add-on Adobe Express (`adobe-express-addon/`, netestat), Adobe PDF Embed, Supabase (date și live), SMS/email (`api/notify.ts`, Twilio/Resend), geocodare (`api/geocode.ts`) | de stabilit | ☐ |
| C4 | **Arhitectură solidă și fiabilitate** (25%) | obligatorie | logică pură cu teste (`tests/`), e2e (`e2e/`), AI validat cu Zod și mock, fallback între furnizori, `npm run check` | de stabilit | ☐ |
| C5 | **Prototip demonstrabil**, experiență intuitivă (10%) | obligatorie | deploy Vercel, link și QR (`src/lib/share.ts`, `QrPanel`), sistemul vizual (`docs/DESIGN.md`), deck-ul `/pitch` | de stabilit | ☐ |
| C6 | **Cost estimat vs. economii sau profit** (bonus +10) | bonus | parțial: costul lunar din cifre spuse de oameni (`src/lib/metrics.ts`, `/cronometru`) | de stabilit | ☐ |
| C7 | „Reimagined”, „next generation”: de la unelte operate manual la agenți | obligatorie (tema) | parțial: agentul cu confirmare (`src/lib/agent.ts`), fluxul (`src/lib/flow.ts`) | de stabilit | ☐ |
| O1 | Date și profiluri de clienți **în timp real** (Data Foundation) | opțională | parțial: `store.ts` + `live.tsx` (sincronizare live), rapoarte live (`/raport`) | de stabilit | ☐ |
| O2 | Agentul **analizează contextul** și **alege strategia** (Decisioning) | opțională | parțial: `agent.ts` alege acțiuni, `ask()` cu schemă | de stabilit | ☐ |
| O3 | Agentul **protejează brandul** | opțională | parțial: auditul de contrast și lizibilitate (`src/lib/accessibility.ts`, `autoFixDesign`), verificările deterministe (`src/lib/checks.ts`, pentru bonuri) | de stabilit | ☐ |
| O4 | **Generează conținut** (Real-Time Execution) | opțională | `/design`: text, voce sau poză → design editabil (Fabric.js), export PNG/SVG | de stabilit | ☐ |
| O5 | **Personalizează experiențe** | opțională | nicio piesă | — | ☐ |
| O6 | **Optimizează conversii** | opțională | parțial: QR și link scurt (`share.ts`), confirmarea pe telefon (`/c/:id`), cronometrul | de stabilit | ☐ |
| O7 | Produsele Adobe din prezentare (Express, Stock, Acrobat, Sign) | opțională | add-on Express (netestat), PDF Embed (`docs/ADOBE-SETUP.md`) | de stabilit | ☐ |

### Ce nu acoperă nicio piesă (munca zilei)

- **Decizia agentului din context real**: datele de intrare (vremea, ora, stocul, rezultatele de ieri, segmentul clientului) → oferta și publicul aleși de AI, cu motivul scris. Azi `agent.ts` execută comenzi, nu decide o strategie.
- **Garda de marcă deterministă**: paleta și fonturile mărcii, mențiunile obligatorii, concordanța ofertei (prețul, procentul, data, codul de pe material = oferta aprobată), ofertă expirată, marjă minimă. Azi `accessibility.ts` verifică doar contrastul și lizibilitatea, iar `checks.ts` doar bonurile.
- **Măsurarea conversiei în lumea reală**: cine a văzut materialul și a venit (coduri unice, scanări), legată de material și întoarsă în următoarea decizie. Azi QR-ul duce doar la design (`/view`).
- **Personalizarea** (mesaje diferite pe segmente de clienți).
- **Calculul cost vs. valoare** pe campanie: cost AI + SMS + API-uri, calculat de cod, vs. vânzări sau ore economisite.
- **O sursă de date externă în timp real** care schimbă decizia (de exemplu vremea, prin Open-Meteo, fără cheie). Integrările de azi nu aduc context de marketing.
- **Add-on-ul Adobe Express rulat de fapt în Express**: codul există, dar n-a fost testat (`docs/ADOBE-SETUP.md`).
- `/design` e azi în panoul echipei (`?dev=1`), nu în meniul juriului.

## Ideea aleasă

Ideea echipei (aleasă după discuție și după un consiliu de 5 perspective): **stilul altcuiva, conținutul tău**. Omul de marketing vede online un design care îi place. Unealta ia din el doar stilul (tehnica desenului, compoziția, atmosfera, rolurile culorilor) și reface materialul cu conținutul mărcii lui: mascota lui regenerată în acel stil, culorile din brand guidelines puse pe rolurile culorilor din referință, textele lui. Fără prompturi: AI-ul citește referința și pune doar 3–5 întrebări cu variante. Codul verifică rezultatul.

- **Fraza (de lucru):** Ajutăm omul de marketing să transforme orice design care îi place într-un material pe marca lui, fără designer și fără zece prompturi.
- **Omul:** omul de marketing dintr-o firmă mică, medie sau mare (de ales o singură persoană pentru demo). Lucrează pe laptop; aprobă și pe telefon.
- **Durerea (cifra și sursa):** de adus azi: test pe hol cu ChatGPT/Firefly (câte prompturi, câte minute până la un rezultat publicabil, ce iese greșit), ideal cu oameni de marketing reali.
- **Plătitorul:** ipoteză: firma (abonament), care azi plătește designeri, ilustratori sau ore de agenție.
- **Diferența față de ChatGPT:** stilul din referință + conținutul din profilul mărcii, într-un design pe straturi editabil (export în Adobe Express); garda deterministă: paleta imaginii generate măsurată față de culorile mărcii, imaginea nouă comparată cu referința (să nu fie aproape identică), text și preț exacte, mențiuni obligatorii, contrast și lizibilitate.
- **Bucla în lumea reală:** de stabilit.
- **Momentul wow (secunda din demo):** ~45: mascota concurentului (de ex. o cămilă) în stânga, mascota mărcii (un pinguin) în același stil în dreapta, cu bifele gărzii.

Decizii luate: doar imagini statice; aplicația web + export în Express; marca din formular, brand book PDF după ora 6; designul construit de cod din „anatomia” referinței (AI-ul scrie textele scurte și generează ilustrația); generarea de imagini cu modelul de imagine Gemini (Firefly Services de verificat); extensia de Chrome construită în paralel de la început (panou lateral, decupaj, citirea culorilor și fonturilor din pagină), aplicația web rămâne ruta de telefon pentru juriu și rezerva.

Scopul pe tipuri de element (cererea colegului: interfață, logo, mascotă, video, animație): o singură arhitectură „element → anatomie → adaptare la marcă → gardă”, cu adaptoare pe tip. **Azi:** imagini statice și mascota, cap-coadă. **După pragul de la ora 6, dacă fluxul static merge:** video ca storyboard + animatic (anatomia scenelor și a ritmului, cadre-cheie generate în stilul referinței, export video din browser), nu video generat. **Scos:** logo-ul (fix în brand guidelines, cel mai protejat juridic). **Azi, după imagine:** o secțiune de site (de exemplu hero-ul unui landing page) refăcută pe marca ta, din structura citită de extensie; dacă la ora 6 nu merge, demo-ul rămâne pe imagine. **După hackathon:** pagini întregi, animațiile CSS/Lottie.

Întrebări de validat pe hol (5 oameni care fac marketing): ultimul material refăcut după ceva văzut (imagine sau video, cât a durat); câte materiale statice vs video luna trecută; ultimul video (cine, cât timp, cât cost); câte încercări în ChatGPT/Firefly/Canva și ce a ieșit greșit; ce le-ar economisi mai mult.

## Ideile respinse

| Idee | De ce nu |
|---|---|
| Aprobarea materialelor între agenție și client (flux din `deconturi`) | AI-ul ar fi un add-on peste un flux de aprobare; pierde la AI-Driven Innovation (25%). |

## Ideile propuse (de ales de echipă)

Notele 1–5 sunt pe cele 9 întrebări din `docs/JURIU.md`; nota ponderată e calculată ca acolo. Nicio cifră nu vine încă de la un om real: Durerea și Costul rămân ipoteze până la interviuri.

**1. Agentul de promoții pentru afacerea de cartier.** Patronul unei cafenele spune ce are azi (ce a rămas în vitrină, ce vrea să vândă). Agentul citește contextul (vremea de la Open-Meteo, ora, rezultatele promoțiilor de ieri), alege oferta și publicul și scrie motivul, apoi generează postarea, story-ul și afișul A4 cu QR, editabile. Garda de marcă (cod) verifică prețul, procentul, data și codul de pe material față de oferta aprobată, plus contrastul și lizibilitatea. Patronul aprobă. Clientul scanează QR-ul și primește un cod unic, iar casierul îl marchează „folosit” sau „cod respins”. Rezultatul intră în decizia de mâine, iar codul calculează costul campaniei față de vânzările din coduri. CXO în mic: date → decizie → execuție → măsurare.

**2. Garda de marcă și de afirmații.** Brand managerul unei firme de cosmetice sau suplimente încarcă vizualul și fișa produsului (PDF). AI-ul extrage afirmațiile („elimină 99% din bacterii”) și caută pentru fiecare un citat în fișă. Codul verifică citatul în text (`verifyCitations`), paleta și mențiunile obligatorii. Ce n-are sursă primește ✗ și o reformulare propusă; responsabilul aprobă, iar vizualul corectat merge în Express. Este „protejează brandul” din slide-ul CXO.

**3. Campanii personalizate pentru magazinul online mic.** Patronul încarcă exportul de comenzi (CSV din WooCommerce sau Shopify). Codul calculează segmentele (recență, frecvență, valoare). Agentul alege ce ofertă primește fiecare segment și scrie emailul și bannerul personalizat; garda verifică oferta. Emailurile pleacă prin Resend, iar linkurile cu cod măsoară clicul și comanda. Este Data Foundation → AJO în mic.

| Întrebarea (criteriul) | 1. Agentul de promoții | 2. Garda de marcă | 3. Campanii personalizate |
|---|---|---|---|
| 1 Omul (PS) | 4: patronul, dimineața, la deschidere | 4: brand managerul, înainte de lansare | 4: patronul magazinului, luni, la campania săptămânii |
| 2 Durerea (PS) | 3: ipoteză (promoții nemăsurate, bani pe freelancer) | 3: ipoteză (reclame respinse, zile de juridic) | 3: ipoteză (același newsletter la toți, conversie mică) |
| 5 Bucla (PS) | 5: QR → cod → casierul confirmă → decizia de mâine | 3: aprobat → publicat; fără măsurare după | 4: email → clic → comandă cu cod; dezabonare ca „n-a mers” |
| 7 Brief-ul (PS) | 5: analizează, decide, execută, măsoară | 4: protejează brandul, generează reformulări | 5: date clienți, personalizare, conversii |
| 4 Diferența (AI) | 4: AI decide și creează; codul păzește | 5: AI extrage și reformulează; codul verifică fiecare citat | 4: AI decide pe segment și scrie; segmentele le calculează codul |
| 8 Integrările | 4: Open-Meteo, Gemini/Claude, add-on Express, SMS, Supabase live | 4: PDF Embed, add-on Express, Gemini/Claude, (Adobe Sign, de verificat) | 4: CSV WooCommerce/Shopify, Resend, Gemini/Claude, Express |
| 9 Fiabilitatea | 4: garda și fluxul sunt logică pură, testabilă | 4: `documents.ts` și `verifyCitations` există și sunt testate | 4: segmentarea e logică pură, testabilă |
| 6 Demo-ul | 5: juriul scanează afișul, casierul validează, cifra crește | 3: ✗ pe afirmații, reformulare, ✓; puțin interactiv | 3: juriul primește emailul pe telefon |
| 3 Costul (bonus) | 4: cost campanie vs. vânzări din coduri, calculat | 3: ore de juridic economisite (cifră de adus) | 4: cost pe email vs. comenzi din cod |
| **Problem Solving (25)** | 21,25 | 17,50 | 20,00 |
| **AI-Driven Innovation (25)** | 20,00 | 25,00 | 20,00 |
| **Integrations (15)** | 12,00 | 12,00 | 12,00 |
| **Technical Excellence (25)** | 20,00 | 20,00 | 20,00 |
| **Demo (10)** | 10,00 | 6,00 | 6,00 |
| **Total (100)** | **83,25** | 80,50 | 78,00 |
| **Bonus (10)** | 8 | 6 | 8 |
| Filtrul (a) cifră de la om | de adus: cum măsoară azi o promoție, cât plătesc pentru materiale | de adus: câte materiale respinse sau întârziate | de adus: rata de conversie a newsletterului |
| Filtrul (b) plătitor existent | ipoteză plauzibilă (freelanceri, Canva), de verificat | da (consultanță juridică, agenții) | da (abonamente Mailchimp, Klaviyo) |
| Filtrul (c) ≥ 2 lucruri peste un prompt | da: date live, gardă, buclă, măsurare, editabil | da: verificare, editabil, aprobare | da: date proprii, segmente calculate, măsurare |

**Recomandarea: ideea 1.** Ce trebuie să fie adevărat ca să câștige: un patron real spune la interviu cum măsoară azi o promoție (probabil deloc) și cât dă pe materiale; decizia agentului se schimbă vizibil când se schimbă contextul (ploaie → altă ofertă), altfel AI-ul pare decor.

### Întrebări de interviu pentru ideea 1 (despre trecut, cu cifre)

1. Ultima promoție pe care ați făcut-o: ce a fost, cine a făcut materialul și cât a durat?
2. Cât ați plătit în ultima lună pentru postări, afișe sau un om de social media?
3. De unde știți dacă promoția de atunci a adus clienți? Câți?
4. Ce ați aruncat sau ați vândut la reducere ieri seară, și cât valora?
5. Ce v-a oprit ultima dată să faceți o promoție în ziua respectivă?

Încheiați cu: „Pe cine altcineva ar trebui să întreb?”

## Dovezi de la oameni reali

| Cine | Ce a spus (cifre) |
|---|---|
| Mentorii ITFest (10:xx) | „e top ideea”. Validare de direcție, nu dovadă de durere: încă nicio cifră de la un om de marketing |

## Jurnal de decizii

| Ora | Decizia | Ce criteriu mută |
|---|---|---|
| 08:xx | Template copiat, `npm run check` trece (158 unitare, 29 e2e) | Technical Excellence |
| 08:xx | Prezentarea Adobe adăugată: tema exactă, criteriile cu ponderi, contextul CXO/CNP | toate |
| 08:xx | Verdict: B (rețeta `/design`), cu agentul (`agent.ts`) și bucla (`flow`); de confirmat după alegerea ideii | AI, Problem Solving |
| 08:xx | Respinsă: aprobarea agenție ↔ client (AI ar fi add-on) | AI-Driven Innovation |
| 09:xx | Aleasă: „stilul altcuiva, conținutul tău” (referință → stil; mascota, culorile și textele mărcii), verificat de cod | AI-Driven Innovation, Problem Solving, Demo |
| 09:xx | Scop: static acum, video (storyboard + animatic) după ora 6; logo scos; interfața site-ului după hackathon | Demo, Technical Excellence |
| 10:xx | După mentori: direcția rămâne; Gemini acum, Firefly mai târziu dacă obținem acces; colegul pe extensie, Alexandru pe motor; în plus landing page (`/`) și interfața de rezultate (`/campanii`) | Integrations, Product Experience |
| 10:xx | Mascota și produsul se numesc **Spire** (de la „inspire”); echipa e de 2 oameni, plan pe două jumătăți (extensia / motorul) | Demo (memorabil) |
| 10:xx | Scanarea site-ului e pentru campanie, nu pentru site: Spire alege elementele utile, din stilul ales iese kitul (postare + story + hero), cu reguli de conversie în gardă; site-ul întreg nu se reface | Problem Solving, Brief („optimizează conversii”) |
| 10:xx | Al doilea consiliu + decizia echipei: extensia rămâne, ca „corpul” agentului (Spire apare peste site, se uită, întreabă); referința din demo e licențiată sau propria campanie, nu concurentul; buclă de agent cu garda; spec: `docs/superpowers/specs/2026-11-07-spire-stil-pe-marca-design.md` | AI-Driven Innovation, Demo |
| 09:xx | Consiliul: originalitatea e în gardă și în rezultatul editabil, nu în clonare; extensia doar ca strat subțire; citirea paginii utilă doar pe site-uri, nu pe Meta/Instagram | Technical Excellence |
