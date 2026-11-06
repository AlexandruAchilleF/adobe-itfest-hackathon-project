# Ambalarea: ce vede juriul în afară de demo

ResourceMe a câștigat și cu un README care era un walkthrough cu capturi pentru fiecare pas. Lista de mai jos se face în ordinea asta, ultima oră înainte de îngheț. Cine ține pitch-ul bifează.

## 1. Datele de seed și textele (ora 1–2, când se schimbă scenariul)

Fișierul de lucru e `src/scenario/scenarios/<nume>.ts`. Activarea: `src/scenario/config.ts`.

- [ ] `id` nou (ex: `resurse`). Colecțiile au prefixul `id`, deci datele vechi din browser nu se amestecă.
- [ ] `app.name`, `app.tagline` (fraza „Ajutăm X să Y fără Z” din `docs/BRIEF.md`), `app.impactLabel` (ce numărați: „porții salvate”).
- [ ] `roles`: cuvintele din brief pentru cele două părți. Dacă brief-ul spune „donor” și „shelter”, scrieți „Donator” și „Adăpost”, nu „Vecin”.
- [ ] `categories`: 4–6 categorii din brief, ultima „altele”.
- [ ] `flow`: stările și pașii din brief, cu rolul care face fiecare pas. `label` e textul butonului, în limba omului din interviuri („Vin să iau”, „Am predat”, „Am primit”). Măcar un pas cu `outcome: "done"` (confirmarea celui care a cerut) și unul cu `outcome: "failed"` („n-a mers”).
- [ ] `business`: problema, plătitorul și dovezile (cine a spus ce cifră). Apar pe `/start`.
- [ ] `documents` (dacă cererea pornește de la un bon, o factură, un formular): `rules` cu plafoanele din politica firmei și un `sample` cu o greșeală pe care verificarea o prinde.
- [ ] `request.addPlaceholder` și `offerPlaceholder`: o frază reală, ideal spusă de cineva la interviu.
- [ ] `seed.people`: 4 + 4 oameni cu nume plauzibile și zone reale din București. Numere de telefon evident false (`0722 000 xxx`).
- [ ] `seed.requests`: 8–10 cereri, cu adrese și coordonate reale. 2–3 confirmate (ca să existe clasament), una livrată (ca să se vadă confirmarea în demo), una acceptată.
- [ ] `seed.reports`: 3 rapoarte la 4–45 de minute în urmă.
- [ ] `points` și `ranks`: numele rangurilor din brief sau din lumea omului. Verificați pe `/clasament` că primul loc nu e la egalitate.
- [ ] `notify` pe pași: mesajele SMS citite cu voce tare. Au sub 160 de caractere?
- [ ] `mascot`: rămâne (decizia echipei), dar pe temă: alt `name`, altă `color`, altă `persona`, iar omul cu design schimbă desenul din `MascotFigure.tsx` dacă are timp. Vorbește doar despre stări reale (verificări, așteptări, confirmări) și stă cel mult 10–15 secunde în demo.
- [ ] `npm test` trece. `validateScenario` și `validateFlow` prind roluri greșite, categorii inexistente, stări fără ieșire și pași imposibili în seed. `tests/urme.test.ts` prinde numele din scenariul vechi rămase în cod.
- [ ] Pe `/start` scrie „✓ Config-ul trece verificările”.

## 2. Urme de template (înainte de ora 6)

- [ ] `features.optionalModules: false` și `?dev=0` pe laptopul de pitch: panoul echipei (Rec, Mod demo, resetare) nu se vede.
- [ ] `VITE_APP_NAME` pe Vercel (sau doar `app.name`).
- [ ] `/business` și `/survey` au fost folosite? Ștergeți exemplul cu licitațiile SEAP din canvas dacă îl arătați juriului.
- [ ] Nicio pagină din meniu nu spune „template”, „rețetă”, „demo” sau „exemplu”.
- [ ] Bifa „Mod demo” din panoul echipei e oprită dacă aveți cheie AI.

## 3. Slide-urile (`/pitch`, înainte de ora 10:30)

Deck-ul se construiește singur din scenariu (`docs/DESIGN.md`, „Pitch deck-ul”). Completați doar ce nu e acolo, în `PITCH` din `src/pitch/deck.ts`:

- [ ] `team`: numele și rolul fiecăruia.
- [ ] `brief`: fiecare cerință din `docs/BRIEF.md` și momentul din demo în care se vede. Puneți aici și ce folosiți de la Adobe.
- [ ] `market`: câte organizații au problema și cât plătesc azi, numărat de jos în sus.
- [ ] `builtToday` și `next`: aceleași ca în `README.md`.
- [ ] `demoUrl`: adresa de pe Vercel (QR-ul de pe slide-ul de demo).
- [ ] Nicio casetă „De completat” rămasă: treceți prin `/pitch` cu săgețile.
- [ ] PDF-ul (`P` pe deck) pe stick și pe telefon, ca rezervă.

## 4. README pentru juriu (ultima oră)

Înlocuiți secțiunea de sus a `README.md` cu:

1. Numele și fraza produsului.
2. **Problema, cu cifra** și cine a spus-o (din `docs/BRIEF.md`, „Dovezi de la oameni reali”).
3. **Walkthrough cu capturi**, câte una pe pas: prima pagină → cererea scrisă de cel care primește → acceptarea → SMS-ul → „Am primit” → punctele și rangul → raportul de pe telefon pe hartă. Capturi cu `⏺ Rec` sau cu screenshot din browser, salvate în `docs/capturi/`.
4. **Ce cere brief-ul și unde se vede** (tabelul din `docs/BRIEF.md`, fiecare rând bifat).
5. **Construit înainte / construit azi**: completați tabelul din `README.md`. Fiecare commit din ziua hackathonului apare în `git log --since="2026-11-07"`.
6. Cum se rulează (`npm install`, `npm run dev`).

## 5. Ce spuneți dacă juriul întreabă de codul scris înainte

„Am venit cu un schelet pe care îl folosim la hackathoane: hartă, roluri, ciclul unei cereri, puncte, notificări cu mock. Azi am scris scenariul vostru (lista din README), am vorbit cu N oameni și am adaptat textele la ce ne-au spus. Commit-urile de azi sunt în git log.” Spuneți asta înainte să fiți întrebați, la slide-ul cu tehnologia.
