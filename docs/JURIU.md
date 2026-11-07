# Lentila juriului

Fiecare decizie din cele 12 ore (ideea, o funcționalitate, un text din UI, un slide) trece prin întrebările de mai jos.
O decizie bună mută cel puțin un criteriu **și se vede în demo**. Dacă nu mută niciunul, propune altceva sau las-o pentru „după hackathon”.

Răspunsurile echipei stau în `docs/BRIEF.md`. Când lipsește un răspuns, cere-l echipei: nu-l inventa.

## Criteriile oficiale (prezentarea Adobe, ITFest 2026)

Sursa: slide-ul „Criterii de Jurizare” din prezentarea Adobe de la deschidere. Scorul principal are 100 de puncte, plus un bonus de până la 10.

| Pondere | Criteriul | Ce scrie pe slide | Întrebările care îl mută |
|---|---|---|---|
| **25%** | Problem Solving | „O problemă reală de marketing, rezolvată cu impact.” | 1 Omul, 2 Durerea, 5 Bucla, 7 Brief-ul |
| **25%** | AI-Driven Innovation | „AI-ul este esențial pentru produs, nu doar un add-on.” | 4 Diferența |
| **15%** | Third-Party Integrations | „API-uri și servicii externe integrate cu sens.” | 8 Integrările |
| **25%** | Technical Excellence | „Arhitectură solidă, implementare și fiabilitate.” | 9 Fiabilitatea |
| **10%** | Product Experience & Demo | „Experiență intuitivă și prototip demonstrabil.” | 6 Demo-ul |
| **+10** | Bonus: Cost vs. Value | „Costuri estimate vs. economii sau profit.” | 3 Costul și plătitorul |

Ce rezultă de aici:
- **Demo-ul valorează doar 10%.** Arhitectura, fiabilitatea și integrările valorează împreună 40%. Un demo frumos peste un nucleu fragil pierde.
- **AI-ul trebuie să fie miezul.** Dacă produsul ar merge la fel fără AI, pierdem un sfert din notă. AI-ul analizează, decide și creează; codul păzește marca și cifrele; omul aprobă.
- **Integrările se notează separat** și trebuie să aibă sens (o integrare care nu schimbă rezultatul nu contează).
- **Costul vs. valoarea e bonus:** o cifră calculată de cod (cât costă o rulare, cât aduce sau economisește), nu o estimare spusă din burtă.

## Formatul prezentării (de la organizatori, 7 noiembrie)

Organizatorii recomandă un **videoclip de prezentare**, de **circa 3 minute** (durata nu e fixată), în care se vorbește **mult despre arhitectură și partea tehnică**, ca să se vadă că echipa a înțeles ce a construit. Textul și programul: `docs/PITCH.md`.

Ponderile de mai sus nu s-au schimbat. Se schimbă cum le apărăm: un video îngrijit nu ține loc de Technical Excellence, iar arhitectura e aproape jumătate din timp.

## Ce înseamnă „marketing” pentru Adobe (din prezentare)

- **Adobe CXO** (Customer Experience Orchestration): „De la tool-uri operate manual la AI Agents care analizează, decid și execută procese de marketing.” Trei straturi: date despre clienți în timp real (AEP, Analytics, AJO, Target) → decizie și optimizare, unde agenții „analizează contextul, protejează brandul și aleg strategii” → execuție în timp real (Target, GenStudio), care „generează conținut, personalizează experiențe și optimizează conversii”.
- **Adobe CNP** (Creativity & Productivity): Photoshop, Illustrator, Express, Stock; Acrobat Reader, Adobe Sign.
- Juriul e format din ingineri (AEP Data Distiller, Run and Operate). Stack-ul lor de frontend e React, TypeScript și Spectrum, ca al nostru.

## Întrebările

Numerele 1–7 rămân aceleași ca înainte (codul le citează după număr); 8 și 9 sunt adăugate pentru criteriile noi.

| # | Cuvântul | Întrebarea | Trece testul dacă… |
|---|---|---|---|
| 1 | **Omul** | Cine anume folosește aplicația, într-o situație concretă de marketing? | poți spune rolul și momentul („patronul cafenelei, dimineața, când decide promoția zilei”) |
| 2 | **Durerea** | Ce pierde azi omul ăsta, în cifre? | există o cifră spusă de un om real (interviu, sondaj): ore, bani, clienți, conversii |
| 3 | **Costul și plătitorul** | Cât costă o rulare și cât aduce? Cine plătește? | codul calculează costul (AI, SMS, API-uri) și valoarea (vânzări, ore economisite) din cifre reale, iar plătitorul plătește deja pentru problemă |
| 4 | **Diferența** | Fără AI, mai există produsul? Și ce face în plus față de un prompt în ChatGPT? | AI-ul analizează, decide sau creează partea centrală, **și** codul adaugă ce un chat nu are: date proprii sau live, protecția mărcii verificată de cod, o acțiune în lumea reală, mai mulți oameni conectați, aprobarea omului |
| 5 | **Bucla** | Se închide bucla în lumea reală? | materialul ajunge la un client real și rezultatul se întoarce în aplicație (confirmat, măsurat), cu o cale pentru „n-a mers” |
| 6 | **Demo-ul** | Se vede în circa 3 minute de video, pe un singur drum, intuitiv? | momentul wow apare în primul minut, montajul nu arată ce nu există (accelerarea are etichetă) și juriul poate încerca singur (QR, telefon) |
| 7 | **Brief-ul** | E marketing „reimagined”, „next generation”? | fiecare cerință din `docs/BRIEF.md` are o bifă și un moment în demo |
| 8 | **Integrările** | Ce API-uri și servicii externe folosim, și ce ar pierde produsul fără fiecare? | fiecare integrare din demo schimbă rezultatul (Adobe Express, PDF Embed, AI, date live, SMS/email) și are o cale de rezervă dacă pică |
| 9 | **Fiabilitatea** | Arhitectura ține? Merge și când AI-ul, rețeaua sau o cheie pică? Și se vede în video că am înțeles-o? | logică pură testată, AI cu schemă validată și mock, verificări deterministe lângă AI, `npm run check` verde, oricine din echipă explică orice fișier, iar video-ul spune decizii și motivele lor, nu o listă de tehnologii |

Câștigătorul ITFest × Adobe 2023 (ResourceMe) a implementat toate funcționalitățile opționale din brief și a închis bucla (SMS către adăpost, „nu am primit”, ban). Alte echipe cu aceeași idee, fără buclă, n-au câștigat.

## Cum se calculează nota

Dați 1–5 la fiecare întrebare. Nota pe criteriu = media întrebărilor lui ÷ 5 × ponderea. Exemplu: Problem Solving cu 4, 3, 4, 4 → 3,75 ÷ 5 × 25 = 18,75 puncte. Bonusul = nota la întrebarea 3 ÷ 5 × 10.

Fără dovadă (cifră, test, ecran în demo), o întrebare primește cel mult 2.

## Întrebările grele, cu răspunsul pregătit

- „De ce e nevoie de AI aici? E doar un add-on?” → AI-ul face partea centrală (citește contextul, decide oferta, scrie și desenează materialul). Fără el n-ar exista produsul. Codul doar păzește: verifică marca și cifrele, iar omul aprobă.
- „Ce se întâmplă când AI-ul greșește?” → verificarea deterministă îl prinde și omul confirmă înainte de orice publicare sau trimitere.
- „Cât costă o rulare și cât aduce?” → întrebarea 3, cu cifra calculată în aplicație.
- „Ce faceți dacă pică API-ul X?” → întrebarea 8: calea de rezervă (alt furnizor AI, mod demo, pdf.js, localStorage).
- „Puteți explica arhitectura?” → video-ul o explică pe rularea reală, oricine din echipă explică orice fișier din demo, iar testele arată ce garantăm.

## Cum aplici lentila

- **La alegerea ideii:** dă fiecărei idei 1–5 la fiecare întrebare, calculează nota ponderată și recomandă una. Spune ce ar trebui să fie adevărat ca ideea să câștige.
- **Înainte de o funcționalitate:** scrie într-o frază ce întrebare mută și în ce secundă a demo-ului apare. Ordinea: ce mută criteriile de 25% (problemă, AI, tehnic) înaintea celor de 15% și 10%.
- **La textele din UI:** pornește de la Omul și Durerea („Vezi câți clienți a adus afișul de ieri”), nu de la tehnologie („Analiză AI a campaniei”).
- **La date de seed:** 8–10 înregistrări din domeniul brief-ului, cu nume și locuri reale din București. Datele domeniului exemplu ies din demo.
- **La mascotă:** o folosești doar unde servește Omul (copii, vârstnici, utilizatori neexperți, gamificare) și doar pentru stări reale. La teme B2B, juridice sau financiare rămâne ascunsă.
- **După ora 6:** doar Demo-ul, Brief-ul și Fiabilitatea mai contează. Repari ce se vede și ce poate pica, nu adaugi.

## Semnale bune

- O cifră reală în prima jumătate de minut a video-ului.
- Un singur flux care merge cap-coadă, cu pasul în care omul confirmă vizibil.
- Arhitectura ocupă aproape jumătate din video, cu schema și codul real pe ecran; plus integrările și costul pe rulare vs. valoarea adusă.
- Juriul ține un telefon în mână în timpul demo-ului.
- Cuvintele din UI sunt cele din brief și din interviuri.
- README-ul spune ce a existat înainte (template-ul) și ce s-a construit azi.
