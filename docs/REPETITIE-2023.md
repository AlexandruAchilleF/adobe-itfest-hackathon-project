# Repetiția pe brief-ul ResourceWise (ITFest × Adobe 2023)

**Brief-ul (textul păstrat în repo-ul unei echipe din 2023):** „Build an application to combat resource waste and connect those with surplus resources to those in need… You can include features such as **Interactive Mapping**, to locate nearby donors and beneficiaries… or **Gamification**, to Earn rewards and points for your contributions.” Cazul descris de Adobe: restaurante cu mâncare rămasă seara și adăposturi.

**Rezultatul:** `src/scenario/scenarios/resurse.ts` („Masa de diseară”). Rulează cu `VITE_SCENARIO=resurse npm run dev` și e acoperit de `e2e/repetitie.spec.ts`.

## Cât a durat și ce s-a atins

| Ce | Rezultat |
|---|---|
| Cod scris în afara config-ului | **0 linii** |
| Fișiere atinse | 1 fișier nou de scenariu (circa 140 de linii, aproape toate date) + 1 linie în `src/scenario/config.ts` |
| Verificări la prima rulare | `validateScenario` și `validateFlow` au trecut din prima. Fluxul a mers cap-coadă fără erori. |
| Timp, scris de asistentul AI | sub 2 minute. **Nu e o măsură pentru voi:** un asistent scrie 140 de linii de date instantaneu. |
| Timp estimat pentru echipă | 45–75 de minute pentru config, majoritatea pentru seed (adrese reale, nume, cifre). E o estimare, nu o măsurătoare. **Refaceți repetiția voi, cu ceasul pornit**, înainte de 7 noiembrie. |

Ce a acoperit config-ul din brief:

| Cerința din brief | Unde se vede |
|---|---|
| conectează surplusul cu nevoia | două roluri (Restaurant, Adăpost), fluxul „caută donator → promis → predat → primit” |
| Interactive Mapping, donatori în apropiere | `/harta`, potrivirea cu scor determinist (urgență + distanță), raportul „Surplus acum, aici” la locația curentă |
| Gamification, puncte și recompense | puncte calculate de cod doar după confirmarea adăpostului, ranguri de la „Novice” la „Expert ResourceWise”, ramă de profil, clasament |
| **în plus față de brief (bucla)** | SMS cu link la predare, „Nu am primit”, penalizare și suspendare după 2 contestări, cronometrul (cât stă o cerere fără donator) |

## Juriul, pe rezultat (`docs/JURIU.md`)

| # | Întrebarea | Nota (1–5) | De ce |
|---|---|---|---|
| 1 | Omul | 4 | coordonatorul adăpostului, seara, când îi lipsesc porții la cină |
| 2 | Durerea | **1** | nicio cifră spusă de un om real. Se rezolvă doar prin interviuri, nu prin cod. |
| 3 | Plătitorul | **2** | ipoteza (operatorii alimentari, CSR) nu e verificată |
| 4 | Diferența | 4 | mai mulți oameni legați, date live, puncte calculate de cod, confirmare |
| 5 | Bucla | 5 | promis → predat → primit, plus „nu am primit” cu consecință |
| 6 | Demo-ul | 3 → 4 | după reparațiile de mai jos |
| 7 | Brief-ul | 5 | ambele funcționalități opționale, plus bucla |

## Primele 3 probleme găsite și reparate

1. **„Mod demo”, „AI: mock”, „Rec” și „Resetează datele demo” erau vizibile pentru juriu.** Juriul citește „mock” și „demo” ca „fals”. Acum, cu `features.optionalModules: false` (modul de pitch), antetul și pagina cererilor nu mai arată uneltele echipei. `?demo=1` merge în continuare. Test: `e2e/repetitie.spec.ts`.
2. **Mascota spunea „stă la restaurant de 1 zi” despre o cerere pentru cina de diseară, pe care n-o preluase nimeni.** Au fost două cauze. Prima: seed-ul eșalona implicit cererile câte 3 ore, deci prima apărea creată acum o zi. Acum le eșalonează câte o oră, iar `hoursAgo` se poate da pe fiecare cerere. A doua: formularea dădea vina pe un restaurant anume. Acum spune „n-a preluat-o încă nimeni (restaurant)”, atât în mascotă, cât și pe `/cronometru`.
3. **Prima pagină n-avea unde să arate cifra spusă de un om real** (întrebarea 2, „în primele 30 de secunde”). Acum primul rând din `business.evidence` apare sub fraza produsului. Cât timp lipsește, în modul de lucru apare un avertisment. Tot aici: numele și persona mascotei („Bucățel”, cățel) nu se potriveau cu desenul, care e un arici. Am corectat config-ul și am notat în `docs/AMBALARE.md` că desenul trebuie schimbat de om dacă se schimbă animalul.

## Ce rămâne neacoperit de repetiție

- Cifrele de la oameni reali (întrebările 2 și 3). Codul are acum locul pentru ele, dar nu le poate inventa.
- Telefoane diferite: fără Supabase, raportul live merge doar între tab-urile aceluiași browser.
- Geocodarea reală a adreselor scrise de adăposturi (în teste e simulată).
