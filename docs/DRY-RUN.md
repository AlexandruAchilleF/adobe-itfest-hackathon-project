# Test: un proiect complet construit din template

**Ce am testat:** tema aleasă la întâmplare a fost „Rethink Reading: documente și cunoaștere”. Ca testul să fie mai greu, nu am refolosit exemplul existent (licitațiile), ci am luat altă problemă din `docs/PROBLEME.md`: **profesorul care transformă o lecție din manual într-o fișă de lucru adaptată** pentru elevii cu dificultăți de citire.

**Rezultat:** proiectul e pe ramura `dry-run` (`src/pages/FisaPage.tsx`, ~170 de linii). Fluxul merge cap-coadă în modul demo: lecția (PDF) → structura → fișa (rezumat simplificat, vocabular, întrebări) → editare de către profesor → fiecare răspuns e căutat în lecție (✓ / ✗) → tipărire sau PDF. Din template s-au refolosit fără modificări `parsePdf`, `documentContext`, `sectionsOf`, `verifyCitations`, `ask()` și mock-ul.

## Ce a lipsit și s-a reparat în template

| Problemă găsită | Reparație (acum pe `main`) |
|---|---|
| Scriptul pentru PDF-uri exemplu avea conținutul scris în cod, deci nu se putea face un document nou | `node scripts/make-sample-pdf.mjs samples-src/fisierul-vostru.html` transformă orice HTML în PDF |
| La tipărire apăreau meniul, butoanele și titlul paginii | meniul și antetul paginii au `print:hidden`, iar fundalul devine alb la tipărire |
| Câmpurile pe un singur rând tăiau textul lung, care se pierdea la tipărire | `<EditableText>`: text editabil care crește pe mai multe rânduri și se tipărește ca text normal |

## Ce NU a putut fi testat

- **Calitatea AI-ului real.** În mediul de test nu există nicio cheie API, deci toate răspunsurile au fost simulate. Primul lucru de făcut cu o cheie Gemini: rulați rețetele pe documente reale (un caiet de sarcini din SEAP, o lecție din manuale.edu.ro) și notați unde greșește.
- **Timpul real al unei echipe.** Codul l-a scris un asistent AI, deci nu spune cât durează pentru voi. Repetiția din `docs/PLAN-12H.md` (4 ore, cronometrat) măsoară asta.
- **Deploy-ul pe Vercel și folosirea de pe telefon.**
