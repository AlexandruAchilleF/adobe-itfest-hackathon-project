// Pregătirea filmării: campania „Marina Park · Descoperă spiritul Vamii”, salvată în Supabase cu id fix.
//   node scripts/demo-seed.mjs            o pune sau o readuce la starea aprobată (idempotent)
//   node scripts/demo-seed.mjs --remove   o șterge
// Afișul și clipul sunt fișierele echipei, neatinse. Peste afiș stă un singur strat editabil: blocul cu adresa și
// telefonul, ca garda să aibă ce verifica. Bifele nu sunt scrise de mână: le calculează garda aplicației.
import { pathToFileURL } from "node:url";
import { createServer, loadEnv } from "vite";

export const CAMPAIGN_ID = "5d1f0a7e-3c52-4b8e-9a61-0d3c7e5a2b10";
export const PHONE = "0723 690 941";
const POSTER = "/samples/spire/demo-videos/afis-marina-park.png";
const REFERENCE = "/samples/spire/marina-park/referinta-camping.png";
const CLIP = { url: "/samples/spire/demo-videos/marina-park.mp4", poster: "/samples/spire/demo-videos/marina-park.webp" };
const WIDTH = 1080;
const HEIGHT = 1620;
// Cel mai aproape de fundalul afișului (#1C1510) care rămâne în paleta mărcii (ΔE ≤ 12 față de #1B2A1F).
const PANEL = "#1C1F17";
const CREAM = "#F6F1E4";

const env = loadEnv("production", process.cwd(), "VITE_SUPABASE");
const rest = `${env.VITE_SUPABASE_URL}/rest/v1/records`;
const headers = { apikey: env.VITE_SUPABASE_ANON_KEY, authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`, "content-type": "application/json" };

function text(id, x, y, width, value) {
  return { type: "text", id, x, y, width, text: value, fontSize: 25, fill: CREAM, fontWeight: "bold", align: "left", fontFamily: "Geist" };
}

function buildCampaign({ guardCampaign, Campaign, marinaParkBrand }) {
  const copy = { address: "STR. NICHITA STĂNESCU NR. 10", place: "VAMA VECHE ·", cta: PHONE };
  const answers = { product: "Marina Park, camping și motel în Vama Veche", cta: PHONE, formats: ["post"] };
  const design = {
    title: "Marina Park",
    width: WIDTH,
    height: HEIGHT,
    background: "#1B2A1F",
    elements: [
      { type: "image", id: "poster", x: 0, y: 0, width: WIDTH, height: HEIGHT, src: POSTER },
      { type: "rect", id: "footer", x: 284, y: 1488, width: 424, height: 90, fill: PANEL, radius: 0 },
      text("address", 294, 1496, 410, copy.address),
      text("place", 294, 1536, 180, copy.place),
      text("cta", 470, 1536, 230, copy.cta),
    ],
  };
  const designs = { post: design };
  return Campaign.parse({
    title: "Marina Park · Descoperă spiritul Vamii",
    source: { url: "https://www.google.com/search?tbm=isch&q=camping+poster", title: "camping poster – Căutare Google" },
    reference: REFERENCE,
    anatomy: {
      kind: "image",
      width: 552,
      height: 834,
      zones: [
        { id: "headline", role: "headline", box: { x: 0.1, y: 0.04, w: 0.8, h: 0.13 }, maxChars: 24 },
        { id: "photo", role: "photo", box: { x: 0, y: 0.17, w: 1, h: 0.45 }, maxChars: 0 },
        { id: "address", role: "body", box: { x: 0.27, y: 0.91, w: 0.4, h: 0.03 }, maxChars: 40 },
        { id: "place", role: "body", box: { x: 0.27, y: 0.94, w: 0.17, h: 0.03 }, maxChars: 20 },
        { id: "cta", role: "cta", box: { x: 0.44, y: 0.94, w: 0.23, h: 0.03 }, maxChars: 20 },
        { id: "logo", role: "logo", box: { x: 0.8, y: 0.88, w: 0.16, h: 0.09 }, maxChars: 0 },
      ],
      colors: { background: "#2A2118", primary: "#6B7F3A", accent: "#E8C25A", text: "#F4EFE0", source: "pixeli" },
      illustration: null,
      why: ["Titlul de mână dă afișului o voce personală.", "Fotografia mare arată locul dintr-o privire.", "Trei polaroiduri spun ce găsești acolo."],
      suggestions: { cta: [PHONE], product: ["Camping în Vama Veche"] },
    },
    answers,
    copy,
    illustration: POSTER,
    designs,
    hero: null,
    video: CLIP,
    checks: guardCampaign({ designs, brand: marinaParkBrand, answers, copy }),
    // momentul filmării: galeria e ordonată după dată, iar campania abia făcută e prima
    createdAt: new Date().toISOString(),
  });
}

async function loadAppModules() {
  const vite = await createServer({ configFile: false, logLevel: "error", appType: "custom", server: { middlewareMode: true }, optimizeDeps: { noDiscovery: true } });
  try {
    const { guardCampaign, Campaign } = await vite.ssrLoadModule("/src/lib/campaigns.ts");
    const { marinaParkBrand } = await vite.ssrLoadModule("/src/lib/brand.ts");
    return { guardCampaign, Campaign, marinaParkBrand };
  } finally {
    await vite.close();
  }
}

export async function seedCampaign() {
  const campaign = buildCampaign(await loadAppModules());
  const failed = campaign.checks.filter((c) => !c.ok);
  if (failed.length) throw new Error(`Campania de filmare nu trece de gardă: ${failed.map((c) => c.message).join("; ")}`);
  const res = await fetch(`${rest}?on_conflict=id`, {
    method: "POST",
    headers: { ...headers, prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: CAMPAIGN_ID, collection: "spire:campanii", data: campaign }),
  });
  if (!res.ok) throw new Error(`Supabase a răspuns ${res.status}: ${await res.text()}`);
  return campaign;
}

export async function removeCampaign() {
  const res = await fetch(`${rest}?id=eq.${CAMPAIGN_ID}`, { method: "DELETE", headers });
  if (!res.ok) throw new Error(`Supabase a răspuns ${res.status}: ${await res.text()}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes("--remove")) {
    await removeCampaign();
    console.log(`Campania ${CAMPAIGN_ID} a fost ștearsă.`);
  } else {
    const campaign = await seedCampaign();
    console.log(`Campania ${CAMPAIGN_ID} e salvată: ${campaign.checks.length} verificări trec.`);
  }
  process.exit(0);
}
