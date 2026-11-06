// Rulează în browser (are nevoie de isPointInFill pe SVG): construiește graful uliului de pază.
// Folosit de scripts/hawk-graph/generate.cjs; rezultatul e src/pitch/hawkGraph.ts.
function buildHawkGraph(opts = {}) {
  const { step = 7.5, grid = 15, maxEdge = 19, chainStep = 6.5 } = opts;
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 200 240"); svg.style.position = "absolute"; svg.style.left = "-9999px";
  document.body.appendChild(svg);
  const mk = (d) => { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); svg.appendChild(p); return p; };
  // silueta: cap mai turtit, cioc mai mic
  const BODY = mk("M91.2 64.6 C92.6 58.6 94 53.4 95.4 49.4 L92.6 47.4 L96.8 46.2 L94.6 42.4 L99.4 42 C102 37 106.8 34 112 33 C118 32 124 32.2 128 33 C129.6 33.4 131 34.2 132.4 35.2 C134.8 35.4 136.8 36.2 138.6 37.4 C141.2 39 143 41.6 143.4 44.6 C143.8 46.8 143.4 48.8 142.4 50.8 C141.8 48.8 140.4 47.2 138.4 46.4 L130.6 46.8 L135.2 48.6 L138.6 49.8 C137.6 51.6 136 52.6 134.2 52.8 L130.4 52.8 C130.6 58 131.4 63.6 133.4 70.4 C138.4 84 139.4 100 135.6 116 C132.4 130 127.4 143.6 120.6 155.6 C122.2 161.6 122 167.4 119.4 172.2 L108 174 L96 170 L84 120 Z");
  const WING = mk("M91.2 64.6 C86.4 74.6 82 90 81 108 C80 130 77.6 160 73.6 196 L71.6 205.4 C78.4 192.6 86.6 180.2 94.6 170.4 C99 167 104 163 108.4 156 C111.8 146 113.8 132 114 118 C114.2 106 112.4 96.6 108 88.4 C104.6 80.6 99.6 73.4 94.4 67.6 Z");
  const TAIL = mk("M86 174 L78.6 227 C82.6 229.4 88.6 230 93.4 228.6 L101.6 168 Z");
  const shapes = [BODY, WING, TAIL];
  const pt = svg.createSVGPoint();
  const inShape = (s, x, y) => { pt.x = x; pt.y = y; return s.isPointInFill(pt); };
  const inside = (x, y) => shapes.some((s) => inShape(s, x, y));
  const nodes = []; const strong = new Set(); const kind = [];
  const behindBranch = (x, y) => { const t = (x - 26) / 158; return y > 190 - t * 18 - 1.5 && y < 197 - t * 17.6 + 1.5; };
  const face = (x, y) => x > 108 && y < 56;
  const add = (x, y, t) => { if (t === "n" && face(x, y)) return -1; if (t === "tail" && behindBranch(x, y)) return -1; const j = nodes.findIndex(([a, b], k) => Math.hypot(a - x, b - y) < (t === "key" || kind[k] === "key" ? 1.1 : 3.2)); if (j >= 0) { if (t !== "n" && kind[j] === "n") kind[j] = t; return j; } nodes.push([x, y]); kind.push(t); return nodes.length - 1; };
  const link = (a, b) => { if (a >= 0 && b >= 0 && a !== b) strong.add(a < b ? `${a},${b}` : `${b},${a}`); };
  // un lanț: eșantionat de-a lungul unei curbe, cu muchii între vecini
  const chain = (d, t, st = chainStep, closed = false) => { const p = mk(d); const L = p.getTotalLength(); const n = Math.max(1, Math.round(L / st)); const ids = []; for (let i = 0; i <= n; i++) { if (closed && i === n) break; const q = p.getPointAtLength((i / n) * L); ids.push(add(q.x, q.y, t)); } for (let i = 1; i < ids.length; i++) link(ids[i - 1], ids[i]); if (closed) link(ids[ids.length - 1], ids[0]); p.remove(); return ids; };
  // trăsăturile: ochiul, sprânceana, ciocul, dunga obrazului
  const eye = add(121, 40.6, "eye");
  // conturul capului, nod cu nod: ceafa zbârlită, creștetul, ciocul-cârlig, mandibula de jos (gura întredeschisă)
  chain("M95.4 49.4 L92.6 47.4 L96.8 46.2 L94.6 42.4 L99.4 42 C102 37 106.8 34 112 33 C118 32 124 32.2 128 33 C129.6 33.4 131 34.2 132.4 35.2", "key", 5.2);
  chain("M132.4 35.2 C134.8 35.4 136.8 36.2 138.6 37.4 C141.2 39 143 41.6 143.4 44.6 C143.8 46.8 143.4 48.8 142.4 50.8 C141.8 48.8 140.4 47.2 138.4 46.4 L130.6 46.8", "key", 3.4);
  chain("M130.6 47.6 L135.2 48.6 L138.6 49.8 C137.6 51.6 136 52.6 134.2 52.8 L130.4 52.8", "key", 3.2);
  chain("M130.4 52.8 C130.6 58 131.4 63.6 133.4 70.4", "edge", 4.4);
  // ceara și nara
  chain("M132.4 35.2 C133.6 38.4 133.8 41.6 133 44.4", "key", 3.2);
  add(135.6, 39.6, "key");
  // sprânceana osoasă: creastă dublă, joasă, care umbrește ochiul
  chain("M110.4 37.6 C115.4 35.2 121.6 34.4 127.2 35.2 L132 39", "key", 4.6);
  chain("M113.4 39.4 C117.2 37.6 121.6 37.2 126 37.8 L129.4 40", "key", 4.4);
  // dunga ascuțită de sub ochi
  chain("M119.2 43.8 C117.6 48.8 117.2 53.6 118.6 59", "key", 5);
  chain("M121.8 44.4 L120.8 49.4", "key", 3);
  // penele de pe ceafă și creștet, în linii scurte
  chain("M100.4 46.6 L104.4 44.2 L108.4 43.2", "key", 4.2);
  chain("M98.6 52 L103.2 50.6 L107.8 50.4", "key", 4.4);
  // contururile (fără bucățile care cad în interiorul altei forme)
  for (const [s, t] of [[BODY, "edge"], [WING, "edge"], [TAIL, "tail"]]) {
    const L = s.getTotalLength(); const n = Math.round(L / step); let prev = null, first = null;
    for (let i = 0; i <= n; i++) {
      const q = s.getPointAtLength(((i % n) / n) * L);
      const hidden = (s === BODY && q.y < 56 && q.x > 91) || shapes.some((o) => o !== s && inShape(o, q.x, q.y) && (t !== "tail"));
      if (hidden) { prev = null; continue; }
      const id = add(q.x, q.y, t); if (id < 0) { prev = null; continue; } if (prev !== null) link(prev, id); prev = id; if (first === null) first = id;
    }
  }
  // aripa strânsă: muchia din față, rândurile de acoperitoare, remigele
  chain("M94.4 67.6 C99.6 73.4 104.6 80.6 108 88.4 C112.4 96.6 114.2 106 114 118 C113.8 132 111.8 146 108.4 156 C104 163 99 167 94.6 170.4 C86.6 180.2 78.4 192.6 71.6 205.4", "edge", 6);
  chain("M87.2 96 Q93 101 98 103 Q104 106 110.2 107", "wing", 6);
  chain("M84.6 122 Q92 127 99 130 Q105 133 112.6 133.4", "wing", 6);
  chain("M84.6 140 C83 160 79.6 180 72.6 203.6", "wing", 7);
  chain("M92 141 C89.6 160 84.6 180 74.6 202.6", "wing", 7);
  chain("M100 142 C97 158 90 174 79.2 194.2", "wing", 7);
  chain("M107 141 C105 150 102 158 98.4 165", "wing", 7);
  // coada: trei pene lungi și banda de la capăt
  chain("M89.8 178 L84.6 228.8", "tail", 7.5);
  chain("M95.8 176 L89.6 229.4", "tail", 7.5);
  chain("M80.6 216.6 C85 218.6 90 218.8 95.2 217.4", "tail", 4.8);
  // degetele care strâng creanga
  chain("M112.4 172.8 C113 174.4 113.4 175.6 113.6 176.8 C118.4 176.6 123.6 177.6 126.8 180.2 C128.2 181.6 128 183.6 126.6 184.6", "key", 2.8);
  chain("M115.6 177.4 C119.4 178.4 122 180.2 122.8 183 C122.8 184.4 122 185.4 120.8 185.8", "key", 2.8);
  chain("M112.2 177 C108.8 178.2 106.4 180.4 106.2 183.2 C106.2 184.6 107 185.6 108.4 186", "key", 2.8);
  // pieptul: o coloană de noduri pe banda burții
  chain("M128 82 C130 96 128 112 124 126 C121.6 134 119 140 116.6 146", "chest", 8);
  // interior rar, cu decalaj determinist
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = 40; y < 232; y += grid) for (let x = 70; x < 146; x += grid * 0.86) {
    const jx = x + (rnd() - 0.5) * grid * 0.6, jy = y + (rnd() - 0.5) * grid * 0.6;
    if (inside(jx, jy) && Math.hypot(jx - 121, jy - 40.6) > 7) add(jx, jy, "n");
  }
  // triangulare Bowyer-Watson, păstrăm triunghiurile din siluetă
  const all = nodes.map(([x, y]) => ({ x, y })).concat([{ x: -1000, y: -1000 }, { x: 1200, y: -1000 }, { x: 100, y: 1400 }]); const N = nodes.length;
  let tris = [[N, N + 1, N + 2]];
  const circ = (t) => { const [a, b, c] = t.map((i) => all[i]); const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y)); const ux = ((a.x ** 2 + a.y ** 2) * (b.y - c.y) + (b.x ** 2 + b.y ** 2) * (c.y - a.y) + (c.x ** 2 + c.y ** 2) * (a.y - b.y)) / d; const uy = ((a.x ** 2 + a.y ** 2) * (c.x - b.x) + (b.x ** 2 + b.y ** 2) * (a.x - c.x) + (c.x ** 2 + c.y ** 2) * (b.x - a.x)) / d; return { ux, uy, r2: (a.x - ux) ** 2 + (a.y - uy) ** 2 }; };
  for (let i = 0; i < N; i++) { const p = all[i]; const bad = [], good = []; for (const t of tris) { const c = circ(t); ((p.x - c.ux) ** 2 + (p.y - c.uy) ** 2 < c.r2 ? bad : good).push(t); } const em = new Map(); for (const t of bad) for (const [a, b] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) { const k = a < b ? `${a},${b}` : `${b},${a}`; em.set(k, (em.get(k) || 0) + 1); } tris = good; for (const [k, c] of em) if (c === 1) { const [a, b] = k.split(",").map(Number); tris.push([a, b, i]); } }
  const weak = new Set();
  for (const t of tris) { if (t.some((i) => i >= N)) continue; const [a, b, c] = t.map((i) => all[i]); if (!inside((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3)) continue; for (const [u, v] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) { if (u === eye || v === eye) continue; if (face(all[u].x, all[u].y) || face(all[v].x, all[v].y)) continue; if (Math.hypot(all[u].x - all[v].x, all[u].y - all[v].y) > maxEdge) continue; const k = u < v ? `${u},${v}` : `${v},${u}`; if (!strong.has(k)) weak.add(k); } }
  svg.remove();
  const pairs = (s) => [...s].map((k) => k.split(",").map(Number));
  return { nodes: nodes.map(([x, y], i) => [+x.toFixed(1), +y.toFixed(1), kind[i]]), strong: pairs(strong), weak: pairs(weak) };
}
