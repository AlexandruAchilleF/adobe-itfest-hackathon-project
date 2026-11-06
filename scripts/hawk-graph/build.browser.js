// Rulează în browser (are nevoie de isPointInFill pe SVG): construiește graful uliului de pază.
// Folosit de scripts/hawk-graph/generate.cjs; rezultatul e src/pitch/hawkGraph.ts.
//
// Cum e construit: lanțuri de noduri pe anatomie (contur, sprânceană, cioc, muchia aripii, rândurile
// de pene, remige, coadă, degete), apoi o umplere rară, triangulată, doar în interiorul siluetei.
// Linia de rețea pe care stă uliul (PERCH) e desenată de HawkMark.tsx; aici doar ascundem coada sub ea.

/** linia de rețea (creanga): y în funcție de x, aceeași formulă ca în HawkMark.tsx */
function perchY(x) {
  return 190 - ((x - 26) * 18) / 158;
}

function buildHawkGraph(opts = {}) {
  const { step = 7.5, grid = 15, maxEdge = 19 } = opts;
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 200 240");
  svg.style.position = "absolute";
  svg.style.left = "-9999px";
  document.body.appendChild(svg);
  const mk = (d) => {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    svg.appendChild(p);
    return p;
  };
  // silueta: ceafă cu două pene, creștet turtit, cioc-cârlig abia întredeschis
  const BODY = mk(
    "M91.2 64.6 C92.6 58.6 94 53.4 95.4 49.4 L93.4 46.6 L97.4 45.8 C98.8 40.6 103 36.4 108.4 34.2 C114 32.2 121.6 31.8 128 33 C129.6 33.4 131 34.2 132.4 35.2 C134.8 35.4 136.8 36.2 138.6 37.4 C141.2 39 143 41.6 143.4 44.6 C143.8 46.8 143.4 48.8 142.4 50.8 C141.8 48.8 140.4 47.2 138.4 46.4 L130.6 46.8 L135.2 47.8 L138.4 48.6 C137.4 50.2 135.8 51.2 134 51.4 L130.4 51.6 C130.6 57.4 131.4 63.4 133.4 70.4 C138.4 84 139.4 100 135.6 116 C132.4 130 127.4 143.6 120.6 155.6 C122.2 161.6 122 167.4 119.4 172.2 L108 174 L96 170 L84 120 Z",
  );
  const WING = mk(
    "M91.2 64.6 C86.4 74.6 82 90 81 108 C80 130 77.6 160 73.6 196 L71.6 205.4 C78.4 192.6 86.6 180.2 94.6 170.4 C99 167 104 163 108.4 156 C111.8 146 113.8 132 114 118 C114.2 106 112.4 96.6 108 88.4 C104.6 80.6 99.6 73.4 94.4 67.6 Z",
  );
  const shapes = [BODY, WING];
  const pt = svg.createSVGPoint();
  const inShape = (s, x, y) => {
    pt.x = x;
    pt.y = y;
    return s.isPointInFill(pt);
  };
  const inside = (x, y) => shapes.some((s) => inShape(s, x, y));
  // ciocul: doar contur, fără umplere (altfel liniile se suprapun)
  const beak = (x, y) => x > 129.4 && y < 53;
  const nodes = [];
  const kind = [];
  const strong = new Set();
  const add = (x, y, t) => {
    if (t === "n" && beak(x, y)) return -1;
    if (t === "tail" && Math.abs(y - perchY(x)) < 2.2) return -1;
    const fine = t === "key" || t === "joint";
    const j = nodes.findIndex(([a, b], k) => Math.hypot(a - x, b - y) < (fine || kind[k] === "key" || kind[k] === "joint" ? 1.1 : 3.2));
    if (j >= 0) {
      if (t === "joint" || (t !== "n" && kind[j] === "n")) kind[j] = t;
      return j;
    }
    nodes.push([x, y]);
    kind.push(t);
    return nodes.length - 1;
  };
  const link = (a, b) => {
    if (a >= 0 && b >= 0 && a !== b) strong.add(a < b ? `${a},${b}` : `${b},${a}`);
  };
  const chain = (d, t, st = 6.5) => {
    const p = mk(d);
    const L = p.getTotalLength();
    const n = Math.max(1, Math.round(L / st));
    const ids = [];
    for (let i = 0; i <= n; i++) {
      const q = p.getPointAtLength((i / n) * L);
      ids.push(add(q.x, q.y, t));
    }
    for (let i = 1; i < ids.length; i++) link(ids[i - 1], ids[i]);
    p.remove();
    return ids;
  };

  // capul
  const eye = add(121, 40.6, "eye");
  chain("M95.4 49.4 L93.4 46.6 L97.4 45.8 C98.8 40.6 103 36.4 108.4 34.2 C114 32.2 121.6 31.8 128 33 C129.6 33.4 131 34.2 132.4 35.2", "key", 5);
  chain("M132.4 35.2 C134.8 35.4 136.8 36.2 138.6 37.4 C141.2 39 143 41.6 143.4 44.6 C143.8 46.8 143.4 48.8 142.4 50.8 C141.8 48.8 140.4 47.2 138.4 46.4 L130.6 46.8", "key", 3.4);
  chain("M130.6 47.6 L135.2 47.8 L138.4 48.6 C137.4 50.2 135.8 51.2 134 51.4 L130.4 51.6", "key", 3.2);
  chain("M130.4 51.6 C130.6 57.4 131.4 63.4 133.4 70.4", "edge", 4.6);
  // ceara, cu nara legată de ea
  chain("M132.4 35.2 C133.6 38.4 133.8 41.6 133 44.4", "key", 3.2);
  chain("M133.6 39.8 L135.8 39.4", "key", 2.2);
  // sprânceana osoasă: o creastă puternică în V spre cioc, plus o linie scurtă care umbrește ochiul
  chain("M110.4 37.6 C115.4 35.2 121.6 34.4 127.2 35.2 L132 39", "key", 4.6);
  chain("M117.6 38.2 C121 37.2 124.4 37.4 127.6 38.6", "key", 3.4);
  // dunga de sub ochi și obrazul
  chain("M119.2 43.8 C117.6 48.8 117.2 53.6 118.6 59", "key", 5);
  [[110.6, 45], [125.6, 46.8], [108.4, 53.4], [125, 55.4], [113.4, 60.6], [102.6, 43.2]].forEach(([x, y]) => add(x, y, "n"));

  // contururile corpului și ale aripii (fără cap, fără bucățile ascunse de cealaltă formă)
  for (const s of shapes) {
    const L = s.getTotalLength();
    const n = Math.round(L / step);
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const q = s.getPointAtLength(((i % n) / n) * L);
      const hidden = (s === BODY && q.y < 56 && q.x > 91) || shapes.some((o) => o !== s && inShape(o, q.x, q.y));
      if (hidden) {
        prev = null;
        continue;
      }
      const id = add(q.x, q.y, "edge");
      if (prev !== null) link(prev, id);
      prev = id;
    }
  }

  // aripa strânsă: muchia din față, două rânduri de acoperitoare, remigele care converg spre vârf
  chain("M94.4 67.6 C99.6 73.4 104.6 80.6 108 88.4 C112.4 96.6 114.2 106 114 118 C113.8 132 111.8 146 108.4 156 C104 163 99 167 94.6 170.4 C86.6 180.2 78.4 192.6 71.6 205.4", "edge", 6);
  chain("M87.2 96 Q93 101 98 103 Q104 106 110.2 107", "wing", 6);
  chain("M84.6 122 Q92 127 99 130 Q105 133 112.6 133.4", "wing", 6);
  chain("M84.6 140 C83 160 79.6 180 72.6 203.6", "wing", 9);
  chain("M92 141 C89.6 160 84.6 180 74.6 202.6", "wing", 9);
  chain("M100 142 C97 158 90 174 79.2 194.2", "wing", 9);
  chain("M107 141 C105 150 102 158 98.4 165", "wing", 9);

  // coada: evantai care se deschide spre vârf, cu pene care converg spre bază; fără umplere
  chain("M89 182 L73.6 225.4", "tail", 6.5);
  chain("M100 180.6 L101.2 228.6", "tail", 6.5);
  chain("M92.6 182 L80.6 228", "tail", 7.5);
  chain("M96.4 181.6 L90.4 229.6", "tail", 7.5);
  chain("M73.6 225.4 Q76.6 229.4 80.6 228 Q85.2 231.6 90.4 229.6 Q95.6 231.4 101.2 228.6", "tail", 3.6);
  chain("M76.4 217.6 C83 220.4 92 221.2 100.8 219.8", "tail", 4.6);

  // degetele: trei, clare, închise peste linia de rețea, cu gheare scurte
  chain("M115.6 172.8 C120.4 173.6 125.4 176.2 127.8 179.2 C128.8 180.8 128.2 182.6 126.6 183.4", "key", 2.6);
  chain("M116.4 174.6 C119.8 176 122.2 178.2 122.8 181 C122.8 182.4 122 183.4 120.6 183.8", "key", 2.6);
  chain("M113.6 175 C110.4 176.4 108.4 178.6 108.2 181.4 C108.2 182.8 109 183.8 110.4 184.2", "key", 2.6);

  // pieptul: o coloană de noduri pe banda burții
  chain("M128 82 C130 96 128 112 124 126 C121.6 134 119 140 116.6 146", "chest", 8);

  // articulațiile: noduri mai mari, ca stelele dintr-o constelație
  [[91.2, 64.6], [108, 88.4], [114, 118], [108.4, 156], [71.6, 205.4], [142.4, 50.8], [132.4, 35.2], [95.4, 49.4], [126.6, 183.4], [120.6, 183.8], [110.4, 184.2], [73.6, 225.4], [101.2, 228.6], [133.4, 70.4]].forEach(([x, y]) => add(x, y, "joint"));

  // umplere rară, cu decalaj determinist
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let y = 40; y < 176; y += grid)
    for (let x = 70; x < 146; x += grid * 0.86) {
      const jx = x + (rnd() - 0.5) * grid * 0.6;
      const jy = y + (rnd() - 0.5) * grid * 0.6;
      if (inside(jx, jy) && Math.hypot(jx - 121, jy - 40.6) > 7) add(jx, jy, "n");
    }

  // triangulare Bowyer-Watson; păstrăm triunghiurile din siluetă
  const all = nodes.map(([x, y]) => ({ x, y })).concat([{ x: -1000, y: -1000 }, { x: 1200, y: -1000 }, { x: 100, y: 1400 }]);
  const N = nodes.length;
  let tris = [[N, N + 1, N + 2]];
  const circ = (t) => {
    const [a, b, c] = t.map((i) => all[i]);
    const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
    const ux = ((a.x ** 2 + a.y ** 2) * (b.y - c.y) + (b.x ** 2 + b.y ** 2) * (c.y - a.y) + (c.x ** 2 + c.y ** 2) * (a.y - b.y)) / d;
    const uy = ((a.x ** 2 + a.y ** 2) * (c.x - b.x) + (b.x ** 2 + b.y ** 2) * (a.x - c.x) + (c.x ** 2 + c.y ** 2) * (b.x - a.x)) / d;
    return { ux, uy, r2: (a.x - ux) ** 2 + (a.y - uy) ** 2 };
  };
  for (let i = 0; i < N; i++) {
    const p = all[i];
    const bad = [];
    const good = [];
    for (const t of tris) {
      const c = circ(t);
      ((p.x - c.ux) ** 2 + (p.y - c.uy) ** 2 < c.r2 ? bad : good).push(t);
    }
    const em = new Map();
    for (const t of bad)
      for (const [a, b] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) {
        const k = a < b ? `${a},${b}` : `${b},${a}`;
        em.set(k, (em.get(k) || 0) + 1);
      }
    tris = good;
    for (const [k, c] of em)
      if (c === 1) {
        const [a, b] = k.split(",").map(Number);
        tris.push([a, b, i]);
      }
  }
  const weak = new Set();
  for (const t of tris) {
    if (t.some((i) => i >= N)) continue;
    const [a, b, c] = t.map((i) => all[i]);
    if (!inside((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3)) continue;
    for (const [u, v] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) {
      if (u === eye || v === eye) continue;
      if (beak(all[u].x, all[u].y) && beak(all[v].x, all[v].y)) continue;
      // fără „treptele” dintre remige și fără umplere în coadă sau între degete
      const ku = kind[u];
      const kv = kind[v];
      if (ku === "wing" && kv === "wing") continue;
      if (ku === "tail" || kv === "tail") continue;
      if (all[u].y > 172 && all[v].y > 172) continue;
      if (Math.hypot(all[u].x - all[v].x, all[u].y - all[v].y) > maxEdge) continue;
      const k = u < v ? `${u},${v}` : `${v},${u}`;
      if (!strong.has(k)) weak.add(k);
    }
  }
  svg.remove();
  const pairs = (s) => [...s].map((k) => k.split(",").map(Number));
  return { nodes: nodes.map(([x, y], i) => [+x.toFixed(1), +y.toFixed(1), kind[i]]), strong: pairs(strong), weak: pairs(weak) };
}
