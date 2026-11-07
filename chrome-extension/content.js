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

  // ---------------------------------------------------------------------------------------------
  // Scanarea paginii (A2). Contractul: PageElement și PageSummary din src/lib/extensionBridge.ts.
  //
  // Coordonatele din `box` sunt ale viewport-ului (getBoundingClientRect), în pixeli CSS, la
  // momentul scanării: x/y = colțul stânga-sus față de fereastra vizibilă. Așa lucrează și
  // `inFirstScreen` (top < innerHeight) și regulile din campaign.ts (viewport: innerWidth ×
  // innerHeight). Chenarele nu folosesc aceste cifre: se repoziționează după elementul viu.
  //
  // Aici nu se alege nimic: regulile (hero, ofertă, mascotă, buton, insignă) stau doar în
  // campaign.ts, în aplicație. Extensia citește, trimite și desenează ce primește înapoi.
  // ---------------------------------------------------------------------------------------------
  var MAX_ELEMENTS = 200; // MAX_PAGE_ELEMENTS din extensionBridge.ts
  var MAX_CANDIDATES = 400; // de unde alegem cele 200, după prioritate
  var MAX_VISITED = 5000; // noduri parcurse, ca să nu citim stiluri pentru o pagină întreagă
  var MAX_TEXT = 200;
  var MAX_DATA_IMAGE = 200000; // caractere; o imagine data: mai mare nu încape în mesaj
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEMPLATE: 1, HEAD: 1, META: 1, LINK: 1, IFRAME: 1, OBJECT: 1, EMBED: 1 };
  var TOP_TAGS = { H1: 1, H2: 1, H3: 1, A: 1, BUTTON: 1, IMG: 1, svg: 1, SVG: 1 };
  var BLOCK_TAGS = { SECTION: 1, HEADER: 1, MAIN: 1, FOOTER: 1, ARTICLE: 1, ASIDE: 1, NAV: 1, DIV: 1, FIGURE: 1 };

  var elementsById = new Map(); // id → Element, pentru chenare și decupaj (A3)

  function normalize(text, max) {
    var t = String(text || "").replace(/\s+/g, " ").trim();
    return t.length > max ? t.slice(0, max) : t;
  }

  // Textul scurt scris direct în element (nu în copii), ex. o insignă „-20%”.
  function directText(el) {
    var t = "";
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) t += n.nodeValue;
    }
    return normalize(t, MAX_TEXT + 1);
  }

  function isVisible(el, rect) {
    if (!(rect.width > 0 && rect.height > 0)) return false;
    // checkVisibility vede și strămoșii (display: none, visibility, opacity: 0).
    if (typeof el.checkVisibility === "function") {
      if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    }
    var cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) return false;
    return cs;
  }

  function safeImageSrc(el) {
    var src = el.currentSrc || el.src || "";
    if (/^https?:/i.test(src)) return src;
    if (/^data:image\//i.test(src) && src.length <= MAX_DATA_IMAGE) return src;
    return null;
  }

  function safeHref(el) {
    var href = typeof el.href === "string" ? el.href : "";
    return /^https?:/i.test(href) ? href : null;
  }

  // Textul unui element: pentru imagini și svg, eticheta lor (alt, aria-label, <title>).
  function elementText(el, tag) {
    if (tag === "img") return normalize(el.getAttribute("alt"), MAX_TEXT);
    if (tag === "svg") {
      var label = el.getAttribute("aria-label");
      if (label) return normalize(label, MAX_TEXT);
    }
    return normalize(el.textContent, MAX_TEXT);
  }

  function scanPage() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var bigArea = vw * vh * 0.05;
    var candidates = [];
    var visited = 0;

    var walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_ELEMENT, {
      acceptNode: function (node) {
        if (node === host) return NodeFilter.FILTER_REJECT; // propriul strat, cu tot ce e în el
        if (SKIP_TAGS[node.tagName]) return NodeFilter.FILTER_REJECT;
        if (node.ownerSVGElement) return NodeFilter.FILTER_REJECT; // nu coborâm în svg
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    var node = walker.currentNode;
    while (node && visited < MAX_VISITED && candidates.length < MAX_CANDIDATES) {
      visited++;
      var el = node;
      node = walker.nextNode();

      var tagName = el.tagName;
      var priority = 0;
      var ownText = "";
      if (TOP_TAGS[tagName]) priority = 3;
      else {
        ownText = directText(el);
        if (ownText.length > 0 && ownText.length <= MAX_TEXT) priority = 1;
        else if (!BLOCK_TAGS[tagName]) continue;
      }

      var rect = el.getBoundingClientRect();
      if (!(rect.width > 0 && rect.height > 0)) continue;
      // Un bloc fără text propriu contează doar dacă e mare (o secțiune, un hero).
      if (priority === 0) {
        if (rect.width * rect.height < bigArea) continue;
        priority = 2;
      }
      var cs = isVisible(el, rect);
      if (!cs) continue;

      candidates.push({ el: el, rect: rect, cs: cs, priority: priority, order: candidates.length });
    }

    // Prioritatea: întâi tag-urile cu sens, apoi blocurile mari, apoi textele scurte; în primul ecran
    // înainte de restul. Apoi înapoi în ordinea din document, ca id-urile să urmeze pagina.
    var chosen = candidates
      .slice()
      .sort(function (a, b) {
        var fa = a.rect.top < vh ? 1 : 0;
        var fb = b.rect.top < vh ? 1 : 0;
        return b.priority - a.priority || fb - fa || a.order - b.order;
      })
      .slice(0, MAX_ELEMENTS)
      .sort(function (a, b) {
        return a.order - b.order;
      });

    elementsById = new Map();
    var elements = chosen.map(function (c, i) {
      var id = "el-" + i;
      elementsById.set(id, c.el);
      var tag = c.el.tagName.toLowerCase();
      var item = {
        id: id,
        tag: tag,
        text: elementText(c.el, tag),
        box: { x: c.rect.left, y: c.rect.top, w: c.rect.width, h: c.rect.height },
        styles: {
          color: c.cs.color,
          background: c.cs.backgroundColor,
          fontFamily: c.cs.fontFamily,
          fontSize: c.cs.fontSize,
          fontWeight: c.cs.fontWeight,
        },
        inFirstScreen: c.rect.top < vh,
      };
      // Cheile opționale lipsesc de tot când nu au valoare (nu undefined).
      if (tag === "img") {
        var src = safeImageSrc(c.el);
        if (src) item.imageSrc = src;
      }
      if (tag === "a") {
        var href = safeHref(c.el);
        if (href) item.href = href;
      }
      return item;
    });

    return { page: summarize(elements), elements: elements };
  }

  function isTransparent(color) {
    return !color || color === "transparent" || /^rgba\(.*,\s*0(\.0+)?\)$/.test(color);
  }

  // Cele mai folosite valori, în ordinea frecvenței (la egalitate, prima întâlnită).
  function topValues(values, max) {
    var counts = new Map();
    values.forEach(function (v) {
      if (v) counts.set(v, (counts.get(v) || 0) + 1);
    });
    return Array.from(counts.keys())
      .sort(function (a, b) {
        return counts.get(b) - counts.get(a);
      })
      .slice(0, max);
  }

  function distinct(values, max) {
    var out = [];
    values.forEach(function (v) {
      if (v && out.indexOf(v) === -1 && out.length < max) out.push(v);
    });
    return out;
  }

  function summarize(elements) {
    var colors = [];
    elements.forEach(function (e) {
      if (!isTransparent(e.styles.color)) colors.push(e.styles.color);
      if (!isTransparent(e.styles.background)) colors.push(e.styles.background);
    });
    return {
      url: location.href,
      title: normalize(document.title, MAX_TEXT),
      headings: distinct(
        elements
          .filter(function (e) {
            return e.tag === "h1" || e.tag === "h2" || e.tag === "h3";
          })
          .map(function (e) {
            return e.text;
          }),
        10,
      ),
      ctas: distinct(
        elements
          .filter(function (e) {
            return (e.tag === "a" || e.tag === "button") && e.text.length <= 40;
          })
          .map(function (e) {
            return e.text;
          }),
        10,
      ),
      colors: topValues(colors, 10),
      fonts: topValues(
        elements.map(function (e) {
          return e.styles.fontFamily;
        }),
        5,
      ),
    };
  }

  function sendPage() {
    var win = iframe.contentWindow;
    if (!win) return;
    clearBoxes(); // id-urile vechi nu mai înseamnă nimic după o scanare nouă
    var scan;
    try {
      scan = scanPage();
    } catch (e) {
      console.warn("Spire: nu am putut citi pagina.", e && e.message ? e.message : e);
      return;
    }
    // Doar spre originea aplicației: dacă iframe-ul a ajuns pe altă adresă, mesajul nu pleacă.
    win.postMessage({ type: "spire:page", page: scan.page, elements: scan.elements }, config.APP_ORIGIN);
  }

  // ---------------------------------------------------------------------------------------------
  // Chenarele (A2): elementele alese de aplicație (spire:picks), aprinse pe rând.
  // ---------------------------------------------------------------------------------------------
  var KIND_LABELS = { hero: "hero", offer: "ofertă", mascot: "mascotă", cta: "buton", badge: "insignă" };
  var MAX_PICKS = 10;
  var LIGHT_STEP_MS = 250;
  var drawn = []; // { el, box }
  var timers = [];
  var frameRequested = false;

  function clearBoxes() {
    timers.forEach(clearTimeout);
    timers = [];
    drawn = [];
    while (boxes.firstChild) boxes.removeChild(boxes.firstChild);
  }

  function placeBox(entry) {
    var r = entry.el.getBoundingClientRect();
    var hidden = !entry.el.isConnected || !(r.width > 0 && r.height > 0);
    entry.box.style.display = hidden ? "none" : "block";
    entry.box.style.left = r.left + "px";
    entry.box.style.top = r.top + "px";
    entry.box.style.width = r.width + "px";
    entry.box.style.height = r.height + "px";
  }

  function placeAll() {
    frameRequested = false;
    drawn.forEach(placeBox);
  }

  function schedulePlace() {
    if (frameRequested || drawn.length === 0) return;
    frameRequested = true;
    requestAnimationFrame(placeAll);
  }

  window.addEventListener("scroll", schedulePlace, { passive: true, capture: true });
  window.addEventListener("resize", schedulePlace, { passive: true });

  // Alegerile vin din aplicație, dar le verificăm oricum: listă, fel cunoscut, id din scanarea noastră.
  function validPicks(picks) {
    if (!Array.isArray(picks)) return [];
    var seen = {};
    var out = [];
    for (var i = 0; i < picks.length && out.length < MAX_PICKS; i++) {
      var p = picks[i];
      if (!p || typeof p !== "object") continue;
      if (typeof p.elementId !== "string" || typeof p.kind !== "string") continue;
      if (!Object.prototype.hasOwnProperty.call(KIND_LABELS, p.kind)) continue;
      var el = elementsById.get(p.elementId);
      if (!el || !el.isConnected) continue;
      var key = p.elementId + "|" + p.kind;
      if (seen[key]) continue;
      seen[key] = true;
      out.push({ el: el, kind: p.kind });
    }
    return out;
  }

  function drawPicks(picks) {
    var valid = validPicks(picks);
    if (valid.length === 0) return;
    clearBoxes();
    valid.forEach(function (pick, i) {
      var box = document.createElement("div");
      box.className = "spire-box";
      var label = document.createElement("span");
      label.className = "spire-box-label";
      label.textContent = KIND_LABELS[pick.kind]; // doar textContent, niciodată HTML
      box.appendChild(label);
      var entry = { el: pick.el, box: box };
      placeBox(entry);
      boxes.appendChild(box);
      drawn.push(entry);
      timers.push(
        setTimeout(function () {
          box.classList.add("spire-box-lit");
        }, i * LIGHT_STEP_MS),
      );
    });
  }

  // Scanăm când s-a încărcat aplicația din iframe (și la fiecare reîncărcare a ei).
  iframe.addEventListener("load", sendPage);

  // Mesajele de la aplicație. Acceptăm doar din iframe-ul nostru și de pe originea aplicației.
  window.addEventListener("message", function (event) {
    if (event.origin !== config.APP_ORIGIN) return;
    if (event.source !== iframe.contentWindow) return;
    var data = event.data;
    if (!data || typeof data !== "object" || typeof data.type !== "string") return;
    if (data.type === "spire:ready") {
      // Aplicația și-a pus ascultătorul abia după `load` (React montează târziu): scanăm din nou.
      sendPage();
    } else if (data.type === "spire:picks") {
      drawPicks(data.picks);
    }
    // A3: decupajul (ex. data.type === "spire:scan").
  });
})();
