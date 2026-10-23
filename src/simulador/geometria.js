/* ======================= geometría ======================= */
function rectOf(n) {
  const w = bodyW(n), h = bodyH(n);
  if (esMarco(n)) return { l: n.x - w / 2, r: n.x + w / 2, t: n.y - h / 2, b: n.y + h / 2,
                           w: w, h: h, cx: n.x, cy: n.y };
  if (esSum(n)) {                       // tiene patas en los cuatro lados
    const m = STUB;
    return { l: n.x - w / 2 - m, r: n.x + w / 2 + m, t: n.y - h / 2 - m, b: n.y + h / 2 + m,
             w: w + 2 * m, h: h + 2 * m, cx: n.x, cy: n.y };
  }
  const l = -w / 2 - (nIn(n) ? STUB : 0), r = w / 2 + bubR(n) * 2 + (n.type === "label" ? 0 : STUB);
  const rot = ROT(n);
  const esq = [{ x: l, y: -h / 2 }, { x: r, y: -h / 2 }, { x: r, y: h / 2 }, { x: l, y: h / 2 }]
    .map(p => girar(p, rot));
  const xs = esq.map(p => p.x), ys = esq.map(p => p.y);
  const L = n.x + Math.min.apply(null, xs), R = n.x + Math.max.apply(null, xs);
  const T = n.y + Math.min.apply(null, ys), B = n.y + Math.max.apply(null, ys);
  return { l: L, r: R, t: T, b: B, w: R - L, h: B - T, cx: n.x, cy: n.y };
}
const filaLocal = (n, i) => -bodyH(n) / 2 + FF_CAB + FF_FILA * (i + 0.5);
const filaFF = (n, i) => n.y + filaLocal(n, i);
const ROT = (n) => (((n.rot || 0) % 360) + 360) % 360;
function girar(p, rot) {
  if (rot === 90) return { x: -p.y, y: p.x };
  if (rot === 180) return { x: -p.x, y: -p.y };
  if (rot === 270) return { x: p.y, y: -p.x };
  return { x: p.x, y: p.y };
}
/* posición de la pata respecto del centro, sin rotar */
function pinLocal(n, pin) {
  if (esSum(n)) return sumPata(n, pin).punta;      // cada pata sale por su propio lado
  const h = bodyH(n);
  if (esSalida(pin)) {
    const k = nOut(n), i = idxSalida(pin);
    if (k <= 1) return { x: outX(n), y: 0 };
    // en el biestable, Q y Q̄ se apoyan en la primera y la última fila
    const y = n.type === "ff" ? filaLocal(n, i === 0 ? 0 : Math.max(1, nIn(n) - 1))
                              : -h / 2 + h * (i + 1) / (k + 1);
    return { x: outX(n), y };
  }
  const k = nIn(n);
  const y = n.type === "ff" ? filaLocal(n, pin) : k === 1 ? 0 : -h / 2 + h * (pin + 1) / (k + 1);
  return { x: inX(n), y };
}
function pinPoint(n, pin) {
  const p = girar(pinLocal(n, pin), ROT(n));
  return { x: n.x + Math.round(p.x * 2) / 2, y: n.y + Math.round(p.y * 2) / 2 };
}
function pinDir(n, pin) {
  const d = esSum(n) ? sumPata(n, pin).dir : esSalida(pin) ? { x: 1, y: 0 } : { x: -1, y: 0 };
  return girar(d, ROT(n));
}
const puedeGirar = (n) => /^(and|or|xor|nand|nor|xnor|not|buf)$/.test(n.type);

/* ======================= cables ======================= */
// dos cables que salen de la misma salida comparten tronco: se premia que viajen juntos
const sonHermanas = (a, b) => a.from === b.from;   // misma salida del mismo bloque
function candidatos(A, dA, B, dB, near, all) {
  const st = 16;
  const a = { x: A.x + dA.x * st, y: A.y + dA.y * st }, b = { x: B.x + dB.x * st, y: B.y + dB.y * st };
  const out = [], push = (m) => out.push(cleanPts([A, a].concat(m, [b, B])));
  const hA = dA.x !== 0, hB = dB.x !== 0;
  const offs = [0, 20, -20, 40, -40, 70, -70, 110, -110, 160, -160];
  // El orden importa: el ordenamiento es estable, así que ante igual puntaje gana
  // el primero. Por eso van adelante los recorridos que llegan derecho a la pata,
  // con el escalón pegado a la compuerta en vez de en la mitad del tramo.
  if (hA && hB) {
    if (Math.abs(a.y - b.y) < .5) push([]);
    push([{ x: b.x, y: a.y }, { x: b.x, y: b.y }]);      // escalón contra el destino
    push([{ x: a.x, y: a.y }, { x: a.x, y: b.y }]);      // o contra el origen
    for (const o of offs) { const mx = (a.x + b.x) / 2 + o; push([{ x: mx, y: a.y }, { x: mx, y: b.y }]); }
    for (const base of [near.t - 30, near.b + 30, all.t - 30, all.b + 30])
      for (const o of [0, 20, -20, 40, -40, 60, -60])
        push([{ x: a.x, y: base + o }, { x: b.x, y: base + o }]);
  } else if (!hA && !hB) {
    if (Math.abs(a.x - b.x) < .5) push([]);
    push([{ x: a.x, y: b.y }, { x: b.x, y: b.y }]);
    push([{ x: a.x, y: a.y }, { x: b.x, y: a.y }]);
    for (const o of offs) { const my = (a.y + b.y) / 2 + o; push([{ x: a.x, y: my }, { x: b.x, y: my }]); }
    for (const base of [near.l - 30, near.r + 30, all.l - 30, all.r + 30])
      for (const o of [0, 20, -20, 40, -40])
        push([{ x: base + o, y: a.y }, { x: base + o, y: b.y }]);
  } else {                                               // una pata horizontal y la otra vertical
    push([{ x: b.x, y: a.y }]);
    push([{ x: a.x, y: b.y }]);
    for (const o of offs) {
      if (hA) { const mx = (a.x + b.x) / 2 + o; push([{ x: mx, y: a.y }, { x: mx, y: b.y }]); }
      else { const my = (a.y + b.y) / 2 + o; push([{ x: a.x, y: my }, { x: b.x, y: my }]); }
    }
    const ys = [near.t - 30, near.b + 30, all.b + 30, all.t - 30];
    const xs = [near.l - 30, near.r + 30, all.l - 30, all.r + 30];
    if (hA) for (const y of ys) push([{ x: a.x, y }, { x: b.x, y }]);
    else for (const x of xs) push([{ x, y: a.y }, { x, y: b.y }]);
  }
  return out;
}
function routeAll() {
  const placed = [], all = bboxAll();
  for (const w of S.wires) {
    const from = getNode(w.from.id), to = getNode(w.to.id);
    if (!from || !to) { w.pts = null; continue; }
    const A = pinPoint(from, w.from.pin || "o"), B = pinPoint(to, w.to.pin);
    const Rf = rectOf(from), Rt = rectOf(to);
    const near = { l: Math.min(Rf.l, Rt.l), r: Math.max(Rf.r, Rt.r), t: Math.min(Rf.t, Rt.t), b: Math.max(Rf.b, Rt.b) };
    const obst = S.nodes.filter(n => n.id !== from.id && n.id !== to.id &&
                                n.type !== "label" && !esMarco(n))
      .map(n => agrandar(rectOf(n), 7));
    const keys = { from: w.from.id + ":" + (w.from.pin || "o"), to: w.to.id + ":" + w.to.pin };
    const cands = candidatos(A, pinDir(from, w.from.pin || "o0"), B, pinDir(to, w.to.pin), near, all);
    w.pts = variante(rutasPorPuntaje(cands, obst, placed, keys, 10, [Rf, Rt]), w.variant);
    for (const sg of segsOf(w.pts)) placed.push({ seg: sg, keys });
  }
}
/* Vuelve a la ruta automática (la alternativa 0) */
function rutaAuto(w) { w.variant = 0; }
/* Los puntos de unión van donde se separan dos cables de la misma salida */
const junctionDots = () => puntosDeUnion(S.wires,
  (a, b) => a.from.id === b.from.id && (a.from.pin || "o") === (b.from.pin || "o"),
  (a, p) => ({ p, id: a.from.id, i: idxSalida(a.from.pin || "o") }));
