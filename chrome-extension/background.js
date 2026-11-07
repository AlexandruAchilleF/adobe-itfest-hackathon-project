// Service worker (clasic). La clic pe iconiță injectează Spire în fila activă și, la cererea
// stratului din pagină, fotografiază ce se vede în filă (pentru decupaj).
importScripts("config.js");

// Injectează configurarea și scriptul din pagină.
async function injectSpire(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["config.js", "mascot-poses.js", "critique.js", "content.js"],
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

// Doar mesajele extensiei noastre (content.js), venite dintr-o filă. Paginile web nu pot trimite aici
// (manifestul nu are externally_connectable), dar verificăm oricum expeditorul.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !sender.tab) return false;
  if (!message || message.type !== "capture") return false;
  // Doar cadrul principal al filei (content.js nu rulează în iframe-uri).
  if (sender.frameId !== 0) {
    sendResponse({ ok: false, error: "Captura se cere doar din pagina principală." });
    return false;
  }
  capture(sender.tab.windowId).then(sendResponse);
  return true; // răspunsul vine asincron
});
