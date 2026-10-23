/* ======================= interacción ======================= */
function hitNode(target) {
  const g = target.closest ? target.closest("[data-id]") : null;
  return g ? g.getAttribute("data-id") : null;
}
/* ---- doble clic: el contenido del bloque o la etiqueta de la flecha, sobre la hoja ---- */
function puntoEtiqueta(e) {                    // el medio del tramo más largo, como al dibujarla
  const segs = segsOf(e.pts);
  let best = segs[0], largo = -1;
  for (const s of segs) {
    const L = Math.hypot(s[1].x - s[0].x, s[1].y - s[0].y);
    if (L > largo) { largo = L; best = s; }
  }
  return { x: (best[0].x + best[1].x) / 2, y: (best[0].y + best[1].y) / 2 };
}
/* Abre el editor sobre un bloque (por id) o sobre una flecha (por id). */
function editarElemento(nid, eid) {
  if (nid) {
    const n = getNode(nid);
    if (!n || n.type === "node") return;        // la bifurcación no tiene contenido
    S.sel = [nid]; S.selEdges = []; render();
    editarEnLaHoja(n.x, n.y, n.label, Math.max(120, n.w * S.zoom + 44), v => n.label = v);
    return;
  }
  const e = eid && getEdge(eid);
  if (e && e.pts && e.pts.length > 1) {
    S.selEdges = [e.id]; S.sel = []; render();
    const p = puntoEtiqueta(e);
    editarEnLaHoja(p.x, p.y, e.label, Math.max(120, 60 * S.zoom + 44), v => e.label = v);
  }
}
detectarDobleClic(ev => {
  const nid = hitNode(ev.target);
  const eg = ev.target.closest ? ev.target.closest("[data-eid]") : null;
  const eid = nid ? null : (eg && eg.getAttribute("data-eid"));
  return (nid || eid) ? { id: nid || eid, nid, eid } : null;
}, t => editarElemento(t.nid, t.eid));
// Por si algún navegador sí manda el dblclick (p. ej. un elemento que no se redibuja)
svg.addEventListener("dblclick", ev => {
  if (editorAbierto) return;
  const eg = ev.target.closest ? ev.target.closest("[data-eid]") : null;
  editarElemento(hitNode(ev.target), eg && eg.getAttribute("data-eid"));
});

/* ---- puntero (mouse, lápiz y un dedo) ---- */
const esFondo = (t) => !(t && t.closest && t.closest("[data-id],[data-eid],.port,.m-handle-wrap,.m-grip-wrap,.seg-handle-wrap"));
function limpiarCursorResize() {
  svg.classList.remove("resizing-nw", "resizing-ne", "resizing-se", "resizing-sw",
    "resizing-n", "resizing-s", "resizing-e", "resizing-w", "moviendo-tramo-h", "moviendo-tramo-v");
}
/* Lo que cancelarDrag() (comun/tactil.js) no sabe deshacer: estirar y correr un tramo */
function cancelarArrastrePropio(drag) {
  if (drag && drag.kind === "resize" && drag.orig) {
    const n = getNode(drag.nodeId);
    if (n) {
      n.x = drag.orig.x; n.y = drag.orig.y; n.w = drag.orig.w; n.h = drag.orig.h;
      if (drag.orig.auto === undefined) delete n.auto; else n.auto = drag.orig.auto;
    }
  }
  if (drag && drag.kind === "tramo") {
    const e = getEdge(drag.edgeId);
    if (e) { if (drag.orig) e.manual = drag.orig; else delete e.manual; }
  }
  limpiarCursorResize();
}
svg.addEventListener("pointercancel", ev => { soltarDedo(ev); cancelarDrag(); render(); });

/* ---- estirar un recuadro, bloque o sumador ----
   Un recuadro deja fijo el lado opuesto al tirador, como en cualquier editor. Un bloque o un
   sumador crece desde el centro: así sus puertos siguen alineados con los de los vecinos y
   las flechas no se quiebran. Al estirar a mano un bloque deja de ajustarse a la ecuación. */
function estirar(n, d, w) {
  const dir = d.dir, o = d.orig;
  if (esMarco(n)) {
    const MIN = 20;
    let l = o.x - o.w / 2, r = o.x + o.w / 2, t = o.y - o.h / 2, b = o.y + o.h / 2;
    if (dir.includes("w")) l = Math.min(snapV(w.x), r - MIN);
    if (dir.includes("e")) r = Math.max(snapV(w.x), l + MIN);
    if (dir.includes("n")) t = Math.min(snapV(w.y), b - MIN);
    if (dir.includes("s")) b = Math.max(snapV(w.y), t + MIN);
    n.w = r - l; n.h = b - t; n.x = l + n.w / 2; n.y = t + n.h / 2;
    return;
  }
  const paso = S.snap ? S.grid / 2 : 1;              // el ancho total sube de a una celda
  const medio = (v) => Math.round(v / paso) * paso;
  const hw = medio(Math.abs(w.x - o.x)), hh = medio(Math.abs(w.y - o.y));
  if (n.type === "sum") {
    const r = Math.min(60, Math.max(10, hw, hh));    // mismo rango que "Diámetro" del panel
    n.w = n.h = r * 2;
  } else {
    n.w = Math.max(30, hw * 2); n.h = Math.max(24, hh * 2);
    n.auto = false;
  }
  n.x = o.x; n.y = o.y;
}
/* ---- correr un tramo de una flecha ----
   Cualquier tramo se corre a lo ancho. Uno del medio sólo cambia su línea; uno pegado a un
   puerto no se puede despegar, así que al correrlo la flecha sale una punta recta del puerto,
   dobla y recién ahí sigue por la línea nueva. */
function tramoCercano(e, w) {
  if (!e || !e.pts) return -1;
  let mejor = -1, md = 7 / S.zoom;
  for (let i = 0; i < e.pts.length - 1; i++) {
    const a = e.pts[i], b = e.pts[i + 1];
    const dx = Math.max(Math.min(a.x, b.x) - w.x, 0, w.x - Math.max(a.x, b.x));
    const dy = Math.max(Math.min(a.y, b.y) - w.y, 0, w.y - Math.max(a.y, b.y));
    const dist = Math.hypot(dx, dy);
    if (dist < md) { md = dist; mejor = i; }
  }
  return mejor;
}
function empezarTramo(eid, i, w) {
  const e = getEdge(eid);
  if (!e || !e.pts || i < 0 || i > e.pts.length - 2) return false;
  const pts = e.pts, n = pts.length - 1;              // n tramos
  const h = tramoHoriz(e, i);
  const coord = (j) => tramoHoriz(e, j) ? pts[j].y : pts[j].x;   // la línea del tramo j, tal como se ve
  const medio = [];
  for (let j = 1; j <= n - 2; j++) medio.push(coord(j));
  // la punta que sale de un puerto: una línea perpendicular un poco más allá del puerto
  const punta = (P, port) => { const d = dirOf(port); return d.x ? P.x + d.x * TRAMO_PUNTA : P.y + d.y * TRAMO_PUNTA; };
  const A = pts[0], B = pts[pts.length - 1];
  let c = medio, idx = i - 1;
  if (i === 0) {                                       // pegado al puerto de salida
    c = [punta(A, e.from.port), coord(0)].concat(medio);
    if (n === 1) c.push(punta(B, e.to.port));          // una recta: también hay que despegarse del destino
    idx = 1;
  } else if (i === n - 1) {                            // pegado al puerto de llegada
    c = medio.concat([coord(n - 1), punta(B, e.to.port)]);
    idx = medio.length;
  }
  drag = { kind: "tramo", edgeId: eid, h, c, idx,
    orig: e.manual ? JSON.parse(JSON.stringify(e.manual)) : null,
    c0: c[idx], p0: h ? w.y : w.x, moved: false };
  svg.classList.add(h ? "moviendo-tramo-h" : "moviendo-tramo-v");
  return true;
}
svg.addEventListener("pointerdown", ev => {
  capturarPuntero(ev);
  const w = toWorld(ev);
  const t = ev.target;
  if (ev.pointerType === "touch") {
    dedos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (dedos.size === 2) return arrancarPellizco();
    if (dedos.size > 2) return;
  }
  // pan
  // rueda del mouse, barra espaciadora, o Ctrl (⌘) + clic izquierdo: mueven la hoja
  if (ev.button === 1 || spaceDown || (ev.button === 0 && (ev.ctrlKey || ev.metaKey))) {
    drag = { kind: "pan", sx: ev.clientX, sy: ev.clientY, px: S.pan.x, py: S.pan.y };
    svg.classList.add("panning"); return;
  }
  // un dedo en el fondo mueve la hoja, salvo en selección múltiple, donde encierra
  if (ev.pointerType === "touch" && esFondo(t) && !pendingAdd && S.mode !== "multi") {
    S.sel = []; S.selEdges = [];
    drag = { kind: "pan", sx: ev.clientX, sy: ev.clientY, px: S.pan.x, py: S.pan.y };
    render(); return;
  }
  // tirador de tamaño (recuadro, bloque o sumador) -> estirar
  const hw = t.closest ? t.closest(".m-handle-wrap") : null;
  if (hw) {
    const dir = hw.getAttribute("data-handle");
    const nid = hw.getAttribute("data-nid");
    const n = getNode(nid);
    if (n) {
      drag = {
        kind: "resize",
        nodeId: nid,
        dir,
        orig: { x: n.x, y: n.y, w: n.w, h: n.h, auto: n.auto },
        moved: false
      };
      svg.classList.add("resizing-" + dir);
      return;
    }
  }
  // asa de un recuadro -> moverlo (y lo que esté seleccionado con él)
  const gp = t.closest ? t.closest(".m-grip-wrap") : null;
  if (gp && getNode(gp.getAttribute("data-nid"))) {
    drag = { kind: "move", w0: w, moved: false,
      orig: S.sel.map(id => { const n = getNode(id); return { id, x: n.x, y: n.y }; }) };
    return;
  }
  // tirador de un tramo de flecha -> correrlo a un costado
  const sh = t.closest ? t.closest(".seg-handle-wrap") : null;
  if (sh && empezarTramo(sh.getAttribute("data-seg-eid"), +sh.getAttribute("data-seg"), w)) return;
  // dibujar recuadro
  if (pendingAdd === "marco") {
    const sx = snapV(w.x), sy = snapV(w.y);
    drag = { kind: "draw-marco", start: { x: sx, y: sy }, cur: { x: sx, y: sy }, moved: false };
    render(); return;
  }
  // puerto -> conectar
  if (t.classList && t.classList.contains("port")) {
    const nid = t.getAttribute("data-pid"), port = t.getAttribute("data-port");
    const n = getNode(nid);
    drag = { kind: "connect", fromId: nid, fromPort: port, start: portPoint(n, port), cur: w };
    render(); return;
  }
  // flecha
  const eg = t.closest ? t.closest("[data-eid]") : null;
  if (eg) {
    const id = eg.getAttribute("data-eid");
    if (pendingAdd === "node") {               // insertar bifurcación en el medio de esta flecha
      splitEdge(getEdge(id)); setPending(null); commit(); render(); return;
    }
    if (sumandoALaSeleccion(ev)) { S.selEdges = S.selEdges.includes(id) ? S.selEdges.filter(x => x !== id) : S.selEdges.concat(id); }
    else {
      S.selEdges = [id]; S.sel = [];
      // agarrar la línea por un tramo de adentro ya la corre: seleccionar y acomodar en un solo gesto
      const i = tramoCercano(getEdge(id), w);
      if (i >= 0) empezarTramo(id, i, w);
    }
    render(); return;
  }
  // nodo
  let nid = hitNode(t);
  if (!nid && S.mode !== "multi") {
    const marcos = S.nodes.filter(n => esMarco(n) && puntoEnMarco(w, n));
    if (marcos.length) {
      marcos.sort((a, b) => (a.w * a.h) - (b.w * b.h));
      nid = marcos[0].id;
    }
  }
  if (nid) {
    if (S.mode === "connect" && !esMarco(getNode(nid))) {
      const n = getNode(nid);
      const port = nearestPort(n, w);
      drag = { kind: "connect", fromId: nid, fromPort: port, start: portPoint(n, port), cur: w };
      render(); return;
    }
    if (sumandoALaSeleccion(ev)) S.sel = S.sel.includes(nid) ? S.sel.filter(x => x !== nid) : S.sel.concat(nid);
    else if (!S.sel.includes(nid)) { S.sel = [nid]; S.selEdges = []; }
    drag = { kind: "move", w0: w, orig: S.sel.map(id => { const n = getNode(id); return { id, x: n.x, y: n.y }; }), moved: false };
    render(); return;
  }
  // vacío -> banda de selección
  if (!sumandoALaSeleccion(ev)) { S.sel = []; S.selEdges = []; }
  drag = { kind: "band", band: { x1: w.x, y1: w.y, x2: w.x, y2: w.y }, add: sumandoALaSeleccion(ev) };
  render();
});
function nearestPort(n, w, fromNode) {
  if (n.type === "node") {
    const ref = fromNode ? { x: fromNode.x, y: fromNode.y } : w;
    const dx = ref.x - n.x, dy = ref.y - n.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "r" : "l";
    return dy >= 0 ? "b" : "t";
  }
  let best = "r", bd = 1e9;
  for (const p of ["l", "r", "t", "b"]) {
    const q = portPoint(n, p), d = Math.hypot(q.x - w.x, q.y - w.y);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
/* Qué hay debajo del puntero al tirar una flecha: un puerto, un elemento, o nada */
function destinoBajoPuntero(ev, drag, w) {
  const t = document.elementFromPoint(ev.clientX, ev.clientY);
  if (t && t.classList && t.classList.contains("port"))
    return { id: t.getAttribute("data-pid"), port: t.getAttribute("data-port") };
  const nid = t ? hitNode(t) : null;
  if (nid && !esMarco(getNode(nid)))
    return { id: nid, port: nearestPort(getNode(nid), w, getNode(drag.fromId)) };
  return null;
}
svg.addEventListener("pointermove", ev => {
  if (ev.pointerType === "touch") {
    if (dedos.has(ev.pointerId)) dedos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pellizco) return moverPellizco();
    if (gestoZoom) return;
  }
  const w = toWorld(ev);
  if (!drag) {
    const nid = hitNode(ev.target);
    if (nid !== hoverNode) { hoverNode = nid; render(); }
    return;
  }
  if (drag.kind === "pan") {
    S.pan.x = drag.px + (ev.clientX - drag.sx);
    S.pan.y = drag.py + (ev.clientY - drag.sy);
    moverVista(); return;
  }
  if (drag.kind === "resize") {
    const n = getNode(drag.nodeId);
    if (!n) return;
    const antes = [n.x, n.y, n.w, n.h].join();
    estirar(n, drag, w);
    if ([n.x, n.y, n.w, n.h].join() !== antes) { drag.moved = true; render(); }
    return;
  }
  if (drag.kind === "tramo") {
    const e = getEdge(drag.edgeId);
    if (!e) return;
    const p = drag.h ? w.y : w.x;
    if (!drag.moved && Math.abs(p - drag.p0) * S.zoom < 3) return;   // un clic no mueve nada
    const k = drag.c.length, A = e.pts[0], B = e.pts[e.pts.length - 1];
    const c = acotarLinea(e, snapV(drag.c0 + (p - drag.p0)), drag.idx, k, A, B);
    if (!drag.moved && c === drag.c0) return;               // todavía no se movió de verdad
    if (drag.moved && e.manual && e.manual.c[drag.idx] === c) return;
    drag.moved = true;
    e.manual = { c: drag.c.slice() };
    e.manual.c[drag.idx] = c;
    render();
    return;
  }
  if (drag.kind === "draw-marco") {
    const cx = snapV(w.x), cy = snapV(w.y);
    if (cx !== drag.cur.x || cy !== drag.cur.y) {
      drag.cur = { x: cx, y: cy };
      if (Math.abs(drag.cur.x - drag.start.x) > 3 || Math.abs(drag.cur.y - drag.start.y) > 3) {
        drag.moved = true;
      }
      render();
    }
    return;
  }
  if (drag.kind === "move") {
    const dx = w.x - drag.w0.x, dy = w.y - drag.w0.y;
    if (Math.abs(dx) + Math.abs(dy) > 1) drag.moved = true;
    for (const o of drag.orig) {
      const n = getNode(o.id); if (!n) continue;
      n.x = snapV(o.x + dx); n.y = snapV(o.y + dy);
    }
    render(); return;
  }
  if (drag.kind === "connect") {
    drag.cur = w;
    const dst = destinoBajoPuntero(ev, drag, w);
    drag.invalido = !!dst && dst.id !== drag.fromId && !admiteEntrada(dst.id);
    render(); return;
  }
  if (drag.kind === "band") { drag.band.x2 = w.x; drag.band.y2 = w.y; render(); return; }
});
svg.addEventListener("pointerup", ev => {
  if (soltarDedo(ev)) { render(); return; }
  const w = toWorld(ev);
  if (!drag) return;
  if (drag.kind === "resize" || drag.kind === "tramo") {
    limpiarCursorResize();
    if (drag.moved) commit();
    drag = null;
    render();
    return;
  }
  if (drag.kind === "draw-marco") {
    const x1 = drag.start.x, y1 = drag.start.y;
    const x2 = drag.cur.x, y2 = drag.cur.y;
    const dw = Math.abs(x2 - x1), dh = Math.abs(y2 - y1);
    if (!drag.moved || (dw < 10 && dh < 10)) {
      addAt("marco", snapV(w.x), snapV(w.y));
    } else {
      const nw = Math.max(20, dw);
      const nh = Math.max(20, dh);
      const cx = Math.min(x1, x2) + nw / 2;
      const cy = Math.min(y1, y2) + nh / 2;
      const n = makeNode("marco", cx, cy, { w: nw, h: nh });
      S.nodes.push(n);
      S.sel = [n.id]; S.selEdges = [];
      setPending(null);
      commit();
    }
    drag = null;
    render();
    return;
  }
  if (drag.kind === "connect") {
    const dst = destinoBajoPuntero(ev, drag, w);
    let targetId = dst && dst.id, targetPort = dst && dst.port;
    if (!targetId) {
      // soltar en el vacío = crear bifurcación ahí y conectar
      const nn = makeNode("node", snapV(w.x), snapV(w.y));
      S.nodes.push(nn); targetId = nn.id; targetPort = "l";
    }
    if (targetId !== drag.fromId) {
      if (admiteEntrada(targetId)) {
        S.edges.push({ id: uid("e"), from: { id: drag.fromId, port: drag.fromPort },
          to: { id: targetId, port: targetPort }, variant: 0 });
        commit();
      } else {
        toast("Un bloque admite una sola entrada: para juntar dos señales usá un sumador");
      }
    }
  } else if (drag.kind === "band") {
    const b = drag.band;
    const R = { l: Math.min(b.x1, b.x2), r: Math.max(b.x1, b.x2), t: Math.min(b.y1, b.y2), b: Math.max(b.y1, b.y2) };
    const inside = S.nodes.filter(n => { const r = rectOf(n); return r.l >= R.l && r.r <= R.r && r.t >= R.t && r.b <= R.b; }).map(n => n.id);
    S.sel = drag.add ? Array.from(new Set(S.sel.concat(inside))) : inside;
    if (Math.abs(b.x2 - b.x1) < 3 && Math.abs(b.y2 - b.y1) < 3 && pendingAdd) {
      if (pendingAdd === "node") toast("La bifurcación va sobre una flecha: hacé clic en una línea");
      else addAt(pendingAdd, snapV(w.x), snapV(w.y));
    }
  } else if (drag.kind === "move" && drag.moved) commit();
  svg.classList.remove("panning");
  drag = null; render();
});
instalarRueda();

/* ======================= alta de elementos ======================= */
let pendingAdd = null;
/* Una herramienta de inserción y un modo (selección, múltiple, conectar) son excluyentes:
   elegir una suelta la otra. Al colocar el elemento se vuelve a Selección. */
function setPending(type) {
  pendingAdd = type || null;
  if (pendingAdd && S.mode !== "select") S.mode = "select";   // sale de Conectar / Múltiple
  document.querySelectorAll(".ptool").forEach(b => b.classList.toggle("on", b.dataset.add === pendingAdd));
  svg.classList.toggle("split-mode", pendingAdd === "node");
  svg.classList.toggle("drawing-marco", pendingAdd === "marco");
  svg.classList.toggle("mode-connect", !pendingAdd && S.mode === "connect");
  pintarModo();
  if (pendingAdd) render();
}
// botones de modo y franja de atajos: se marca lo que esté activo, y nada más
function pintarModo() {
  for (const m of ["select", "multi", "connect"])
    $("#m-" + m).classList.toggle("on", !pendingAdd && S.mode === m);
  document.querySelectorAll("#atajos [data-modo]").forEach(e =>
    e.classList.toggle("act", !pendingAdd && S.mode === e.dataset.modo));
  document.querySelectorAll("#atajos [data-add]").forEach(e =>
    e.classList.toggle("act", e.dataset.add === pendingAdd));
  $("#st-hint").textContent = pendingAdd === "node" ? "Hacé clic sobre una flecha: la bifurcación se inserta en su punto medio · Esc cancela"
    : pendingAdd === "marco" ? "Arrastrá para dibujar el recuadro o hacé clic para colocarlo · Esc cancela"
    : pendingAdd ? "Hacé clic en la hoja para colocarlo · Esc cancela"
    : S.mode === "connect" ? "Arrastrá de un elemento a otro para crear la flecha"
    : S.mode === "multi" ? "Cada clic suma o saca de la selección · arrastrá en el fondo para encerrar varios" : "";
}
function addAt(type, x, y) {
  const n = makeNode(type, x, y);
  if (type === "block") n.label = "G" + (S.nodes.filter(m => m.type === "block").length + 1);
  S.nodes.push(n); S.sel = [n.id]; S.selEdges = [];
  setPending(null); commit();
}
document.querySelectorAll(".ptool").forEach(b => {
  b.onclick = () => setPending(pendingAdd === b.dataset.add ? null : b.dataset.add);
});

function setMode(m) {
  S.mode = m;
  pendingAdd = null;                         // elegir un modo suelta la herramienta de inserción
  document.querySelectorAll(".ptool").forEach(b => b.classList.remove("on"));
  svg.classList.remove("split-mode", "drawing-marco");
  svg.classList.toggle("mode-connect", m === "connect");
  pintarModo();
  render();
}
/* En selección múltiple cada clic suma o saca, igual que si tuvieras Shift apretado */
const sumandoALaSeleccion = (ev) => ev.shiftKey || S.mode === "multi";
