# Promptul de start (ziua hackathonului)

Promptul pentru o sesiune Claude Code nouă care copiază template-ul într-un repo nou de proiect și îl adaptează la brief.

**Înainte:**

1. Creați pe GitHub un repo **gol** pentru proiect (fără README, fără `.gitignore`), de exemplu `itfest-2026`.
2. Porniți o sesiune Claude Code nouă pe acel repo. Pe claude.ai/code, adăugați la sesiune și repo-ul template-ului, ca să-l poată clona.
3. Lipiți promptul de mai jos și înlocuiți ce e între `[...]`.

```text
Azi e hackathonul ITFest × Adobe (12 ore). Lucrăm în repo-ul ăsta nou, care acum e gol. Vreau să pornim proiectul din template-ul nostru și să-l adaptăm la brief-ul de mai jos.

## 1. Copiază template-ul (fără să-i modifici repo-ul)
- Template: https://github.com/AlexandruAchilleF/hackathon-template-adobe (branch `main`).
- Adu tot conținutul lui în repo-ul ăsta, cu istoricul păstrat: `git remote add template <url>`, `git fetch template`, `git merge template/main` (sau `git reset --hard template/main` dacă repo-ul e complet gol). Apoi scoate remote-ul `template` și împinge pe `main`.
- `npm install`, apoi `npm run check`. Trebuie să treacă înainte să schimbi ceva. Dacă ceva pică, spune-mi exact ce.
- Nu face deploy încă; îl facem noi după ce merge local.

## 2. Citește regulile proiectului
Citește întâi `AGENTS.md`, `docs/PLAN-12H.md`, `docs/JURIU.md`, `docs/BRIEF.md`, `docs/AMBALARE.md`, `docs/DESIGN.md`. Respectă-le întocmai (UI în română, fără emoji ca icoane, AI-ul propune și omul confirmă, verificări deterministe lângă AI, fiecare `ask()` cu `mock`).

## 3. Brief-ul Adobe (textul exact)
[LIPIȚI AICI BRIEF-UL, CUVÂNT CU CUVÂNT]

## 4. Ce vreau de la tine, în ordinea asta
1. Completează `docs/BRIEF.md`: brief-ul exact, tabelul de cerințe (fiecare propoziție care cere ceva și fiecare „you can include…” pe un rând) și piesa din template care acoperă fiecare cerință (tabelul din `docs/PLAN-12H.md`). Ce nu acoperă nicio piesă, listează separat: acolo e munca zilei.
2. Spune-mi forma brief-ului: „flux de cereri între oameni” (pornim dintr-un scenariu: `resurse`, `sesizari`, `deconturi`, `interne`, `vecini`) sau „input haotic → rezultat editabil” (pornim din `/design` sau `/docs`).
3. Propune 3 idei, fiecare trecută prin cele 7 întrebări din `docs/JURIU.md` (notă 1–5 la fiecare) și prin cele 3 filtre din `docs/BRIEF.md`. Recomandă una. NU scrie cod până nu aleg eu ideea.
4. După ce aleg: copiază scenariul cel mai apropiat în `src/scenario/scenarios/<nume>.ts`, fă-l activ în `src/scenario/config.ts` și schimbă tot după `docs/AMBALARE.md`, secțiunea 1 (id, app, business, roles, flow, categories, documents, features, mascot, seed cu locuri reale din București). Folosește cuvintele din brief pentru roluri și pași. Cifrele din `business.evidence` le las goale: le aducem noi de la interviuri, nu le inventa.
5. `npm run check` trebuie să treacă, iar pe `/start` să scrie „✓ Config-ul trece verificările”. `tests/urme.test.ts` nu are voie să găsească nimic din scenariul vechi.
6. Completează `PITCH` din `src/pitch/deck.ts` cu ce știm (cerințele din brief → unde se văd în demo); lasă goale echipa și cifrele.

## Reguli pentru toată ziua
- Un singur flux complet, nu mai multe începute. Adaptează modulele existente înainte să scrii module noi.
- La fiecare funcționalitate propusă, spune ce întrebare din `docs/JURIU.md` mută și în ce secundă din demo se vede. Ce nu mută nimic rămâne pentru „după hackathon”.
- Commit-uri mici și dese, cu mesaje în română, pe `main` (vrem istoricul de azi vizibil în `git log --since="2026-11-07"`).
- Ține la zi în `README.md` secțiunea „Construit înainte / construit azi”.
- Dacă ceva din brief e ambiguu, întreabă-mă, nu ghici.

Începe cu pasul 1 și spune-mi când `npm run check` trece.
```

## De ce e scris așa

- **Pasul 3 cere idei, nu cod.** Ideea o alegeți voi, după interviuri. ResourceMe a câștigat în 2023 cu unghiul și cu bucla închisă, nu cu funcționalitățile.
- **Cifrele rămân goale** până le aduceți de la oameni reali. Asistentul nu le inventează.
- **Commit-urile pe `main`** și secțiunea „Construit înainte / construit azi” vă acoperă dacă juriul întreabă ce ați scris azi.
- **Fără deploy în prompt:** îl faceți voi, după ce merge local, cu cheile AI în setările Vercel (`GEMINI_API_KEY` sau `ANTHROPIC_API_KEY`, apoi `VITE_ADOBE_PDF_CLIENT_ID`). Testați imediat o poză reală de pe telefon: pe mock, pozele sunt ignorate.
