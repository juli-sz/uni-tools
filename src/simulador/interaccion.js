/* ======================= interacción ======================= */
let pendiente = null;
const hitNode = (t) => { const g = t.closest ? t.closest("[data-id]") : null; return g ? g.getAttribute("data-id") : null; };
/* Si venís de una salida busco la entrada libre más cercana (y si no hay libres,
   la más cercana, que se reemplaza); si venís de una entrada, la salida. */
function pinDestino(n, w, desdeSalida) {
  if (desdeSalida) {
    if (n.type === "in" || n.type === "clk" || !nIn(n)) return null;
    let cerca = null, dc = 1e9, libre = null, dl = 1e9;
    for (let i = 0; i < nIn(n); i++) {
      const q = pinPoint(n, i), d = Math.hypot(q.x - w.x, q.y - w.y);
      if (d < dc) { dc = d; cerca = i; }
      if (!ocupada(n.id, i) && d < dl) { dl = d; libre = i; }
    }
    return libre !== null ? libre : cerca;
  }
  if (!nOut(n)) return null;
  let mejor = null, dm = 1e9;
  for (let i = 0; i < nOut(n); i++) {
    const q = pinPoint(n, "o" + i), d = Math.hypot(q.x - w.x, q.y - w.y);
    if (d < dm) { dm = d; mejor = "o" + i; }
  }
  return mejor;
}
function pinCercano(n, w) {
  let best = "o0", bd = 1e9;
  const cand = [];
  for (let i = 0; i < nOut(n); i++) cand.push("o" + i);
  if (n.type !== "in" && n.type !== "clk") for (let i = 0; i < nIn(n); i++) cand.push(i);
  for (const p of cand) {
    const q = pinPoint(n, p), d = Math.hypot(q.x - w.x, q.y - w.y);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
/* ---- doble clic: el nombre, sobre la hoja ---- */
svg.addEventListener("dblclick", ev => {
  const g = ev.target.closest ? ev.target.closest("[data-id]") : null;
  const n = g && getNode(g.getAttribute("data-id"));
  if (!n) return;
  S.sel = [n.id]; S.selW = []; render();
  const arriba = n.type === "in" || n.type === "out" || n.type === "clk";
  editarEnLaHoja(n.x, n.y - (arriba ? bodyH(n) / 2 + 11 : 0), n.label, Math.max(110, bodyW(n) * S.zoom + 40), v => n.label = v);
});
detectarDobleClic(enLaHoja, dobleClicSintetico);

/* ---- puntero (mouse, lápiz y un dedo) ---- */
const esFondo = (t) => !(t && t.closest && t.closest("[data-id],[data-wid],[data-pid]"));
svg.addEventListener("pointercancel", ev => { soltarDedo(ev); drag = null; render(); });

svg.addEventListener("pointerdown", ev => {
  capturarPuntero(ev);
  const w = toWorld(ev), t = ev.target;
  if (ev.pointerType === "touch") {
    dedos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (dedos.size === 2) return arrancarPellizco();
    if (dedos.size > 2) return;
  }
  // rueda del mouse, barra espaciadora, o Ctrl (⌘) + clic izquierdo: mueven la hoja
  if (ev.button === 1 || spaceDown || (ev.button === 0 && (ev.ctrlKey || ev.metaKey))) {
    drag = { kind: "pan", sx: ev.clientX, sy: ev.clientY, px: S.pan.x, py: S.pan.y };
    svg.classList.add("panning"); return;
  }
  // un dedo en el fondo mueve la hoja (con el mouse eso es la banda de selección)
  if (ev.pointerType === "touch" && esFondo(t) && !pendiente) {
    S.sel = []; S.selW = [];
    drag = { kind: "pan", sx: ev.clientX, sy: ev.clientY, px: S.pan.x, py: S.pan.y };
    render(); return;
  }
  if (t.getAttribute && t.getAttribute("data-pid")) {
    const id = t.getAttribute("data-pid"), pin = t.getAttribute("data-pin");
    const n = getNode(id), p = esSalida(pin) ? pin : +pin;   // "o0" es salida; "0" es la entrada 0
    drag = { kind: "connect", fromId: id, fromPin: p, start: pinPoint(n, p), cur: w };
    render(); return;
  }
  const wg = t.closest ? t.closest("[data-wid]") : null;
  if (wg) {
    const id = wg.getAttribute("data-wid");
    if (ev.shiftKey) S.selW = S.selW.includes(id) ? S.selW.filter(x => x !== id) : S.selW.concat(id);
    else { S.selW = [id]; S.sel = []; }
    render(); return;
  }
  const nid = hitNode(t);
  if (nid) {
    if (ev.shiftKey) S.sel = S.sel.includes(nid) ? S.sel.filter(x => x !== nid) : S.sel.concat(nid);
    else if (!S.sel.includes(nid)) { S.sel = [nid]; S.selW = []; }
    drag = { kind: "move", w0: w, orig: S.sel.map(id => { const n = getNode(id); return { id, x: n.x, y: n.y }; }), moved: false, nid };
    render(); return;
  }
  if (!ev.shiftKey) { S.sel = []; S.selW = []; }
  drag = { kind: "band", band: { x1: w.x, y1: w.y, x2: w.x, y2: w.y }, add: ev.shiftKey };
  render();
});
svg.addEventListener("pointermove", ev => {
  if (ev.pointerType === "touch") {
    if (dedos.has(ev.pointerId)) dedos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pellizco) return moverPellizco();
    if (gestoZoom) return;
  }
  const w = toWorld(ev);
  if (!drag) {
    const nid = nodoCerca(w);
    if (nid !== hoverNode) { hoverNode = nid; render(); }
    return;
  }
  if (drag.kind === "pan") { S.pan.x = drag.px + (ev.clientX - drag.sx); S.pan.y = drag.py + (ev.clientY - drag.sy); moverVista(); return; }
  if (drag.kind === "move") {
    const dx = w.x - drag.w0.x, dy = w.y - drag.w0.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
    for (const o of drag.orig) { const n = getNode(o.id); if (n) { n.x = snapV(o.x + dx); n.y = snapV(o.y + dy); } }
    render(); return;
  }
  if (drag.kind === "connect") { drag.cur = w; render(); return; }
  if (drag.kind === "band") { drag.band.x2 = w.x; drag.band.y2 = w.y; render(); return; }
});
svg.addEventListener("pointerup", ev => {
  if (soltarDedo(ev)) { render(); return; }
  const w = toWorld(ev);
  if (!drag) return;
  if (drag.kind === "connect") {
    const t = document.elementFromPoint(ev.clientX, ev.clientY);
    let id = null, pin = null;
    if (t && t.getAttribute && t.getAttribute("data-pid")) {          // justo sobre un pin
      id = t.getAttribute("data-pid");
      const v = t.getAttribute("data-pin");
      pin = esSalida(v) ? v : +v;
    } else {
      // sobre el cuerpo, o cerca: elijo la pata que tiene sentido para este cable
      const nid = (t ? hitNode(t) : null) || nodoCerca(w, 16);
      if (nid && nid !== drag.fromId) {
        const n = getNode(nid);
        pin = pinDestino(n, w, esSalida(drag.fromPin));
        if (pin === null) toast(esSalida(drag.fromPin)
          ? "Ese elemento no tiene entradas" : "Ese elemento no tiene salida");
        else id = nid;
      }
    }
    if (id && id !== drag.fromId) conectar(drag.fromId, drag.fromPin, id, pin);
  } else if (drag.kind === "band") {
    const b = drag.band;
    const R = { l: Math.min(b.x1, b.x2), r: Math.max(b.x1, b.x2), t: Math.min(b.y1, b.y2), b: Math.max(b.y1, b.y2) };
    const dentro = S.nodes.filter(n => { const q = rectOf(n); return q.l >= R.l && q.r <= R.r && q.t >= R.t && q.b <= R.b; }).map(n => n.id);
    S.sel = drag.add ? Array.from(new Set(S.sel.concat(dentro))) : dentro;
    if (Math.abs(b.x2 - b.x1) < 3 && Math.abs(b.y2 - b.y1) < 3 && pendiente) {
      const n = makeNode(pendiente, snapV(w.x), snapV(w.y));
      S.nodes.push(n); S.sel = [n.id]; S.selW = []; setPendiente(null); commit();
    }
  } else if (drag.kind === "move") {
    if (drag.moved) { recalcularCables(new Set(drag.orig.map(o => o.id))); commit(); }
    else {
      const n = getNode(drag.nid);
      if (n && n.type === "in") { n.on = !n.on; commit(); }
      else if (n && n.type === "clk") {
        if (n.modo === "fijo") { n.on = !n.on; commit(); }         // queda mantenido
        else if (n.modo === "auto") { n.corriendo = !n.corriendo; commit(); }
        else pulso(n);                                             // un flanco y vuelve a 0
      }
    }
  }
  svg.classList.remove("panning");
  drag = null; render();
});
function pulso(n) {
  n.on = true; render();
  setTimeout(() => { n.on = false; commit(); render(); }, 140);
}
/* Los relojes en automático laten solos; se frenan mientras arrastrás algo. */
const PERIODO = 400;
setInterval(() => {
  if (drag) return;
  const activos = S.nodes.filter(n => n.type === "clk" && n.modo === "auto" && n.corriendo);
  if (!activos.length) return;
  activos.forEach(n => n.on = !n.on);
  render();
}, PERIODO);
function conectar(fromId, fromPin, toId, toPin) {
  let a = { id: fromId, pin: fromPin }, b = { id: toId, pin: toPin };
  if (!esSalida(a.pin) && esSalida(b.pin)) { const c = a; a = b; b = c; }   // se cableó al revés
  if (!esSalida(a.pin) || esSalida(b.pin)) { toast("Un cable va de una salida a una entrada"); return; }
  const na = getNode(a.id), nb = getNode(b.id);
  const salidaOk = na && idxSalida(a.pin) >= 0 && idxSalida(a.pin) < nOut(na);
  const entradaOk = nb && Number.isInteger(b.pin) && b.pin >= 0 && b.pin < nIn(nb);
  if (!salidaOk || !entradaOk) { toast("Esa conexión no corresponde a una pata válida"); return; }
  S.wires = S.wires.filter(w => !(w.to.id === b.id && w.to.pin === b.pin));  // una entrada, un cable
  S.wires.push({ id: uid("w"), from: { id: a.id, pin: a.pin }, to: { id: b.id, pin: b.pin }, variant: 0 });
  commit();
}
