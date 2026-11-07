// Service worker (clasic). La clic pe iconiță injectează Spire în fila activă și, la cererea
// stratului din pagină, fotografiază ce se vede în filă (pentru decupaj).
importScripts("config.js");

// Injectează configurarea și scriptul din pagină.
async function injectSpire(tabId) {
  try {
    // O pagină poate păstra content script-ul vechi după actualizarea extensiei.
    // Reîncărcarea elimină și stilurile vechi înainte să injectăm noua versiune.
    const [state] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (build) => {
        const root = document.getElementById("spire-root");
        return Boolean(root && root.dataset.spireBuild !== build);
      },
      args: [SPIRE_CONFIG.BUILD],
    });
    if (state?.result) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { chrome.tabs.onUpdated.removeListener(updated); reject(new Error("Pagina nu s-a reîncărcat la timp.")); }, 30000);
        function updated(id, change) {
          if (id === tabId && change.status === "complete") {
            clearTimeout(timer); chrome.tabs.onUpdated.removeListener(updated); resolve();
          }
        }
        chrome.tabs.onUpdated.addListener(updated);
        chrome.tabs.reload(tabId).catch((error) => { clearTimeout(timer); chrome.tabs.onUpdated.removeListener(updated); reject(error); });
      });
    }
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["config.js", "mascot-poses.js", "critique.js", "inspire.js", "content.js"],
    });
    return true;
  } catch (e) {
    // Pe pagini chrome://, Chrome Web Store sau PDF-uri injectarea nu e permisă.
    console.warn("Spire: nu pot rula pe această pagină.", e && e.message ? e.message : e);
    return false;
  }
}

globalThis.injectSpire = injectSpire;

chrome.action.onClicked.addListener((tab) => {
  if (tab && tab.id != null) injectSpire(tab.id);
});

// Captura: tot ce se vede în fila activă a ferestrei, JPEG. Merge cu activeTab, acordat la clicul
// pe iconiță (până când fila navighează în altă parte). Chrome permite cel mult 2 capturi pe
// secundă; dacă am depășit, mai încercăm o singură dată, după o pauză (fără buclă).
const CAPTURE_RETRY_MS = 600;

function captureOnce(windowId) {
  return chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 85 });
}

async function capture(windowId) {
  try {
    return { ok: true, image: await captureOnce(windowId) };
  } catch (e) {
    const error = e && e.message ? e.message : String(e);
    if (!/MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND/.test(error)) return { ok: false, error };
    await new Promise((resolve) => setTimeout(resolve, CAPTURE_RETRY_MS));
    try {
      return { ok: true, image: await captureOnce(windowId) };
    } catch (e2) {
      return { ok: false, error: e2 && e2.message ? e2.message : String(e2) };
    }
  }
}

// Observațiile AI ale criticii. Fetch-ul stă aici, nu în pagină: din pagină ar fi supus CORS-ului
// site-ului. Chrome oprește service worker-ul dacă un fetch depășește 30 s, deci renunțăm înainte.
// Serverul primește un termen puțin mai scurt, ca să împartă timpul între Gemini și modelul de rezervă
// și să răspundă cu o eroare clară înainte să renunțe extensia.
const AI_TIMEOUT_MS = 28000;
const AI_SERVER_BUDGET_MS = 26000;
const AI_IMAGE_WIDTH = 1280;

async function shrinkImage(dataUrl) {
  const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const scale = Math.min(1, AI_IMAGE_WIDTH / bitmap.width);
  const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const bytes = new Uint8Array(await (await canvas.convertToBlob({ type: "image/jpeg", quality: 0.75 })).arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(binary);
}

async function askCritique(request, image) {
  try {
    const attachment = { mimeType: "image/jpeg", data: await shrinkImage(image) };
    const res = await fetch(SPIRE_CONFIG.APP_URL + "/api/ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: request.prompt, schema: request.schema, mock: request.mock, attachments: [attachment], timeoutMs: AI_SERVER_BUDGET_MS }),
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, status: res.status, error: (body && body.error) || "HTTP " + res.status };
    return { ok: true, data: body && body.data, model: body && body.model };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

// Doar mesajele extensiei noastre (content.js), venite dintr-o filă. Paginile web nu pot trimite aici
// (manifestul nu are externally_connectable), dar verificăm oricum expeditorul.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !sender.tab) return false;
  if (!message || (message.type !== "capture" && message.type !== "critique-ai" && message.type !== "inspire-ai")) return false;
  // Doar cadrul principal al filei (content.js nu rulează în iframe-uri).
  if (sender.frameId !== 0) {
    sendResponse({ ok: false, error: "Captura se cere doar din pagina principală." });
    return false;
  }
  if (message.type === "critique-ai" || message.type === "inspire-ai") {
    askCritique(message.request, message.image).then(sendResponse);
    return true;
  }
  capture(sender.tab.windowId).then(sendResponse);
  return true; // răspunsul vine asincron
});
