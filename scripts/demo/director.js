// Stratul de regie al filmării: cursor, inele, spotlight, zoom, carduri, clip. Injectat de Playwright.
// Stă în top layer (popover), deci nu e atins de zoom-ul de pe <body> și trece peste orice z-index.
// Nimic de aici nu ajunge în aplicație sau în extensie.
(() => {
  if (window.top !== window || window.__demo) return;

  const CORAL = "#FF6B57";
  const FONT = '"Geist Variable", Geist, -apple-system, "Helvetica Neue", Arial, sans-serif';
  const CURSORS = {
    arrow: { x: 0, y: 0, svg: '<path d="M1.5 1.5v19.2l5-4.6 3.4 8 3.5-1.5-3.4-7.9h6.8z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>' },
    pointer: { x: 8, y: 1, svg: '<path d="M9.5 2a1.8 1.8 0 0 1 1.8 1.8v6.6l1.2-.1a1.7 1.7 0 0 1 1.5.6 1.8 1.8 0 0 1 2 .4 1.8 1.8 0 0 1 2.2.7 1.7 1.7 0 0 1 2.3 1.6v4.2c0 3.2-2.4 5.7-5.6 5.7h-1.6c-2 0-3.7-.9-4.8-2.5l-4.4-6.3a1.9 1.9 0 0 1 2.9-2.4l1 1V3.800A1.800 1.800 0 0 1 9.500 2z" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/>' },
    text: { x: 8, y: 13, svg: '<path d="M4.500 2.500h2.500c1 0 1.500.5 2 1 .5-.5 1-1 2-1h2.500M9 3.500v19M4.500 23.500h2.500c1 0 1.500-.5 2-1 .5.5 1 1 2 1h2.500" fill="none" stroke="#000" stroke-width="1.700" stroke-linecap="round"/>' },
  };

  const root = document.createElement("div");
  root.id = "demo-director";
  root.setAttribute("popover", "manual");
  root.style.cssText = "all:initial;position:fixed;inset:0;width:100vw;height:100vh;margin:0;padding:0;border:0;background:transparent;overflow:hidden;pointer-events:none;z-index:2147483647;display:block;";
  const style = document.createElement("style");
  style.textContent = `
    #demo-director * { box-sizing: border-box; pointer-events: none; }
    #demo-director .cursor { position: fixed; left: 0; top: 0; width: 28px; height: 28px; filter: drop-shadow(0 1px 2px rgb(0 0 0 / .4)); will-change: transform; z-index: 5; }
    #demo-director .ripple { position: fixed; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%; border: 3px solid ${CORAL}; animation: demo-ripple 450ms ease-out forwards; z-index: 4; }
    #demo-director .ring { position: fixed; border: 3px solid ${CORAL}; border-radius: 14px; animation: demo-ring 800ms ease-in-out forwards; z-index: 3; }
    #demo-director .spot { position: fixed; border-radius: 16px; box-shadow: 0 0 0 300vmax rgb(0 0 0 / .55); opacity: 0; transition: opacity 400ms ease; z-index: 2; }
    #demo-director .tag { position: fixed; top: 24px; right: 24px; padding: 8px 14px; border-radius: 10px; background: rgb(20 20 24 / .86); color: #fff; font: 600 20px ${FONT}; z-index: 6; }
    #demo-director .card { position: fixed; inset: 0; opacity: 0; transition: opacity 500ms ease; background: #101114; color: #fff; font-family: ${FONT}; z-index: 8; display: grid; place-items: center; overflow: hidden; }
    #demo-director .shade { position: fixed; inset: 0; background: rgb(0 0 0 / .7); opacity: 0; transition: opacity 500ms ease; z-index: 7; display: grid; place-items: center; }
    #demo-director .shade video { height: 90vh; aspect-ratio: 9 / 16; object-fit: cover; border-radius: 16px; box-shadow: 0 24px 80px rgb(0 0 0 / .6); transform: scale(.92); transition: transform 500ms cubic-bezier(.2,.7,.2,1); background: #000; }
    #demo-director .shade.on { opacity: 1; }
    #demo-director .shade.on video { transform: scale(1); }
    #demo-director .wipe { position: fixed; inset: 0; z-index: 9; overflow: hidden; pointer-events: none; }
    #demo-director .wipe-sheet { position: absolute; inset: 0; background: #141a3d; will-change: transform; }
    #demo-director .wipe-bird { position: absolute; top: 50%; left: 0; width: 300px; height: 300px; margin: -150px 0 0 -150px; will-change: transform; filter: drop-shadow(0 18px 30px rgb(0 0 0 / .45)); }
    #demo-director .wipe-bird svg { width: 100%; height: 100%; overflow: visible; }
    #demo-director .split { position: fixed; inset: 0; z-index: 8; display: flex; gap: 90px; align-items: center; justify-content: center; background: #101114; opacity: 0; transition: opacity 400ms ease; }
    #demo-director .split.on { opacity: 1; }
    #demo-director .split figure { margin: 0; transition: transform 900ms cubic-bezier(.22,.8,.2,1), opacity 500ms ease; opacity: 0; }
    #demo-director .split figure.left { transform: translateX(-560px); }
    #demo-director .split figure.right { transform: translateX(560px); }
    #demo-director .split.on figure { transform: none; opacity: 1; }
    #demo-director .split img { display: block; height: 900px; border-radius: 14px; box-shadow: 0 24px 80px rgb(0 0 0 / .6); }
    @keyframes demo-ripple { from { transform: scale(.25); opacity: 1; } to { transform: scale(1); opacity: 0; } }
    @keyframes demo-ring { 0% { transform: scale(1.04); opacity: 0; } 35% { transform: scale(1); opacity: 1; } 70% { transform: scale(1.012); opacity: 1; } 100% { transform: scale(1); opacity: 0; } }
  `;
  root.append(style);

  const cursor = document.createElement("div");
  cursor.className = "cursor";
  root.append(cursor);

  const state = { x: -100, y: -100, shape: "", hint: null };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const px = (rect, pad = 0) => `left:${rect.x - pad}px;top:${rect.y - pad}px;width:${rect.width + 2 * pad}px;height:${rect.height + 2 * pad}px;`;

  const paint = () => {
    const c = CURSORS[state.shape] || CURSORS.arrow;
    cursor.style.transform = `translate(${state.x - c.x}px, ${state.y - c.y}px)`;
  };
  const setShape = (shape) => {
    if (shape === state.shape) return;
    state.shape = shape;
    cursor.innerHTML = `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">${CURSORS[shape].svg}</svg>`;
    paint();
  };
  const shapeOf = (el) => {
    if (!el) return "arrow";
    const css = getComputedStyle(el).cursor;
    if (css === "pointer") return "pointer";
    if (css === "text" || el.matches?.('input:not([type="checkbox"],[type="radio"],[type="button"]),textarea')) return "text";
    if (el.closest?.('a[href],button,[role="button"],summary')) return "pointer";
    return "arrow";
  };
  const deepest = (x, y) => {
    let el = document.elementFromPoint(x, y);
    while (el?.shadowRoot) {
      const inner = el.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === el) break;
      el = inner;
    }
    return el;
  };
  const moveTo = (x, y) => {
    state.x = x;
    state.y = y;
    const el = deepest(x, y);
    // peste un iframe nu vedem elementul: forma o spune mouse.ts, care vede în frame
    setShape(el?.tagName === "IFRAME" && state.hint ? state.hint : shapeOf(el));
    paint();
  };
  window.addEventListener("mousemove", (e) => moveTo(e.clientX, e.clientY), { capture: true, passive: true });

  const mount = () => {
    const host = document.documentElement;
    if (!host || root.isConnected) return;
    host.append(root);
    root.showPopover();
  };
  mount();
  if (!root.isConnected) document.addEventListener("readystatechange", mount, { once: true });
  setShape("arrow");

  const addTemp = (className, cssText, ms) => {
    const el = document.createElement("div");
    el.className = className;
    el.style.cssText = cssText;
    root.append(el);
    setTimeout(() => el.remove(), ms);
    return el;
  };

  let zoomed = null;
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  const tweenScale = (from, to, ms) =>
    new Promise((resolve) => {
      const start = performance.now();
      const frame = (now) => {
        const t = Math.min(1, (now - start) / ms);
        document.body.style.transform = `scale(${from + (to - from) * easeInOut(t)})`;
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });

  window.__demo = {
    cursorAt: (x, y) => moveTo(x, y),
    cursorHint: (shape) => {
      state.hint = shape;
      moveTo(state.x, state.y);
    },
    cursorVisible: (on) => {
      cursor.style.opacity = on ? "1" : "0";
    },
    ripple: (x, y) => {
      addTemp("ripple", `left:${x}px;top:${y}px;`, 450);
    },
    ring: (rect) => {
      addTemp("ring", px(rect, 6), 800);
    },
    spotlight: (rect, ms) => {
      const el = addTemp("spot", px(rect, 8), ms + 450);
      requestAnimationFrame(() => {
        el.style.opacity = "1";
      });
      setTimeout(() => {
        el.style.opacity = "0";
      }, Math.max(0, ms - 400));
    },
    zoom: async (rect, scale, ms) => {
      const s = Math.min(1.25, scale);
      // pe <body>, nu pe <html>: pe rădăcină, Chromium rămâne cu pagina desenată tăiat după ce revine
      const body = document.body;
      const box = body.getBoundingClientRect();
      body.style.transformOrigin = `${rect.x + rect.width / 2 - box.x}px ${rect.y + rect.height / 2 - box.y}px`;
      zoomed = s;
      await tweenScale(1, s, 900);
      await sleep(ms);
      await tweenScale(s, 1, 900);
      body.style.transform = "";
      body.style.transformOrigin = "";
      zoomed = null;
    },
    isZoomed: () => zoomed !== null,
    card: async (html, ms, { stay = false } = {}) => {
      const el = document.createElement("div");
      el.className = "card";
      el.innerHTML = html;
      root.append(el);
      requestAnimationFrame(() => requestAnimationFrame(() => (el.style.opacity = "1")));
      await sleep(500 + ms);
      if (stay) return;
      el.style.opacity = "0";
      await sleep(500);
      el.remove();
    },
    tag: (text) => {
      root.querySelector(".tag")?.remove();
      if (text) addTemp("tag", "", 3_600_000).textContent = text;
    },
    /** Comparația: `stânga` alunecă din stânga, `dreapta` din dreapta, se opresc alături. Rămâne până la următoarea regie. */
    split: async (left, right, ms = 4000) => {
      const el = document.createElement("div");
      el.className = "split";
      for (const [side, src] of [["left", left], ["right", right]]) {
        const figure = document.createElement("figure");
        figure.className = side;
        const img = document.createElement("img");
        img.alt = "";
        img.src = src;
        figure.append(img);
        el.append(figure);
      }
      root.append(el);
      await Promise.all([...el.querySelectorAll("img")].map((img) => img.decode().catch(() => undefined)));
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("on")));
      await sleep(900 + ms);
    },
    /**
     * Tranziția dintre tab-uri, în două jumătăți care se lipesc la montaj fără cross-fade:
     * `birdWipe("out")` traversează ecranul și trage cortina după uliu, `birdWipe("in")` trage cortina de pe pagina nouă.
     * `birdWipe("cover")` pune cortina fără animație, înainte de începutul scenei.
     */
    birdWipe: async (phase, birdSvg = "") => {
      const width = innerWidth;
      let wipe = root.querySelector(".wipe");
      if (!wipe) {
        wipe = document.createElement("div");
        wipe.className = "wipe";
        wipe.innerHTML = '<div class="wipe-sheet"></div>';
        root.append(wipe);
      }
      const sheet = wipe.querySelector(".wipe-sheet");
      if (phase === "cover") {
        sheet.style.transform = "translateX(0)";
        return;
      }
      const animate = (el, frames, ms) => el.animate(frames, { duration: ms, easing: "cubic-bezier(.45,.05,.55,.95)", fill: "forwards" }).finished;
      if (phase === "in") {
        await animate(sheet, [{ transform: "translateX(0)" }, { transform: `translateX(${width}px)` }], 480);
        wipe.remove();
        return;
      }
      const bird = document.createElement("div");
      bird.className = "wipe-bird";
      bird.innerHTML = birdSvg;
      wipe.append(bird);
      await Promise.all([
        animate(sheet, [{ transform: `translateX(${-width}px)` }, { transform: "translateX(0)" }], 720),
        animate(bird, [{ transform: "translateX(-160px) translateY(40px) rotate(-6deg)" }, { transform: `translateX(${width / 2}px) translateY(-30px) rotate(3deg)`, offset: 0.55 }, { transform: `translateX(${width + 200}px) translateY(10px) rotate(-3deg)` }], 720),
      ]);
    },
    media: async (src, { from = 0, ms = 15000, origin = null } = {}) => {
      const shade = document.createElement("div");
      shade.className = "shade";
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.src = src;
      shade.append(video);
      // intră de unde e clipul în panou: se mărește din colțul acela, nu din centru
      if (origin) {
        video.style.transformOrigin = `${origin.x + origin.width / 2 - innerWidth / 2 + (innerHeight * 0.9 * 9) / 32}px ${origin.y + origin.height / 2 - innerHeight * 0.05}px`;
        video.style.transform = `scale(${Math.max(0.2, origin.height / (innerHeight * 0.9))})`;
      }
      root.append(shade);
      await new Promise((resolve, reject) => {
        video.addEventListener("loadeddata", resolve, { once: true });
        video.addEventListener("error", () => reject(new Error(`Clipul nu se încarcă: ${src}`)), { once: true });
      });
      video.currentTime = from;
      await new Promise((resolve) => video.addEventListener("seeked", resolve, { once: true }));
      await video.play();
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          shade.classList.add("on");
          video.style.transform = "";
        }),
      );
      await sleep(ms);
      shade.classList.remove("on");
      await sleep(500);
      shade.remove();
    },
    /** Spire își ascunde stratul cât fotografiază fila: ascundem regia odată cu el, ca să nu intre în decupaj. */
    watchSpire: () => {
      const host = document.getElementById("spire-root");
      if (!host) return false;
      const sync = () => {
        root.style.visibility = host.style.visibility === "hidden" ? "hidden" : "visible";
      };
      new MutationObserver(sync).observe(host, { attributes: true, attributeFilter: ["style"] });
      return true;
    },
  };
})();
