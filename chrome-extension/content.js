// Stratul Spire din pagină. Injectat de background.js după config.js (la clic pe iconiță).
// Desenează doar chenarele de scanare (A2) și decupajul (A3). Spire (uliul),
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

  // Stratul pentru chenarele de scanare (A2). Nu prinde clicuri; doar chenarele aprinse (A3).
  var boxes = document.createElement("div");
  boxes.className = "spire-boxes";
  shadow.appendChild(boxes);

  // Stratul de decupaj (A3): ascuns; în modul de decupaj prinde clicurile de pe pagină. Stă sub
  // panou, ca bara panoului să rămână la îndemână.
  var crop = document.createElement("div");
  crop.className = "spire-crop";
  crop.hidden = true;
  var cropRect = document.createElement("div");
  cropRect.className = "spire-crop-rect";
  cropRect.hidden = true;
  crop.appendChild(cropRect);
  shadow.appendChild(crop);

  // Panoul din dreapta: bara (stare, Decupează, Închide) și aplicația Spire într-un iframe.
  var panel = document.createElement("div");
  panel.className = "spire-panel";

  var bar = document.createElement("div");
  bar.className = "spire-bar";

  // Mesajele scurte (erori, indicații). Doar textContent.
  var status = document.createElement("p");
  status.className = "spire-status";
  status.setAttribute("role", "status");
  bar.appendChild(status);

  var cropButton = document.createElement("button");
  cropButton.type = "button";
  cropButton.className = "spire-button";
  cropButton.textContent = "Decupează";
  cropButton.setAttribute("aria-pressed", "false");
  bar.appendChild(cropButton);

  // „Strânge”: panoul se ascunde (visibility, deci iframe-ul rămâne încărcat cu starea aplicației)
  // și în locul lui rămâne o filă îngustă la marginea dreaptă. Pagina de sub panou devine clicabilă.
  var collapseButton = document.createElement("button");
  collapseButton.type = "button";
  collapseButton.className = "spire-button";
  collapseButton.textContent = "Strânge";
  collapseButton.setAttribute("aria-label", "Strânge panoul Spire");
  bar.appendChild(collapseButton);

  var close = document.createElement("button");
  close.type = "button";
  close.className = "spire-button spire-close";
  close.textContent = "Închide Spire";
  close.addEventListener("click", function () {
    host.style.setProperty("display", "none", "important");
  });
  bar.appendChild(close);
  panel.appendChild(bar);

  var iframe = document.createElement("iframe");
  iframe.className = "spire-frame";
  iframe.title = "Spire";
  iframe.src = config.APP_URL + "/nou?din=extensie";
  iframe.allow = "clipboard-write";
  panel.appendChild(iframe);

  shadow.appendChild(panel);

  var tab = document.createElement("button");
  tab.type = "button";
  tab.className = "spire-tab";
  tab.textContent = "Spire";
  tab.setAttribute("aria-label", "Deschide panoul Spire");
  tab.hidden = true;
  shadow.appendChild(tab);

  function setCollapsed(on) {
    panel.classList.toggle("spire-panel-collapsed", on);
    tab.hidden = !on;
  }

  collapseButton.addEventListener("click", function () {
    setCollapsed(true);
    tab.focus();
  });
  tab.addEventListener("click", function () {
    setCollapsed(false);
    collapseButton.focus();
  });

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

  // ---------------------------------------------------------------------------------------------
  // Cererea de scanare (spire:scan), trimisă de aplicație la „Scanează pagina”. Pagina nu se mai
  // scanează singură la încărcarea iframe-ului: omul apasă butonul și vede ce se întâmplă.
  // Întâi linia de scanare trece de sus în jos (în stratul chenarelor, fără clicuri), apoi
  // scanarea de mai jos și spire:page. O cerere venită cât scanarea e în curs se ignoră.
  // ---------------------------------------------------------------------------------------------
  var SCAN_LINE_MS = 1200; // cât durează linia (și animația ei din overlay.css)
  var scanning = false;
  var scanLine = null;

  function requestScan() {
    if (scanning) return;
    scanning = true;
    clearBoxes(); // chenarele vechi nu mai înseamnă nimic după o scanare nouă
    scanLine = document.createElement("div");
    scanLine.className = "spire-scanline";
    scanLine.setAttribute("aria-hidden", "true");
    boxes.appendChild(scanLine);
    setTimeout(function () {
      if (scanLine && scanLine.parentNode) scanLine.parentNode.removeChild(scanLine);
      scanLine = null;
      scanning = false;
      sendPage();
    }, SCAN_LINE_MS);
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
  var drawn = []; // { el, id, box }
  var timers = [];
  var frameRequested = false;

  // Șterge chenarele; linia de scanare (dacă trece acum) rămâne.
  function clearBoxes() {
    timers.forEach(clearTimeout);
    timers = [];
    drawn = [];
    Array.prototype.slice.call(boxes.children).forEach(function (child) {
      if (child !== scanLine) boxes.removeChild(child);
    });
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
      out.push({ el: el, id: p.elementId, kind: p.kind });
    }
    return out;
  }

  function drawPicks(picks) {
    // Cât trece linia, id-urile vechi sunt pe cale să fie înlocuite: alegerile întârziate se ignoră.
    if (scanning) return;
    var valid = validPicks(picks);
    if (valid.length === 0) return;
    clearBoxes();
    valid.forEach(function (pick, i) {
      var box = document.createElement("div");
      box.className = "spire-box";
      // Chenarul e și buton (A3): clic sau Enter → referința din caseta elementului.
      box.setAttribute("role", "button");
      box.tabIndex = 0;
      box.setAttribute("aria-label", "Alege " + KIND_LABELS[pick.kind]);
      // Interiorul chenarului lasă clicurile spre pagină (un chenar hero acoperă tot ecranul);
      // le prind doar cele patru margini și eticheta.
      ["top", "right", "bottom", "left"].forEach(function (side) {
        var edge = document.createElement("span");
        edge.className = "spire-box-edge spire-box-edge-" + side;
        box.appendChild(edge);
      });
      var label = document.createElement("span");
      label.className = "spire-box-label";
      label.textContent = KIND_LABELS[pick.kind]; // doar textContent, niciodată HTML
      box.appendChild(label);
      var entry = { el: pick.el, id: pick.id, box: box };
      box.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        chooseElement(entry);
      });
      box.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        chooseElement(entry);
      });
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

  // ---------------------------------------------------------------------------------------------
  // Decupajul și referința (A3): clic pe un chenar sau un dreptunghi tras cu mouse-ul →
  // captura filei (background.js) → decupajul în pagină → spire:reference spre aplicație.
  // Din pagină pleacă doar decupajul, niciodată captura întreagă.
  // ---------------------------------------------------------------------------------------------
  var MAX_SIDE = 1080; // latura cea mai mare a decupajului, în pixeli (nu mărim niciodată)
  var MIN_CROP = 20; // dreptunghiurile mai mici (în px CSS, pe oricare latură) se ignoră
  var MOSTLY_INSIDE = 0.5; // un element intră în elementIds dacă cel puțin jumătate din el e în dreptunghi
  var JPEG_QUALITY = 0.85;
  var busy = false; // o captură în curs: alte clicuri se ignoră (captureVisibleTab are limită de rată)

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  // Calculul pur al decupajului, fără DOM.
  // - box: caseta în px CSS, coordonatele viewport-ului ({ x, y, w, h }), citită la momentul clicului.
  // - viewport: { w: innerWidth, h: innerHeight }; image: { w, h } ale capturii (pixeli de ecran).
  // Scara = lățimea capturii / innerWidth. Acoperă și devicePixelRatio, și zoom-ul browserului
  // (captura e în pixeli de ecran, innerWidth în px CSS). devicePixelRatio e doar rezerva, când una
  // dintre lățimi lipsește (0).
  // Caseta se prinde în limitele imaginii: dintr-un element ieșit parțial din ecran rămâne doar
  // partea vizibilă (captura nu are restul). Apoi micșorăm (fără mărire) ca latura mai mare să fie
  // cel mult MAX_SIDE. Întoarce null dacă nu rămâne nimic vizibil.
  function cropPlan(box, viewport, image, dpr) {
    var scale = image.w > 0 && viewport.w > 0 ? image.w / viewport.w : dpr > 0 ? dpr : 1;
    var sx = clamp(Math.round(box.x * scale), 0, image.w);
    var sy = clamp(Math.round(box.y * scale), 0, image.h);
    var sw = clamp(Math.round((box.x + box.w) * scale), 0, image.w) - sx;
    var sh = clamp(Math.round((box.y + box.h) * scale), 0, image.h) - sy;
    if (sw < 1 || sh < 1) return null;
    var fit = Math.min(1, MAX_SIDE / Math.max(sw, sh));
    return {
      scale: scale,
      sx: sx,
      sy: sy,
      sw: sw,
      sh: sh,
      dw: Math.max(1, Math.round(sw * fit)),
      dh: Math.max(1, Math.round(sh * fit)),
    };
  }

  function setStatus(text) {
    status.textContent = text || "";
  }

  function rectBox(r) {
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }

  // Ascundem tot stratul Spire (panou, chenare, decupaj) cât se face captura, altfel apare în ea.
  // visibility, nu display: iframe-ul aplicației rămâne încărcat și nu se reflowează nimic.
  function setLayerHidden(hidden) {
    if (hidden) host.style.setProperty("visibility", "hidden", "important");
    else host.style.removeProperty("visibility");
  }

  // Două cadre: în primul se aplică stilul, al doilea e desenat fără strat.
  function twoFrames() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          resolve();
        });
      });
    });
  }

  function captureTab() {
    try {
      return chrome.runtime.sendMessage({ type: "capture" }).then(function (reply) {
        if (!reply || reply.ok !== true || typeof reply.image !== "string" || reply.image.indexOf("data:image/") !== 0) {
          throw new Error((reply && reply.error) || "captură goală");
        }
        return reply.image;
      });
    } catch (e) {
      // Extensia a fost reîncărcată sau scoasă: chrome.runtime nu mai răspunde.
      return Promise.reject(e);
    }
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        reject(new Error("nu pot citi captura"));
      };
      img.src = src;
    });
  }

  function cropImage(img, box) {
    var plan = cropPlan(
      box,
      { w: window.innerWidth, h: window.innerHeight },
      { w: img.naturalWidth, h: img.naturalHeight },
      window.devicePixelRatio,
    );
    if (!plan) return null;
    var canvas = document.createElement("canvas");
    canvas.width = plan.dw;
    canvas.height = plan.dh;
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, plan.sx, plan.sy, plan.sw, plan.sh, 0, 0, plan.dw, plan.dh);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  }

  var CAPTURE_FAILED = "Nu am putut fotografia pagina. Apasă din nou iconița Spire și încearcă iar.";

  // Caseta (px CSS, viewport) → captură → decupaj → spire:reference. Un singur drum odată.
  function sendReference(box, elementIds) {
    if (busy) return;
    var win = iframe.contentWindow;
    if (!win) return;
    busy = true;
    setStatus("");
    setLayerHidden(true);
    twoFrames()
      .then(captureTab)
      .catch(function (e) {
        console.warn("Spire: captura a eșuat.", e && e.message ? e.message : e);
        throw new Error(CAPTURE_FAILED);
      })
      .then(function (image) {
        setLayerHidden(false);
        return loadImage(image);
      })
      .then(function (img) {
        var cropped = cropImage(img, box);
        if (!cropped) {
          setStatus("Elementul nu se vede pe ecran. Derulează până la el și încearcă din nou.");
          return;
        }
        // Doar spre originea aplicației: dacă iframe-ul a ajuns pe altă adresă, nu pleacă.
        win.postMessage({ type: "spire:reference", image: cropped, elementIds: elementIds }, config.APP_ORIGIN);
      })
      .catch(function (e) {
        var message = e && e.message === CAPTURE_FAILED ? CAPTURE_FAILED : "Nu am putut decupa imaginea. Încearcă din nou.";
        if (message !== CAPTURE_FAILED) console.warn("Spire: decupajul a eșuat.", e && e.message ? e.message : e);
        setStatus(message);
      })
      .then(function () {
        setLayerHidden(false);
        busy = false;
        // Panoul se deschide singur: acolo e „Ce am văzut” sau mesajul de eroare.
        setCollapsed(false);
      });
  }

  // Clic pe un chenar: caseta se recitește acum (pagina poate fi derulată de la scanare).
  function chooseElement(entry) {
    if (busy || !entry.el.isConnected) return;
    sendReference(rectBox(entry.el.getBoundingClientRect()), [entry.id]);
  }

  // Elementele scanate aflate în mare parte în dreptunghi (casete citite acum).
  function idsInside(box) {
    var ids = [];
    elementsById.forEach(function (el, id) {
      if (!el.isConnected) return;
      var r = el.getBoundingClientRect();
      var area = r.width * r.height;
      if (!(area > 0)) return;
      var w = Math.min(r.right, box.x + box.w) - Math.max(r.left, box.x);
      var h = Math.min(r.bottom, box.y + box.h) - Math.max(r.top, box.y);
      if (w > 0 && h > 0 && (w * h) / area >= MOSTLY_INSIDE) ids.push(id);
    });
    return ids;
  }

  // Modul de decupaj: stratul prinde clicurile, tragi un dreptunghi, Esc anulează.
  var dragStart = null; // { x, y, pointerId }

  function dragBox(event) {
    var x = clamp(event.clientX, 0, window.innerWidth);
    var y = clamp(event.clientY, 0, window.innerHeight);
    return {
      x: Math.min(dragStart.x, x),
      y: Math.min(dragStart.y, y),
      w: Math.abs(x - dragStart.x),
      h: Math.abs(y - dragStart.y),
    };
  }

  function showRect(box) {
    cropRect.hidden = false;
    cropRect.style.left = box.x + "px";
    cropRect.style.top = box.y + "px";
    cropRect.style.width = box.w + "px";
    cropRect.style.height = box.h + "px";
  }

  // Cât tragi, panoul nu prinde mouse-ul: iframe-ul aplicației (altă origine) ar înghiți
  // evenimentele, iar captura de pointer nu trece peste el. Așa dreptunghiul continuă și sub panou.
  function setDragging(on) {
    if (on) panel.style.setProperty("pointer-events", "none");
    else panel.style.removeProperty("pointer-events");
  }

  function setCropMode(on) {
    dragStart = null;
    setDragging(false);
    cropRect.hidden = true;
    crop.hidden = !on;
    cropButton.setAttribute("aria-pressed", on ? "true" : "false");
    setStatus(on ? "Trage un dreptunghi peste pagină. Esc anulează." : "");
  }

  cropButton.addEventListener("click", function () {
    if (busy) return;
    setCropMode(crop.hidden);
  });

  crop.addEventListener("pointerdown", function (event) {
    if (event.button !== 0 || busy) return;
    event.preventDefault();
    dragStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    setDragging(true);
    // Captura de pointer: dreptunghiul continuă și dacă mouse-ul iese din fereastră.
    crop.setPointerCapture(event.pointerId);
    showRect({ x: event.clientX, y: event.clientY, w: 0, h: 0 });
  });

  crop.addEventListener("pointermove", function (event) {
    if (!dragStart || event.pointerId !== dragStart.pointerId) return;
    showRect(dragBox(event));
  });

  crop.addEventListener("pointerup", function (event) {
    if (!dragStart || event.pointerId !== dragStart.pointerId) return;
    var box = dragBox(event);
    dragStart = null;
    setDragging(false);
    cropRect.hidden = true;
    if (box.w < MIN_CROP || box.h < MIN_CROP) {
      setStatus("Dreptunghiul e prea mic. Trage unul mai mare sau apasă Esc.");
      return;
    }
    setCropMode(false);
    sendReference(box, idsInside(box));
  });

  crop.addEventListener("pointercancel", function () {
    dragStart = null;
    setDragging(false);
    cropRect.hidden = true;
  });

  window.addEventListener(
    "keydown",
    function (event) {
      if (event.key === "Escape" && !crop.hidden) {
        event.preventDefault();
        setCropMode(false);
      }
    },
    true,
  );

  // Nu scanăm la `load`-ul iframe-ului: doar la spire:scan, când omul apasă „Scanează pagina”.
  // `spire:ready` (vechiul semnal „aplicația ascultă, scanează acum”) a fost scos: ar fi pornit
  // scanarea fără să apese nimeni, iar aplicația nu-l mai trimite.

  // Mesajele de la aplicație. Acceptăm doar din iframe-ul nostru și de pe originea aplicației.
  window.addEventListener("message", function (event) {
    if (event.origin !== config.APP_ORIGIN) return;
    if (event.source !== iframe.contentWindow) return;
    var data = event.data;
    if (!data || typeof data !== "object" || typeof data.type !== "string") return;
    if (data.type === "spire:scan") {
      requestScan();
    } else if (data.type === "spire:picks") {
      drawPicks(data.picks);
    }
  });
})();
