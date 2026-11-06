# Sistemul vizual

Inspirat din deskfirst.com (capturi de pe telefon, 6 noiembrie 2026). Am luat principiile, nu imaginile lor: ilustrațiile, logo-ul și textele sunt ale lor. Tokenurile stau în `src/index.css`, iar componentele în `src/components/ui.tsx`.

## Cele 9 elemente

| # | Elementul | Cum îl folosiți |
|---|---|---|
| 1 | **Hârtie caldă, cerneală bleumarin, un singur accent coral** | `bg-paper`, `text-ink`, `text-coral`. Fără gradienți mov-albastru și fără dark mode. |
| 2 | **Titluri în două voci** | sans strâns (Inter Tight, `-0.035em`) + un cuvânt-cheie în serif coral (Fraunces): `<Accent text="Banii pe bonuri, *în zile.*" />`, sau `*…*` în `PageHeader title`. Un singur accent pe titlu. |
| 3 | **Butoane cu treaptă** | `<Button variant="primary">` (coral, margine închisă jos), `secondary` (crem, text coral), `danger` (alb, contur coral). Fără butoane-gradient și fără glow. |
| 4 | **Panglica gravată** deasupra secțiunilor | `<Ribbon>Cronometrul</Ribbon>` sau `PageHeader eyebrow="…"`. Una pe secțiune, cel mult două-trei cuvinte. |
| 5 | **Etichete pe roluri** | `<Tag tone={i}>Manager</Tag>`: lila, salvie, coral, muștar. Aceeași culoare pentru același rol peste tot. |
| 6 | **Meniu-capsulă plutitor** | `src/App.tsx`: alb, rotunjit 26px, inel pal; pe telefon devine meniu „hamburger”. |
| 7 | **Carduri moi cu passe-partout** | `.card` / `<Card>`: alb, rotunjit 26px, linie caldă și un inel alb în jur. `label` dă eticheta mică muștar („CUM AI SPUNE-O”). |
| 8 | **Fluxul de semnale** | rânduri albe: punct de stare (`StatusDot`), titlu îngroșat, etichetă colorată (`StatusPill`), „acum 2 h” la dreapta. |
| 9 | **Caseta de prompt** | `.prompt-box` + `<ArrowButton>`: crem, bordură coral, săgeată rotundă. Doar unde omul scrie pentru AI. |

Plus: fraza tăiată de pe prima pagină (`app.notThis`), cerul (`.sky`) doar pe prima pagină și pe paginile de telefon, iar mascota e personajul mărcii, ca „wingman”-ul lor. Culoarea mascotei e cea din config (`mascot.color`), dintr-o paletă apropiată de coral sau bleumarin.

## Ce nu folosim (semne de site „vibe-coded”)

- emoji ca icoane în butoane, carduri sau liste. Folosiți puncte de culoare (culoarea categoriei sau a stării) sau text;
- dark mode cu accent neon sau chihlimbar, sticlă (`backdrop-blur` peste conținut), umbre colorate, gradienți pe text;
- `font-mono` pentru cifre. Folosiți `tabular-nums`;
- mai mult de un cuvânt accentuat pe titlu și mai mult de o panglică pe secțiune.

## Cod vechi

Paginile scrise înainte folosesc `slate-*`. Scala e remapată în `src/index.css` (950 = hârtia, 900 = cardul, 800/700 = liniile, 400 = textul secundar, 100 = cerneala), deci arată corect fără rescriere. În cod nou folosiți tokenurile semantice: `paper`, `card`, `line`, `ink`, `ink-2`, `muted`, `coral`, `coral-deep`, `coral-tint`, `lilac`, `sage`, `mustard`.
