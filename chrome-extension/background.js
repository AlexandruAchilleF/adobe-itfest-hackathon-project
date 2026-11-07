// Service worker (clasic). La clic pe iconiță injectează Spire în fila activă.
importScripts("config.js");

// Injectează configurarea și scriptul din pagină. Captura vine în A3.
async function injectSpire(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["config.js", "content.js"],
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
