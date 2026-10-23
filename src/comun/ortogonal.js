/* ======================= cajas y ruteo ortogonal =======================
   Para las herramientas de elementos rectangulares (bloques y compuertas): rectOf(n)
   de cada una da la caja que ocupa un elemento, y con eso salen el encuadre, la
   alineación y las conexiones en ángulo recto que esquivan a los demás. */
function bboxAll() {
  const lista = S[HERRAMIENTA.nodos];
  if (!lista.length) return { l: 0, t: 0, r: 400, b: 300 };
  let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
  for (const n of lista) { const R = rectOf(n); l = Math.min(l, R.l); t = Math.min(t, R.t); r = Math.max(r, R.r); b = Math.max(b, R.b); }
  return { l, t, r, b };
}
/* Alinea o reparte la selección; después las conexiones vuelven a su ruta automática */
function alinear(kind) {
  const ns = S.sel.map(buscarNodo).filter(Boolean);
  if (ns.length < 2) { toast("Elegí al menos dos elementos"); return; }
  const rs = ns.map(rectOf);
  if (kind === "left") { const v = Math.min(...rs.map(r => r.l)); ns.forEach((n, i) => n.x += v - rs[i].l); }
  if (kind === "right") { const v = Math.max(...rs.map(r => r.r)); ns.forEach((n, i) => n.x += v - rs[i].r); }
  if (kind === "top") { const v = Math.min(...rs.map(r => r.t)); ns.forEach((n, i) => n.y += v - rs[i].t); }
  if (kind === "bottom") { const v = Math.max(...rs.map(r => r.b)); ns.forEach((n, i) => n.y += v - rs[i].b); }
  if (kind === "cx") { const v = ns.reduce((a, n) => a + n.x, 0) / ns.length; ns.forEach(n => n.x = snapV(v)); }
  if (kind === "cy") { const v = ns.reduce((a, n) => a + n.y, 0) / ns.length; ns.forEach(n => n.y = snapV(v)); }
  if (kind === "dh") {
    const s = ns.slice().sort((a, b) => a.x - b.x);
    const step = (s[s.length - 1].x - s[0].x) / (s.length - 1);
    s.forEach((n, i) => n.x = snapV(s[0].x + step * i));
  }
  if (kind === "dv") {
    const s = ns.slice().sort((a, b) => a.y - b.y);
    const step = (s[s.length - 1].y - s[0].y) / (s.length - 1);
    s.forEach((n, i) => n.y = snapV(s[0].y + step * i));
  }
  S[HERRAMIENTA.conexiones].forEach(rutaAuto);
  commit(); render();
}

/* ---- ruteo ----
   Cada herramienta arma sus recorridos candidatos; acá se les pone puntaje (quiebres,
   largo, pasar por encima de un elemento, montarse sobre otra conexión) y se elige. */
function cleanPts(pts) {
  const out = [];
  for (const p of pts) {
    const q = { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
    if (out.length && Math.abs(out[out.length - 1].x - q.x) < .3 && Math.abs(out[out.length - 1].y - q.y) < .3) continue;
    out.push(q);
  }
  const res = [];
  for (let i = 0; i < out.length; i++) {
    if (i > 0 && i < out.length - 1) {
      const a = out[i - 1], b = out[i], c = out[i + 1];
      const col = (Math.abs(a.x - b.x) < .3 && Math.abs(b.x - c.x) < .3) ||
                  (Math.abs(a.y - b.y) < .3 && Math.abs(b.y - c.y) < .3);
      if (col) continue;
    }
    res.push(out[i]);
  }
  return res;
}
function segsOf(pts) {
  const s = [];
  for (let i = 0; i < pts.length - 1; i++) s.push([pts[i], pts[i + 1]]);
  return s;
}
function segRect(seg, R) {
  const x1 = Math.min(seg[0].x, seg[1].x), x2 = Math.max(seg[0].x, seg[1].x);
  const y1 = Math.min(seg[0].y, seg[1].y), y2 = Math.max(seg[0].y, seg[1].y);
  return !(x2 < R.l || x1 > R.r || y2 < R.t || y1 > R.b);
}
function overlapInfo(seg, other) {
  const horiz = Math.abs(seg[0].y - seg[1].y) < .5, horiz2 = Math.abs(other[0].y - other[1].y) < .5;
  const vert = Math.abs(seg[0].x - seg[1].x) < .5, vert2 = Math.abs(other[0].x - other[1].x) < .5;
  if (horiz && horiz2 && Math.abs(seg[0].y - other[0].y) < 7) {
    const a1 = Math.min(seg[0].x, seg[1].x), a2 = Math.max(seg[0].x, seg[1].x);
    const b1 = Math.min(other[0].x, other[1].x), b2 = Math.max(other[0].x, other[1].x);
    const ov = Math.min(a2, b2) - Math.max(a1, b1);
    if (ov > 6) return { kind: "col", ov, exact: Math.abs(seg[0].y - other[0].y) < .6 };
  }
  if (vert && vert2 && Math.abs(seg[0].x - other[0].x) < 7) {
    const a1 = Math.min(seg[0].y, seg[1].y), a2 = Math.max(seg[0].y, seg[1].y);
    const b1 = Math.min(other[0].y, other[1].y), b2 = Math.max(other[0].y, other[1].y);
    const ov = Math.min(a2, b2) - Math.max(a1, b1);
    if (ov > 6) return { kind: "col", ov, exact: Math.abs(seg[0].x - other[0].x) < .6 };
  }
  if ((horiz && vert2) || (vert && horiz2)) return { kind: "cross" };
  return null;
}
/* ¿El tramo se mete adentro del rectángulo? Tocar el borde (donde están los puertos) no cuenta. */
function entraEn(seg, R) {
  const x1 = Math.min(seg[0].x, seg[1].x), x2 = Math.max(seg[0].x, seg[1].x);
  const y1 = Math.min(seg[0].y, seg[1].y), y2 = Math.max(seg[0].y, seg[1].y);
  return x2 > R.l + 1 && x1 < R.r - 1 && y2 > R.t + 1 && y1 < R.b - 1;
}
/* Dos conexiones hermanas (sonHermanas() de la herramienta: las que comparten tronco)
   se premian por viajar juntas en vez de abrirse en canales paralelos. Los propios son
   el origen y el destino de la conexión: puede salir de su borde, pero no pasarles por
   encima (un cable que sale de una compuerta y vuelve cruzándola se lee mal). */
function scorePath(pts, obstacles, placed, keys, propios) {
  let s = 0;
  const segs = segsOf(pts);
  s += (segs.length - 1) * 16;
  for (const seg of segs) {
    s += (Math.abs(seg[0].x - seg[1].x) + Math.abs(seg[0].y - seg[1].y)) * 0.012;
    for (const R of obstacles) if (segRect(seg, R)) s += 500;
    for (const R of propios) if (entraEn(seg, R)) s += 500;
    for (const o of placed) {
      const r = overlapInfo(seg, o.seg);
      if (!r) continue;
      if (r.kind === "cross") { s += 3; continue; }
      if (sonHermanas(keys, o.keys)) s -= r.exact ? Math.min(r.ov, 260) * 0.7 : 0;
      else s += 140 + r.ov * 0.6;
    }
  }
  return s;
}
/* Los candidatos ordenados por puntaje, sin repetidos y a lo sumo cuantos+1. El orden es
   estable: ante igual puntaje gana el que vino primero. La variante elegida a mano
   ("Ruta alternativa") recorre esta lista. */
function rutasPorPuntaje(cands, obstacles, placed, keys, cuantos, propios) {
  const scored = cands.map(p => ({ p, s: scorePath(p, obstacles, placed, keys, propios) })).sort((x, y) => x.s - y.s);
  const uniq = [];
  for (const c of scored) {
    const key = c.p.map(q => q.x + "," + q.y).join("|");
    if (!uniq.some(u => u.key === key)) uniq.push({ key, p: c.p });
    if (uniq.length > cuantos) break;
  }
  return uniq.map(u => u.p);
}
const variante = (lista, v) => lista[((v || 0) % lista.length + lista.length) % lista.length];
const agrandar = (R, k) => ({ l: R.l - k, r: R.r + k, t: R.t - k, b: R.b + k });
/* El trazo de una ruta, con las esquinas redondeadas con radio r */
function pathD(pts, r) {
  if (!pts || pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], a = pts[i - 1], b = pts[i + 1];
    const d1 = Math.hypot(p.x - a.x, p.y - a.y), d2 = Math.hypot(b.x - p.x, b.y - p.y);
    const k = Math.min(r, d1 / 2, d2 / 2);
    const u1 = { x: (a.x - p.x) / (d1 || 1), y: (a.y - p.y) / (d1 || 1) };
    const u2 = { x: (b.x - p.x) / (d2 || 1), y: (b.y - p.y) / (d2 || 1) };
    d += ` L ${p.x + u1.x * k} ${p.y + u1.y * k} Q ${p.x} ${p.y} ${p.x + u2.x * k} ${p.y + u2.y * k}`;
  }
  const e = pts[pts.length - 1];
  d += ` L ${e.x} ${e.y}`;
  return d;
}
/* Donde una conexión se desprende del tronco que comparte con su hermana va un punto de
   unión. hermanas(a, b) dice qué pares cuentan; dato(a, p) es lo que se devuelve por punto. */
function puntosDeUnion(conexiones, hermanas, dato) {
  const inSeg = (p, sg) => {
    const h = Math.abs(sg[0].y - sg[1].y) < .6, v = Math.abs(sg[0].x - sg[1].x) < .6;
    if (h && Math.abs(p.y - sg[0].y) < .6) {
      const a = Math.min(sg[0].x, sg[1].x), b = Math.max(sg[0].x, sg[1].x);
      return p.x > a + 2 && p.x < b - 2;
    }
    if (v && Math.abs(p.x - sg[0].x) < .6) {
      const a = Math.min(sg[0].y, sg[1].y), b = Math.max(sg[0].y, sg[1].y);
      return p.y > a + 2 && p.y < b - 2;
    }
    return false;
  };
  const dots = new Map();
  for (const a of conexiones) {
    if (!a.pts) continue;
    for (let i = 1; i < a.pts.length - 1; i++) {
      const p = a.pts[i];
      for (const b of conexiones) {
        if (b === a || !b.pts) continue;
        if (!hermanas(a, b)) continue;
        if (segsOf(b.pts).some(sg => inSeg(p, sg))) {
          dots.set(Math.round(p.x) + "," + Math.round(p.y), dato(a, p));
          break;
        }
      }
    }
  }
  return Array.from(dots.values());
}
