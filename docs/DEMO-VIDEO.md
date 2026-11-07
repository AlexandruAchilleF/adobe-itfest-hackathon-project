# Video-ul demo: Marina Park, filmat cu Playwright

Stare: filmat și montat pe 7 noiembrie, **cu AI simulat (mock)**, 2:15, cu extensia la viteza ei, pagina randată de browser la scara 1,25 și uliul de 1,6 ori mai mare doar în copia filmării, în `public/pitch/demo.mp4`. Gemini era supraîncărcat (trei încercări, 502), așa că echipa a ales mock-ul; pe ecran scrie „Analiză simulată”, iar brief-ul din film are produsul „Vremea in Vama Veche”. Critica vine din commitul lui David (`76260fc`), iar varianta pentru Marina Park e CSS pregătit de echipă. Reperele: `docs/demo/repere.md`. Scenariul inițial: `docs/PROMPT-DEMO-VIDEO.md`; față de el, filmul n-are zoom și are 2:15 în loc de 1:20, fiindcă echipa a păstrat clipul întreg, de 40 s, și animațiile uliului la viteză reală. Se filmează cu `DEMO_VARIANT=viteza-reala DEMO_SCALE=1.25 DEMO_BIRD_SCALE=1.6`; fără variabilă, ies filmul accelerat și reperele lui. Pentru o filmare cu Gemini: `npm run demo:film`, apoi `npm run demo:cut`, când modelele răspund.

## Povestea, într-o frază

Proprietarul campingului Marina Park are un site și n-are designer. Pornește Spire pe site, critica găsește problemele paginii, iar omul cere rezolvarea și vede pagina refăcută. Apoi Spire scanează pagina și extrage contextul, iar omul cere din extensie un clip. Pe Google găsește un afiș care îi place, îl selectează cu Inspire și primește afișul pe marca lui. La final, le găsește pe amândouă în campanii, în dashboard.

Drumul: **site → critică → aplicarea ajustărilor → scanare → video din extensie → Google → Inspire → afișul → dashboard.**

Întrebările mutate (`docs/JURIU.md`): **1 Omul** (un business real), **4 Diferența** (Spire găsește problemele și arată rezolvarea pe pagina ta), **6 Demo-ul** (un singur drum, cap-coadă), **7 Brief-ul** („analizează, decid și execută”).

## Formatul

**Un singur video, 2:15**, pentru slide-ul 8 din deck (`public/pitch/demo.mp4`), fără sunet și fără subtitrări: echipa vorbește peste el, live.

## Regulile filmării

- **Pe site și pe pagina de căutare rulează extensia reală**, încărcată dintr-o copie temporară. În pachetul public nu ajunge nimic din modul de filmare.
- **Critica rulează pe marinapark.ro live, dar în filmul actual e simulată (mock), iar pe ecran scrie asta.** Ajustările aplicate sunt varianta CSS aleasă de echipă pentru Marina Park, fără scor pe ecran.
- **Doar în copia de filmare:** uliul intră de pe marginea ecranului și pleacă după 250 ms, nu după 4–8 s, descărcarea clipului e încetinită ca bara să se vadă, iar întrebările de brief din balon sunt ascunse cu un stil. Toate sunt notate în `docs/demo/demo-run.json`.
- **Rezultatele pregătite pornesc doar cu un semnal pus de filmare.** Fără el, aplicația și extensia se poartă ca înainte.
- **Dacă pică ceva, refacem rularea întreagă.** Nu lipim bucăți din rulări diferite.
- **Filmul actual nu accelerează nimic.** În varianta accelerată, așteptările au etichetă: scriptul notează timpii reali, iar montajul pune ×N din acele cifre.
- **Referința e a altcuiva** (șablon Envato, cu filigran): spunem „stilul unui afiș găsit” și păstrăm doar așezarea.
- Fără `?dev=1`, fără chei vizibile, fără notificări.

## Decis

1. **marinapark.ro live**, fără copie locală.
2. **Critica deschide filmul:** uliul zboară între zone, apoi „Aplică ajustările” arată pagina înainte și după.
3. **Clipul din repo se cere din panoul extensiei** și apare acolo, apoi în dashboard.
4. **Inspire, pe pagina de căutare, duce la afișul echipei.**
5. **Totul se regăsește pe `/campanii`.**
6. **Fără scena gărzii în film.** Verificările se văd pe pagina campaniei, iar garda rămâne în pitch, pe slide-ul 7.
7. **Fără subtitrări și fără sunet.** Ecranul stă pe loc cât se spune fraza.
8. **Cursor virtual** care mișcă mouse-ul real al paginii, cu animații în stratul de regie.

Asset-uri: `public/samples/spire/marina-park/` (`logo.png`, `cautare-google.png`, `referinta-camping.png`) și `public/samples/spire/demo-videos/` (`afis-marina-park.png`, `marina-park.mp4`).
