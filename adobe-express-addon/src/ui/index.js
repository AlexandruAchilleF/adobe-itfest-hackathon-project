import addOnUISdk from "https://express.adobe.com/static/add-on-sdk/sdk.js";

// URL-ul aplicației din template (local sau deploy-ul de pe Vercel).
const API_BASE = "http://localhost:5173";

const DESIGN_SCHEMA_URL = new URL("./design-schema.json", import.meta.url);

// Design folosit când aplicația rulează fără cheie AI (provider „mock"),
// ca să puteți testa add-on-ul cap-coadă înainte de a avea chei.
function mockDesign(brief) {
  const words = brief.split(/\s+/).filter(Boolean);
  return {
    title: words.slice(0, 4).join(" ") || "Titlu",
    width: 1080,
    height: 1350,
    background: "#0b1020",
    elements: [
      { type: "rect", id: "card", x: 86, y: 86, width: 908, height: 1178, fill: "#16213e", radius: 40 },
      { type: "circle", id: "sun", x: 870, y: 260, radius: 130, fill: "#f5a524" },
      { type: "text", id: "title", x: 140, y: 420, width: 800, text: words.slice(0, 4).join(" ") || "Titlu", fontSize: 88, fill: "#f8fafc", fontWeight: "bold", align: "left" },
      { type: "line", id: "rule", x1: 140, y1: 820, x2: 480, y2: 820, stroke: "#f5a524", strokeWidth: 10 },
      { type: "text", id: "body", x: 140, y: 880, width: 800, text: words.slice(4).join(" ").slice(0, 140), fontSize: 40, fill: "#cbd5e1", fontWeight: "normal", align: "left" },
    ],
  };
}

addOnUISdk.ready.then(async () => {
  const sandboxProxy = await addOnUISdk.instance.runtime.apiProxy("documentSandbox");
  const button = document.getElementById("generate");
  const status = document.getElementById("status");
  button.disabled = false;

  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = "Generez…";
    try {
      const schema = await (await fetch(DESIGN_SCHEMA_URL)).json();
      const res = await fetch(`${API_BASE}/api/ai`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          system:
            "Ești designer grafic. Generezi un layout pe o pânză de 1080x1350px. Toate elementele încap în pânză, ierarhie clară, contrast WCAG AA.",
          prompt: `Creează un design pentru: ${document.getElementById("brief").value}`,
          schema,
          mock: mockDesign(document.getElementById("brief").value),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      if (!body.data || !Array.isArray(body.data.elements)) throw new Error("Răspunsul AI nu conține un design.");
      await sandboxProxy.drawDesign(body.data);
      status.textContent = `Gata (${body.provider}, ${body.ms} ms). Totul e editabil.`;
    } catch (err) {
      status.textContent = `Eroare: ${err.message}`;
    } finally {
      button.disabled = false;
    }
  });
});
