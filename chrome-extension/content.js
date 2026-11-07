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
  host.dataset.spireBuild = config.BUILD;
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
   pagina gazdă. Fără dark mode. Gazda (poziție fixă, all: initial) e stilată din content.js.
   Culorile sunt cele din aplicație (src/index.css, docs/DESIGN.md): bleumarin pentru text,
   coral doar pe acțiunea principală, coral aprins pe chenarele de pe pagină. */

:host {
  --spire-ink: #1b2350;
  --spire-ink-2: #3d4366;
  --spire-muted: #646985;
  --spire-line: #e5e3de;
  --spire-paper: #f6f5f2;
  --spire-paper-2: #efede8;
  --spire-card: #ffffff;
  --spire-coral: #c84a37;
  --spire-coral-deep: #a3392a;
  --spire-coral-bright: #e0614a;
  --spire-gold: #d9a03a;
  --spire-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --spire-shadow: 0 1px 2px rgba(27, 35, 80, 0.06), 0 18px 40px -18px rgba(27, 35, 80, 0.38);
  --spire-font: "Spire Geist", "Geist", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-family: var(--spire-font);
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
   Stă în .spire-boxes, deci nu prinde clicuri. Durata e SCAN_LINE_MS din content.js.
   În urma ei rămâne o dâră scurtă, ca să se vadă direcția. */
.spire-scanline {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--spire-coral-bright);
  box-shadow: 0 6px 18px rgba(224, 97, 74, 0.3);
  opacity: 0.85;
  pointer-events: none;
  animation: spire-scan 1200ms cubic-bezier(0.45, 0, 0.25, 1) forwards;
}

.spire-scanline::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 2px;
  height: 56px;
  background: linear-gradient(to top, rgba(224, 97, 74, 0.12), rgba(224, 97, 74, 0));
}

@keyframes spire-scan {
  0% {
    transform: translateY(0);
    opacity: 0;
  }
  10% {
    opacity: 0.85;
  }
  90% {
    opacity: 0.85;
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
    background: rgba(224, 97, 74, 0.06);
    box-shadow: none;
    opacity: 0;
    animation: spire-scan-flash 400ms ease-out 1;
  }

  .spire-scanline::before {
    display: none;
  }
}

/* Un chenar de scanare (A2): elementul citit din pagină. Poziția vine din content.js. */
.spire-box {
  position: absolute;
  border: 2px solid var(--spire-coral-bright);
  border-radius: 8px;
  background: rgba(224, 97, 74, 0.05);
  pointer-events: none;
  /* Stins până îi vine rândul; content.js pune .spire-box-lit pe rând, la 250 ms. */
  opacity: 0;
  transform: scale(0.97);
  transition: opacity 220ms ease-out, transform 320ms var(--spire-ease), background-color 150ms ease-out;
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
  background: rgba(224, 97, 74, 0.12);
  outline: none;
}

/* „Alege”, în colțul dreapta-jos, cât stai cu mouse-ul pe chenar. */
.spire-box-lit:hover::after,
.spire-box-lit:focus-visible::after {
  content: "Alege";
  position: absolute;
  right: 6px;
  bottom: 6px;
  padding: 3px 9px;
  border-radius: 7px;
  background: var(--spire-ink);
  color: #ffffff;
  font: 500 12px/1.4 var(--spire-font);
  box-shadow: 0 6px 14px -6px rgba(27, 35, 80, 0.5);
}

/* Stratul de decupaj (A3): peste pagină, sub panou; prinde clicuri doar cât e deschis. */
.spire-crop {
  position: fixed;
  inset: 0;
  background: rgba(27, 35, 80, 0.14);
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
  border: 2px solid var(--spire-coral-bright);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 0 9999px rgba(27, 35, 80, 0.12);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .spire-box {
    transition: opacity 150ms ease-out;
    transform: none;
  }
}

/* Eticheta chenarului (ex. „titlu”, „buton”), deasupra colțului stânga-sus. */
.spire-box-label {
  position: absolute;
  left: -2px;
  bottom: 100%;
  margin-bottom: 5px;
  padding: 2px 9px;
  border-radius: 7px;
  background: var(--spire-coral-bright);
  color: #ffffff;
  font: 500 12px/1.4 var(--spire-font);
  white-space: nowrap;
  box-shadow: 0 6px 14px -8px rgba(163, 57, 42, 0.6);
}

/* Panoul din dreapta: aplicația Spire. Intră din dreapta; strâns, iese tot spre dreapta. */
.spire-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 480px;
  max-width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--spire-paper);
  border-left: 1px solid var(--spire-line);
  box-shadow: -1px 0 0 rgba(27, 35, 80, 0.03), -24px 0 48px -24px rgba(27, 35, 80, 0.28);
  pointer-events: auto;
  animation: spire-panel-in 380ms var(--spire-ease);
  transition: transform 300ms var(--spire-ease), visibility 0s linear 0s;
}

@keyframes spire-panel-in {
  from {
    transform: translateX(32px);
    opacity: 0;
  }
  to {
    transform: none;
    opacity: 1;
  }
}

/* Strâns: ascuns, dar încărcat (visibility nu descarcă iframe-ul și nu se lovește la clic). */
.spire-panel[hidden] {
  display: none;
}

.spire-panel.spire-panel-collapsed {
  visibility: hidden;
  transform: translateX(100%);
  transition: transform 240ms cubic-bezier(0.4, 0, 1, 1), visibility 0s linear 240ms;
}

/* Fila panoului strâns, lipită de marginea dreaptă: semnul Spire, apoi numele, pe verticală. */
.spire-tab {
  position: fixed;
  top: 96px;
  right: 0;
  width: 44px;
  padding: 12px 0 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--spire-line);
  border-right: 0;
  border-radius: 12px 0 0 12px;
  background: var(--spire-card);
  color: var(--spire-ink);
  box-shadow: -10px 8px 24px -14px rgba(27, 35, 80, 0.4);
  font: 600 13px/1 var(--spire-font);
  letter-spacing: 0.01em;
  cursor: pointer;
  pointer-events: auto;
  animation: spire-tab-in 300ms var(--spire-ease) 120ms both;
  transition: background-color 150ms ease-out, padding 200ms var(--spire-ease);
}

.spire-tab-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

@keyframes spire-tab-in {
  from {
    transform: translateX(100%);
  }
  to {
    transform: none;
  }
}

.spire-tab[hidden] {
  display: none;
}

.spire-tab:hover {
  background: var(--spire-paper);
  padding-right: 4px;
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

/* Bara de sus a panoului: semnul și numele, uneltele; dedesubt, starea (doar când are text). */
.spire-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 10px 10px 14px;
  background: var(--spire-card);
  border-bottom: 1px solid var(--spire-line);
}

.spire-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: auto;
  font: 600 15px/1 var(--spire-font);
  letter-spacing: -0.01em;
  color: var(--spire-ink);
}

/* Semnul aplicației: pătrat bleumarin rotunjit cu un pătrățel coral (Mark din src/App.tsx). */
.spire-mark {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--spire-ink);
}

.spire-mark::after {
  content: "";
  width: 9px;
  height: 9px;
  border-radius: 3px;
  background: var(--spire-coral-bright);
}

.spire-status {
  margin: 0;
  padding: 8px 14px;
  font: 400 13px/1.4 var(--spire-font);
  color: var(--spire-ink-2);
  background: var(--spire-paper-2);
  border-bottom: 1px solid var(--spire-line);
}

.spire-status:empty {
  display: none;
}

.spire-button {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 11px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--spire-ink-2);
  font: 500 13px/1 var(--spire-font);
  cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out;
}

.spire-button svg {
  flex: none;
}

.spire-button:hover {
  background: var(--spire-paper-2);
  color: var(--spire-ink);
}

/* Decupajul pornit: butonul rămâne apăsat, în bleumarin. */
.spire-button[aria-pressed="true"] {
  background: var(--spire-ink);
  color: #ffffff;
}

/* Strânge și Închide: doar iconița, numele e în aria-label. */
.spire-icon-button {
  width: 32px;
  padding: 0;
}

.spire-button:focus-visible {
  outline: 2px solid var(--spire-ink);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .spire-panel,
  .spire-tab {
    animation: none;
  }

  .spire-panel,
  .spire-panel.spire-panel-collapsed {
    transition: none;
    transform: none;
  }
}

/* ---- Uliul, meniul și balonul. Mișcările desenului sunt copiate din src/index.css (mascot-*). ---- */
.spire-bird {position:fixed;top:0;left:0;width:140px;height:140px;padding:0;border:0;background:none;cursor:pointer;pointer-events:auto;z-index:3;outline-offset:-15px;-webkit-tap-highlight-color:transparent}
.spire-bird:focus-visible {outline:2px solid var(--spire-ink);border-radius:50%}
.spire-body {display:block;width:100%;height:100%;transform-origin:50% 78%}
/* umbra de sub gheare: apare cât stă așezat, se strânge când zboară */
.spire-shadow {position:absolute;left:50%;top:97px;width:44px;height:8px;margin-left:-22px;border-radius:50%;background:rgba(27,35,80,.2);filter:blur(2.5px);opacity:0;transform:scale(.5);transition:opacity .2s ease-out,transform .35s var(--spire-ease);pointer-events:none}
.perched .spire-shadow {opacity:1;transform:none}
.spire-bird:hover .spire-shadow {transform:scale(1.12)}
.spire-pose {position:absolute;inset:0;opacity:0;transition:opacity .16s ease-out;pointer-events:none}
.spire-pose.show {opacity:1}
.spire-pose svg {width:100%;height:100%;overflow:visible}
/* contur alb, ca un abțibild: uliul se vede și pe fundaluri închise. Filtrul stă pe desen, nu în SVG */
.spire-body {filter:drop-shadow(0 0 .8px #fff) drop-shadow(0 0 .8px #fff) drop-shadow(0 0 .6px #fff) drop-shadow(0 3px 6px rgba(16,21,58,.28))}
/* aripile pivotează din umăr. Bătaia: coborârea e mai rapidă decât ridicarea, iar corpul urcă pe coborâre */
.mascot-wing {transform-box:fill-box;transform-origin:94% 50%}
.flap .mascot-wing {animation:spire-flap .3s linear infinite}
.flap .mascot-wing-far {animation-delay:-.035s}
.flap .spire-pose.show svg {animation:spire-heave .3s linear infinite}
.glide .mascot-wing {animation:spire-glide 1.6s ease-in-out infinite alternate}
.flare .mascot-wing {animation:none;transform:rotate(34deg) scaleX(.9);transition:transform .22s var(--spire-ease)}
@keyframes spire-flap {0%{transform:rotate(28deg) scaleX(.92);animation-timing-function:cubic-bezier(.5,0,.6,1)} 42%{transform:rotate(-26deg) scaleY(.9);animation-timing-function:cubic-bezier(.4,0,.5,1)} 100%{transform:rotate(28deg) scaleX(.92)}}
@keyframes spire-heave {0%,100%{transform:translateY(2px)} 42%{transform:translateY(-3px)}}
@keyframes spire-glide {from{transform:rotate(8deg)} to{transform:rotate(2deg) scaleY(.98)}}
/* așezat: respiră, se uită în jur, clipește, mișcă scurt din coadă */
.perched .spire-pose.show svg {animation:spire-breathe 3.2s ease-in-out infinite alternate;transform-origin:50% 78%}
@keyframes spire-breathe {to{transform:scale(1.014,.988)}}
.mascot-head {transform-box:fill-box;transform-origin:50% 90%;animation:spire-look 9s ease-in-out infinite}
.mascot-tail {transform-box:fill-box;transform-origin:50% 0;animation:spire-tail 7s ease-in-out infinite}
.flap .mascot-head,.glide .mascot-head,.flap .mascot-tail {animation:none}
@keyframes spire-look {0%,60%,100%{transform:rotate(0)} 65%,76%{transform:rotate(-8deg)} 81%,91%{transform:rotate(5deg)}}
@keyframes spire-tail {0%,86%,100%{transform:rotate(0)} 90%{transform:rotate(3deg)} 95%{transform:rotate(-2deg)}}
.mascot-blink {transform-box:fill-box;transform-origin:50% 50%!important;animation:spire-blink 6s infinite}
@keyframes spire-blink {0%,44%,50%,88%,100%{transform:scaleY(1)} 47%{transform:scaleY(.1)} 91%{transform:scaleY(.1)} 93%{transform:scaleY(1)} 95.5%{transform:scaleY(.1)}}
.mascot-dots circle {animation:spire-rise 1.5s ease-in-out infinite both}
.mascot-dots circle:nth-child(2) {animation-delay:.2s}
.mascot-dots circle:nth-child(3) {animation-delay:.4s}
@keyframes spire-rise {0%{opacity:0;transform:translateY(2px)} 30%,70%{opacity:1;transform:none} 100%{opacity:0;transform:translateY(-2px)}}
.mascot-search {animation:spire-search 1.6s ease-in-out infinite}
.mascot-search-eye {animation:spire-search-eye 1.6s ease-in-out infinite}
@keyframes spire-search {0%,100%{transform:translateX(-7px)} 50%{transform:translateX(7px)}}
@keyframes spire-search-eye {0%,100%{transform:translateX(-.8px)} 50%{transform:translateX(.8px)}}
.mascot-bit {animation:spire-burst .9s var(--spire-ease) both}
.mascot-bit:nth-child(1) {--dx:15px;--dy:-10px}
.mascot-bit:nth-child(2) {--dx:-13px;--dy:-11px;animation-delay:40ms}
.mascot-bit:nth-child(3) {--dx:7px;--dy:12px;animation-delay:80ms}
.mascot-bit:nth-child(4) {--dx:-9px;--dy:13px;animation-delay:120ms}
.mascot-bit:nth-child(5) {--dx:13px;--dy:3px;animation-delay:160ms}
.mascot-bit:nth-child(6) {--dx:-13px;--dy:2px;animation-delay:200ms}
@keyframes spire-burst {from{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.4)} 50%{opacity:1} to{opacity:1;transform:none}}
/* starea se vede din tot corpul: bucuria sare, îngrijorarea se scutură */
.spire-pose.show[data-mood="happy"] svg {animation:spire-hop .8s cubic-bezier(.3,.7,.4,1) 1;transform-origin:50% 80%}
.spire-pose.show[data-mood="celebrate"] svg {animation:spire-hop .8s cubic-bezier(.3,.7,.4,1) 2;transform-origin:50% 80%}
.spire-pose.show[data-mood="worried"] svg {animation:spire-shake .5s ease-out 2;transform-origin:50% 70%}
@keyframes spire-hop {0%,100%{transform:translateY(0) scale(1,1)} 12%{transform:translateY(1px) scale(1.06,.92)} 38%{transform:translateY(-14px) scale(.96,1.05)} 62%{transform:translateY(0) scale(1.05,.94)} 78%{transform:translateY(-3px) scale(1,1)}}
@keyframes spire-shake {0%,100%{transform:translateX(0) rotate(0)} 20%{transform:translateX(-2px) rotate(-5deg)} 40%{transform:translateX(2px) rotate(4deg)} 60%{transform:translateX(-1px) rotate(-2deg)} 80%{transform:translateX(1px) rotate(1deg)}}

/* meniul și balonul: carduri albe, ca în aplicație; apar dinspre uliu */
.spire-menu,.spire-bubble {position:fixed;pointer-events:auto;z-index:4;background:var(--spire-card);border:1px solid var(--spire-line);border-radius:16px;box-shadow:var(--spire-shadow);font:400 14px/1.5 var(--spire-font);color:var(--spire-ink);-webkit-font-smoothing:antialiased;transform-origin:left top}
.spire-menu[data-side="left"],.spire-bubble[data-side="left"] {transform-origin:right top}
.spire-menu:not([hidden]),.spire-bubble:not([hidden]) {animation:spire-pop .28s var(--spire-ease)}
@keyframes spire-pop {from{opacity:0;transform:translateY(6px) scale(.96)} to{opacity:1;transform:none}}
.spire-menu[hidden],.spire-bubble[hidden],.spire-crit-outline[hidden] {display:none}
.spire-bubble [hidden] {display:none!important}
.spire-menu ::selection,.spire-bubble ::selection {background:#fbebe6;color:var(--spire-ink)}
.spire-menu {width:252px;padding:6px;display:grid;gap:2px}
.spire-menu-head {display:flex;align-items:center;gap:10px;padding:8px 8px 10px}
.spire-menu-head b {display:block;font:600 14px/1.2 var(--spire-font)}
.spire-menu-head small {display:block;margin-top:2px;font:400 12px/1.3 var(--spire-font);color:var(--spire-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px}
.spire-menu button {display:flex;align-items:center;gap:10px;width:100%;margin:0;border:0;border-radius:10px;background:none;padding:9px 10px;color:var(--spire-ink);text-align:left;font:500 14px/1.2 var(--spire-font);cursor:pointer;transition:background-color .15s ease-out}
.spire-menu button:hover {background:var(--spire-paper)}
.spire-menu button svg {flex:none;color:var(--spire-muted)}
.spire-menu .spire-primary,.spire-menu .spire-primary:hover {background:var(--spire-coral);color:#fff}
.spire-menu .spire-primary:hover {background:var(--spire-coral-deep)}
.spire-menu .spire-primary svg {color:#fff}
.spire-note {margin:2px 10px 6px;font:400 12.5px/1.45 var(--spire-font);color:var(--spire-muted)}
.spire-sep {height:1px;margin:2px 6px;background:var(--spire-line)}
.spire-bubble {width:min(360px,calc(100vw - 16px));max-height:calc(100vh - 16px);overflow:auto;padding:16px 18px 18px;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--spire-line) transparent}
.spire-bubble button {display:inline-flex;align-items:center;justify-content:center;height:34px;border:0;border-radius:10px;background:var(--spire-card);box-shadow:inset 0 0 0 1px var(--spire-line);color:var(--spire-ink);padding:0 12px;cursor:pointer;font:500 13px/1 var(--spire-font);transition:background-color .15s ease-out,box-shadow .15s ease-out,transform .1s ease-out}
.spire-bubble button:hover {box-shadow:inset 0 0 0 1px #cfccc4;background:#fcfbf9}
.spire-bubble button:active,.spire-menu button:active {transform:scale(.98)}
.spire-bubble button:disabled {opacity:.45;cursor:default;transform:none}
.spire-bubble .spire-primary {background:var(--spire-coral);box-shadow:none;color:#fff}
.spire-bubble .spire-primary:hover:not(:disabled) {background:var(--spire-coral-deep);box-shadow:none}
.spire-menu button:focus-visible,.spire-bubble button:focus-visible,.spire-bubble summary:focus-visible {outline:2px solid var(--spire-ink);outline-offset:2px}
.spire-bubble .spire-link {height:auto;padding:0;margin-top:12px;background:none;box-shadow:none;color:var(--spire-muted);font-weight:400;text-decoration:underline;text-underline-offset:3px}
.spire-bubble .spire-link:hover {background:none;box-shadow:none;color:var(--spire-ink)}
.spire-meta {display:flex;align-items:center;justify-content:space-between;gap:12px;font:500 12px/1.3 var(--spire-font)}
.spire-provenance {color:var(--spire-muted);font:500 12px/1.3 var(--spire-font)}
.spire-level {display:inline-flex;align-items:center;gap:7px;color:var(--spire-ink-2);font:500 12.5px/1.3 var(--spire-font)}
.spire-level:before {content:"";flex:none;width:8px;height:8px;border-radius:50%;background:var(--spire-gold)}
.spire-level[data-level="important"]:before {background:var(--spire-coral-bright);box-shadow:0 0 0 3px rgba(224,97,74,.18)}
.spire-level[data-level="marunt"]:before {background:#8b90a8}
.spire-bubble h2 {margin:10px 0 6px;font:600 17px/1.3 var(--spire-font);letter-spacing:-.012em;text-wrap:balance;color:var(--spire-ink)}
.spire-bubble h2:first-child {margin-top:0}
.spire-bubble p {margin:6px 0;color:var(--spire-ink-2);overflow-wrap:anywhere}
.spire-bubble p:empty {margin:0}
.spire-bubble ul {margin:8px 0;padding-left:18px;color:var(--spire-ink-2)}
.spire-bubble li+li {margin-top:4px}
.spire-bubble details {margin:12px 0 4px;padding:10px 12px;border-radius:12px;background:var(--spire-paper)}
.spire-bubble summary {cursor:pointer;font:500 13.5px/1.3 var(--spire-font);color:var(--spire-ink);border-radius:6px}
.spire-bubble summary::marker {color:var(--spire-muted)}
.spire-bubble .spire-busy {display:flex;align-items:center;gap:10px;margin:2px 0 12px;color:var(--spire-ink)}
.spire-busy::before {content:"";flex:none;width:14px;height:14px;border-radius:50%;border:2px solid var(--spire-line);border-top-color:var(--spire-ink);animation:spire-spin .8s linear infinite}
@keyframes spire-spin {to{transform:rotate(360deg)}}
.spire-row {display:flex;gap:8px;align-items:center;margin-top:16px}
.spire-progress {flex:1;display:flex;align-items:center;gap:10px;color:var(--spire-muted);font:500 12.5px/1 var(--spire-font);font-variant-numeric:tabular-nums}
.spire-steps {display:flex;gap:4px}
.spire-steps i {width:6px;height:6px;border-radius:3px;background:var(--spire-line);transition:width .3s var(--spire-ease),background-color .3s ease-out}
.spire-steps i.done {background:var(--spire-ink-2)}
.spire-steps i.now {width:16px;background:var(--spire-ink)}
/* bara de jos se golește până trece singur la următoarea observație; se oprește cât stai pe balon */
.spire-timer {display:block;height:2px;margin:16px -18px -18px;background:var(--spire-ink);opacity:.22;transform-origin:left center}
.spire-question {display:grid;gap:8px;margin-top:6px;font:500 14px/1.4 var(--spire-font);color:var(--spire-ink)}
.spire-question input {width:100%;height:40px;padding:0 12px;border:1px solid var(--spire-line);border-radius:10px;background:#fff;color:var(--spire-ink);font:400 14px var(--spire-font);transition:border-color .15s ease-out,box-shadow .15s ease-out}
.spire-question input:focus {outline:none;border-color:var(--spire-ink);box-shadow:0 0 0 3px rgba(27,35,80,.12)}
.spire-question input::placeholder {color:var(--spire-muted)}
.spire-options {display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 12px}
.spire-options button {height:30px;padding:0 10px;font-weight:400;color:var(--spire-ink-2)}
.spire-stage {display:block}
.spire-intro {font-size:13.5px;line-height:1.45;color:var(--spire-ink-2)!important;margin:12px 0 4px!important}
.spire-step {font:500 12px/1.3 var(--spire-font)!important;color:var(--spire-muted)!important;margin:14px 0 6px!important;font-variant-numeric:tabular-nums}
.spire-ask {font:600 17px/1.3 var(--spire-font);letter-spacing:-.012em;color:var(--spire-ink);text-wrap:balance}
.spire-answers {display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.spire-bubble .spire-answer {display:inline-flex;align-items:baseline;gap:6px;max-width:100%;height:auto;padding:5px 9px;border-radius:8px;background:var(--spire-paper);box-shadow:none;font:400 12.5px/1.3 var(--spire-font);text-align:left}
.spire-bubble button.spire-answer:hover {background:var(--spire-paper-2);box-shadow:none}
.spire-answer strong {flex:none;font-weight:500;color:var(--spire-muted)}
.spire-answer span {min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;color:var(--spire-ink);font-weight:500}
.spire-recap {display:grid;gap:6px;margin:10px 0 2px}
.spire-recap .spire-answer {display:flex;width:100%;padding:8px 10px}
.spire-recap .spire-answer strong {width:72px}
.spire-recap .spire-answer span {max-width:none;white-space:normal;overflow-wrap:anywhere}
.spire-row-end {justify-content:flex-end}
.spire-bubble .spire-quiet {background:none;box-shadow:none;color:var(--spire-ink-2)}
.spire-bubble .spire-quiet:hover {background:var(--spire-paper);box-shadow:none}
.spire-note-line {font-size:12.5px;color:var(--spire-ink-2)!important;margin:10px 0 0!important}
.spire-actions {display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.spire-actions .spire-primary {flex-basis:100%;height:40px;font-size:14px}
.spire-bubble .spire-actions button:not(.spire-primary) {height:30px;padding:0 8px;background:none;box-shadow:none;color:var(--spire-ink-2);white-space:nowrap}
.spire-bubble .spire-actions button:not(.spire-primary):hover {background:var(--spire-paper);box-shadow:none;color:var(--spire-ink)}
.spire-stage > h2:first-child {margin-top:12px}
.spire-question .spire-note {margin:0 0 4px;font-size:13px;font-weight:400;color:var(--spire-muted)}
.spire-crit-outline {position:fixed;border:2px solid var(--spire-coral-bright);border-radius:8px;background:rgba(224,97,74,.05);box-shadow:0 0 0 4px rgba(224,97,74,.14);pointer-events:none;animation:spire-outline .45s var(--spire-ease)}
@keyframes spire-outline {from{opacity:0;transform:scale(1.04)} to{opacity:1;transform:none}}
@media(prefers-reduced-motion:reduce){
  .spire-pose,.spire-body,.mascot-wing,.mascot-head,.mascot-tail,.mascot-dots circle,.mascot-search,.mascot-search-eye,.spire-shadow {transition:none!important;animation:none!important}
  .mascot-bit {animation-duration:1ms!important}
  .spire-pose.show svg,.perched .spire-pose.show svg {animation:none!important}
  .spire-menu:not([hidden]),.spire-bubble:not([hidden]) {animation:spire-fade .15s ease-out}
  .spire-crit-outline {animation:none}
}
@keyframes spire-fade {from{opacity:0}}
`);
  shadow.adoptedStyleSheets = [sheet];

  // Fontul aplicației (Geist), din pachetul extensiei. @font-face nu se aplică dintr-un shadow root,
  // așa că îl adăugăm în document sub un nume propriu („Spire Geist”), fără să atingem fonturile
  // paginii. Dacă nu se poate (extensie reîncărcată, test fără chrome.runtime), rămâne fontul sistemului.
  try {
    [["fonts/geist-latin.woff2", "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"],
     ["fonts/geist-latin-ext.woff2", "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF"]].forEach(function (f) {
      var face = new FontFace("Spire Geist", "url(" + chrome.runtime.getURL(f[0]) + ") format('woff2')", { weight: "100 900", unicodeRange: f[1], display: "swap" });
      document.fonts.add(face);
      face.load().catch(function () {});
    });
  } catch (_) { /* fără fontul propriu */ }

  // Iconițele: un singur traseu SVG, linie de 1,6 px, desenate element cu element prin DOM.
  var ICONS = {
    crop: "M4.5 1.5v10h10M1.5 4.5h10v10",
    collapse: "M5.5 3.5 10 8l-4.5 4.5M13.5 2.5v11",
    close: "M3.5 3.5l9 9M12.5 3.5l-9 9",
    critique: "M11.5 7a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10.3 10.3l3.7 3.7",
    campaign: "M8 2 14 5.2 8 8.4 2 5.2ZM2 8.4l6 3.2 6-3.2M2 11.4l6 3.2 6-3.2",
    inspire: "M8 1.8v3M8 11.2v3M1.8 8h3M11.2 8h3M3.6 3.6l2 2M10.4 10.4l2 2M12.4 3.6l-2 2M5.6 10.4l-2 2",
    back: "M10 3.5 5.5 8l4.5 4.5",
    expand: "M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10",
    copy: "M5.5 5.5h8v8h-8ZM10.5 5.5v-3h-8v8h3",
  };
  function icon(name) {
    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 16 16"); svg.setAttribute("width", "16"); svg.setAttribute("height", "16");
    svg.setAttribute("aria-hidden", "true"); svg.setAttribute("fill", "none");
    var path = document.createElementNS(NS, "path");
    path.setAttribute("d", ICONS[name]); path.setAttribute("stroke", "currentColor"); path.setAttribute("stroke-width", "1.6");
    path.setAttribute("stroke-linecap", "round"); path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
    return svg;
  }
  function mark() {
    var m = document.createElement("span"); m.className = "spire-mark"; m.setAttribute("aria-hidden", "true");
    return m;
  }

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
  var brand = document.createElement("span");
  brand.className = "spire-brand";
  brand.append(mark(), "Spire");
  bar.appendChild(brand);

  // Mesajele scurte (erori, indicații), sub bară; ascunse cât sunt goale. Doar textContent.
  var status = document.createElement("p");
  status.className = "spire-status";
  status.setAttribute("role", "status");

  // Inspire: alegi o zonă din pagină, iar Spire o recreează în HTML/CSS, aici în panou.
  var inspireButton = document.createElement("button");
  inspireButton.type = "button";
  inspireButton.className = "spire-button";
  inspireButton.append(icon("inspire"), "Inspire");
  inspireButton.setAttribute("aria-label", "Inspire: recreează o zonă din pagină");
  inspireButton.addEventListener("click", function () { startInspire(); });
  bar.appendChild(inspireButton);

  // „Strânge”: panoul se ascunde (visibility, deci iframe-ul rămâne încărcat cu starea aplicației)
  // și în locul lui rămâne o filă îngustă la marginea dreaptă. Pagina de sub panou devine clicabilă.
  var collapseButton = document.createElement("button");
  collapseButton.type = "button";
  collapseButton.className = "spire-button spire-icon-button";
  collapseButton.appendChild(icon("collapse"));
  collapseButton.title = "Strânge";
  collapseButton.setAttribute("aria-label", "Strânge panoul Spire");
  bar.appendChild(collapseButton);

  var close = document.createElement("button");
  close.type = "button";
  close.className = "spire-button spire-icon-button spire-close";
  close.appendChild(icon("close"));
  close.title = "Închide Spire";
  close.setAttribute("aria-label", "Închide Spire");
  close.addEventListener("click", function () {
    host.style.setProperty("display", "none", "important");
  });
  bar.appendChild(close);
  panel.appendChild(bar);
  panel.appendChild(status);

  var iframe = document.createElement("iframe");
  iframe.className = "spire-frame";
  iframe.title = "Spire";

  // fullscreen: videoclipul din panou se poate deschide pe tot ecranul
  iframe.allow = "clipboard-write; fullscreen";
  panel.appendChild(iframe);

  // Panoul și iframe-ul se atașează doar la alegerea campaniei.
  var appReady = false, campaignOpened = false;
  var latestCritique = null;
  var latestCritiques = null, latestBriefTitle = "";
  function ensureApp(forCritique) {
    if (!panel.isConnected) {
      panel.hidden = true;
      iframe.src = config.APP_URL + "/nou?din=extensie&hostOrigin=" + encodeURIComponent(location.origin) + (forCritique ? "&critique=1" : "");
      shadow.appendChild(panel);
    }
  }
  // Aplicația nu răspunde (ex. `npm run dev` oprit): în loc de pagina de eroare a browserului,
  // panoul spune ce s-a întâmplat și oferă reîncercarea.
  var offline = document.createElement("div");
  offline.className = "spire-offline"; offline.hidden = true; offline.setAttribute("role", "alert");
  var offlineTitle = document.createElement("h2"); offlineTitle.textContent = "Nu ajung la aplicația Spire";
  var offlineText = document.createElement("p");
  offlineText.textContent = "Verifică dacă aplicația rulează la " + config.APP_URL.replace(/^https?:\/\//, "") + (/localhost|127\.0\.0\.1/.test(config.APP_URL) ? " (în proiect: npm run dev)" : "") + ", apoi încearcă din nou.";
  var offlineRetry = document.createElement("button"); offlineRetry.type = "button"; offlineRetry.textContent = "Încearcă din nou";
  offline.append(offlineTitle, offlineText, offlineRetry);
  panel.insertBefore(offline, iframe);
  var offlineTimer = 0;
  function setOffline(on) {
    offline.hidden = !on; panel.classList.toggle("spire-panel-offline", on);
  }
  function watchApp() {
    clearTimeout(offlineTimer);
    if (appReady) return setOffline(false);
    offlineTimer = setTimeout(function () { if (!appReady) setOffline(true); }, 6000);
  }
  offlineRetry.addEventListener("click", function () {
    setOffline(false); appReady = false;
    iframe.src = iframe.src; // reîncarcă aplicația
    watchApp();
  });
  function openCampaign() {
    stopCritique();
    if (inspirePanel) { inspireToken++; inspirePanel.hidden = true; panel.classList.remove("spire-panel-inspire"); }
    campaignOpened = true;
    ensureApp(); panel.hidden = false;
    setCollapsed(false);
    dodgePanel();
    watchApp();
    if (appReady) sendBrief();
  }

  var tab = document.createElement("button");
  tab.type = "button";
  tab.className = "spire-tab";
  var tabText = document.createElement("span");
  tabText.className = "spire-tab-text";
  tabText.textContent = "Spire";
  tab.append(mark(), tabText);
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
  // umbra de sub gheare: stă pe element cât uliul e așezat (în afara corpului, nu se rotește cu el)
  var perchShadow = document.createElement("span");
  perchShadow.className = "spire-shadow";
  bird.appendChild(perchShadow);
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
  var mood = "idle", wingState = "perched", facing = 1;
  function pose(m) { var changed = m !== mood; mood = m; refreshPose(changed); }
  // La o stare nouă, desenul nou „se umflă” scurt din corp: schimbarea se vede, nu doar se înlocuiește.
  function refreshPose(pop) {
    var p = bird.classList.contains("perched") ? "perched" : "flying", shown = null;
    body.querySelectorAll(".spire-pose").forEach(function (el) {
      var on = el.dataset.mood === mood && el.dataset.pose === p;
      el.classList.toggle("show", on);
      if (on) shown = el;
    });
    if (pop && shown && shown.animate && !motion.matches) {
      shown.animate([{ transform: "scale(.9)", opacity: 0.4 }, { transform: "none", opacity: 1 }], { duration: 300, easing: "cubic-bezier(.16,1,.3,1)" });
    }
  }
  function wings(c) {
    if (c === wingState && bird.classList.contains(c)) return; // în zbor se cere la fiecare cadru
    wingState = c;
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
  function button(parent, label, fn, primary, iconName) {
    var b = document.createElement("button");
    b.type = "button";
    if (iconName) b.appendChild(icon(iconName));
    b.append(label);
    if (primary) b.className = "spire-primary";
    b.addEventListener("click", fn); parent.appendChild(b);
    return b;
  }
  var menuHead = document.createElement("div");
  menuHead.className = "spire-menu-head";
  var menuTitle = document.createElement("span");
  line(menuTitle, "b", "Spire");
  line(menuTitle, "small", location.hostname.replace(/^www\./, ""));
  menuHead.append(mark(), menuTitle);
  menu.appendChild(menuHead);
  button(menu, "Inspire", function () { menu.hidden = true; startInspire(); }, false, "campaign");
  line(menu, "p", "Selectează ceva ce îți place. Trimit selecția la AI și o recreez în cod.", "spire-note");
  button(menu, "Critică pagina", function () { menu.hidden = true; critique(); }, true, "critique");
  line(menu, "p", "Trimite la AI o captură a ecranului și textele din ea.", "spire-note");
  line(menu, "div", "", "spire-sep");
  var resumeBriefButton = button(menu, "Continuă brief-ul", function () {
    if (!latestCritiques) return;
    currentAnswers(); stopCritique(); menu.hidden = true;
    showBubble(null, 0, 0, globalThis.SpireCritique.summarySentence(latestCritiques));
    void showBrief(latestCritiques, latestBriefTitle);
  }, false, "campaign");
  resumeBriefButton.hidden = true; resumeBriefButton.style.display = "none";
  button(menu, "Fă o campanie", function () { menu.hidden = true; openCampaign(); }, false, "campaign");
  button(menu, "Închide Spire", function () { stopCritique(); menu.hidden = true; host.style.setProperty("display", "none", "important"); }, false, "close");
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
    var left = r.right + 6 + w > innerWidth;
    var x = left ? r.left - w - 6 : r.right + 6;
    el.dataset.side = left ? "left" : "right";
    el.style.left = Math.max(8, Math.min(innerWidth - w - 8, x)) + "px";
    el.style.top = Math.max(8, Math.min(innerHeight - h - 8, r.top - 10)) + "px";
  }
  function place(x, y, rot, sx, sy) {
    bird.style.transform = "translate(" + (x - S / 2) + "px," + (y - S * .78) + "px)";
    body.style.transform = "rotate(" + (rot || 0) + "deg) scale(" + ((sx || 1) * facing).toFixed(3) + "," + (sy || 1) + ")";
    if (!bubble.hidden) positionPopup(bubble);
    if (!menu.hidden) positionPopup(menu);
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms * speed); }); }
  // Cât panoul e deschis, uliul stă pe pagină, în stânga lui, nu peste el.
  function panelLeft() {
    return panel.isConnected && !panel.hidden && !panel.classList.contains("spire-panel-collapsed") ? Math.min(innerWidth, panel.getBoundingClientRect().left) : innerWidth;
  }
  function clampPoint(p) {
    return { x: Math.max(75, Math.min(panelLeft() - 75, p.x)), y: Math.max(115, Math.min(innerHeight - 30, p.y)) };
  }
  function dodgePanel() {
    var safe = clampPoint(pos);
    if (Math.abs(safe.x - pos.x) < 2) return;
    void takeoff().then(function () { return fly(safe, 800, .25); }).then(function (ok) { if (ok) return land(); });
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
        // se întoarce cu fața spre unde zboară: scaleX trece prin 0, ca o rotire pe loc
        if (Math.abs(vx) > .4) facing += ((vx < 0 ? -1 : 1) - facing) * .32;
        if (t > .35 && t < .7) wings("glide"); else if (t >= .7 && t < .9) wings("flap"); else if(t >= .9) wings("flare");
        var bob = Math.sin(now/90)*(t<.9?2:0); pos={x:x,y:y+bob}; place(x,y+bob,ang);
        if(t<1) requestAnimationFrame(step); else { pos=to; ang=0; facing=facing<0?-1:1; resolve(true); }
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
      if (mode === "roam" && menu.hidden && bubble.hidden && host.style.display !== "none" && (!panel.isConnected || panel.hidden)) {
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
        if(token===run && mode==="roam" && menu.hidden && bubble.hidden && host.style.display!=="none" && (!panel.isConnected || panel.hidden)) {
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
      var zone=/^(nav|header|section|article|footer)$/.test(tag) || /^(navigation|region|banner|contentinfo)$/.test(current.getAttribute("role") || "");
      var semanticText=zone || /^(a|button|label|summary|h[1-6])$/.test(tag) || /^(button|link|heading)$/.test(current.getAttribute("role") || "");
      var text=normalize(semanticText ? current.innerText : directText(current),120);
      if(tag==="h1") h1++;
      if(tag==="img" && !current.hasAttribute("alt")) missing++;
      if(elements.length>=200) continue;
      var role=current.getAttribute("role") || (tag==="button" || (tag==="input" && /^(button|submit|reset)$/.test(current.type)) ? "button" : tag==="a" && current.hasAttribute("href") ? "link" : /^h[1-6]$/.test(tag) ? "heading" : tag==="img" ? "img" : "");
      if(zone && !role) role=tag==="nav"?"navigation":tag==="header"?"banner":tag==="footer"?"contentinfo":"region";
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
      elements.push({id:id,tag:tag.slice(0,50),role:role.slice(0,100),text:text,accessibleName:name,fontSizePx:size,fontWeight:weight,color:cs.color,background:effectiveBackground(current),
        box:{x:r.left,y:r.top,w:r.width,h:r.height},inFirstScreen:r.bottom>0 && r.right>0 && r.top<innerHeight && r.left<innerWidth,
        isLink:role==="link",href:tag==="a"?current.href.slice(0,2000):null,isButtonLike:fake,isImage:tag==="img" || role==="img",
        alt:current.getAttribute("alt")===null?null:current.getAttribute("alt").slice(0,1000),isHeadingLike:!/^h[1-6]$/.test(tag) && role!=="heading" && (size>=20 || (size>=18 && weight>=700))});
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
    return {page:{url:location.href,title:document.title.slice(0,300),lang:document.documentElement.lang.slice(0,100),metaDescription:meta?meta.content.slice(0,2000):"",jsonLdTypes:types.slice(0,100).map(function(t){return t.slice(0,100);}),h1Count:h1,imagesWithoutAlt:missing},elements:elements};
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
    cancelAiCritique();
    tour++; run++; mode="roam"; outlined=null; outline.hidden=true; bubble.hidden=true;
    if(resumeBubble) resumeBubble();
    wings("perched");
  }
  function line(parent, tag, text, cls) {
    var el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;parent.appendChild(el);return el;
  }
  // Răspunsurile aparțin extensiei, separat pentru fiecare origine a site-ului.
  var memoryKey = "spire:brief:" + location.origin;
  var briefAnswers = {}, answerInputs = {}, memoryVersion = 0;
  var memoryError = "", hasMemory = false;
  var memoryReady = readMemory();
  function cleanAnswers(value) {
    var out = {};
    ["product", "audience", "goal", "cta"].forEach(function (key) {
      if (value && typeof value[key] === "string" && value[key].length <= 500) out[key] = value[key];
    });
    return out;
  }
  async function readMemory() {
    var version = memoryVersion;
    try {
      var stored = await chrome.storage.local.get(memoryKey);
      if (version === memoryVersion) briefAnswers = cleanAnswers(stored[memoryKey]);
      hasMemory = Object.keys(cleanAnswers(stored[memoryKey])).length > 0;
    } catch (_) { memoryError = "Nu pot citi răspunsurile păstrate."; }
  }
  function currentAnswers() {
    Object.keys(answerInputs).forEach(function (key) { briefAnswers[key] = answerInputs[key].value.slice(0, 500); });
    return cleanAnswers(briefAnswers);
  }
  // Fotografiile pentru video: cele mai mari imagini din pagină (<img> și fundaluri CSS), de pe același
  // domeniu, micșorate la 960 px. Cele de pe alt domeniu fără CORS murdăresc canvasul și se sar.
  // Contractul: MAX_BRIEF_PHOTOS și MAX_BRIEF_PHOTO din src/lib/extensionBridge.ts.
  var MAX_BRIEF_PHOTOS = 6, MAX_BRIEF_PHOTO = 400000, PHOTO_SIDE = 960;
  var photosPromise = null;
  // aceeași fotografie în altă mărime (WordPress: -655x545, -scaled) contează o singură dată
  function photoKey(url) { return url.replace(/[?#].*$/, "").replace(/-(\d+x\d+|scaled)(?=\.\w+$)/g, ""); }
  function photoCandidates() {
    var seen = {}, out = [];
    function add(url) {
      if (!url) return;
      try { url = new URL(url, location.href).href; } catch (_) { return; }
      if (!/^https?:/i.test(url) || /\.(svg|gif)(\?|$)/i.test(url) || seen[photoKey(url)]) return;
      seen[photoKey(url)] = true; out.push(url);
    }
    document.querySelectorAll("img").forEach(function (img) {
      if (img.closest && img.closest("#" + ROOT_ID)) return;
      if (img.complete && img.naturalWidth && (img.naturalWidth < 400 || img.naturalHeight < 260)) return;
      // sliderele și încărcarea leneșă țin adresa în data-src până apare imaginea
      add(img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || img.currentSrc || img.src);
    });
    var nodes = document.querySelectorAll("body *");
    for (var i = 0; i < nodes.length && i < 4000; i++) {
      var bg = getComputedStyle(nodes[i]).backgroundImage;
      var m = bg && bg !== "none" && bg.match(/url\(["']?([^"')]+)["']?\)/);
      var r = nodes[i].getBoundingClientRect();
      if (m && r.width >= 300 && r.height >= 200) add(m[1]);
    }
    return out.slice(0, 16);
  }
  async function photoData(url) {
    var img = new Image();
    if (new URL(url).origin !== location.origin) img.crossOrigin = "anonymous";
    img.src = url;
    await img.decode();
    var w = img.naturalWidth, h = img.naturalHeight;
    if (w < 400 || h < 260 || w / h > 3 || h / w > 2.5) return null; // logo-uri, iconițe, benzi
    var scale = Math.min(1, PHOTO_SIDE / Math.max(w, h));
    var canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    var data = canvas.toDataURL("image/jpeg", 0.78); // aruncă dacă imaginea e de pe alt domeniu fără CORS
    if (data.length > MAX_BRIEF_PHOTO) data = canvas.toDataURL("image/jpeg", 0.6);
    return data.length <= MAX_BRIEF_PHOTO ? { data: data, png: /\.png(\?|$)/i.test(url) } : null;
  }
  function collectPhotos() {
    if (!photosPromise) photosPromise = (async function () {
      var loaded = await Promise.all(photoCandidates().map(function (url) { return photoData(url).catch(function () { return null; }); }));
      // în ordinea din pagină; PNG-urile (de obicei logo-uri și grafică) doar dacă lipsesc fotografiile
      var ok = loaded.filter(Boolean);
      return ok.filter(function (p) { return !p.png; }).concat(ok.filter(function (p) { return p.png; })).slice(0, MAX_BRIEF_PHOTOS).map(function (p) { return p.data; });
    })();
    return photosPromise;
  }
  async function sendBrief() {
    if (!campaignOpened || !appReady || !iframe.contentWindow || !/^https?:$/.test(location.protocol)) return;
    var photos = await collectPhotos().catch(function () { return []; });
    if (!iframe.contentWindow) return;
    iframe.contentWindow.postMessage({ type: "spire:brief", brief: {
      source: { url: location.href, title: document.title.slice(0, 300) }, answers: currentAnswers(), critique: latestCritique || undefined,
      photos: photos.length ? photos : undefined
    } }, config.APP_ORIGIN);
  }
  // Brieful, ca o conversație: o singură întrebare pe ecran. Răspunsurile date rămân sus, ca
  // etichete scurte; un clic pe una te întoarce la întrebarea ei. La final, un rezumat și pasul următor.
  var ANSWER_LABELS = { product: "Produs", audience: "Public", goal: "Obiectiv", cta: "Buton" };
  // Previzualizare locală: doar proprietăți CSS permise, niciodată cod executat din răspunsul AI.
  var critiqueEdits = [], critiqueAfter = false;
  var marinaSite = /(^|\.)marinapark\.ro$/i.test(location.hostname);
  var marinaPreviewStyle = null;
  // Variantă de demo aleasă de echipă pentru Marina Park, nu design generat de AI.
  var marinaPreviewCss = `
    .site-header.main-header { background:#fbfaf6!important; position:relative!important; color:#163e43!important; box-shadow:0 2px 24px #143e4310!important; }
    .site-header .top-header-bar { background:#163e43!important; color:#fbfaf6!important; border:0!important; }
    .site-header .top-header-bar a,.site-header .top-header-bar span { color:#fbfaf6!important; }
    .site-header .top-header-bar__row { min-height:36px!important; padding-block:6px!important; }
    .site-header .date-time-widget { display:none!important; }
    .site-header .header-block { background:#fbfaf6!important; }
    .site-header .header-block__row--main { min-height:104px!important; padding-block:12px!important; }
    .site-header .header-logo img { object-fit:contain!important; }
    .site-header nav > ul.menu { display:flex!important; flex-wrap:wrap!important; align-items:center!important; gap:4px 18px!important; }
    .site-header nav > ul.menu > li { margin:0!important; padding:0!important; }
    .site-header nav > ul.menu > li > a { display:flex!important; align-items:center!important; min-height:44px!important; padding:8px 0!important; background:transparent!important; border:0!important; border-radius:0!important; color:#163e43!important; font:500 14px/1.3 Heebo,Arial,sans-serif!important; text-transform:none!important; letter-spacing:0!important; }
    .site-header nav > ul.menu > li > a span { color:inherit!important; }
    .site-header nav > ul.menu > li > a::after { background:#bf713e!important; }
    .site-header nav > ul.menu > li.menu-item-1603 > a { background:#163e43!important; color:#fff!important; padding:12px 18px!important; border-radius:6px!important; }
    .site-header nav .sub-menu { background:#fbfaf6!important; border:1px solid #dce5df!important; border-radius:8px!important; box-shadow:0 16px 40px #143e4320!important; }
    .site-header nav .sub-menu a { color:#163e43!important; font:400 14px/1.5 Heebo,Arial,sans-serif!important; padding:12px 18px!important; }
    .homepage-intro { background:#fbfaf6!important; padding-top:72px!important; padding-bottom:64px!important; }
    .homepage-rooms { background:#edf3ef!important; padding-top:72px!important; padding-bottom:72px!important; }
    .homepage-reviews { background:#fbfaf6!important; padding-top:64px!important; padding-bottom:48px!important; }
    .homepage-events { background:#edf3ef!important; padding-top:64px!important; padding-bottom:64px!important; }
    .homepage-intro h2,.homepage-rooms h2,.homepage-reviews h2 { color:#163e43!important; font-family:Trirong,Georgia,serif!important; font-weight:400!important; font-size:clamp(28px,3.1vw,46px)!important; line-height:1.22!important; letter-spacing:-.6px!important; max-width:900px!important; margin:0 auto 28px!important; text-align:center!important; }
    .homepage-intro p { color:#435b5d!important; font:400 17px/1.8 Heebo,Arial,sans-serif!important; max-width:780px!important; margin:0 auto 20px!important; }
    .homepage-intro .service-icons { margin-top:36px!important; padding-top:28px!important; border-top:1px solid #dce5df!important; }
    .homepage-rooms .portfolio-item .item-box { overflow:hidden!important; border-radius:12px!important; background:#fff!important; box-shadow:0 8px 28px #163e4310!important; }
    .homepage-rooms .portfolio-item .info { padding:24px!important; background:#fff!important; }
    .homepage-rooms .portfolio-item h3 { margin:0 0 10px!important; font:500 21px/1.35 Heebo,Arial,sans-serif!important; }
    .homepage-rooms .portfolio-item h3 a { color:#163e43!important; background:transparent!important; }
    .homepage-rooms .portfolio-item .terms,.homepage-rooms .portfolio-item .terms a { color:#667a75!important; font:400 13px/1.5 Heebo,Arial,sans-serif!important; }
    .site-footer.main-footer { background:#163e43!important; color:#f6f5ee!important; padding-top:56px!important; padding-bottom:40px!important; }
    .site-footer.main-footer a,.site-footer.main-footer h2 { color:#f6f5ee!important; }
    @media(min-width:1200px) { .site-header .header-block__row-container { width:calc(100% - 80px)!important; max-width:1440px!important; } }
    @media(max-width:767px) { .homepage-intro,.homepage-rooms,.homepage-reviews,.homepage-events { padding-top:40px!important; padding-bottom:40px!important; } .homepage-intro p { font-size:16px!important; } }
  `;
  function critiqueZone(el) {
    if (!el || !el.closest) return null;
    var semantic = el.closest('nav,[role="navigation"]') || el.closest('section,article,header,footer,[role="region"],[role="banner"]');
    if (semantic) return semantic;
    // Site-urile fără HTML semantic: căutăm ansamblul, niciodată un singur link.
    for (var node = el, depth = 0; node && depth < 6; node = node.parentElement, depth++) {
      if (node.matches('body,main,html')) break;
      if (node.children.length < 2) continue;
      if (node.querySelectorAll('a[href],button').length >= 2 || (node.querySelector('h1,h2,h3') && node.querySelector('p'))) return node;
    }
    return null;
  }
  function groupZoneCritiques(crits) {
    var grouped = [], seen = new Set();
    crits.forEach(function(c) {
      var target = critiqueElements.get(c.elementId), zone = critiqueZone(target);
      if (!zone) { grouped.push(c); return; }
      if (seen.has(zone)) return;
      seen.add(zone);
      var zoneId = c.elementId;
      if (zone !== target) {
        zoneId = "crit-zone-" + grouped.length;
        critiqueElements.set(zoneId, zone);
      }
      grouped.push(Object.assign({}, c, { elementId: zoneId }));
    });
    return grouped;
  }
  function planCritiqueEdits(crits) {
    var edits = [], seen = new Set();
    function add(el, property, value) {
      var key = edits.filter(function(e) { return e.el === el && e.property === property; });
      if (!key.length && el.style.getPropertyValue(property) !== value) edits.push({ el: el, property: property, value: value,
        before: el.style.getPropertyValue(property), priority: el.style.getPropertyPriority(property) });
    }
    crits.forEach(function(c) {
      var el = critiqueZone(critiqueElements.get(c.elementId));
      if (!el || !el.isConnected || seen.has(el) || !el.style) return;
      seen.add(el);
      var navigation = el.matches('nav,[role="navigation"],ul,ol') || (!el.querySelector('h1,h2,h3,p') && el.querySelectorAll('a[href]').length >= 2);
      var region = el.children.length > 1 || el.matches('nav,header,section,article,footer,[role="navigation"],[role="region"],[role="banner"]');
      if (region) {
        // Respectăm structura și ordinea existente; ajustăm ansamblul, fără să refacem layout-ul.
        add(el, "padding-block", navigation ? "16px" : "32px");
        if (/flex|grid/.test(getComputedStyle(el).display)) add(el, "gap", "24px");
        if (navigation) {
          add(el, "display", "flex"); add(el, "flex-wrap", "wrap"); add(el, "align-items", "center"); add(el, "gap", "24px");
        }
        Array.from(el.querySelectorAll('ul,ol')).slice(0, 6).forEach(function(list) {
          if (!navigation && !list.closest('nav,[role="navigation"]')) return;
          add(list, "display", "flex"); add(list, "flex-wrap", "wrap"); add(list, "align-items", "center");
          add(list, "gap", "24px"); add(list, "list-style", "none"); add(list, "padding", "0"); add(list, "margin", "0");
        });
        var primary = Array.from(el.querySelectorAll('a.cta,a[class*="primary"],button,[role="button"]')).find(function(child) {
          return !navigation && !child.closest('nav,[role="navigation"]') && child.getClientRects().length;
        });
        var children = el.querySelectorAll('h1,h2,h3,p,a[href],button');
        Array.from(children).slice(0, 40).forEach(function(child) {
          var style = getComputedStyle(child);
          if (style.display === "none" || style.visibility === "hidden" || !child.getClientRects().length) return;
          if (/^H[1-3]$/.test(child.tagName)) {
            add(child, "font-weight", "700"); add(child, "line-height", "1.15"); add(child, "margin-bottom", "20px");
          } else if (child.tagName === "P") {
            add(child, "line-height", "1.6"); add(child, "max-width", "65ch");
          }
          if (parseFloat(style.fontSize) < 16) add(child, "font-size", "16px");
          if (child.matches('a[href],button')) {
            var menuItem = navigation || child.closest('nav,[role="navigation"]');
            if (!menuItem && child !== primary) return;
            add(child, "display", "inline-flex"); add(child, "align-items", "center");
            add(child, "min-height", "44px"); add(child, "padding", menuItem ? "8px 0" : "12px 24px");
            add(child, "font-weight", "600");
            if (menuItem) {
              add(child, "background-color", "transparent"); add(child, "color", "inherit"); add(child, "border-radius", "0");
            } else { add(child, "border-radius", "8px"); add(child, "background-color", "#172033"); add(child, "color", "#ffffff"); }
          }
        });
        return;
      }
    });
    return edits;
  }
  function setCritiquePreview(after) {
    if (marinaSite) {
      if (!marinaPreviewStyle) {
        marinaPreviewStyle = document.createElement("style");
        marinaPreviewStyle.setAttribute("data-spire-marina-preview", "true");
        marinaPreviewStyle.textContent = marinaPreviewCss;
        (document.head || document.documentElement).appendChild(marinaPreviewStyle);
      }
      marinaPreviewStyle.media = after ? "all" : "not all";
      critiqueAfter = after;
      return;
    }
    critiqueEdits.forEach(function(e) {
      if (!e.el.isConnected) return;
      if (after) e.el.style.setProperty(e.property, e.value, "important");
      else if (e.before) e.el.style.setProperty(e.property, e.before, e.priority);
      else e.el.style.removeProperty(e.property);
    });
    critiqueAfter = after;
  }
  function critiquePreviewControls(parent, crits) {
    if (!marinaSite && !critiqueEdits.length) critiqueEdits = planCritiqueEdits(crits);
    if (!marinaSite && !critiqueEdits.length) return;
    var area = line(parent, "div", "", "spire-preview-controls");
    line(area, "p", marinaSite ? "Previzualizare Marina Park — meniu, secțiuni și carduri. Modificările se aplică doar în această pagină." : "Ajustări pe zone: spațiere, ierarhie și lizibilitate. Previzualizare locală, până reîncarci pagina.", "spire-note");
    var toggle = button(area, critiqueAfter ? "Vezi înainte" : "Aplică ajustările", function() {
      setCritiquePreview(!critiqueAfter);
      toggle.textContent = critiqueAfter ? "Vezi înainte" : "Vezi după";
      status.textContent = critiqueAfter ? "După · ajustări aplicate local" : "Înainte · pagina originală";
    }, true);
    var status = line(area, "p", critiqueAfter ? "După · ajustări aplicate local" : "Aplică propunerea ca să vezi diferența pe pagină.", "spire-note-line");
    status.setAttribute("role", "status");
  }
  async function showBrief(crits, title) {
    await memoryReady;
    if (bubble.hidden || bubble.dataset.summary !== "true") return;
    var summary = globalThis.SpireCritique.summarySentence(crits);
    var questions = globalThis.SpireCritique.briefQuestions(crits.map(function (c) { return c.evidence && ["primary-action", "navigation"].includes(c.evidence.category) ? "link-vag" : c.ruleId; }), title);
    var questionIndex = 0, note = null, noteText = memoryError;
    function say(text) { noteText = text; if (note) note.textContent = text; }
    function revealAnswer(target) {
      positionPopup(bubble);
      bubble.scrollTop += Math.max(0, target.getBoundingClientRect().bottom - bubble.getBoundingClientRect().bottom + 16);
    }
    function go(index, keepNote) { if (!keepNote) noteText = ""; questionIndex = index; render(true); }
    function render(slide) {
      bubble.replaceChildren(); answerInputs = {};
      var meta = line(bubble, "div", "", "spire-meta");
      line(meta, "span", critiqueProvenance, "spire-provenance");
      var steps = line(meta, "span", "", "spire-steps"); steps.setAttribute("aria-hidden", "true");
      questions.forEach(function (_, k) { var d = document.createElement("i"); d.className = k < questionIndex ? "done" : k === questionIndex ? "now" : ""; steps.appendChild(d); });
      critiquePreviewControls(bubble, crits);
      var stage = line(bubble, "div", "", "spire-stage");
      if (slide && stage.animate && !motion.matches) stage.animate([{ opacity: 0, transform: "translateX(14px)" }, { opacity: 1, transform: "none" }], { duration: 280, easing: "cubic-bezier(.16,1,.3,1)" });
      if (questionIndex >= questions.length) renderDone(stage); else renderQuestion(stage);
      note = line(bubble, "p", noteText, "spire-note-line"); note.setAttribute("role", "status");
      if (hasMemory) {
        var forget = button(bubble, "Uită răspunsurile", async function () {
          try {
            await chrome.storage.local.remove(memoryKey); memoryVersion++; briefAnswers = {}; hasMemory = false;
            noteText = "Răspunsuri uitate."; go(0, true);
          } catch (_) { say("Nu am putut uita răspunsurile. Încearcă din nou."); }
        });
        forget.classList.add("spire-link");
      }
      positionPopup(bubble);
    }
    function renderQuestion(stage) {
      if (questionIndex === 0) line(stage, "p", "Am terminat. " + summary + " Acum câteva întrebări scurte pentru campanie.", "spire-intro");
      var given = questions.slice(0, questionIndex);
      if (given.length) {
        var chips = line(stage, "div", "", "spire-answers");
        given.forEach(function (q, k) {
          var chip = button(chips, "", function () { go(k); });
          chip.className = "spire-answer"; chip.title = "Schimbă răspunsul";
          line(chip, "strong", ANSWER_LABELS[q.id] || q.text); line(chip, "span", briefAnswers[q.id] || "");
        });
      }
      var q = questions[questionIndex];
      line(stage, "p", "Întrebarea " + (questionIndex + 1) + " din " + questions.length, "spire-step");
      var label = document.createElement("label"); label.className = "spire-question";
      line(label, "span", q.text, "spire-ask");
      var brandName = title.split(/[|—–]/)[0].trim().slice(0, 80) || location.hostname;
      var offerName = (briefAnswers.product || "această ofertă").slice(0, 90);
      var brandPrompts = {
        product: "La „" + brandName + "”, ce ofertă alegem, de ce ar prefera-o clientul și ce dovadă reală avem?",
        audience: "Cine ar alege „" + offerName + "” și ce nevoie principală vrea să rezolve?",
        goal: "Ce rezultat concret contează acum pentru „" + brandName + "” și în ce perioadă?",
        cta: "Ce pas poate face clientul imediat și unde trebuie să îl ducă butonul?",
      };
      var detail = line(label, "small", brandPrompts[q.id] || "", "spire-note");
      detail.id = "spire-brand-question-" + q.id;
      var input = document.createElement("input"); input.type = "text"; input.maxLength = 500;
      input.placeholder = q.options.length ? "Scrie sau alege mai jos" : "Scrie aici";
      input.value = briefAnswers[q.id] || ""; input.setAttribute("aria-label", q.text);
      input.setAttribute("aria-describedby", detail.id);
      answerInputs[q.id] = input; label.appendChild(input); stage.appendChild(label);
      function advance() {
        if (!input.value.trim()) return;
        memoryVersion++; briefAnswers[q.id] = input.value.trim(); go(questionIndex + 1);
      }
      if (q.options.length) {
        var options = line(stage, "div", "", "spire-options");
        q.options.forEach(function (option) { button(options, option, function () { input.value = option; advance(); }); });
      }
      var row = line(stage, "div", "", "spire-row spire-row-end");
      if (questionIndex > 0) button(row, "Înapoi", function () { currentAnswers(); go(questionIndex - 1); }).classList.add("spire-quiet");
      var next = button(row, "Continuă", advance, true);
      next.disabled = !input.value.trim();
      input.addEventListener("input", function () { memoryVersion++; briefAnswers[q.id] = input.value; next.disabled = !input.value.trim(); });
      input.addEventListener("keydown", function (event) { if (event.key === "Enter") { event.preventDefault(); advance(); } });
      input.focus({ preventScroll: true }); revealAnswer(row);
    }
    function renderDone(stage) {
      line(stage, "h2", "Brief-ul e gata");
      var list = line(stage, "div", "", "spire-recap");
      questions.forEach(function (q) {
        var item = line(list, "div", "", "spire-answer");
        line(item, "strong", ANSWER_LABELS[q.id] || q.text); line(item, "span", briefAnswers[q.id] || "");
      });
      var actions = line(stage, "div", "", "spire-actions");
      button(actions, "Continuă cu o campanie", function () { currentAnswers(); openCampaign(); }, true);
      button(actions, "Păstrează răspunsurile", async function () {
        var answers = currentAnswers();
        try { await chrome.storage.local.set({ [memoryKey]: answers }); hasMemory = true; noteText = "Răspunsuri păstrate."; render(false); }
        catch (_) { say("Nu am putut păstra răspunsurile. Încearcă din nou."); }
      });
      button(actions, "Modifică răspunsurile", function () { go(0); });
      revealAnswer(actions);
    }
    render(true);
  }
  var critiqueProvenance = "";
  var activeAiCritique = null;
  function cancelAiCritique() {
    if (!activeAiCritique) return;
    clearTimeout(activeAiCritique.timer); clearTimeout(activeAiCritique.readyTimer);
    activeAiCritique.resolve({ cancelled: true }); activeAiCritique = null;
  }
  var aiCapturing = false;
  async function critiqueScreenshot() {
    if (aiCapturing) return undefined;
    aiCapturing = true;
    try {
      setLayerHidden(true); await twoFrames();
      var src = await captureTab();
      setLayerHidden(false);
      var image = await loadImage(src), canvas = document.createElement("canvas");
      var ratio = Math.min(1, 960 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.round(image.naturalWidth * ratio); canvas.height = Math.round(image.naturalHeight * ratio);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      var jpeg = canvas.toDataURL("image/jpeg", .75);
      return jpeg.length <= 2000000 ? jpeg : undefined;
    } catch (_) { return undefined; }
    finally { aiCapturing = false; setLayerHidden(false); }
  }
  function requestAiCritique(facts, token) {
    return new Promise(function (resolve) {
      var request = { requestId: "crit-" + Date.now() + "-" + token, resolve: resolve, sent: false };
      activeAiCritique = request;
      request.timer = setTimeout(function () { finish({ error: true }); }, 50000 * (globalThis.__spireTestAiTimeoutScale || 1));
      function finish(value) {
        if (activeAiCritique !== request) return;
        clearTimeout(request.timer); clearTimeout(request.readyTimer); activeAiCritique = null; value.screenshot = request.screenshot; resolve(value);
      }
      request.finish = finish;
      request.input = { page: facts.page, elements: facts.elements, viewport: { w: innerWidth, h: innerHeight } };
      request.send = function () {
        if (activeAiCritique !== request || request.sent || !appReady || !request.captureDone) return;
        request.sent = true; clearTimeout(request.readyTimer);
        iframe.contentWindow.postMessage({ type: "spire:critique-request", requestId: request.requestId, input: request.input }, config.APP_ORIGIN);
      };
      ensureApp(true);
      request.readyTimer = setTimeout(function () { if (!appReady) finish({ error: true }); }, 8000 * (globalThis.__spireTestAiTimeoutScale || 1));
      void critiqueScreenshot().then(function (image) {
        if (image) request.input.screenshot = image;
        request.screenshot = image;
        request.captureDone = true; request.send();
      });
      request.send();
    });
  }
  function validAiResult(result) {
    if (!result || !["ai", "mock"].includes(result.mode) || !Array.isArray(result.critiques) || result.critiques.length > 5) return false;
    return result.critiques.every(function (c) {
      return c && typeof c.ruleId === "string" &&
        ["important", "de-imbunatatit", "marunt"].includes(c.level) &&
        (c.elementId === null || critiqueElements.has(c.elementId)) &&
        ["title", "body", "fix"].every(function (key) { return typeof c[key] === "string" && c[key].length <= 600; });
    });
  }
  // Balonul reapare dinspre uliu la fiecare conținut nou, chiar dacă era deja deschis.
  function popBubble() {
    if (!bubble.animate) return;
    bubble.animate(motion.matches ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: "translateY(6px) scale(.97)" }, { opacity: 1, transform: "none" }],
      { duration: motion.matches ? 150 : 300, easing: "cubic-bezier(.16,1,.3,1)" });
  }
  function showBubble(c,index,total,summary) {
    bubble.replaceChildren(); bubble.hidden=false; popBubble();
    var meta=line(bubble,"div","","spire-meta");
    line(meta,"span",critiqueProvenance,"spire-provenance");
    if(summary) {
      bubble.dataset.summary="true";line(bubble,"h2","Am terminat");line(bubble,"p",summary);positionPopup(bubble);
      return Promise.resolve();
    }
    delete bubble.dataset.summary;
    var labels={"important":"Important","de-imbunatatit":"De îmbunătățit","marunt":"Mărunt"};
    var level=line(meta,"span",labels[c.level],"spire-level");
    level.dataset.level=c.level;
    line(bubble,"h2",c.title);line(bubble,"p",c.body);
    var row=document.createElement("div");row.className="spire-row";bubble.appendChild(row);
    // progresul: o liniuță pentru observația curentă, puncte pentru celelalte
    var progress=line(row,"span","","spire-progress"), steps=line(progress,"span","","spire-steps");
    steps.setAttribute("aria-hidden","true");
    for(var k=0;k<total;k++){var dot=document.createElement("i");dot.className=k<index?"done":k===index?"now":"";steps.appendChild(dot);}
    line(progress,"span",(index+1)+" din "+total);
    // bara de jos se golește până la trecerea automată; cât stai cu mouse-ul pe balon, așteaptă
    var timerBar=line(bubble,"span","","spire-timer");timerBar.setAttribute("aria-hidden","true");
    return new Promise(function(resolve){
      var done=false, anim=null, timer=null;
      function next(){if(done)return;done=true;clearTimeout(timer);if(anim)anim.cancel();bubble.onmouseenter=bubble.onmouseleave=null;resumeBubble=null;resolve();}
      button(row,"Următorul",next,true);button(row,"Oprește",stopCritique);
      var ms=8000*speed;
      if(timerBar.animate){
        anim=timerBar.animate([{transform:"scaleX(1)"},{transform:"scaleX(0)"}],{duration:ms,easing:"linear",fill:"forwards"});
        anim.finished.then(next,function(){});
        bubble.onmouseenter=function(){if(!done)anim.pause();};
        bubble.onmouseleave=function(){if(!done)anim.play();};
      } else timer=setTimeout(next,ms);
      resumeBubble=next;positionPopup(bubble);
    });
  }
  async function critique() {
    setCritiquePreview(false); critiqueEdits = [];
    stopCritique();mode="crit";var id=tour;pose("searching");await wait(1200);
    if(id!==tour)return;
    var facts=readFacts();
    bubble.replaceChildren(); bubble.hidden=false; popBubble(); line(bubble,"p","Analizez pagina…","spire-busy"); button(bubble,"Oprește",stopCritique); positionPopup(bubble);
    var result=await requestAiCritique(facts,id);
    if(id!==tour || result.cancelled)return;
    var crits;
    if(result.error) {
      critiqueProvenance="Verificări locale · AI indisponibil";
      crits=globalThis.SpireCritique.critiquePage(facts.page,facts.elements,{w:innerWidth,h:innerHeight});
    } else {
      critiqueProvenance=result.mode==="mock"?"Analiză simulată":"Analiză AI";
      crits=result.critiques;
    }
    crits = groupZoneCritiques(crits);
    await memoryReady;
    if (id !== tour) return;
    briefAnswers = globalThis.SpireCritique.fillBriefGaps(briefAnswers, Object.assign({}, globalThis.SpireCritique.briefSeed(facts.page, facts.elements), cleanAnswers(result.suggestedAnswers)));
    latestCritique = { mode: result.error ? "fallback" : result.mode,
      items: crits.map(function(c,index){return {id:"change-"+index,title:c.title.slice(0,100),observation:c.body.slice(0,120),proposal:c.fix.slice(0,180),elementId:c.elementId};}),
      screenshot: result.screenshot, searchOptimization: Array.isArray(result.searchOptimization) ? result.searchOptimization.slice(0,3) : [] };
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
    showBubble(null,0,0,globalThis.SpireCritique.summarySentence(crits));
    latestCritiques = crits; latestBriefTitle = facts.page.title;
    resumeBriefButton.hidden = false; resumeBriefButton.style.removeProperty("display");
    showBrief(crits, facts.page.title); mode="roam";
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
  var cropPurpose = "reference";
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
    setStatus(on ? "Trage un dreptunghi peste pagină. Esc anulează." : "");
  }


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
    if (cropPurpose === "inspire") void inspireSelection(box);
    else sendReference(box, idsInside(box));
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
        if (cropPurpose === "inspire") bubble.hidden = true;
      }
    },
    true,
  );

  // Inspire folosește decupajul existent; demo-ul nu modifică DOM-ul site-ului gazdă.
  var inspireToken = 0, inspirePanel = null, inspireLast = null;
  var inspireSheet = new CSSStyleSheet();
  inspireSheet.replaceSync(`
    .spire-inspire{flex:1;min-height:0;display:flex;flex-direction:column;overflow:auto;background:var(--spire-paper);color:var(--spire-ink);font:14px/1.45 var(--spire-font)}
    .spire-inspire[hidden]{display:none!important}
    .spire-panel-inspire .spire-frame{display:none}
    .spire-panel-offline .spire-frame{display:none}
    .spire-panel-inspire .spire-offline{display:none}
    .spire-offline{margin:16px 14px;padding:18px;border-radius:14px;background:var(--spire-card);box-shadow:inset 0 0 0 1px var(--spire-line);display:grid;gap:8px;justify-items:start;font:14px/1.45 var(--spire-font);color:var(--spire-ink-2);animation:spire-pop .3s var(--spire-ease)}
    .spire-offline[hidden]{display:none}
    .spire-offline h2{margin:0;font:600 16px/1.3 var(--spire-font);color:var(--spire-ink)}
    .spire-offline p{margin:0}
    .spire-offline button{margin-top:6px;height:34px;padding:0 14px;border:0;border-radius:10px;background:var(--spire-coral);color:#fff;font:500 13px/1 var(--spire-font);cursor:pointer}
    .spire-offline button:hover{background:var(--spire-coral-deep)}
    .spire-offline button:focus-visible{outline:2px solid var(--spire-ink);outline-offset:2px}
    .spire-inspire-bar{display:flex;align-items:center;gap:8px;padding:14px 14px 4px}
    .spire-inspire-bar h2{font:600 17px/1.3 var(--spire-font);letter-spacing:-.012em;margin:0;flex:1;min-width:0;text-wrap:balance}
    .spire-inspire button{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;border:0;border-radius:9px;background:var(--spire-card);box-shadow:inset 0 0 0 1px var(--spire-line);color:var(--spire-ink);padding:0 11px;cursor:pointer;font:500 13px/1 var(--spire-font);transition:background-color .15s ease-out,box-shadow .15s ease-out}
    .spire-inspire button:hover{box-shadow:inset 0 0 0 1px #cfccc4}
    .spire-inspire button.spire-primary{background:var(--spire-coral);color:#fff;box-shadow:none}
    .spire-inspire button.spire-primary:hover{background:var(--spire-coral-deep)}
    .spire-inspire .spire-inspire-back{width:32px;padding:0;background:none;box-shadow:none;color:var(--spire-ink-2)}
    .spire-inspire .spire-inspire-back:hover{background:var(--spire-paper-2);box-shadow:none}
    .spire-inspire button:focus-visible,.spire-inspire summary:focus-visible{outline:2px solid var(--spire-ink);outline-offset:2px}
    .spire-inspire-status{padding:0 14px 0 54px;margin:0 0 12px;color:var(--spire-muted);font-size:12.5px}
    .spire-inspire-switch{display:flex;gap:2px;margin:0 14px 10px;padding:3px;border-radius:11px;background:var(--spire-paper-2)}
    .spire-inspire .spire-inspire-switch button{flex:1;height:28px;background:none;box-shadow:none;color:var(--spire-muted);font-size:12.5px}
    .spire-inspire .spire-inspire-switch button[aria-pressed="true"]{background:var(--spire-card);color:var(--spire-ink);box-shadow:0 1px 2px rgba(27,35,80,.1)}
    .spire-inspire-stage{position:relative;margin:0 14px;border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 0 0 1px var(--spire-line),0 12px 28px -18px rgba(27,35,80,.35);animation:spire-pop .4s var(--spire-ease)}
    .spire-inspire-stage:fullscreen{margin:0;border-radius:0;display:grid;place-items:center;background:var(--spire-paper)}
    .spire-inspire-frame{display:block;border:0;background:#fff;transform-origin:0 0}
    .spire-inspire-original{display:block;width:100%;height:auto}
    .spire-inspire-loading{position:relative;margin:0 14px;border-radius:12px;overflow:hidden;background:var(--spire-ink);min-height:160px;max-height:70vh;display:grid;place-items:center}
    .spire-inspire-loading img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.28;filter:saturate(.6)}
    .spire-inspire-loading::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.12) 50%,transparent 70%);animation:spire-sweep 1.8s cubic-bezier(.45,0,.55,1) infinite}
    .spire-inspire-bird{position:relative;width:96px;height:96px;filter:drop-shadow(0 0 .8px #fff) drop-shadow(0 0 .8px #fff)}
    .spire-inspire-bird svg{width:100%;height:100%;overflow:visible}
    @keyframes spire-sweep{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
    .spire-inspire-actions{display:flex;flex-wrap:wrap;gap:8px;padding:12px 14px 4px}
    .spire-inspire details{margin:8px 14px 18px;padding:10px 12px;border-radius:12px;background:var(--spire-card);box-shadow:inset 0 0 0 1px var(--spire-line)}
    .spire-inspire summary{cursor:pointer;font:500 13px/1.3 var(--spire-font);color:var(--spire-ink-2)}
    .spire-inspire-code{margin:10px 0 0;max-height:260px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.5 ui-monospace,SFMono-Regular,monospace;color:var(--spire-ink-2);user-select:text}
    .spire-inspire-error{margin:8px 14px;padding:16px;border-radius:12px;background:#fbebe6;color:var(--spire-coral-deep);display:grid;gap:12px;justify-items:start}
    .spire-inspire-error p{margin:0}
    @media(prefers-reduced-motion:reduce){.spire-inspire-loading::after,.spire-inspire-stage{animation:none}}
  `);
  shadow.adoptedStyleSheets = shadow.adoptedStyleSheets.concat(inspireSheet);
  var inspireResize = null;
  function closeInspire() {
    inspireToken++;
    if (inspireResize) { inspireResize.disconnect(); inspireResize = null; }
    if (inspirePanel) inspirePanel.hidden = true;
    panel.classList.remove("spire-panel-inspire");
    // venit doar pentru Inspire: panoul se închide odată cu demo-ul
    if (!campaignOpened) panel.hidden = true;
    bird.focus({ preventScroll: true });
  }
  function startInspire() {
    if (busy) return;
    stopCritique();
    closeInspire();
    menu.hidden = true;
    panel.hidden = true; // pagina rămâne liberă pentru selecție
    cropPurpose = "inspire";
    setCropMode(true);
    bubble.replaceChildren(); line(bubble, "h2", "Alege o zonă"); line(bubble, "p", "Trage un dreptunghi peste partea din pagină care îți place. O recreez în HTML, în panou. Esc anulează.");
    bubble.hidden = false; positionPopup(bubble);
  }
  // Demo-ul stă în panoul din dreapta, în locul aplicației, până apeși „Înapoi”.
  function inspireShell(title) {
    if (!inspirePanel) {
      inspirePanel = document.createElement("section");
      inspirePanel.className = "spire-inspire";
      inspirePanel.setAttribute("role", "region"); inspirePanel.setAttribute("aria-label", "Inspire");
      panel.insertBefore(inspirePanel, iframe);
    }
    if (inspireResize) { inspireResize.disconnect(); inspireResize = null; }
    ensureApp(); panel.hidden = false; setCollapsed(false);
    panel.classList.add("spire-panel-inspire");
    dodgePanel();
    inspirePanel.replaceChildren(); inspirePanel.hidden = false;
    var toolbar = document.createElement("div"); toolbar.className = "spire-inspire-bar";
    var back = button(toolbar, "", closeInspire); back.className = "spire-inspire-back";
    back.appendChild(icon("back")); back.setAttribute("aria-label", "Închide demo-ul"); back.title = campaignOpened ? "Înapoi la campanie" : "Închide";
    line(toolbar, "h2", title);
    inspirePanel.appendChild(toolbar);
    return inspirePanel;
  }
  // Textele și stilurile măsurate din zonă: AI-ul le folosește ca valori exacte, nu ghicite.
  function selectionText(box) {
    var texts = [], walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), node, visited = 0, length = 0;
    while ((node = walker.nextNode()) && visited++ < 5000 && length < 4000) {
      var parent = node.parentElement;
      if (!parent || host.contains(parent) || parent.closest("script,style,noscript,input,textarea,select,[hidden]")) continue;
      var text = normalize(node.nodeValue, 300);
      if (!text) continue;
      var range = document.createRange(); range.selectNodeContents(node);
      var r = range.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0 || r.left + r.width / 2 < box.x || r.left + r.width / 2 > box.x + box.w || r.top + r.height / 2 < box.y || r.top + r.height / 2 > box.y + box.h) continue;
      texts.push(text); length += text.length;
    }
    return texts.join("\n").slice(0, 4000);
  }
  function selectionStyles(box) {
    var out = [], walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT), el, visited = 0;
    while ((el = walker.nextNode()) && visited++ < 3000 && out.length < 40) {
      if (host.contains(el) || SKIP_TAGS[el.tagName]) continue;
      var r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4 || r.left < box.x - 2 || r.top < box.y - 2 || r.right > box.x + box.w + 2 || r.bottom > box.y + box.h + 2) continue;
      var cs = getComputedStyle(el), own = normalize(directText(el), 60), tag = el.tagName.toLowerCase();
      var bg = cs.backgroundColor, painted = bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg);
      if (!own && !painted && !/^(img|svg|button|a|input)$/.test(tag)) continue;
      out.push({ tag: tag, text: own, x: Math.round(r.left - box.x), y: Math.round(r.top - box.y), w: Math.round(r.width), h: Math.round(r.height),
        font: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim().slice(0, 40), size: Math.round(parseFloat(cs.fontSize)), weight: cs.fontWeight,
        color: cs.color, background: painted ? bg : "", radius: cs.borderRadius, align: cs.textAlign });
    }
    return out;
  }
  async function inspireSelection(box) {
    if (busy) return;
    var token = ++inspireToken, image, timer;
    var context = { w: box.w, h: box.h, text: selectionText(box), styles: selectionStyles(box) };
    busy = true; bubble.hidden = true; setLayerHidden(true);
    try {
      image = await Promise.race([
        twoFrames().then(captureTab).then(loadImage).then(function (img) { return cropImage(img, box); }),
        new Promise(function (_, reject) { timer = setTimeout(function () { reject(new Error(CAPTURE_FAILED)); }, 8000); }),
      ]);
      if (!image) throw new Error(CAPTURE_FAILED);
    } catch (err) {
      if (token === inspireToken) inspireError(err.message || CAPTURE_FAILED);
      return;
    } finally { clearTimeout(timer); busy = false; setLayerHidden(false); }
    if (token !== inspireToken) return;
    inspireLast = { image: image, context: context };
    await generateInspire(token);
  }
  function inspireError(message) {
    var shell = inspireShell("Inspire"), error = document.createElement("div"); error.className = "spire-inspire-error";
    var text = line(error, "p", message); text.setAttribute("role", "alert");
    if (inspireLast) button(error, "Reîncearcă", function () { void generateInspire(++inspireToken); }, true);
    shell.appendChild(error);
  }
  function thinkingBird() {
    var wrap = document.createElement("span"); wrap.className = "spire-inspire-bird";
    var svg = new DOMParser().parseFromString(globalThis.SPIRE_POSES.thinking.flying, "image/svg+xml").documentElement;
    wrap.appendChild(document.importNode(svg, true));
    return wrap;
  }
  // Demo-ul se desenează la lățimea zonei alese, apoi se micșorează cât panoul: arată ca originalul.
  function scaledFrame(stage, box, frame, w, h) {
    frame.style.width = w + "px"; frame.style.height = h + "px";
    function fit() {
      if (box.hidden) { stage.style.height = ""; return; }
      var full = shadow.fullscreenElement === stage;
      var k = full ? Math.min(innerWidth / w, innerHeight / h) : Math.min(1, stage.clientWidth / w);
      frame.style.transform = "scale(" + k + ")";
      box.style.width = Math.round(w * k) + "px"; box.style.height = Math.round(h * k) + "px";
      stage.style.height = full ? "" : Math.round(h * k) + "px";
    }
    inspireResize = new ResizeObserver(fit); inspireResize.observe(stage); fit();
    return fit;
  }
  async function generateInspire(token) {
    // DEMO_INSPIRE_RESULT există doar în copia temporară a filmării (scripts/demo/film.ts), niciodată în pachet.
    if (config.DEMO_INSPIRE_RESULT) {
      var demoStage = line(inspireShell("Afișul, pe marca ta"), "div", "", "spire-inspire-stage");
      var demoPoster = document.createElement("img");
      demoPoster.className = "spire-inspire-original"; demoPoster.alt = "Afișul rezultat"; demoPoster.src = config.DEMO_INSPIRE_RESULT;
      demoStage.appendChild(demoPoster);
      return;
    }
    var shell = inspireShell("Recreez selecția…");
    var status = line(shell, "p", "Construiesc demo-ul din selecția ta.", "spire-inspire-status"); status.setAttribute("role", "status");
    var loading = line(shell, "div", "", "spire-inspire-loading");
    loading.style.aspectRatio = Math.max(1, Math.round(inspireLast.context.w)) + " / " + Math.max(1, Math.round(inspireLast.context.h));
    var preview = document.createElement("img"); preview.alt = ""; preview.src = inspireLast.image; preview.onerror = function () { preview.remove(); };
    loading.append(preview, thinkingBird());
    try {
      var reply = await chrome.runtime.sendMessage({ type: "inspire-ai", request: globalThis.SpireInspire.request(inspireLast.context), image: inspireLast.image });
      if (token !== inspireToken) return;
      if (!reply || !reply.ok) throw new Error(reply && reply.status === 429 ? "Gemini a atins limita temporară de utilizare. Încearcă din nou puțin mai târziu." : reply && reply.error || "Nu am putut crea demo-ul. Încearcă din nou.");
      var result = globalThis.SpireInspire.result(reply.data);
      shell = inspireShell(result.title);
      line(shell, "p", reply.model === "mock" ? "Demo simulat · HTML/CSS" : "Recreat cu AI · HTML/CSS", "spire-inspire-status");
      var ctx = inspireLast.context, w = Math.max(200, Math.round(ctx.w)), h = Math.max(120, Math.round(ctx.h));
      // comparația: recreat sau original, pe aceeași scenă
      var toggle = line(shell, "div", "", "spire-inspire-switch"); toggle.setAttribute("role", "group"); toggle.setAttribute("aria-label", "Ce arăt");
      var showMade = button(toggle, "Recreat", function () { pick(true); }), showOrig = button(toggle, "Original", function () { pick(false); });
      var stage = line(shell, "div", "", "spire-inspire-stage");
      var box = line(stage, "div", ""); box.style.overflow = "hidden";
      var frame = document.createElement("iframe"); frame.className = "spire-inspire-frame"; frame.title = "Demo Inspire";
      frame.setAttribute("sandbox", ""); frame.setAttribute("referrerpolicy", "no-referrer"); frame.srcdoc = result.document;
      box.appendChild(frame);
      var original = document.createElement("img"); original.className = "spire-inspire-original"; original.alt = "Zona originală din pagină"; original.src = inspireLast.image; original.hidden = true;
      original.onerror = function () { toggle.remove(); };
      stage.appendChild(original);
      var fit = scaledFrame(stage, box, frame, w, h);
      function pick(made) {
        showMade.setAttribute("aria-pressed", String(made)); showOrig.setAttribute("aria-pressed", String(!made));
        box.hidden = !made; original.hidden = made; fit();
      }
      pick(true);
      var actions = line(shell, "div", "", "spire-inspire-actions");
      var full = button(actions, "Ecran complet", function () { if (stage.requestFullscreen) void stage.requestFullscreen().catch(function () {}); }); full.prepend(icon("expand"));
      var copy = button(actions, "Copiază codul", async function () {
        try { await navigator.clipboard.writeText(result.document); copy.lastChild.textContent = "Copiat"; }
        catch (_) { copy.lastChild.textContent = "Nu am putut copia"; }
        setTimeout(function () { copy.lastChild.textContent = "Copiază codul"; }, 1800);
      });
      copy.prepend(icon("copy")); copy.lastChild.textContent = "Copiază codul";
      var details = document.createElement("details"); line(details, "summary", "Vezi codul");
      line(details, "pre", result.document, "spire-inspire-code"); shell.appendChild(details);
    } catch (err) { if (token === inspireToken) inspireError(err.message || "Nu am putut crea demo-ul. Încearcă din nou."); }
  }

  // Nu scanăm la `load`-ul iframe-ului: doar la spire:scan, când omul apasă „Scanează pagina”.
  // `spire:ready` (vechiul semnal „aplicația ascultă, scanează acum”) a fost scos: ar fi pornit
  // scanarea fără să apese nimeni, iar aplicația nu-l mai trimite.

  // Mesajele de la aplicație. Acceptăm doar din iframe-ul nostru și de pe originea aplicației.
  window.addEventListener("message", function (event) {
    if (event.origin !== config.APP_ORIGIN) return;
    if (event.source !== iframe.contentWindow) return;
    var data = event.data;
    if (!data || typeof data !== "object" || typeof data.type !== "string") return;
    if (data.type === "spire:brief-ready") {
      appReady = true; clearTimeout(offlineTimer); setOffline(false);
      if (activeAiCritique) activeAiCritique.send();
      void memoryReady.then(sendBrief);
    } else if (data.type === "spire:critique-result") {
      if (!activeAiCritique || data.requestId !== activeAiCritique.requestId || !activeAiCritique.sent) return;
      if (data.error || !validAiResult(data.result)) activeAiCritique.finish({ error: true });
      else activeAiCritique.finish(data.result);
    } else if (data.type === "spire:brief-suggested") {
      void memoryReady.then(function () {
        currentAnswers();
        briefAnswers = globalThis.SpireCritique.fillBriefGaps(briefAnswers, cleanAnswers(data.answers));
      });
    } else if (data.type === "spire:scan") {
      requestScan();
    } else if (data.type === "spire:picks") {
      drawPicks(data.picks);
    }
  });
})();
