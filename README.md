# Template de hackathon: aplicație-scenariu (ITFest × Adobe, 7 noiembrie 2026)

La ITFest, Adobe dă un **scenariu** (cine sunt oamenii, ce fac unii pentru alții) și o listă de funcționalități opționale. Template-ul e scheletul pentru formatul ăsta: se scrie scenariul într-un fișier de config, iar paginile, fluxul, verificările și notificările îl urmează.

> Mâine, la start: promptul pentru asistent e în [`docs/PROMPT-START.md`](docs/PROMPT-START.md).
> Citiți întâi: [`docs/JURIU.md`](docs/JURIU.md) (lentila juriului), [`docs/BRIEF.md`](docs/BRIEF.md) (ce faceți în prima oră), [`docs/PLAN-12H.md`](docs/PLAN-12H.md) (programul zilei) și [`docs/AMBALARE.md`](docs/AMBALARE.md) (ce vede juriul în afară de demo).
> De ce arată așa: [`docs/REVIZUIRE.md`](docs/REVIZUIRE.md). Repetiția cronometrată pe brief-ul din 2023: [`docs/REPETITIE-2023.md`](docs/REPETITIE-2023.md).

## Ce face în plus față de „un prompt în ChatGPT”

AI-ul face un singur lucru: transformă ce scrie, spune sau fotografiază omul într-o structură. Restul îl face codul:

| Piesa | Ce face | Unde |
|---|---|---|
| **Flux configurabil** | oricâte roluri și pași (cere → aprobă → execută → confirmă), retur cu motiv, „n-a mers”, cine are voie să facă fiecare pas | `src/lib/flow.ts`, `scenario.flow` |
| **Documente verificate de cod** | bon, factură, poză sau PDF → câmpuri extrase de AI → ✓/✗ pe sumă, cod fiscal (cifra de control), dată, duplicate, plafoane; nu se trimite până nu se corectează | `src/lib/checks.ts`, `DocumentIntake` |
| **Cronometrul procesului** | cât stă fiecare cerere la fiecare pas, unde se blochează, reminder; costul lunar doar din cifrele spuse de oameni | `src/lib/metrics.ts`, `/cronometru` |
| **Rezultat editabil** | fișa finală cu fapte din date și rezumat propus de AI, corectat de om, tipărit ca PDF | `/fisa/:id` |
| **Notificări cu link** | SMS sau email la fiecare pas (mock fără chei), cu link de confirmare pe telefon | `api/notify.ts`, `/c/:id` |
| **Hartă și raport live** | cereri pe hartă, potrivire cu scor determinist, raport rapid la locația curentă, live între telefoane; cu `reports.toRequest` raportul devine cerere cu flux | `/cereri`, `/raport`, `src/lib/live.tsx` |
| **Puncte și ranguri** | calculate de cod din confirmări, doar când brief-ul le cere | `src/lib/gamification.ts`, `/clasament` |
| **Mascota** | vocea verificărilor și a așteptărilor, execută acțiuni doar cu confirmare | `src/modules/mascot/`, `scenario.mascot` |
| **Validare** | sondaj prin QR și business canvas: cifra reală și plătitorul pentru pitch | `/survey`, `/business` |

Două scenarii exemplu, ca să vedeți cum arată config-ul:
- **`deconturi`** (implicit): angajat → manager → contabil, bonul verificat de cod, cronometrul. Plătitorul e firma.
- **`sesizari`**: raportezi de pe telefon (GPS și oră), raportul devine sesizare cu flux, echipa primăriei o preia și o rezolvă, cetățeanul confirmă din SMS sau spune „nu s-a rezolvat”. Forma brief-ului din 2024. Plătitorul: primăria (ipoteză).
- **`resurse`**: repetiția pe brief-ul ResourceWise 2023 (restaurante → adăposturi, hartă, puncte, ranguri). Vezi `docs/REPETITIE-2023.md`.
- **`interne`**: cereri interne IT și onboarding (angajat → manager → IT → „funcționează” sau „nu merge”), fără hartă și fără documente. Plătitorul: firma (ipoteză).
- **`vecini`**: două roluri, hartă, puncte, raport live. Arată mecanica; nu are un plătitor verificat și nu e o idee de pitch.

Scenariul se alege cu `VITE_SCENARIO=<id>` (în `.env` local și în setările Vercel, la build) sau schimbând valoarea implicită din `src/scenario/config.ts`.

## Din brief în aplicație (primele 2 ore)

1. Brief-ul în `docs/BRIEF.md`, cu fiecare „you can include…” pe un rând. Ideea trece prin trei filtre: problemă cu cifră spusă de un om, un plătitor care plătește deja, cel puțin două lucruri din tabelul de mai sus.
2. Copiați scenariul cel mai apropiat din `src/scenario/scenarios/` (`deconturi` pentru procese, `sesizari` pentru raportare live, `resurse` pentru „cine are / cine are nevoie” pe hartă) în `src/scenario/scenarios/<nume>.ts` și adăugați-l în `SCENARIOS` din `src/scenario/config.ts`.
3. Schimbați, în ordinea asta: `id`, `app`, `business`, `roles`, `flow`, `categories`, `documents`, `features`, `mascot`, `seed`. Checklist-ul complet: `docs/AMBALARE.md`.
4. `npm test`: `validateScenario` și `validateFlow` spun ce nu se leagă (roluri, stări fără ieșire, pași imposibili în seed), iar `tests/urme.test.ts` prinde numele din scenariul vechi rămase în cod. Pe `/start` trebuie să scrie „✓ Config-ul trece verificările”.
5. `npm run dev` și parcurgeți fluxul cu fiecare rol (comutatorul „Sunt” din antet sau `?ca=<handle>` pe telefon).

```bash
npm install
```

```bash
npm run dev
```

Fără nicio cheie, totul merge în mod demo. Cheile se pun în `.env` (local) sau în setările de deploy, după modelul din `.env.example`. Cerințe: Node ≥ 22.18, Chrome.

## Construit înainte / construit azi

Codul scris dinainte e permis la ITFest × Adobe 2026. Îl declarăm, ca juriul să știe ce evaluează. **Completați partea a doua pe 7 noiembrie, înainte de pitch.**

**Construit înainte de 7 noiembrie (acest template):** fluxul configurabil, verificările de documente, cronometrul, fișa tipăribilă, notificările cu mock, harta și raportul live, punctele, mascota, sondajul și business canvas-ul, apelul AI cu mock, modulele opționale (documente cu citate, design editabil, asistent).

**Construit azi, la hackathon:**

| Ce | Fișiere | Starea |
|---|---|---|
| Brief-ul Adobe, criteriile cu ponderi din prezentare, cerințele, ideile notate | `docs/BRIEF.md`, `docs/JURIU.md`, `docs/PLAN-12H.md` | gata |
| Spec-ul produsului (Spire): fluxul, arhitectura, garda, planul pentru doi oameni | `docs/superpowers/specs/2026-11-07-spire-stil-pe-marca-design.md` | gata |
| Scenariul Spire: texte, marca de demo, fluxul campaniilor | `src/scenario/scenarios/spire.ts` | urmează |
| Motorul: anatomia, întrebările, kitul, garda, bucla de agent | `src/lib/` (`anatomy`, `gaps`, `compose`, `campaign`, `restyle`, `guard`, `agentLoop`, `color`, `similarity`) | urmează |
| Generarea mascotei cu Gemini | `api/image.ts` | urmează |
| Extensia de Chrome: Spire peste pagină, scanarea, decupajul, citirea paginii | `chrome-extension/` | urmează |
| Aplicația web: landing page, marca, campanie nouă, campaniile | `src/pages/` | urmează |

Toate commit-urile de azi: `git log --since="2026-11-07"`.

**Cu cine am vorbit azi:** _(câți oameni, ce cifre au spus; vezi `docs/BRIEF.md`)_

## Module opționale (panoul echipei, `?dev=1`)

| Modul | Fluxul |
|---|---|
| **Documente → răspunsuri verificate** (`/docs`) | PDF → structură (titlu, H1–H3, pagini) → întrebare → răspuns cu citate verificate în text → salt la pagină |
| **Input haotic → design editabil** (`/design`) | text / voce / poză → design → audit de lizibilitate și contrast + reparare → PNG/SVG/QR |
| **Asistent cu confirmare** (`/assistant`) | cerere în limbaj natural → acțiuni pe cererile scenariului → omul aprobă orice modificare |
| **Business canvas + sondaj** (`/business`, `/survey`) | problemă, cine plătește, piață → sondaj prin QR → „11 din 14 (79%) au răspuns Da” |

Paginile astea, modul demo, înregistrarea video și resetarea datelor apar în panoul echipei: deschideți aplicația cu `?dev=1` (rămâne pornit în browserul vostru până la `?dev=0`). Juriul vede doar paginile scenariului.

## Piesele de bază în cod

```ts
// AI cu răspuns structurat și validat (Gemini / Claude / mock), cu imagini sau PDF
const { data } = await ask({ prompt, schema: ZodSchema, files: [pozaSauPdf], mock: exempluConstruitDinInput });

// Fluxul: reguli pure, aceleași în UI, în seed și în teste
apply(scenario.flow, cerere, "aproba", { handle, role }, new Date(), motiv);
available(scenario.flow, cerere, eu);            // butoanele pe care le am
checkDocument(doc, { rules, category, existing }); // ✓/✗ calculate de cod
processStats(scenario.flow, cereri);              // unde se blochează

// Acțiuni din limbaj natural, cu confirmare în cuvinte
defineAction({ name, kind: "write", description, args, run, examples, mockArgs, describe: (a) => "Aprobă „…”" });
```

## Configurare (opțional)

- **Gemini:** `GEMINI_API_KEY` (are free tier). Dacă primiți 429, setați `GEMINI_MODEL` la un model `-flash-lite`.
- **Claude:** `ANTHROPIC_API_KEY` (implicit `claude-opus-5-5`, cu `ANTHROPIC_EFFORT=low` pentru răspunsuri rapide).
- **Adobe PDF Embed:** `VITE_ADOBE_PDF_CLIENT_ID`. Fără el, documentele se afișează cu pdf.js. Pașii sunt în `docs/ADOBE-SETUP.md`.
- **Supabase** (date partajate între dispozitive, sondaj între telefoane, link-uri scurte în QR): `VITE_SUPABASE_URL` și `VITE_SUPABASE_ANON_KEY`. Rulați în *SQL Editor*:
  ```sql
  create table public.records (
    id uuid primary key default gen_random_uuid(),
    collection text not null,
    data jsonb not null,
    created_at timestamptz not null default now()
  );
  create index on public.records (collection, created_at);
  alter table public.records enable row level security;
  -- doar pentru demo: oricine are cheia publică poate citi și scrie
  create policy "demo all" on public.records for all to anon using (true) with check (true);
  ```
  Fără Supabase, datele rămân în browser (localStorage), iar sondajul merge între tab-urile aceluiași browser.

## Deploy

```bash
npx vercel
```

Setați aceleași variabile în *Vercel → Project → Settings → Environment Variables*. Pe telefon, camera și microfonul cer HTTPS, deci folosiți adresa de pe Vercel.

## Comenzi

| Comandă | Ce face |
|---|---|
| `npm run dev` | aplicația + `/api` local |
| `npm run build` | typecheck + build de producție |
| `npm test` | teste unitare: fluxul, verificările de documente, cronometrul, gamificarea, notificările, scenariile, documente cu pdf.js real, agentul cu confirmare, auditul |
| `npm run e2e` | ambele scenarii cap-coadă și modulele opționale, în browser, cu AI mock și fără internet (un server pe scenariu) |
| `npm run check` | toate cele de mai sus |

## Ce e în altă parte

- Un proiect complet construit din template, ca test, e pe ramura **`dry-run`** (fișă adaptată din lecție). Rezultatele testului: [`docs/DRY-RUN.md`](docs/DRY-RUN.md).

- Modulele de interacțiune (mâini, față, corp, sunet, Arduino, telefon-controller, mockup în perspectivă, kiosk) sunt pe ramura **`effects`**. Aduceți-le înapoi doar dacă tema le cere explicit, de exemplu accesibilitate fără mâini.
- Add-on-ul Adobe Express: `adobe-express-addon/` și `docs/ADOBE-SETUP.md`.

## Ce nu a fost testat

- Apelurile reale către Gemini și Claude: testele folosesc `mock`.
- Adobe PDF Embed cu un Client ID real, add-on-ul în Express, Supabase cu un proiect real.
- Geocodarea reală prin Nominatim: în teste e simulată.
- SMS-uri reale prin Twilio și emailuri prin Resend: testele simulează rețeaua.
- Două telefoane diferite pe Supabase Realtime: testele folosesc tab-urile aceluiași browser.
- Citirea unei poze reale de bon de către Gemini sau Claude: mock-ul citește doar text.
