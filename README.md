# Spire

Ai văzut un design care îți place? Spire îl face pe marca ta.

Spire e un agent de marketing care apare peste orice site. Citește designul ales, pune câteva întrebări cu variante și reface materialul pe marca omului: mascota lui în același stil, culorile și textele lui. Codul verifică rezultatul, iar omul aprobă.

Proiect pentru ITFest × Adobe, 7 noiembrie 2026. Tema: „Marketing Reimagined”.

## Cum rulezi

```bash
npm install
cp .env.example .env   # fără chei merge cu răspunsuri simulate
npm run dev
```

Extensia de Chrome: `chrome-extension/README.md`.

## Unde găsești

| Ce | Unde |
|---|---|
| Spec-ul produsului | `docs/superpowers/specs/2026-11-07-spire-stil-pe-marca-design.md` |
| Brief-ul și deciziile | `docs/BRIEF.md` |
| Criteriile juriului | `docs/JURIU.md` |
| Demo-ul și pitch-ul | `docs/DEMO.md`, `docs/PITCH.md` |
| Sistemul vizual | `docs/DESIGN.md` |
| Add-on-ul Adobe Express (netestat) | `adobe-express-addon/`, `express-addon/`, `docs/ADOBE-SETUP.md` |

## Comenzi

| Comandă | Ce face |
|---|---|
| `npm run dev` | aplicația și `/api`, local |
| `npm run build` | verificare de tipuri și build de producție |
| `npm test` | teste unitare |
| `npm run e2e` | teste în browser |
| `npm run check` | toate |

## Construit înainte și construit azi

Am pornit de la un schelet pregătit de noi pentru hackathoane: `ask()` cu schemă și răspuns simulat, stocarea, sincronizarea live, pânza Fabric, mascota, deck-ul. Tot ce e Spire (motorul din `src/lib/`, paginile din `src/pages/spire/`, extensia) s-a scris pe 7 noiembrie: `git log --since=2026-11-07`.
