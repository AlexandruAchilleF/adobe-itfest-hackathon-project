# Planul demo-ului: „Alegeți voi referința”

Stare: propunere scrisă la 11:05, nimic implementat. Decide echipa. Estimările sunt aproximative.

## Ideea

Spire reface pe marca ta orice design care îți place. Până acum am demonstrat asta doar pe o referință aleasă de noi, deci juriul poate crede că e regizat. Aici **referința o alege juriul**, din sală, cu camera telefonului, iar marca rămâne aceeași: Gelateria Pip.

Fraza din pitch: *„Site-urile sunt doar un loc în care vezi design. Arătați-i voi lui Spire ce vă place.”*

Întrebările mutate: 4 Diferența (AI-ul citește o imagine pe care n-a văzut-o), 6 Demo-ul (telefonul e în mâna juriului), 8–9 Integrările și Fiabilitatea (agentul se vede lucrând, cu timp și cost pe fiecare pas), 3 Costul (cifra e din rularea de față).

## Ce se întâmplă

| Timp | Pe ecranul mare | Pe telefonul juratului | Se spune |
|---|---|---|---|
| 0:00–0:30 | Rezultatul, apoi problema cu cifra | nimic | Omul și durerea |
| 0:30–1:10 | Extensia pe site: scanare, kit, primul wow | nimic | Drumul produsului |
| 1:10–1:25 | QR mare | Spire aterizează; se deschide camera; juratul fotografiază un afiș, un sticker, un tricou | „Acum alegeți voi referința.” |
| 1:25–2:00 | Fotografia juratului, cu aceleași chenare ca în extensie, puse pe zonele găsite de AI; apoi urma agentului, pas cu pas, cu timp și cost | Aceeași stare, pe scurt | **Arhitectura se explică pe rularea reală:** anatomie, texte, compunere, ilustrație, gardă, reîncercare |
| ~2:00 | **Al doilea wow:** fotografia lui în stânga, Pip în acel stil în dreapta, cu bifele gărzii | Rezultatul, de descărcat | Tăcere două secunde |
| 2:00–2:35 | Totalul rulării, calculat | | „A costat X și a durat Y. Azi, în chat, le-a luat [Z] minute.” |
| 2:35–3:00 | Ce urmează, QR-ul rămâne | Oricine poate încerca, cu coadă | Închiderea |

Așteptarea generării nu mai e timp mort: e chiar partea tehnică a pitch-ului. Slide-urile de arhitectură și de cost dispar, pentru că le înlocuiește urma agentului.

**Rezultatul apare în trepte.** Paleta și chenarele vin primele, apoi postarea compusă de cod, cu Pip original, apoi Pip generat. Ecranul nu rămâne gol, iar dacă pică generarea avem deja un rezultat, cu garda care spune ce s-a întâmplat.

## Ce e obligatoriu să nu pară un șablon

- **Fără formular.** Marca e deja în profil, iar Spire pune cel mult o întrebare.
- **Fotografia juratului e eroul**, nu un card într-o pagină de setări.
- **Spire e prezent:** același personaj și aceleași chenare ca în extensie. Un motor, două corpuri.
- **Stilul se transferă vizibil:** paleta, așezarea și desenul din fotografie, nu un fundal pastelat.
- **Urma e reală:** fiecare timp și cost vine din rularea de față.

Direcția vizuală a celor două ecrane se alege după acest plan, nu înainte. `PRODUCT.md` lipsește; se scrie din `docs/BRIEF.md` și se confirmă de echipă.

## Testul care decide: 45 de minute, înainte de orice cod nou

Totul depinde de cât de bine merge lanțul pe o fotografie făcută prost.

1. Faceți 10 fotografii cu telefonul în sală: afișe, stickere, tricouri, un slide de pe ecran.
2. Rulați lanțul real: anatomia, apoi ilustrația (azi Cloudflare FLUX.2, din `server/image.ts`).
3. Notați timpul pe fiecare pas și dacă ați publica rezultatul.

| Rezultat | Decizia |
|---|---|
| ≥ 6/10 bune și sub ~30 s | Live, cu orice referință din sală |
| 3–5/10 bune | Live, dar juratul alege din 4 afișe de pe masă, testate dinainte |
| < 3/10 bune sau peste ~60 s | Nu e live. Rămâne demo-ul cu extensia, plus urma agentului, iar referința din sală trece la „ce urmează” |

Afișele de pe masă sunt licențiate sau făcute de noi, deci rezolvă și decizia despre referințe.

## Ce se construiește

| # | Piesa | Depinde de | Efort |
|---|---|---|---|
| 1 | Telefon: QR → Spire → camera nativă a telefonului → imagine micșorată la ~1024 px (limita Vercel e ~4,5 MB) | `ask`, anatomia | 1 oră |
| 2 | `cost.ts`, logică pură cu teste: timp și cost pe pas | `agentLoop` | 30 min |
| 3 | Urma agentului ca evenimente, cu pagina de scenă: fotografia, chenarele, pașii, comparația | 1, 2, Supabase | 1,5 ore |
| 4 | Supabase: stare live și stocare pentru imagini; o singură rulare pe ecran, restul la coadă, cu plafon de rulări | | 30 min |
| 5 | Rezervă: reluarea unei rulări reale înregistrate, în aceeași interfață, spusă ca atare | 3 | 30 min |
| 6 | Dacă rămâne timp: mascota desenată de jurat pe o foaie (subiectul din `api/image.ts` devine fotografia desenului) | 1 | 30 min |

Piesa 3 merită făcută și dacă testul pică: urma agentului funcționează și pe rularea din extensie.

## Programul

| Când | Ce |
|---|---|
| Acum–12:00 | Testul care decide; în paralel, interviurile |
| 12:00–14:00 | Piesele 1–5, într-un fir separat, lângă sarcinile B7–B10 |
| 14:00 | Pragul general. Dacă drumul de bază nu merge, referința din sală iese primul. |
| 14:00–17:00 | Probe pe telefoane reale, pe rețeaua din sală, pe Vercel |
| 18:30 | Repetiții, inclusiv cu generarea picată |

## Riscuri

| Risc | Ce facem |
|---|---|
| Rețeaua din sală | Hotspot pentru telefonul nostru de rezervă; juratul poate fotografia cu el |
| Cota de generare se termină | Plafon de rulări și cont verificat dinainte; apoi rulare reluată |
| Fotografie proastă sau cu ceva nepotrivit | Doar operatorul pune o rulare pe ecranul mare |
| Fotografia e a unei mărci protejate | Păstrăm doar stilul, comparăm amprentele, spunem pe scenă ce e preluat și ce e nou |
| Juratul nu vrea să iasă telefonul | Îi dăm telefonul nostru, cu pagina deschisă |
| Jurizare în alt format decât credem | De aflat acum de la organizatori |

## Ce renunțăm

- **Pagina `/incearca`** (formular cu șablon): nu arată produsul.
- **Peretele de postări și „strică-l”:** demonstrează lucruri secundare.
