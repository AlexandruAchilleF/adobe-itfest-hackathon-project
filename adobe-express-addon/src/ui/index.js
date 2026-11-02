import addOnUISdk from "https://express.adobe.com/static/add-on-sdk/sdk.js";

// URL-ul aplicației din template (local sau deploy-ul de pe Vercel).
const API_BASE = "http://localhost:5173";

const DESIGN_SCHEMA_URL = new URL("./design-schema.json", import.meta.url);

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
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      await sandboxProxy.drawDesign(body.data);
      status.textContent = `Gata (${body.provider}, ${body.ms} ms). Totul e editabil.`;
    } catch (err) {
      status.textContent = `Eroare: ${err.message}`;
    } finally {
      button.disabled = false;
    }
  });
});
