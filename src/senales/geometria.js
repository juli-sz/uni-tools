/* ======================= geometría ======================= */
function bboxAll() {
  if (!S.nodos.length) return { l: 0, t: 0, r: 400, b: 300 };
  let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
  for (const n of S.nodos) {
    l = Math.min(l, n.x - 40); r = Math.max(r, n.x + 40);
    t = Math.min(t, n.y - 34); b = Math.max(b, n.y + 34);
  }
  for (const rr of S.ramas) {                 // el arco de cada rama también ocupa lugar
    const p = curvaDe(rr); if (!p) continue;
    l = Math.min(l, p.cx - 30); r = Math.max(r, p.cx + 30);
    t = Math.min(t, p.cy - 30); b = Math.max(b, p.cy + 30);
  }
  return { l, t, r, b };
}
/* Cada rama es una curva cuadrática. Devuelve los puntos que hacen falta para
   dibujarla, poner la punta de flecha en el medio y ubicar la etiqueta. */
function curvaDe(r) {
  const A = getNodo(r.de), B = getNodo(r.a);
  if (!A || !B) return null;
  if (r.de === r.a) {                          // autolazo: un rulo apoyado sobre el nodo
    const h = Math.abs(r.curva) || 46, s = r.curva < 0 ? -1 : 1;
    const c1 = { x: A.x - h * .72, y: A.y - s * h * 1.5 };
    const c2 = { x: A.x + h * .72, y: A.y - s * h * 1.5 };
    const d = `M ${A.x} ${A.y - s * R_NODO} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${A.x} ${A.y - s * R_NODO}`;
    return { d, cx: A.x, cy: A.y - s * (h * 1.13 + R_NODO), ang: s > 0 ? 0 : 180,
             px: A.x, py: A.y - s * (h * 1.13 + R_NODO), lx: A.x, ly: A.y - s * (h * 1.5 + R_NODO) };
  }
  const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L;              // versor a lo largo, y su perpendicular
  const nx = -uy, ny = ux;
  // los extremos se corren para arrancar en el borde del puntito
  const a = { x: A.x + ux * R_NODO, y: A.y + uy * R_NODO };
  const b = { x: B.x - ux * R_NODO, y: B.y - uy * R_NODO };
  const ctrl = { x: (a.x + b.x) / 2 + nx * r.curva, y: (a.y + b.y) / 2 + ny * r.curva };
  const d = `M ${a.x} ${a.y} Q ${ctrl.x} ${ctrl.y} ${b.x} ${b.y}`;
  // punto y tangente en la mitad de la curva, donde va la flecha
  const t = 0.5;
  const px = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * ctrl.x + t * t * b.x;
  const py = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * ctrl.y + t * t * b.y;
  const tx = 2 * (1 - t) * (ctrl.x - a.x) + 2 * t * (b.x - ctrl.x);
  const ty = 2 * (1 - t) * (ctrl.y - a.y) + 2 * t * (b.y - ctrl.y);
  const ang = Math.atan2(ty, tx) * 180 / Math.PI;
  const signo = r.curva > 0 ? 1 : -1;          // en la recta la etiqueta va del lado de arriba
  return { d, cx: px, cy: py, ang, px, py,
           lx: px + nx * signo * 15, ly: py + ny * signo * 15 };
}
/* ======================= acomodar las ramas =======================
   Una rama va derecho si une dos nodos sin nada en el medio y es la única entre
   ese par. Las demás —las que se saltean nodos, las que vuelven para atrás y las
   paralelas— salen por afuera, en arcos que se van separando para no encimarse. */
const ARCO_BASE = 46, ARCO_PASO = 34;
function distanciaASegmento(p, a, b) {
  const vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy;
  if (!L2) return { d: Math.hypot(p.x - a.x, p.y - a.y), t: 0 };
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / L2));
  return { d: Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy)), t };
}
function tapaUnNodo(A, B) {                    // ¿hay otro nodo apoyado en el medio?
  for (const n of S.nodos) {
    if (n.id === A.id || n.id === B.id) continue;
    const { d, t } = distanciaASegmento(n, A, B);
    if (d < R_NODO + 10 && t > 0.02 && t < 0.98) return true;
  }
  return false;
}
const ladoDe = (A, B, esLazo) => esLazo ? "lazo" : (B.x >= A.x ? "ida" : "vuelta");
function tramoDe(r) {                          // franja que ocupa un arco, para repartirlos
  const A = getNodo(r.de), B = getNodo(r.a);
  if (!A || !B) return null;
  const esLazo = r.de === r.a, borde = esLazo ? 26 : 0;
  return { lado: ladoDe(A, B, esLazo), mag: Math.abs(r.curva),
           x1: Math.min(A.x, B.x) - borde, x2: Math.max(A.x, B.x) + borde };
}
function acomodarRamas() {
  const rectas = new Set(), puestos = [], enArco = [];
  for (const r of S.ramas) {
    const A = getNodo(r.de), B = getNodo(r.a);
    if (!A || !B) continue;
    if (r.curvaFija) { const t = tramoDe(r); if (t) puestos.push(t); continue; }
    const par = [r.de, r.a].sort().join("|");
    if (r.de !== r.a && !rectas.has(par) && !tapaUnNodo(A, B)) {
      r.curva = 0; rectas.add(par);            // derecho: es la conexión directa
    } else enArco.push(r);
  }
  // los arcos cortos primero, así los largos quedan por afuera
  enArco.sort((a, b) => {
    const ta = tramoDe(a), tb = tramoDe(b);
    return (ta.x2 - ta.x1) - (tb.x2 - tb.x1);
  });
  for (const r of enArco) {
    const t = tramoDe(r);
    let mag = ARCO_BASE;
    for (let k = 0; k < 60; k++) {
      mag = ARCO_BASE + k * ARCO_PASO;
      const choca = puestos.some(p => p.lado === t.lado && Math.abs(p.mag - mag) < 1 &&
        Math.min(p.x2, t.x2) - Math.max(p.x1, t.x1) > 12);
      if (!choca) break;
    }
    r.curva = t.lado === "lazo" ? mag : -mag;  // negativo: ida arriba, vuelta abajo
    puestos.push({ lado: t.lado, mag, x1: t.x1, x2: t.x2 });
  }
}
function ramaCerca(w) {                        // la rama más cercana al puntero, para el hover
  let best = null, bd = 14;
  for (const r of S.ramas) {
    const c = curvaDe(r); if (!c) continue;
    const d = Math.hypot(c.px - w.x, c.py - w.y);
    if (d < bd) { bd = d; best = r; }
  }
  return best;
}
