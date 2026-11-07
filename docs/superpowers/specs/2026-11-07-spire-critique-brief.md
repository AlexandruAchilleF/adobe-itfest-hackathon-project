# Spire: observații → propuneri → brief memorat

Cerințe aprobate direct de utilizator: observații succinte, mai generale și diverse; nu repeta aceeași problemă pe cinci butoane identice; în tur evidențiază problema, fără instrucțiuni pentru utilizator. La final, Spire spune ce ar modifica el și pune întrebări relevante, memorate pentru o campanie ulterioară.

## Flux
- Tur: gravitate, titlu, o observație scurtă. Fără „Ce faci” sau secțiune AI. AI apare în text doar dacă este relevant pentru căutare (date structurate).
- Cel mult 5 observații; cel mult una pe regulă și fără repetarea aceleiași familii de elemente identice. Acordă loc problemelor paginii (titlu, structură, descoperire), păstrând prima problemă importantă pe element. Nu pretinde audit complet dintr-o citire plafonată.
- Final: „Aș modifica…” și cel mult 3 propuneri concrete, la condițional, legate de constatările reale. Nu modifică site-ul.
- Urmează 3 întrebări scurte: produs/serviciu, public, obiectiv. Dacă observațiile implică acțiuni neclare, întreabă și ce acțiune să conțină butonul. Fără prețuri sau reduceri inventate.
- Răspunsurile cunoscute sunt precompletate și editabile. „Păstrează răspunsurile” salvează explicit în chrome.storage.local, separat pe origină; starea confirmă doar după succes. Erorile de salvare sunt vizibile; există „Uită răspunsurile”. Nu folosi localStorage al site-ului gazdă.
- „Continuă cu o campanie” deschide panoul existent și transferă brief-ul numai spre originea configurată, după handshake. Aplicația validează contractul, arată răspunsurile editabile și le folosește în generare/salvare. Nu suprascrie câmpurile editate la o retrimitere a aceluiași brief.
- product/cta se mapează pe Answers existent; audience/goal se adaugă opțional în Answers și schema campaniei și în promptul writeCopy. Analiza referinței nu trebuie să șteargă aceste răspunsuri. „Fă campania” rămâne explicit.

## Interfețe
- Brief: { source: { url, title }, answers: { product?, audience?, goal?, cta? } }. Fiecare răspuns maximum 500 caractere, URL HTTP(S), titlu maximum 300.
- App → extensie: spire:brief-ready. Extensia verifică event.source===iframe.contentWindow și event.origin===APP_ORIGIN, apoi trimite spire:brief cu brief-ul curent. iframe încărcat/reîncărcat primește brief-ul; nicio scanare automată.
- Memory: permisiune storage, fără host_permissions noi. Cheie per location.origin. Datele aparțin extensiei, nu site-ului.
- Întrebările se construiesc determinist din constatări și contextul paginii. Nu adăugăm un al doilea endpoint AI.

## Dovezi
Teste pure: deduplicare, diversitate/limite, propoziții observaționale, propuneri la condițional. Teste browser: SVG real vizibil, observații concise, rezumat+întrebări, salvare/reîncărcare/uitare, transfer după readiness cu origine verificată, date editabile folosite în campanie și păstrate după analiză. Păstrează CSP, scanare, captură și decupaj.

Juriu: întrebarea 6 se vede în demo la trecerea din critica site-ului în brief; întrebarea 9 se vede în verificarea persistenței și a transferului validat. Nu transformăm observațiile deterministe în judecăți AI de design.

## Actualizare cerută: critică AI rapidă
- AI-ul face critica largă a paginii, într-un singur apel prin ask() și endpointul existent /api/ai. Engine-ul, furnizorii și cheile sunt responsabilitatea colegului; nu adăugăm endpoint sau configurare de provider.
- Promptul clientului comprimă criteriile skill-ului critique: claritatea scopului/ofertei, ierarhie, navigare, acțiune principală, lizibilitate și consistență. Maximum 5 observații scurte, distincte și ancorate în elementele citite. Propunerile rămân la condițional, numai în recapitulare.
- O captură curată a primului ecran poate însoți faptele. Fără captură, modelul nu inventează judecăți vizuale sau măsurători. Datele paginii sunt delimitate ca input neîncredere.
- Iframe-ul aplicației poate fi încărcat ascuns pentru apelul AI, fără a deschide panoul campaniei. Request/result se corelează cu un ID și se verifică originea și fereastra. La întrerupere, rezultatele vechi se ignoră.
- Un apel, timeout de aproximativ 10 secunde, fără bucle de reîncercare. Codul rămâne verificare măsurabilă și rezervă în caz de eroare/CSP/API indisponibil; rezerva se etichetează explicit. Provider mock înseamnă „Analiză simulată”, nu dovadă de AI real.
- Fără cheie în această sesiune, conform cererii utilizatorului. Validarea clientului folosește mock și rezultate controlate, fără a pretinde validare pe un furnizor live.

## Actualizare cerută: sidebar și coadă de materiale
- După întrebări, „Continuă cu o campanie” deschide sidebar-ul existent. Acesta primește constatările, propunerile și răspunsurile, nu doar patru câmpuri de brief.
- În sidebar: lista detaliată „Ce aș modifica”, descrierea utilizatorului, „Mai clarificăm” și acțiuni distincte pentru imagine, logo și videoclip. Constatările nu se aplică singure pe site.
- Materialele au o coadă vizibilă cu stare și rezultat/eroare. Fiecare cerere folosește un snapshot din critică, răspunsuri, descriere și clarificări. Rezultatele simulate sunt marcate explicit.
- Păstrează draftul și coada local prin mecanismul store existent. Erorile de persistență/generare sunt vizibile; nu declara material gata înainte de rezultat valid.
- Imaginile și logo-ul folosesc /api/image. Conform clarificării utilizatorului, video-ul este un clip de demo pregătit anterior, mapat explicit pe site. Marina Park folosește clipul local din portofoliul Exedria. Domeniile necunoscute primesc indisponibilitate; nu prezentăm un storyboard sau clipul pregătit ca generare AI live.

## Recomandări pentru căutările cu AI
Secțiunea dedicată din sidebar primește maximum trei propuneri din același apel AI: căutare relevantă, ce ar schimba Spire, dovadă observată sau „De verificat”. Conținutul util, prețurile/stocurile reale și datele structurate potrivite pot sprijini descoperirea; nu garantăm indexarea sau poziția. robots.txt și accesul crawlerelor nu au fost testate din citirea DOM și sunt marcate de verificat. Referințe: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide ; https://developers.google.com/search/docs/appearance/structured-data/product ; https://developers.openai.com/api/docs/bots .
