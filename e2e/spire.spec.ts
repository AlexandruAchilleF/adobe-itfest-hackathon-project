import { existsSync, statSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { MAX_CRITIQUES } from "../src/lib/critique";
import { critiqueStops } from "../src/lib/landingCritique";

const REFERENCE = "public/samples/spire/referinta.png";

/** Parcurge fluxul pe mock până la campania salvată. */
async function makeCampaign(page: Page) {
  await page.goto("/nou");
  await page.setInputFiles("input[type=file]", REFERENCE);
  await expect(page.getByText("Ce am văzut")).toBeVisible();
  await page.getByRole("button", { name: "Gelato" }).click();
  await page.getByRole("button", { name: "Fă campania" }).click();
  await expect(page.getByText("Prețul e cel din ofertă")).toBeVisible();
  await page.getByRole("button", { name: "Salvează campania" }).click();
  await expect(page).toHaveURL(/\/campanii\//);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
});

test("referință → întrebări → kit verificat → campanie salvată", async ({ page }) => {
  await makeCampaign(page);
  await page.goto("/campanii");
  await expect(page.getByRole("link", { name: /Gelato/ })).toBeVisible();
});

test("prețul schimbat de mână face bifa roșie", async ({ page }) => {
  await makeCampaign(page);
  await expect(page.getByTestId("check-price")).toContainText("trece");
  await page.getByLabel("Ofertă").fill("59 lei");
  await expect(page.getByTestId("check-price")).toContainText("nu trece");
  await expect(page.getByTestId("check-price")).toContainText("59 lei");
});

test("mutarea unui strat pe pânză păstrează fontul mărcii", async ({ page }) => {
  await makeCampaign(page);
  await expect(page.getByTestId("check-fonts")).not.toContainText("nu trece");
  await page.waitForTimeout(500);
  const box = (await page.locator(".upper-canvas").boundingBox())!;
  const x = box.x + box.width * 0.25;
  const y = box.y + box.height * 0.1;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 20, y + 10, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  await expect(page.getByTestId("check-fonts")).not.toContainText("nu trece");
});

test("exportul PNG descarcă designul", async ({ page }) => {
  await makeCampaign(page);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descarcă PNG" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
});

test("landing: critica și extensia apar după noapte, în ordinea poveștii", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#extensie")).toBeAttached();
  const order = await page.locator("main section").evaluateAll((all) => all.map((s) => s.querySelector("h1,h2")?.textContent ?? s.id));
  const at = (t: string) => order.findIndex((o) => o.includes(t));
  expect(at("Stilul altcuiva")).toBeLessThan(at("Ochi de uliu"));
  expect(at("Ochi de uliu")).toBeLessThan(at("Ce te inspiră"));
  expect(at("Ce te inspiră")).toBeLessThan(at("N-ai designer"));
  await expect(page.locator("#extensie")).toContainText("inSPIRE");
  await expect(page.locator("#critica")).toContainText("părere despre ierarhie și mesaj");
  await expect(page.locator("#critica")).toContainText(`cel mult ${MAX_CRITIQUES} observații`);
  await expect(page.locator("main")).not.toContainText("audit complet");
});

test("landing: linkul din meniu duce la extensie, iar butonul descarcă ZIP-ul", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Extensia" }).click();
  await expect(page).toHaveURL(/#extensie$/);
  await expect(page.locator("#extensie")).toBeInViewport();
  await expect(page.locator("#extensie")).toContainText("Developer mode");
  await expect(page.locator("main")).not.toContainText("Chrome Web Store");
  const download = page.waitForEvent("download");
  await page.locator("#extensie").getByRole("link", { name: "Descarcă extensia" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("spire-extensie.zip");
  const path = await file.path();
  expect(existsSync(path) && statSync(path).size).toBeGreaterThan(1000);
});

test("landing: macheta criticii afișează textele reale, unul după altul", async ({ page }) => {
  const stops = critiqueStops();
  await page.goto("/#critica");
  await page.locator("#critica .land-stage").scrollIntoViewIfNeeded();
  const balon = page.getByTestId("critica-balon");
  await expect(balon).toContainText(stops[0].critique.title, { timeout: 8000 });
  await expect(balon).toContainText("Important");
  await expect(balon).toContainText(stops[0].critique.fix);
  await expect(balon).toContainText(stops[1].critique.title, { timeout: 10000 });
  await expect(balon).toContainText("De îmbunătățit");
  await expect(page.locator("#critica .land-outline")).toHaveCount(1);
});

test("landing: cu mișcare redusă, critica arată toate observațiile, fără zbor", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const stop of critiqueStops()) await expect(page.locator("#critica").getByText(stop.critique.title)).toBeAttached();
  await expect(page.locator("#critica .land-outline")).toHaveCount(critiqueStops().length);
  await expect(page.getByTestId("critica-balon")).toHaveCount(0);
});

test("landing pe telefon: fără scroll orizontal, fără descărcare, cu link spre aplicație", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const section = page.locator("#extensie");
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByText("Extensia se instalează pe calculator, în Chrome")).toBeVisible();
  await expect(section.getByRole("link", { name: "Descarcă extensia" })).toBeHidden();
  await expect(section.getByText("Developer mode")).toBeHidden();
  await page.locator("#critica .land-stage").scrollIntoViewIfNeeded();
  await expect(page.locator("#critica").getByTestId("critica-text").filter({ hasText: critiqueStops()[0].critique.title })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBe(0);
  await section.getByRole("link", { name: "Încearcă Spire în browser" }).click();
  await expect(page).toHaveURL(/\/nou$/);
});

/** Aplicația într-un iframe, ca în extensie. */
async function embedded(page: Page) {
  const base = new URL(page.url()).origin;
  await page.setContent(`<iframe id="spire" src="${base}/nou?din=extensie" width="420" height="800"></iframe>`);
  const frame = page.frameLocator("#spire");
  await expect(frame.getByRole("img", { name: /Spire/ }).first()).toBeVisible();
  return frame;
}
const IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
async function reloadEmbedded(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => {
    const iframe = document.querySelector('#spire') as HTMLIFrameElement;
    const ready = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow || event.data?.type !== 'spire:brief-ready') return;
      window.removeEventListener('message', ready); resolve();
    };
    window.addEventListener('message', ready);
    iframe.contentWindow!.location.reload();
  }));
}

test("din extensie: mesajul cu referința deschide analiza", async ({ page }) => {
  const frame = await embedded(page);
  await page.evaluate((image) => {
    (document.querySelector("#spire") as HTMLIFrameElement).contentWindow!.postMessage({ type: "spire:reference", image, elementIds: [] }, "*");
  }, IMAGE);
  await expect(frame.getByText("Ce am văzut")).toBeVisible();
});

test("din extensie: mesajul spire:page primește spire:picks și un rezumat în balon", async ({ page }) => {
  const frame = await embedded(page);
  const picks = page.evaluate(
    () =>
      new Promise((resolve) => {
        window.addEventListener("message", (e) => e.data?.type === "spire:picks" && resolve(e.data.picks));
        const element = { id: "h", tag: "h1", text: "Reducere -20%", box: { x: 0, y: 0, w: 1400, h: 500 }, styles: { color: "#000", background: "#fff", fontFamily: "Arial", fontSize: "60px", fontWeight: "700" }, inFirstScreen: true };
        const page = { url: "https://exemplu.ro", title: "Exemplu", headings: ["Reducere -20%"], ctas: [], colors: ["#000000"], fonts: ["Arial"] };
        (document.querySelector("#spire") as HTMLIFrameElement).contentWindow!.postMessage({ type: "spire:page", page, elements: [element] }, "*");
      }),
  );
  expect(await picks).toMatchObject([{ elementId: "h", kind: "hero" }]);
  await expect(frame.getByText(/Am găsit 1/)).toBeVisible();
});

test("din extensie: mesajele care nu vin de la fereastra părinte sunt ignorate", async ({ page }) => {
  const frame = await embedded(page);
  await frame.locator("body").evaluate((_, image) => {
    window.postMessage({ type: "spire:reference", image, elementIds: [] }, "*");
  }, IMAGE);
  await page.waitForTimeout(800);
  await expect(frame.getByText("Ce am văzut")).toHaveCount(0);
});

test("marca se schimbă din formular și rămâne salvată", async ({ page }) => {
  await page.goto("/marca");
  await page.getByLabel("Numele mărcii").fill("Altă marcă");
  await page.getByRole("button", { name: "Salvează marca" }).click();
  await expect(page.getByText("Marca e salvată")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Numele mărcii")).toHaveValue("Altă marcă");
});

test("landing page-ul spune ce face Spire și duce la campania nouă", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Spire îl face pe marca ta.");
  // verdictul gărzii, calculat de cod pe campania de exemplu (macheta din secțiunea „Garda”)
  await expect(page.locator("#garda").getByText(/^\d+ din \d+ verificări trec$/)).toBeAttached();
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Încearcă acum" }).click();
  await expect(page).toHaveURL(/\/nou$/);
});

test("brief-ul rămâne editabil după analiză și intră în generare și salvare", async ({ page }) => {
  const prompts: string[] = [];
  page.on('request', request => {
    if (request.url().endsWith('/api/ai')) prompts.push(request.postData() ?? '');
  });
  const frame = await embedded(page);
  const brief = {source:{url:new URL(page.url()).origin+'/',title:'Cupe'},answers:{product:'Cană',audience:'Părinți',goal:'Comenzi',cta:'Comandă'}};
  await page.evaluate(brief => (document.querySelector('#spire') as HTMLIFrameElement).contentWindow!.postMessage({type:'spire:brief',brief}, '*'), brief);
  await expect(frame.getByRole('heading',{name:'Brief-ul tău'})).toBeVisible();
  const audience = frame.getByRole('textbox', {name:'Cui te adresezi? Scrie tu'});
  await expect(audience).toHaveValue('Părinți');
  await audience.fill('Profesori');
  await page.evaluate(brief => (document.querySelector('#spire') as HTMLIFrameElement).contentWindow!.postMessage({type:'spire:brief',brief}, '*'), brief);
  await expect(audience).toHaveValue('Profesori');
  await frame.getByRole('button',{name:'Folosește exemplul'}).click();
  await expect(frame.getByText('Ce am văzut')).toBeVisible();
  await expect(audience).toHaveValue('Profesori');
  await frame.getByRole('button',{name:'Fă campania',exact:true}).click();
  await expect(frame.getByRole('button',{name:'Salvează campania'})).toBeVisible();
  expect(prompts.some(prompt=>prompt.includes('Profesori') && prompt.includes('Comenzi'))).toBe(true);
  await frame.getByRole('button',{name:'Salvează campania'}).click();
  await expect(frame.getByRole('link',{name:'Deschide în Campanii'})).toBeVisible();
  const saved = await page.evaluate(()=>JSON.stringify(localStorage));
  expect(saved).toContain('Profesori');
  expect(saved).toContain('Comenzi');
});

test('panoul fără referrer primește brief doar de la originea gazdei declarate', async ({page}) => {
  const base=new URL(page.url()).origin;
  await page.setContent(`<iframe id="spire" referrerpolicy="no-referrer" src="${base}/nou?din=extensie&hostOrigin=${encodeURIComponent(base)}"></iframe>`);
  const frame=page.frameLocator('#spire');
  await expect(frame.getByRole('button',{name:'Scanează pagina'})).toBeVisible();
  const brief={source:{url:base+'/',title:'Fără referrer'},answers:{product:'Cană'}};
  await frame.locator('body').evaluate((_,brief)=>window.dispatchEvent(new MessageEvent('message',{source:window.parent,origin:'https://evil.test',data:{type:'spire:brief',brief}})),brief);
  await expect(frame.getByRole('heading',{name:'Brief-ul tău'})).toHaveCount(0);
  await page.evaluate(brief=>(document.querySelector('#spire') as HTMLIFrameElement).contentWindow!.postMessage({type:'spire:brief',brief},'*'),brief);
  await expect(frame.getByRole('heading',{name:'Brief-ul tău'})).toBeVisible();
});

test('aplicația răspunde o singură dată cu analiza AI mock pentru ID duplicat', async ({page}) => {
  let calls=0;
  page.on('request',r=>{if(r.url().endsWith('/api/ai')) calls++;});
  await embedded(page);
  const input={page:{url:new URL(page.url()).origin,title:'Cupe',lang:'ro',metaDescription:'',jsonLdTypes:[],h1Count:1,imagesWithoutAlt:0},elements:[],viewport:{w:1280,h:720}};
  const result=await page.evaluate(input=>new Promise<{mode:string}>(resolve=>{
    window.addEventListener('message',e=>{if(e.data?.type==='spire:critique-result') resolve(e.data.result);});
    const win=(document.querySelector('#spire') as HTMLIFrameElement).contentWindow!;
    win.postMessage({type:'spire:critique-request',requestId:'single',input},'*');
    win.postMessage({type:'spire:critique-request',requestId:'single',input},'*');
  }),input);
  expect(result.mode).toBe('mock');expect(calls).toBe(1);
});

test('sidebar: constatări, căutări AI, brief păstrat și materiale la cerere', async ({page}) => {
  const frame=await embedded(page);
  const brief={source:{url:new URL(page.url()).origin+'/',title:'Magazin'},answers:{product:'Cană'},critique:{mode:'mock',items:[{id:'c1',title:'Produs neclar',observation:'Titlul nu numește produsul.',proposal:'Aș numi cana în titlu.',elementId:null}],searchOptimization:[{title:'Context pentru căutare',query:'cană ceramică',proposal:'Aș explica materialul produsului.',status:'needs-check',evidence:''}]}};
  const send=()=>page.evaluate(brief=>(document.querySelector('#spire') as HTMLIFrameElement).contentWindow!.postMessage({type:'spire:brief',brief},'*'),brief);
  await send();
  const workspace=frame.getByTestId('campaign-workspace');
  await expect(workspace.getByText('Aș numi cana în titlu.')).toBeVisible();
  await expect(workspace.getByRole('heading',{name:'Vizibilitate în căutările cu AI'})).toBeVisible();
  await expect(workspace.getByText('De verificat',{exact:true})).toBeVisible();
  await expect(workspace.getByRole('button',{name:'Generează imagine'})).toBeDisabled();
  await workspace.getByLabel('Ce vrei să creăm?').fill('O imagine cu o cană pentru profesori');
  await workspace.getByRole('button',{name:'Păstrează brief-ul'}).click();
  await expect(workspace.getByRole('status')).toContainText('Păstrat în acest browser');
  await workspace.getByRole('button',{name:'Mai clarificăm'}).click();
  await expect(workspace.getByText('Întrebări simulate din contextul brief-ului')).toBeVisible();
  await expect(workspace.getByTestId('clarification-answer')).toHaveCount(1);
  await expect(workspace.getByRole('button',{name:'Răspunde',exact:true})).toBeDisabled();
  await expect(workspace.getByRole('button',{name:'Generează imagine'})).toBeDisabled();
  for(let i=0;i<3 && await workspace.getByTestId('clarification-answer').count();i++) {
    await workspace.getByTestId('clarification-answer').fill('Răspuns '+(i+1));
    await workspace.getByRole('button',{name:'Răspunde',exact:true}).click();
  }
  await expect(workspace.getByTestId('clarification-answer')).toHaveCount(0);
  await workspace.getByRole('button',{name:'Generează imagine'}).click();
  await expect(workspace.getByText('Rezultat simulat · fără generare de imagine')).toBeVisible();
  await workspace.getByRole('button',{name:'Pregătește video'}).click();
  await expect(workspace.getByText('Nu există încă un video de demo pentru acest site.')).toBeVisible();
  await reloadEmbedded(page);
  await expect(frame.getByRole('button',{name:'Scanează pagina'})).toBeVisible();
  await send();
  await expect(workspace.getByLabel('Ce vrei să creăm?')).toHaveValue('O imagine cu o cană pentru profesori');
  await expect(workspace.getByText('Rezultat simulat · fără generare de imagine')).toBeVisible();
  await reloadEmbedded(page);
  await expect(frame.getByRole('button',{name:'Scanează pagina'})).toBeVisible();
  brief.answers.product = 'Farfurie';
  await send();
  await expect(workspace.getByLabel('Produs sau serviciu',{exact:true})).toHaveValue('Farfurie');
  await expect(workspace.getByLabel('Ce vrei să creăm?')).toHaveValue('O imagine cu o cană pentru profesori');
});

test('sidebar: Marina Park redă clipul local cu proveniență de demo', async ({page}) => {
  const base = new URL(page.url()).origin;
  await page.setContent(`<iframe id="spire" src="${base}/nou?din=extensie&hostOrigin=${encodeURIComponent('https://www.marinapark.ro')}"></iframe>`);
  const frame = page.frameLocator('#spire');
  await expect(frame.getByRole('button',{name:'Scanează pagina'})).toBeVisible();
  await frame.locator('body').evaluate(() => window.dispatchEvent(new MessageEvent('message',{
    source: window.parent, origin: 'https://www.marinapark.ro', data: { type: 'spire:brief', brief: {
      source: {url:'https://www.marinapark.ro/',title:'Marina Park'}, answers: {product:'Cazare'},
    }},
  })));
  const workspace = frame.getByTestId('campaign-workspace');
  await workspace.getByLabel('Ce vrei să creăm?').fill('Un video de prezentare pentru Marina Park');
  await workspace.getByRole('button',{name:'Pregătește video'}).click();
  await expect(workspace.getByText('Video de demo · clip pregătit anterior')).toBeVisible();
  const video = workspace.locator('video');
  await expect(video).toHaveAttribute('src','/samples/spire/demo-videos/marina-park.mp4');
  await expect.poll(() => video.evaluate(el => (el as HTMLVideoElement).duration)).toBeGreaterThan(39);
  expect(await video.evaluate(el => (el as HTMLVideoElement).duration)).toBeLessThan(41);
});


test("scanarea completează brief-ul și păstrează ce a editat omul", async ({ page }) => {
  const frame = await embedded(page);
  const send = () => page.evaluate(() => {
    const element = { id: "h", tag: "h1", text: "Cazare pentru familii", box: { x: 0, y: 0, w: 1400, h: 500 }, styles: { color: "#000", background: "#fff", fontFamily: "Arial", fontSize: "60px", fontWeight: "700" }, inFirstScreen: true };
    const summary = { url: new URL(location.href).origin + "/", title: "Marina Park", headings: [element.text], ctas: [], colors: [], fonts: [] };
    (document.querySelector("#spire") as HTMLIFrameElement).contentWindow!.postMessage({ type: "spire:page", page: summary, elements: [element] }, "*");
  });
  await send();
  const product = frame.getByTestId("campaign-workspace").getByLabel("Produs sau serviciu");
  await expect(product).toHaveValue("Cazare pentru familii");
  await product.fill("Produs ales de om");
  await send();
  await expect(frame.getByText(/Am găsit 1/)).toBeVisible();
  await expect(product).toHaveValue("Produs ales de om");
});
