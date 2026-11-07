# Spire: critica pe pagină (design scurt)

Data: 7 noiembrie 2026. Cerut de Omul A (extensia). Validat pe prototipul din browser (`zbor-prototip-v3`).

## Ce și de ce

Uliul Spire trăiește pe pagină, nu într-un panou: se plimbă peste orice site (mai ales site-ul omului). La „Critică pagina” zboară pe rând pe elementele cu probleme, se așază pe fiecare și spune, în limbaj obișnuit, ce e greșit și ce să facă. Balonul are un titlu și un remediu scurt, fără explicații repetate. Relevanța pentru căutarea cu AI se integrează doar la recomandarea privind datele structurate; nu are o secțiune separată.

- Pentru cine: omul de marketing, fără designer și fără programator la îndemână.
- Merge pe orice site: fără dependență de aplicația din iframe; panoul campaniei rămâne, dar se deschide din meniul uliului.
- Juriul: întrebarea 9 (fiabilitatea: verificări deterministe, testate) și 6 (demo-ul: uliul care zboară pe site-ul juriului). AI-ul pentru formulări și judecăți de design vine după, prin aplicație (nu e în acest pas).

## Ce vede omul

1. Clic pe iconița extensiei: uliul apare pe pagină și se plimbă (zboară pe curbe, se înclină, bate din aripi, planează, aterizează pe margini de elemente cu aripile strânse, respiră, clipește).
2. Clic pe uliu: un meniu mic: „Critică pagina”, „Fă o campanie” (deschide panoul existent), „Închide”.
3. „Critică pagina”: uliul se uită cu lupa, apoi zboară pe rând pe elemente. Pe fiecare: aterizează (aripile se strâng, nu mai bate din aripi), se uită cu lupa, se gândește, apoi balonul: cât contează („Important”, „De îmbunătățit”, „Mărunt”), titlul și un remediu scurt. Fără paragraf separat de explicații sau secțiune despre AI; beneficiul pentru căutarea cu AI apare doar când este relevant, în recomandarea pentru date structurate. „Următorul” sau trecere automată. La final: câte lucruri și cu ce să înceapă.
4. Ton: fără termeni tehnici (fără coduri de culoare, rapoarte de contrast, nume de etichete HTML). Cifrele rămân în date (pentru verificări și pentru un rezumat ulterior), nu în balon.

## Construcția (decizii)

- **Desenul**: un singur desen, `MascotFigure.tsx`, primește poza „așezat” (aripile strânse, din prototip) și o clasă pe aripi pentru bătaie. Un script generează din el `chrome-extension/mascot-poses.js` (fișier generat, versionat); un test verifică că e la zi. Extensia rămâne fără build la încărcare.
- **Regulile criticii**: logică pură în `src/lib/critique.ts`, testată; împachetată ca IIFE în `chrome-extension/critique.js` (generat, versionat, test de prospețime). `content.js` doar adună faptele din pagină și desenează.
- **Robustețe pe orice site**: stilurile prin `adoptedStyleSheets` în shadow root (nu sunt blocate de CSP-ul paginii); uliul nu depinde de iframe (care poate fi blocat de `frame-src`); limite la citire (cel mult 200 de elemente analizate, cel mult 8 critici); nimic din pagină ajuns în HTML fără escape (balonul se construiește cu `textContent`).
- Permisiunile rămân `activeTab`, `scripting`, `sidePanel`.

## Ce nu facem acum

AI pentru formulări sau ierarhie vizuală, rezumatul pentru juriu cu cifre, salvarea criticii în `/campanii`.
