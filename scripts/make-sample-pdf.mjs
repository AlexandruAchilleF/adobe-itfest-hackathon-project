// Generează PDF-ul exemplu (fictiv) folosit de rețeta „Documente" și de teste.
// Rulează: node scripts/make-sample-pdf.mjs   (folosește Chromium din Playwright)
import { chromium } from "@playwright/test";

const html = `<!doctype html><html lang="ro"><head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; margin: 0; color: #111; }
  h1 { font-size: 22pt; margin: 0 0 4pt; }
  h2 { font-size: 16pt; margin: 18pt 0 6pt; }
  h3 { font-size: 13pt; margin: 12pt 0 4pt; }
  .sub { font-size: 10pt; color: #555; margin-bottom: 16pt; }
  .page { page-break-after: always; }
</style></head><body>
<div class="page">
  <h1>Regulamentul Asociației de Proprietari Bloc A7</h1>
  <p class="sub">Document fictiv, creat ca exemplu pentru template-ul de hackathon.</p>
  <h2>1. Dispoziții generale</h2>
  <p>Prezentul regulament se aplică tuturor proprietarilor și chiriașilor din blocul A7, scările A și B.</p>
  <p>Comitetul executiv se alege de adunarea generală pe o perioadă de doi ani.</p>
  <h2>2. Cota de întreținere</h2>
  <h3>2.1 Termenul de plată</h3>
  <p>Întreținerea se plătește până în data de 20 a lunii următoare celei pentru care s-a emis lista.</p>
  <p>Plata se poate face în numerar la casierie, marțea între orele 17 și 19, sau prin transfer bancar.</p>
  <h3>2.2 Penalități</h3>
  <p>Pentru întârzierea plății se aplică penalități de 0,2% pe zi, fără a depăși valoarea sumei datorate.</p>
</div>
<div class="page">
  <h2>3. Spațiile comune</h2>
  <h3>3.1 Curățenia</h3>
  <p>Curățenia pe scări se face de firma contractată în fiecare marți și vineri.</p>
  <p>Bicicletele și cărucioarele nu se depozitează pe holuri, ci în boxa de la parter.</p>
  <h3>3.2 Liniștea</h3>
  <p>Între orele 22 și 8 este interzisă orice activitate care produce zgomot.</p>
  <h2>4. Obligațiile proprietarilor noi</h2>
  <p>Proprietarii noi declară numărul de persoane din apartament în termen de 10 zile de la mutare.</p>
  <p>La predarea cheilor, noul proprietar primește codul interfonului și programul casieriei.</p>
</div>
<div>
  <h2>5. Reparații și avarii</h2>
  <h3>5.1 Întreruperea apei</h3>
  <p>Oprirea apei calde pentru reparații programate se anunță la avizier cu cel puțin 48 de ore înainte.</p>
  <h3>5.2 Avarii</h3>
  <p>Avariile se anunță imediat administratorului la numărul 0722 000 099, disponibil non-stop.</p>
  <h2>6. Adunarea generală</h2>
  <p>Adunarea generală se convoacă cel puțin o dată pe an, în primul trimestru.</p>
</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html);
await page.pdf({ path: new URL("../public/samples/regulament-asociatie.pdf", import.meta.url).pathname, format: "A4", margin: { top: "20mm", bottom: "20mm", left: "20mm", right: "20mm" } });
await browser.close();
console.log("PDF exemplu generat în public/samples/regulament-asociatie.pdf");
