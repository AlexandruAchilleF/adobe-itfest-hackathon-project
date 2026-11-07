# O campanie, două intrări: legarea extensiei de aplicație

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** omul pornește din extensie, primește kitul în panou și îl termină în aplicație, pe aceeași campanie și cu aceeași marcă.

**Architecture:** `store.ts` trece pe Supabase (tabela `records`), pentru că iframe-ul panoului are alt `localStorage` decât un tab normal. Coada de materiale din panou iese din produs, iar critica devine sursa brief-ului pentru fluxul cu kit și gardă. Panoul se încheie cu „Deschide în Spire”, care salvează și deschide `/campanii/:id`.

**Tech Stack:** Vite, React 19, TypeScript, Supabase, Vercel, extensie Chrome MV3, Vitest, Playwright.

**Spec:** deciziile sunt în secțiunea de mai jos. Context: `docs/BRIEF.md`, `docs/JURIU.md`, `docs/superpowers/specs/2026-11-07-spire-critique-brief.md`. Acest plan înlocuiește secțiunea „sidebar și coadă de materiale” din acel spec.

## Decizii

1. **Dovada:** în Chrome 157, pe `spire-coral.vercel.app`, ce scrie iframe-ul în `localStorage` nu apare într-un tab normal (`null`). Playwright oprește implicit `ThirdPartyStoragePartitioning`, deci testele e2e obișnuite nu văd problema.
2. **Rolurile:** extensia face decuparea, întrebările și previzualizarea kitului. Aplicația face retușul, exportul, lista de campanii și marca.
3. **Critica:** completează brief-ul și trimite la alegerea referinței. Nu produce materiale. `/marca` rămâne sursa mărcii; extragerea mărcii din site e pentru după hackathon.
4. **Video-ul:** clipul Marina Park și butonul lui ies din repo. `/api/video` rămâne contract cu mock.
5. **Salvarea:** clicul pe „Deschide în Spire” e confirmarea omului. Nu există salvare automată.

## Cine ce face

**Alexandru: datele, aplicația, deploy-ul.** **David: extensia și panoul.**

| Fișiere | Proprietar |
|---|---|
| `src/lib/store.ts`, `supabase/`, `src/pages/spire/{AcasaPage,CampaignsPage,CampaignPage,CampaignCard,BrandPage,parts}.tsx`, `src/lib/campaigns.ts`, `playwright.config.ts`, `docs/` | Alexandru |
| `chrome-extension/**`, `public/spire-extensie.zip`, `src/pages/spire/NewCampaignPage.tsx`, `src/pages/spire/CritiqueNotes.tsx`, `src/lib/critique*.ts`, `src/lib/gaps.ts`, `e2e/extension.spec.ts` | David |
| `e2e/spire.spec.ts` | fiecare adaugă teste doar la final de fișier |

## Program

| Când | Alexandru | David |
|---|---|---|
| 14:25–14:45 | Task 1, integrarea | Citește planul, confirmă decizia 4, începe Task 6 (doar `chrome-extension/`) |
| 14:45–15:30 | Task 2, Supabase; Task 3, reîncărcarea | După push-ul din Task 1: Task 4, scoaterea cozii |
| **15:30** | **Punct de decizie:** merge Supabase în producție? Dacă nu, vezi „Rezerva” | |
| 15:30–16:15 | Task 7, Acasă și proba de producție | Task 5, „Deschide în Spire”; termină Task 6 |
| 16:15–16:45 | Task 8, deploy și repetiție, împreună | Task 8, împreună |
| **16:45** | Ce nu merge iese din drumul filmat | |
| **17:00** | Îngheț | Îngheț |

**Rezerva, dacă Supabase nu merge la 15:30:** „Deschide în Spire” deschide tabul, îi trimite campania prin `postMessage`, iar tabul o salvează în `localStorage`-ul lui. Marca rămâne nesincronizată, deci panoul folosește marca implicită și în `/marca` nu se schimbă nimic în timpul filmării.

## Reguli de lucru

- Toți lucrați pe `main`, după Task 1. Fără alte ramuri.
- Înainte de push: `git pull --rebase` și `npm run check`. Push după fiecare task, nu la sfârșitul zilei.
- Nu editați fișierul celuilalt. Dacă trebuie, spuneți-i întâi.
- O singură sesiune AI per folder. Fiecare dă asistentului doar task-urile lui din acest plan.
- `public/spire-extensie.zip` e binar: îl reface doar David, cu `npm run ext:zip`, ca ultim pas înainte de push.
- Deploy-ul îl face doar Alexandru, din CLI: proiectul Vercel nu e legat de GitHub. Orice `VITE_*` nou cere rebuild.
- Commiturile merg pe stilul existent: `Spire: ...`, în română.

## Global Constraints

- UI în română, fără liniuțe sau formule de tip „nu X, ci Y” în texte.
- Cheile AI rămân pe server; în browser ajung doar `VITE_SUPABASE_URL` și `VITE_SUPABASE_ANON_KEY`.
- Fără furnizori, endpointuri sau pagini noi. Fără extragerea mărcii din site.
- `?din=extensie` rămâne panou îngust, fără fundal și fără header.
- Testele obișnuite rulează fără Supabase (`playwright.config.ts` golește variabilele); nu schimbați asta.

## Review Focus

1. **Revii în tab cu un formular nesalvat:** editezi marca, schimbi tabul, revii. Valoarea scrisă rămâne (Task 3).
2. **Supabase nu răspunde în panou:** apare o eroare vizibilă. Kitul nu se face pe marca de exemplu fără să știi (Task 3).
3. **Dublu clic pe „Deschide în Spire”:** o singură campanie, un singur tab (Task 5).
4. **Salvarea eșuează după ce tabul s-a deschis:** tabul gol se închide, iar panoul arată eroarea și poți reîncerca (Task 5).
5. **Pornești din critică, fără scanare:** campania salvată are ca sursă pagina din brief, nu `null` (Task 5).

---

### Task 1: Integrarea ramurilor (Alexandru)

**Files:** `src/pages/spire/NewCampaignPage.tsx`, `docs/superpowers/plans/2026-11-07-extensie-aplicatie.md`

**Interfaces:** Produces: `main` cu lucrul ambilor. Tot restul planului pornește de aici.

- [ ] **Step 1:** Pe `ui-spatiu-de-lucru`, adaugă acest plan în commit, apoi `git fetch origin && git merge origin/main`. Conflict așteptat doar în `NewCampaignPage.tsx`.
- [ ] **Step 2: Rezolvă cele trei conflicte.** Importuri: reunirea celor două părți (`Button, Card, ErrorNote, Spinner`, fără `PageHeader`; plus `critiqueWithAi`, `reducedMotion`, `pendingReference`, `CritiqueBrief`, `briefQuestions`, `fillBriefGaps`, `briefSeed`). JSX: păstrează `CampaignWorkspace` și cardul „Brief-ul tău” din `origin/main`, urmate de `ReferenceDrop`.
- [ ] **Step 3:** Schimbă `showPicker` în `!anatomy && !busy && (!embedded || !!brief)`. Altfel panoul nu mai oferă alegerea referinței după critică.
- [ ] **Step 4:** Rulează `npm run check`. Așteptat: trece. Dacă pică un test al lui David din cauza stilului nou, repară selectorul, nu testul de comportament.
- [ ] **Step 5:** `git checkout main && git merge --ff-only origin/main && git merge ui-spatiu-de-lucru && git push origin main`. Anunță-l pe David.

### Task 2: Supabase în producție (Alexandru)

**Files:**
- Create: `supabase/records.sql`
- Modify: `src/lib/store.ts:2` (comentariul trimite la README, unde SQL-ul lipsește)
- Modify: `.env.local` (necomis)

**Interfaces:** Produces: tabela `records(id, collection, data, created_at)`, pe care `supabaseBackend()` o folosește deja.

- [ ] **Step 1: Scrie `supabase/records.sql`.**

```sql
create table if not exists records (
  id uuid primary key default gen_random_uuid(),
  collection text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists records_collection_created on records (collection, created_at);
alter table records enable row level security;
-- Demo fără login: oricine are aplicația citește și scrie. Nu punem date personale aici.
create policy "demo_all" on records for all to anon using (true) with check (true);
```

- [ ] **Step 2:** Contul nu are niciun proiect Supabase. Creează unul în UE, pe planul gratuit, și aplică SQL-ul.
- [ ] **Step 3:** Setează `VITE_SUPABASE_URL` și `VITE_SUPABASE_ANON_KEY` în Vercel (production) și în `.env.local`.
- [ ] **Step 4:** Local, `npm run dev`: fă o campanie din `/nou` și salveaz-o. Verifică în Supabase că rândul există și notează mărimea: `select pg_column_size(data) from records where collection = 'spire:campanii' order by created_at desc limit 1`. Dacă salvarea pică din cauza mărimii, redu referința cu `toDataUrl` la salvare și anunță-l pe David.
- [ ] **Step 5:** Commit și push.

### Task 3: Datele se reîncarcă la revenirea în tab (Alexandru)

**Files:**
- Modify: `src/lib/store.ts:178-184`, `src/pages/spire/BrandPage.tsx:47`, `src/pages/spire/parts.tsx:11-14`
- Test: `tests/store.test.ts`, `e2e/spire.spec.ts`

**Interfaces:** Produces: `reloadWhenBack(target: Pick<EventTarget, "addEventListener" | "removeEventListener">, reload: () => void): () => void` și `useBrandState(): { brand: Brand; loading: boolean; error: string | null }`. `useBrand()` rămâne.

- [ ] **Step 1: Scrie testul care pică.**

```ts
test("reloadWhenBack reîncarcă la focus și se oprește după dezabonare", () => {
  const target = new EventTarget();
  let calls = 0;
  const stop = reloadWhenBack(target, () => calls++);
  target.dispatchEvent(new Event("focus"));
  expect(calls).toBe(1);
  stop();
  target.dispatchEvent(new Event("focus"));
  expect(calls).toBe(1);
});
```

- [ ] **Step 2:** `npx vitest run tests/store.test.ts`. Așteptat: FAIL, funcția nu există.
- [ ] **Step 3:** Implementează `reloadWhenBack` și apeleaz-o în `useCollection`, doar dacă `window` există. Rulează din nou: PASS.
- [ ] **Step 4: Testul e2e pentru Review Focus 1.** `marca: revenirea în tab nu șterge ce ai scris`: pe `/marca` completează numele, apelează `window.dispatchEvent(new Event("focus"))`, așteaptă 300 ms, iar câmpul păstrează valoarea. Dacă pică, efectul de la `BrandPage.tsx:47` umple formularul doar la prima încărcare.
- [ ] **Step 5: Review Focus 2.** Adaugă `useBrandState` în `parts.tsx`. Spune-i lui David numele: el îl folosește în `NewCampaignPage`, cu `ErrorNote` la `error`.
- [ ] **Step 6:** `npm run check`, commit, push.

### Task 4: Coada de materiale iese din panou (David)

**Files:**
- Create: `src/pages/spire/CritiqueNotes.tsx`
- Delete: `src/pages/spire/CampaignWorkspace.tsx`, `src/lib/campaignQueue.ts`, `tests/campaignQueue.test.ts`, `public/samples/spire/demo-videos/`
- Modify: `src/pages/spire/NewCampaignPage.tsx`, `chrome-extension/README.md`, `e2e/spire.spec.ts`

**Interfaces:** Consumes: `CritiqueBrief` din `src/lib/extensionBridge.ts`. Produces: `CritiqueNotes({ brief }: { brief: CritiqueBrief })`, doar pentru citit. `critique.mode === "mock"` arată „Analiză simulată”.

- [ ] **Step 1: Înlocuiește testele.** Șterge testele sidebar din `e2e/spire.spec.ts` (coadă, Marina Park). Adaugă `panou: brief-ul din critică ajunge în kit`: în `?din=extensie` trimite `spire:brief` cu `product: 'Cazare'` și un `critique` cu un rând, apoi `spire:reference`. Așteptat: se văd „Ce aș modifica” și rândul, nu există buton „Pregătește video”, iar kitul apare cu `check-text` și `Cazare` în răspunsuri.
- [ ] **Step 2:** `npx playwright test --project=spire -g "brief-ul din critică"`. Așteptat: FAIL.
- [ ] **Step 3:** Mută lista „Ce aș modifica” din `CampaignWorkspace` în `CritiqueNotes`, montează componenta în locul lui `CampaignWorkspace` și șterge ce e la „Delete”. Păstrează cardul „Brief-ul tău”. Importurile rămase le arată `npm run typecheck`.
- [ ] **Step 4:** Folosește `useBrandState` din Task 3 și arată `ErrorNote` la eroare.
- [ ] **Step 5:** `npm run check`, commit, push.

### Task 5: „Deschide în Spire” (David)

**Files:** Modify `src/pages/spire/NewCampaignPage.tsx`; Test `e2e/spire.spec.ts`

**Interfaces:** Consumes: `saveCampaign(campaigns, data): Promise<Rec<Campaign>>`. Produces: în panou, butonul principal „Deschide în Spire”, în locul perechii „Salvează” și „Deschide în Campanii”.

- [ ] **Step 1: Scrie testele.** În `?din=extensie`, după kit:
  - `panou: butonul salvează și deschide campania`: clicul deschide o pagină nouă cu URL `/campanii/<id>`.
  - `panou: dublu clic face o singură campanie`: două clicuri rapide, un singur tab și un singur rând nou.
  - `panou: salvarea eșuată închide tabul`: cu scrierea forțată să pice, tabul nou se închide, eroarea e vizibilă, iar butonul poate fi apăsat din nou.
  - `panou: campania păstrează sursa din brief`: fără `spire:page`, cu brief, `source.url` e cel din brief.
- [ ] **Step 2:** Rulează-le. Așteptat: FAIL.
- [ ] **Step 3:** Pe clic: `window.open("about:blank", "_blank")` sincron, ca să nu fie blocat de browser, apoi `save()`, apoi `tab.location.href = "/campanii/<id>"` cu URL absolut. La eroare, `tab.close()`. Butonul e dezactivat cât rulează. În `save()`: `source: page.current ? {...} : brief ? brief.source : null`. Dacă `window.open` întoarce `null`, arată un link către campanie după salvare.
- [ ] **Step 4:** Rulează testele: PASS. `npm run check`, commit, push.

### Task 6: Meniul uliului (David)

**Files:** Modify `chrome-extension/content.js:541-543`, `chrome-extension/README.md`; Test `e2e/extension.spec.ts`

**Interfaces:** Produces: meniul cu „Ia stilul de aici” (principal, deschide panoul și decuparea) și „Uită-te la pagina mea” (critica existentă).

- [ ] **Step 1: Actualizează testul e2e.** `meniu: două intrări`: butoanele există cu aceste nume, iar „Ia stilul de aici” deschide panoul cu decuparea activă.
- [ ] **Step 2:** Rulează `npx playwright test --project=extension -g "două intrări"`. Așteptat: FAIL.
- [ ] **Step 3:** Schimbă meniul. Nota „Trimite la AI o captură…” rămâne sub „Uită-te la pagina mea”. Primul pas după critică rămâne „Continuă cu o campanie”.
- [ ] **Step 4:** Rulează: PASS. La final `npm run ext:zip`. Verifică: `unzip -p public/spire-extensie.zip config.js | grep APP_URL` arată `https://spire-coral.vercel.app`.
- [ ] **Step 5:** `npm run check`, commit, push.

### Task 7: Acasă și proba de producție (Alexandru)

**Files:**
- Create: `e2e/productie.spec.ts`
- Modify: `playwright.config.ts`, `package.json`, `src/pages/spire/AcasaPage.tsx`, `AGENTS.md`

**Interfaces:** Produces: `npm run e2e:prod`. Proiectul `productie` nu intră în `npm run check`, fiindcă folosește AI real și scrie în baza de date.

- [ ] **Step 1:** Pe Acasă, sub zona de tras o imagine, adaugă linkul secundar „Instalează extensia”, cu aceeași sursă ca pe landing (`src/lib/extensionInstall.ts`). Actualizează testul e2e al paginii.
- [ ] **Step 2: Scrie proba.** Proiect `productie` cu `channel: "chrome"` și `launchOptions.args: ["--disable-features=Translate"]`. Argumentul înlocuiește lista Playwright, deci partiționarea e pornită. Trei teste, cu site-gazdă simulat prin `page.route` și iframe spre `/nou?din=extensie`:
  - `marca schimbată în tab se vede în panou`;
  - `campania făcută în panou se deschide în tab` (nu apare „Campania nu mai există”);
  - `campania apare în /campanii`.
  Fiecare test își șterge rândurile la final.
- [ ] **Step 3:** Rulează-o pe versiunea veche, fără Supabase: `BASE_URL=https://spire-coral.vercel.app npm run e2e:prod`. Așteptat: FAIL. Asta dovedește că proba vede problema.
- [ ] **Step 4:** Actualizează secțiunea de arhitectură din `AGENTS.md` (`store.ts`, rolurile extensiei și ale aplicației, fără coadă). Commit, push.

### Task 8: Deploy și repetiție (amândoi)

- [ ] **Step 1 (Alexandru):** Din `main` curat: `git archive HEAD | tar -x -C <folder gol>`, apoi `vercel deploy --prod`.
- [ ] **Step 2 (Alexandru):** `BASE_URL=https://spire-coral.vercel.app npm run e2e:prod`. Așteptat: PASS.
- [ ] **Step 3 (Alexandru):** Resetează datele din `?dev=1` și deschide o dată aplicația, ca seed-ul să se scrie o singură dată înainte să o folosească altcineva.
- [ ] **Step 4 (David):** Instalează extensia din zip, într-un profil Chrome curat. Rulează drumul filmat: uliu → „Uită-te la pagina mea” → „Continuă cu o campanie” → decupare pe o referință licențiată → întrebări → kit cu bife → „Deschide în Spire” → retuș și PNG.
- [ ] **Step 5 (David):** Repetă pe un domeniu nepregătit. Dacă site-ul blochează iframe-ul prin CSP, notează-l și filmează pe altul.
- [ ] **Step 6 (amândoi):** Fiecare spune fără foaie o propoziție: ce face Spire. Stabiliți una singură, puneți-o în `docs/PITCH.md`, împreună cu povestea partiționării în partea de arhitectură.
- [ ] **Step 7:** Înregistrați drumul o dată ca rezervă, pentru cazul în care AI-ul sau un site pică la filmare.
- [ ] **Step 8:** Treceți în `docs/BRIEF.md`, la jurnal, decizia și criteriile mutate: 6 Demo, 8 Integrări, 9 Fiabilitate.

## Ce rămâne pentru după hackathon

Extragerea mărcii din site, generarea video cu un furnizor, storyboard-ul, conturile și login-ul, garda pe materiale generate individual.
