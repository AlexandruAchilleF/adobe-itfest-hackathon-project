// Stratul Spire din pagină. Injectat de background.js după config.js (la clic pe iconiță).
// Desenează doar chenarele de scanare (A2) și, mai târziu, decupajul (A3). Spire (uliul),
// balonul și întrebările sunt aplicația din iframe: un singur desen, aceleași stări.
// Script clasic, fără build. Singura urmă globală: marcajul __spireInjected.
(function () {
  var ROOT_ID = "spire-root";

  // A doua injectare (încă un clic pe iconiță): nu dublăm stratul, doar îl ascundem sau îl arătăm.
  // Ne uităm după gazdă în DOM, nu doar după marcaj: dacă pagina (ex. o aplicație SPA) a șters
  // stratul, îl punem din nou.
  var existing = document.getElementById(ROOT_ID);
  if (existing) {
    var hidden = existing.style.getPropertyValue("display") === "none";
    existing.style.setProperty("display", hidden ? "block" : "none", "important");
    return;
  }
  globalThis.__spireInjected = true;

  var config = globalThis.SPIRE_CONFIG;
  if (!config || !config.APP_URL) {
    console.warn("Spire: lipsește configurarea (config.js nu a rulat înainte).");
    return;
  }

  // Gazda: izolată de stilurile paginii (all: initial), fixă peste toată fereastra, dar
  // transparentă la clicuri; doar panoul primește clicuri. Inline și cu !important, ca regulile
  // paginii (ex. „div { … }”) să nu o atingă.
  var host = document.createElement("div");
  host.id = ROOT_ID;
  var hostStyle = {
    all: "initial",
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    "z-index": "2147483647",
    "pointer-events": "none",
    display: "block",
  };
  Object.keys(hostStyle).forEach(function (prop) {
    host.style.setProperty(prop, hostStyle[prop], "important");
  });

  var shadow = host.attachShadow({ mode: "open" });

  var css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = chrome.runtime.getURL("overlay.css");
  shadow.appendChild(css);

  // Stratul pentru chenarele de scanare (A2) și decupaj (A3). Nu prinde clicuri.
  var boxes = document.createElement("div");
  boxes.className = "spire-boxes";
  shadow.appendChild(boxes);

  // Panoul din dreapta: aplicația Spire într-un iframe.
  var panel = document.createElement("div");
  panel.className = "spire-panel";

  var close = document.createElement("button");
  close.type = "button";
  close.className = "spire-close";
  close.textContent = "Închide Spire";
  close.addEventListener("click", function () {
    host.style.setProperty("display", "none", "important");
  });
  panel.appendChild(close);

  var iframe = document.createElement("iframe");
  iframe.className = "spire-frame";
  iframe.title = "Spire";
  iframe.src = config.APP_URL + "/nou?din=extensie";
  iframe.allow = "clipboard-write";
  panel.appendChild(iframe);

  shadow.appendChild(panel);
  (document.body || document.documentElement).appendChild(host);

  // Mesajele de la aplicație. Acceptăm doar din iframe-ul nostru și de pe originea aplicației.
  // Deocamdată doar scheletul; scanarea (A2) și decupajul (A3) se leagă aici.
  window.addEventListener("message", function (event) {
    if (event.origin !== config.APP_ORIGIN) return;
    if (event.source !== iframe.contentWindow) return;
    var data = event.data;
    if (!data || typeof data !== "object" || typeof data.type !== "string") return;
    // A2/A3: tratarea mesajelor (ex. data.type === "spire:scan").
  });
})();
