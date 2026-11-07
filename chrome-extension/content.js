// Stratul Spire din pagină. Injectat de background.js după config.js (la clic pe iconiță).
// Uliul și critica sunt locale; campania se deschide la cerere în iframe.
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

  // Stilurile sunt locale, în foaie construită: funcționează și cu style-src none.
  var sheet = new CSSStyleSheet();
  sheet.replaceSync(`/* Stilurile stratului Spire. Se încarcă doar în shadow root-ul lui #spire-root, deci nu ating
   pagina gazdă. Fără dark mode. Gazda (poziție fixă, all: initial) e stilată din content.js. */

:host {
  --spire-coral: #F25C3B;
  --spire-ink: #1f2a44;
  --spire-paper: #ffffff;
  --spire-line: #e3e5ea;
  font-family: "Geist", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: var(--spire-ink);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

/* Stratul pentru chenare și decupaj: peste toată fereastra, transparent la clicuri. */
.spire-boxes {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

/* Linia de scanare: trece o dată de sus în jos, cât content.js citește pagina (spire:scan).
   Stă în .spire-boxes, deci nu prinde clicuri. Durata e SCAN_LINE_MS din content.js. */
.spire-scanline {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--spire-coral);
  box-shadow: 0 0 0 1px rgba(242, 92, 59, 0.12), 0 6px 18px rgba(242, 92, 59, 0.28);
  opacity: 0.75;
  pointer-events: none;
  animation: spire-scan 1200ms ease-in-out forwards;
}

@keyframes spire-scan {
  0% {
    transform: translateY(0);
    opacity: 0;
  }
  10% {
    opacity: 0.75;
  }
  90% {
    opacity: 0.75;
  }
  100% {
    transform: translateY(100vh);
    opacity: 0;
  }
}

/* Fără mișcare: în loc de linie, o licărire scurtă și discretă peste pagină. */
@keyframes spire-scan-flash {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spire-scanline {
    inset: 0;
    height: auto;
    background: rgba(242, 92, 59, 0.06);
    box-shadow: none;
    opacity: 0;
    animation: spire-scan-flash 400ms ease-out 1;
  }
}

/* Un chenar de scanare (A2): elementul citit din pagină. Poziția vine din content.js. */
.spire-box {
  position: absolute;
  border: 2px solid var(--spire-coral);
  border-radius: 6px;
  background: rgba(242, 92, 59, 0.06);
  pointer-events: none;
  /* Stins până îi vine rândul; content.js pune .spire-box-lit pe rând, la 250 ms. */
  opacity: 0;
  transform: scale(0.98);
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}

/* Aprins, chenarul se poate alege (A3). Interiorul rămâne transparent la clicuri (un chenar hero
   acoperă tot ecranul); le prind doar marginile și eticheta. */
.spire-box-lit {
  opacity: 1;
  transform: none;
}

/* Benzile de 10 px peste margine (2 px vizibili): ținta clicului. */
.spire-box-edge {
  position: absolute;
  pointer-events: none;
}

.spire-box-lit .spire-box-edge,
.spire-box-lit .spire-box-label {
  pointer-events: auto;
  cursor: pointer;
}

.spire-box-edge-top,
.spire-box-edge-bottom {
  left: -6px;
  right: -6px;
  height: 10px;
}

.spire-box-edge-top {
  top: -6px;
}

.spire-box-edge-bottom {
  bottom: -6px;
}

.spire-box-edge-left,
.spire-box-edge-right {
  top: -6px;
  bottom: -6px;
  width: 10px;
}

.spire-box-edge-left {
  left: -6px;
}

.spire-box-edge-right {
  right: -6px;
}

.spire-box-lit:hover,
.spire-box-lit:focus-visible {
  background: rgba(242, 92, 59, 0.14);
  outline: none;
}

/* „Alege”, în colțul dreapta-jos, cât stai cu mouse-ul pe chenar. */
.spire-box-lit:hover::after,
.spire-box-lit:focus-visible::after {
  content: "Alege";
  position: absolute;
  right: 6px;
  bottom: 6px;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--spire-ink);
  color: #ffffff;
  font: 500 12px/1.4 "Geist", system-ui, sans-serif;
}

/* Stratul de decupaj (A3): peste pagină, sub panou; prinde clicuri doar cât e deschis. */
.spire-crop {
  position: fixed;
  inset: 0;
  background: rgba(31, 42, 68, 0.12);
  cursor: crosshair;
  pointer-events: auto;
  touch-action: none;
  user-select: none;
}

.spire-crop[hidden],
.spire-crop-rect[hidden] {
  display: none;
}

.spire-crop-rect {
  position: absolute;
  border: 2px solid var(--spire-coral);
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.18);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .spire-box {
    transition: none;
    transform: none;
  }
}

/* Eticheta chenarului (ex. „titlu”, „buton”), deasupra colțului stânga-sus. */
.spire-box-label {
  position: absolute;
  left: -2px;
  bottom: 100%;
  margin-bottom: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--spire-coral);
  color: #ffffff;
  font: 500 12px/1.4 "Geist", system-ui, sans-serif;
  white-space: nowrap;
}

/* Panoul din dreapta: aplicația Spire. */
.spire-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 420px;
  max-width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--spire-paper);
  border-left: 1px solid var(--spire-line);
  box-shadow: -8px 0 24px rgba(31, 42, 68, 0.12);
  pointer-events: auto;
}

/* Strâns: ascuns, dar încărcat (visibility nu descarcă iframe-ul și nu se lovește la clic). */
.spire-panel.spire-panel-collapsed {
  visibility: hidden;
}

/* Fila panoului strâns, lipită de marginea dreaptă. */
.spire-tab {
  position: fixed;
  top: 96px;
  right: 0;
  width: 44px;
  padding: 14px 0;
  border: 1px solid var(--spire-line);
  border-right: 0;
  border-radius: 10px 0 0 10px;
  background: var(--spire-paper);
  color: var(--spire-ink);
  box-shadow: -4px 0 12px rgba(31, 42, 68, 0.12);
  font: 500 13px/1 "Geist", system-ui, sans-serif;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  cursor: pointer;
  pointer-events: auto;
}

.spire-tab[hidden] {
  display: none;
}

.spire-tab:hover {
  background: #f4f5f7;
}

.spire-tab:focus-visible {
  outline: 2px solid var(--spire-ink);
  outline-offset: 2px;
}

.spire-frame {
  flex: 1;
  width: 100%;
  border: 0;
  display: block;
  background: var(--spire-paper);
}

/* Bara de sus a panoului: starea (stânga), apoi butoanele. */
.spire-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px 0;
}

.spire-status {
  flex: 1;
  min-width: 0;
  margin: 0;
  font: 400 13px/1.35 "Geist", system-ui, sans-serif;
  color: var(--spire-ink);
}

.spire-button {
  flex: none;
  padding: 6px 12px;
  border: 1px solid var(--spire-line);
  border-radius: 10px;
  background: var(--spire-paper);
  color: var(--spire-ink);
  font: 500 13px/1.2 "Geist", system-ui, sans-serif;
  cursor: pointer;
}

.spire-button:hover {
  background: #f4f5f7;
}

.spire-button:focus-visible {
  outline: 2px solid var(--spire-ink);
  outline-offset: 2px;
}
:host { font-family:Geist,system-ui,sans-serif; color:#1f2a44 }
.spire-bird {position:fixed;top:0;left:0;width:140px;height:140px;padding:0;border:0;background:none;cursor:pointer;pointer-events:auto;z-index:3;outline-offset:-15px}
.spire-body {display:block;width:100%;height:100%;transform-origin:50% 78%}
.spire-pose {position:absolute;inset:0;opacity:0;transition:opacity .18s;pointer-events:none}
.spire-pose.show {opacity:1}
.spire-pose svg {width:100%;height:100%;overflow:visible}
.mascot-wing {transform-box:fill-box;transform-origin:10% 25%}
.flap .mascot-wing {animation:spire-flap .17s ease-in-out infinite alternate}
.glide .mascot-wing {animation:spire-glide 1.4s ease-in-out infinite alternate}
.flare .mascot-wing {animation:none;transform:rotate(-34deg);transition:transform .25s ease-out}
.perched .spire-pose.show svg {animation:spire-breathe 2.8s ease-in-out infinite alternate;transform-origin:50% 78%}
@keyframes spire-flap {from{transform:rotate(-30deg)}to{transform:rotate(18deg) scaleY(.92)}}
@keyframes spire-glide {from{transform:rotate(-6deg)}to{transform:rotate(-2deg)}}
@keyframes spire-breathe {to{transform:scale(1.012,.99)}}
.spire-menu,.spire-bubble {position:fixed;pointer-events:auto;z-index:4;background:#fff;border:1px solid #e3e5ea;border-radius:16px;padding:16px;box-shadow:0 8px 28px #1f2a4420;font:14px/1.45 Geist,system-ui,sans-serif;color:#1f2a44}
.spire-menu {width:220px;display:grid;gap:8px}
.spire-bubble {width:min(340px,calc(100vw - 16px));max-height:calc(100vh - 16px);overflow:auto}
.spire-menu[hidden],.spire-bubble[hidden],.spire-crit-outline[hidden] {display:none}
.spire-menu button,.spire-bubble button {border:1px solid #e3e5ea;border-radius:9px;background:#fff;color:#1f2a44;padding:8px 10px;cursor:pointer;font:500 13px/1.3 Geist,system-ui,sans-serif}
.spire-menu .spire-primary,.spire-bubble .spire-primary {background:#F25C3B;color:white;border-color:#F25C3B}
.spire-bubble h2 {font:600 17px/1.3 Geist,system-ui,sans-serif;margin:8px 0}
.spire-bubble p {margin:8px 0;overflow-wrap:anywhere}
.spire-level {font-weight:500}
.spire-level:before {content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:#b08834;margin-right:8px}
.spire-level[data-level="important"]:before {background:#F25C3B}
.spire-level[data-level="marunt"]:before {background:#8b94a6}
.spire-ai {border-top:1px solid #e3e5ea;padding-top:8px}
.spire-row {display:flex;gap:8px;align-items:center;margin-top:12px}
.spire-row span {flex:1}
.spire-crit-outline {position:fixed;border:2px solid #F25C3B;border-radius:6px;background:#F25C3B0A;pointer-events:none}
@media(prefers-reduced-motion:reduce){.spire-pose,.spire-body,.mascot-wing {transition:none!important;animation:none!important}.perched .spire-pose.show svg {animation:none}}
`);
  shadow.adoptedStyleSheets = [sheet];

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

  iframe.allow = "clipboard-write";
  panel.appendChild(iframe);

  // Panoul și iframe-ul se atașează doar la alegerea campaniei.
  function openCampaign() {
    stopCritique();
    if (!panel.isConnected) {
      iframe.src = config.APP_URL + "/nou?din=extensie";
      shadow.appendChild(panel);
    }
    setCollapsed(false);
  }

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

  // Motorul de mișcare portat din zbor-prototip-v3; coordonatele sunt punctul ghearelor.
  var motion = matchMedia("(prefers-reduced-motion: reduce)");
  var speed = Math.max(0.01, Number(globalThis.__spireTestSpeed) || 1);
  var S = 140, pos = { x: innerWidth - 180, y: 140 }, ang = 0, run = 0, tour = 0;
  var mode = "roam", resumeBubble = null, roamTimer, critiqueElements = new Map();
  var bird = document.createElement("button");
  bird.className = "spire-bird perched";
  bird.type = "button";
  bird.setAttribute("aria-label", "Spire, deschide meniul");
  var body = document.createElement("span");
  body.className = "spire-body";
  bird.appendChild(body);
  Object.keys(globalThis.SPIRE_POSES).forEach(function (mood) {
    ["flying", "perched"].forEach(function (pose) {
      var wrapper = document.createElement("span");
      wrapper.className = "spire-pose";
      wrapper.dataset.mood = mood;
      wrapper.dataset.pose = pose;
      var svg = new DOMParser().parseFromString(globalThis.SPIRE_POSES[mood][pose], "image/svg+xml").documentElement;
      wrapper.appendChild(document.importNode(svg, true));
      body.appendChild(wrapper);
    });
  });
  var mood = "idle";
  function pose(m) { mood = m; refreshPose(); }
  function refreshPose() {
    var p = bird.classList.contains("perched") ? "perched" : "flying";
    body.querySelectorAll(".spire-pose").forEach(function (el) {
      el.classList.toggle("show", el.dataset.mood === mood && el.dataset.pose === p);
    });
  }
  function wings(c) {
    bird.classList.remove("flap", "glide", "flare", "perched");
    if (c) bird.classList.add(c);
    refreshPose();
  }
  var bubble = document.createElement("section");
  bubble.className = "spire-bubble";
  bubble.setAttribute("aria-live", "polite");
  bubble.hidden = true;
  var menu = document.createElement("div");
  menu.className = "spire-menu";
  menu.hidden = true;
  function button(parent, label, fn, primary) {
    var b = document.createElement("button");
    b.type = "button"; b.textContent = label;
    if (primary) b.className = "spire-primary";
    b.addEventListener("click", fn); parent.appendChild(b);
    return b;
  }
  button(menu, "Critică pagina", function () { menu.hidden = true; critique(); }, true);
  button(menu, "Fă o campanie", function () { menu.hidden = true; openCampaign(); });
  button(menu, "Închide Spire", function () { stopCritique(); menu.hidden = true; host.style.setProperty("display", "none", "important"); });
  shadow.append(bird, bubble, menu);
  bird.addEventListener("click", function () {
    menu.hidden = !menu.hidden;
    if (!menu.hidden) { stopCritique(); place(pos.x, pos.y); }
    positionPopup(menu);
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") menu.hidden = true; });
  function positionPopup(el) {
    var r = bird.getBoundingClientRect();
    var w = el.offsetWidth, h = el.offsetHeight;
    var x = r.right + 6 + w > innerWidth ? r.left - w - 6 : r.right + 6;
    el.style.left = Math.max(8, Math.min(innerWidth - w - 8, x)) + "px";
    el.style.top = Math.max(8, Math.min(innerHeight - h - 8, r.top - 10)) + "px";
  }
  function place(x, y, rot, sx, sy) {
    bird.style.transform = "translate(" + (x - S / 2) + "px," + (y - S * .78) + "px)";
    body.style.transform = "rotate(" + (rot || 0) + "deg) scale(" + (sx || 1) + "," + (sy || 1) + ")";
    if (!bubble.hidden) positionPopup(bubble);
    if (!menu.hidden) positionPopup(menu);
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms * speed); }); }
  function clampPoint(p) {
    return { x: Math.max(75, Math.min(innerWidth - 75, p.x)), y: Math.max(115, Math.min(innerHeight - 30, p.y)) };
  }
  function fly(to, dur, arc) {
    to = clampPoint(to);
    var id = ++run, from = { x: pos.x, y: pos.y }, dx = to.x - from.x, dy = to.y - from.y, dist = Math.hypot(dx, dy);
    if (motion.matches) { pos = to; place(pos.x, pos.y); wings("perched"); return Promise.resolve(true); }
    dur = (dur || Math.max(700, dist * 1.6)) * speed; arc = arc || .35;
    var c1 = { x: from.x + dx * .25, y: from.y + dy * .25 - dist * arc };
    var c2 = { x: from.x + dx * .75, y: from.y + dy * .75 - dist * arc * .6 };
    function B(t, a, b, c, d) { return (1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*d; }
    pose("idle"); wings("flap");
    return new Promise(function (resolve) {
      var t0 = performance.now(), px = from.x;
      function step(now) {
        if (id !== run) return resolve(false);
        var t = Math.min(1, (now-t0)/dur), e = t < .5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
        var x = B(e,from.x,c1.x,c2.x,to.x), y = B(e,from.y,c1.y,c2.y,to.y);
        var vx = x-px; px=x; ang += (Math.max(-22, Math.min(22,vx*2.2))-ang)*.15;
        if (t > .35 && t < .7) wings("glide"); else if (t >= .7 && t < .9) wings("flap"); else if(t >= .9) wings("flare");
        var bob = Math.sin(now/90)*(t<.9?2:0); pos={x:x,y:y+bob}; place(x,y+bob,ang);
        if(t<1) requestAnimationFrame(step); else { pos=to; ang=0; resolve(true); }
      }
      requestAnimationFrame(step);
    });
  }
  async function squash(sx, sy, ms) {
    if (motion.matches) return;
    body.style.transition = "transform " + ms*speed + "ms cubic-bezier(.3,1.5,.5,1)";
    place(pos.x,pos.y,0,sx,sy); await wait(ms); body.style.transition = "";
  }
  async function land() {
    var token=run;
    wings("flare"); await squash(1.06,.9,140); if(token!==run)return;
    wings("perched"); await squash(.95,1.06,150); if(token!==run)return;
    await squash(1,1,180);
  }
  async function takeoff() {
    if (motion.matches) return;
    var token=run;
    wings("perched"); await squash(1.05,.92,120); if(token!==run)return;
    wings("flap"); await squash(.96,1.06,100);
  }
  function perchOn(el) { var r=el.getBoundingClientRect(); return clampPoint({x:r.left+Math.min(r.width*.5,r.width-40)+8,y:r.top+4}); }
  function scheduleRoam() {
    clearTimeout(roamTimer);
    roamTimer=setTimeout(async function () {
      if (mode === "roam" && menu.hidden && bubble.hidden && host.style.display !== "none" && !panel.isConnected) {
        var targets=[], walker=document.createTreeWalker(document.body,NodeFilter.SHOW_ELEMENT), n, count=0;
        while ((n=walker.nextNode()) && count++<500) {
          if(n===host || host.contains(n)) continue;
          var r=n.getBoundingClientRect();
          if(r.top>115 && r.top<innerHeight-30 && r.width>80 && isVisible(n,r)) targets.push(n);
          if(targets.length>=40) break;
        }
        var target=targets[Math.floor(Math.random()*targets.length)];
        var token=run;
        await takeoff();
        if(token===run && mode==="roam" && menu.hidden && bubble.hidden && host.style.display!=="none" && !panel.isConnected) {
          if(await fly(target?perchOn(target):{x:80+Math.random()*(innerWidth-160),y:120+Math.random()*(innerHeight-180)},1800,.2)) await land();
        }
      }
      scheduleRoam();
    }, (4000+Math.random()*4000)*speed);
  }
  function effectiveBackground(el) {
    for(var n=el;n;n=n.parentElement) {
      var cs=getComputedStyle(n);
      if(cs.backgroundImage !== "none") return "";
      var color=cs.backgroundColor;
      var match=color.match(/^rgba?\((.*)\)$/);
      if(!match) return ""; // Culorile CSS necunoscute nu sunt fundaluri transparente.
      var alpha=Number((match[1].split(",")[3] || "1").trim());
      if(alpha === 1) return color;
      if(alpha > 0) return ""; // Fundal semitransparent: nu tragem concluzii despre contrast.
    }
    return "rgb(255, 255, 255)";
  }
  // Citire plafonată, independentă de spire:page și de identificatorii campaniei.
  function readFacts() {
    var elements=[], visited=0, h1=0, missing=0;
    critiqueElements=new Map();
    var walker=document.createTreeWalker(document.body || document.documentElement,NodeFilter.SHOW_ELEMENT,{
      acceptNode:function(n){ return n===host || SKIP_TAGS[n.tagName] || n.ownerSVGElement ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    var el=walker.currentNode;
    while(el && visited++<MAX_VISITED) {
      var current=el; el=walker.nextNode();
      var r=current.getBoundingClientRect(), cs=isVisible(current,r);
      if(!cs) continue;
      var tag=current.tagName.toLowerCase();
      var semanticText=/^(a|button|label|summary|h[1-6])$/.test(tag) || /^(button|link|heading)$/.test(current.getAttribute("role") || "");
      var text=normalize(semanticText ? current.innerText : directText(current),120);
      if(tag==="h1") h1++;
      if(tag==="img" && !current.hasAttribute("alt")) missing++;
      if(elements.length>=200) continue;
      var role=current.getAttribute("role") || (tag==="button" || (tag==="input" && /^(button|submit|reset)$/.test(current.type)) ? "button" : tag==="a" && current.hasAttribute("href") ? "link" : /^h[1-6]$/.test(tag) ? "heading" : tag==="img" ? "img" : "");
      var labelled=normalize((current.getAttribute("aria-labelledby") || "").split(/\s+/).slice(0,20).map(function(id){var n=document.getElementById(id);return n?n.textContent:"";}).join(" "),120);
      var image=current.querySelector("img[alt]"), name=normalize(current.getAttribute("aria-label") || labelled || text || current.getAttribute("title") || current.getAttribute("alt") || (image && image.getAttribute("alt")),120);
      var pointer=cs.cursor==="pointer" || current.hasAttribute("onclick");
      var childPointer=false;
      // Numai ultimul descendent cu cursor pointer poartă acțiunea.
      for(var i=0;pointer && i<current.children.length && visited<MAX_VISITED;i++,visited++) {
        var child=current.children[i], cr=child.getBoundingClientRect();
        if(cr.width>0 && cr.height>0 && getComputedStyle(child).cursor==="pointer") {childPointer=true;break;}
      }
      var nativeParent=current.parentElement && current.parentElement.closest("a,button,input,select,textarea,summary,label,[role=button],[role=link]");
      var fake=pointer && !childPointer && !nativeParent && !/^(a|button|input|select|textarea|summary|label)$/.test(tag) && role!=="button" && role!=="link";
      if(!text && !fake && tag!=="img" && role!=="img" && role!=="button" && role!=="link") continue;
      var id="crit-"+elements.length; critiqueElements.set(id,current);
      var size=parseFloat(cs.fontSize), weight=parseInt(cs.fontWeight,10)||400;
      elements.push({id:id,tag:tag,role:role,text:text,accessibleName:name,fontSizePx:size,fontWeight:weight,color:cs.color,background:effectiveBackground(current),
        box:{x:r.left,y:r.top,w:r.width,h:r.height},inFirstScreen:r.bottom>0 && r.right>0 && r.top<innerHeight && r.left<innerWidth,
        isLink:role==="link",href:tag==="a"?current.href:null,isButtonLike:fake,isImage:tag==="img" || role==="img",
        alt:current.getAttribute("alt"),isHeadingLike:!/^h[1-6]$/.test(tag) && role!=="heading" && (size>=20 || (size>=18 && weight>=700))});
    }
    var types=[];
    function jsonTypes(value,depth) {
      if(!value || typeof value!=="object" || depth>15 || types.length>=100) return;
      if(Array.isArray(value)) return value.slice(0,100).forEach(function(v){jsonTypes(v,depth+1);});
      var type=value["@type"]; if(typeof type==="string") types.push(type); else if(Array.isArray(type)) type.slice(0,20).forEach(function(t){if(typeof t==="string")types.push(t);});
      Object.keys(value).slice(0,100).forEach(function(k){if(k!=="@type") jsonTypes(value[k],depth+1);});
    }
    Array.from(document.querySelectorAll('script[type="application/ld+json"]')).slice(0,10).forEach(function(s){
      if(s.textContent.length<=100000) try {jsonTypes(JSON.parse(s.textContent),0);} catch (_) {}
    });
    bird.dataset.analyzed=String(elements.length);
    var meta=document.querySelector('meta[name="description"]');
    return {page:{url:location.href,title:document.title,lang:document.documentElement.lang,metaDescription:meta?meta.content:"",jsonLdTypes:types,h1Count:h1,imagesWithoutAlt:missing},elements:elements};
  }
  var outline=document.createElement("div"); outline.className="spire-crit-outline"; outline.hidden=true; boxes.appendChild(outline);
  var outlined=null;
  function updateOutline() {
    if(!outlined || !outlined.isConnected) {outline.hidden=true;return;}
    var r=outlined.getBoundingClientRect();
    outline.style.left=r.left+"px";outline.style.top=r.top+"px";outline.style.width=r.width+"px";outline.style.height=r.height+"px";
  }
  window.addEventListener("scroll",updateOutline,true);
  window.addEventListener("resize",function(){updateOutline();pos=clampPoint(pos);place(pos.x,pos.y);});
  function stopCritique() {
    tour++; run++; mode="roam"; outlined=null; outline.hidden=true; bubble.hidden=true;
    if(resumeBubble) resumeBubble();
    wings("perched");
  }
  function line(parent, tag, text, cls) {
    var el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;parent.appendChild(el);return el;
  }
  function showBubble(c,index,total,summary) {
    bubble.replaceChildren(); bubble.hidden=false;
    if(summary) {
      bubble.dataset.summary="true";line(bubble,"h2","Am terminat");line(bubble,"p",summary);positionPopup(bubble);
      return Promise.resolve();
    }
    delete bubble.dataset.summary;
    var labels={"important":"Important","de-imbunatatit":"De îmbunătățit","marunt":"Mărunt"};
    var level=line(bubble,"div",labels[c.level],"spire-level");
    level.dataset.level=c.level;
    line(bubble,"h2",c.title);line(bubble,"p",c.body);line(bubble,"p","Ce faci: "+c.fix);line(bubble,"p","Pentru asistenții AI: "+c.agent,"spire-ai");
    var row=document.createElement("div");row.className="spire-row";bubble.appendChild(row);line(row,"span",(index+1)+" din "+total);
    return new Promise(function(resolve){
      var done=false;
      function next(){if(done)return;done=true;clearTimeout(timer);resumeBubble=null;resolve();}
      button(row,"Următorul",next,true);button(row,"Oprește",stopCritique);
      var timer=setTimeout(next,8000*speed);resumeBubble=next;positionPopup(bubble);
    });
  }
  async function critique() {
    stopCritique();mode="crit";var id=tour;pose("searching");await wait(1200);
    if(id!==tour)return;
    var facts=readFacts(), crits=globalThis.SpireCritique.critiquePage(facts.page,facts.elements,{w:innerWidth,h:innerHeight});
    // Observațiile despre pagină vin după parcurgerea elementelor.
    crits=crits.filter(function(c){return c.elementId!==null;}).concat(crits.filter(function(c){return c.elementId===null;}));
    for(var i=0;i<crits.length;i++) {
      if(id!==tour)return;
      bubble.hidden=true;outline.hidden=true;outlined=null;
      var c=crits[i], target=critiqueElements.get(c.elementId);
      if(target && target.isConnected) {
        var r=target.getBoundingClientRect();
        if(r.top<115 || r.bottom>innerHeight || r.left<0 || r.right>innerWidth) {
          target.scrollIntoView({block:"center",behavior:motion.matches?"instant":"smooth"});await wait(650);
          if(id!==tour)return;
        }
        await takeoff();if(id!==tour)return;
        if(!await fly(perchOn(target)))return;
        await land();if(id!==tour)return;
        outlined=target;outline.hidden=false;if(!outline.isConnected)boxes.appendChild(outline);updateOutline();
      }
      pose("searching");await wait(500);if(id!==tour)return;
      pose("thinking");await wait(500);if(id!==tour)return;
      pose(c.level==="important"?"worried":"thinking");
      await showBubble(c,i,crits.length);
    }
    if(id!==tour)return;
    outlined=null;outline.hidden=true;pose(crits.some(function(c){return c.level==="important";})?"happy":"celebrate");
    showBubble(null,0,0,globalThis.SpireCritique.summarySentence(crits)); mode="roam";
  }
  pose("idle");place(pos.x,pos.y);scheduleRoam();


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
