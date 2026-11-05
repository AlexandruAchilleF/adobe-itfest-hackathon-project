# Lentila juriului

Fiecare decizie din cele 12 ore (ideea, o funcționalitate, un text din UI, un slide) trece prin cele șapte întrebări de mai jos.
O decizie bună mută cel puțin un criteriu **și se vede în demo**. Dacă nu mută niciunul, propune altceva sau las-o pentru „după hackathon”.

Răspunsurile echipei stau în `docs/BRIEF.md`. Când lipsește un răspuns, cere-l echipei: nu-l inventa.

## Cele șapte întrebări

| # | Cuvântul | Întrebarea | Trece testul dacă… |
|---|---|---|---|
| 1 | **Omul** | Cine anume folosește aplicația, într-o situație concretă? | poți spune numele rolului și momentul („coordonatorul adăpostului, seara, când vede ce lipsește mâine”) |
| 2 | **Durerea** | Ce pierde azi omul ăsta, în cifre? | există o cifră spusă de un om real (interviu, sondaj): ore, bani, cereri pierdute |
| 3 | **Plătitorul** | Cine plătește și din ce buget? | plătitorul e o organizație care plătește deja pentru problema asta (consultant, angajat, amendă, abonament) |
| 4 | **Diferența** | Ce face produsul și n-ar face un prompt în ChatGPT? | are măcar una: date proprii sau live, o acțiune în lumea reală, o verificare deterministă, mai mulți oameni conectați, un flux în care omul confirmă |
| 5 | **Bucla** | Se închide bucla în lumea reală? | cererea are un ciclu complet (creat → acceptat → livrat → confirmat de ambele părți) și o cale pentru „n-a mers” |
| 6 | **Demo-ul** | Se vede în 3 minute, pe un singur drum? | momentul wow apare în primele 90 de secunde și juriul poate încerca singur (QR, telefon) |
| 7 | **Brief-ul** | Acoperă tot ce cere brief-ul Adobe? | fiecare cerință și fiecare „you can include…” din brief are o bifă în `docs/BRIEF.md` și un moment în demo |

Câștigătorul ITFest × Adobe 2023 (ResourceMe) a trecut toate șapte: a implementat toate funcționalitățile opționale din brief (hartă, gamificare) și a închis bucla (SMS către adăpost, „nu am primit”, ban). Alte echipe cu aceeași idee, fără buclă, n-au câștigat.

## Ce notează Adobe

Criteriile publicate la hackathoanele Adobe (fără ponderi): valoare pentru utilizatori, unicitate, fezabilitate și intenția de a construi mai departe, relevanța pentru categorie, claritatea pitch-ului.
Juriile Adobe au lăudat echipele care **și-au validat ideea cu utilizatori** și produsele **finisate, ușor de folosit**.

Întrebările grele, cu răspunsul pregătit:
- „De ce e nevoie de AI aici?” → AI-ul face doar partea pe care codul n-o poate face (text haotic → structură, explicație). Cifrele și scorurile le calculează codul.
- „Ce se întâmplă când AI-ul greșește?” → verificarea deterministă îl prinde și omul confirmă înainte de orice modificare.
- „Cine plătește?” → întrebarea 3, cu cifra din întrebarea 2.
- „Puteți explica codul?” → oricine din echipă explică orice fișier din demo.

## Cum aplici lentila

- **La alegerea ideii:** dă fiecărei idei 1–5 la fiecare întrebare, adună și recomandă una. Spune ce ar trebui să fie adevărat ca ideea să câștige.
- **Înainte de o funcționalitate:** scrie într-o frază ce întrebare mută și în ce secundă a demo-ului apare. Funcționalitățile care nu apar în demo vin după cele care apar.
- **La textele din UI:** pornește de la Omul și Durerea („Vezi ce lipsește mâine la adăpost”), nu de la tehnologie („Analiză AI a resurselor”).
- **La date de seed:** 8–10 înregistrări din domeniul brief-ului, cu nume și locuri reale din București. Datele domeniului exemplu ies din demo.
- **La mascotă:** o folosești doar unde servește Omul (copii, vârstnici, utilizatori neexperți, gamificare) și doar pentru stări reale. La teme B2B, juridice sau financiare rămâne ascunsă.
- **După ora 6:** doar Demo-ul și Brief-ul mai contează. Repari ce se vede, nu adaugi.

## Semnale bune

- O cifră reală în prima jumătate de minut a pitch-ului.
- Un singur flux care merge cap-coadă, cu pasul în care omul confirmă vizibil.
- Juriul ține un telefon în mână în timpul demo-ului.
- Cuvintele din UI sunt cele din brief și din interviuri.
- README-ul spune ce a existat înainte (template-ul) și ce s-a construit azi.
