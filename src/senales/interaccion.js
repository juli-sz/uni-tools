/* ======================= interacción ======================= */
let modo = "select", pendiente = null;
const idDeNodo = (t) => { const g = t.closest ? t.closest("[data-id]") : null; return g && g.getAttribute("data-id"); };
const idDeRama = (t) => { const g = t.closest ? t.closest("[data-rid]") : null; return g && g.getAttribute("data-rid"); };

function setModo(m) {
  modo = m;
  svg.classList.toggle("mode-connect", m === "connect");
  $("#m-select").classList.toggle("on", m === "select");
  $("#m-multi").classList.toggle("on", m === "multi");
  $("#m-connect").classList.toggle("on", m === "connect");
  $("#st-hint").textContent = m === "connect" ? "Arrastrá de un nodo a otro para dibujar la rama"
    : m === "multi" ? "Cada clic suma o saca de la selección · arrastrá en el fondo para encerrar varios" : "";
}
/* En selección múltiple cada clic suma o saca, igual que si tuvieras Shift apretado */
const sumandoALaSeleccion = (ev) => ev.shiftKey || modo === "multi";
function setPendiente(t) {
  pendiente = t;
  document.querySelectorAll(".ptool").forEach(b => b.classList.toggle("on", b.dataset.add === t));
  $("#st-hint").textContent = t ? "Hacé clic en la hoja para poner el nodo · Esc cancela" : "";
}
/* ---- doble clic: el nombre del nodo o la transmitancia de la rama, sobre la hoja ---- */
svg.addEventListener("dblclick", ev => {
  const nid = idDeNodo(ev.target);
  if (nid) {
    const n = getNodo(nid);
    S.sel = [nid]; S.selR = []; render();
    editarEnLaHoja(n.x, n.y - 20, n.nombre, Math.max(110, 90 * S.zoom), v => n.nombre = v);
    return;
  }
  const w = toWorld(ev);
  const rid = idDeRama(ev.target) || (ramaCerca(w) || {}).id;
  const r = rid && getRama(rid);
  if (r) {
    S.selR = [rid]; S.sel = []; render();
    const c = curvaDe(r);
    editarEnLaHoja(c.lx, c.ly, r.g, Math.max(110, 90 * S.zoom), v => r.g = v);
  }
});
detectarDobleClic(enLaHoja, dobleClicSintetico);

/* ---- puntero (mouse, lápiz y un dedo) ---- */
const esFondo = (t) => !(t && t.closest && t.closest("[data-id],[data-rid]"));
svg.addEventListener("pointercancel", ev => { soltarDedo(ev); drag = null; render(); });

svg.addEventListener("pointerdown", ev => {
  if (ev.pointerType === "touch") {
    dedos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (dedos.size === 2) { capturarPuntero(ev); return arrancarPellizco(); }
    if (dedos.size > 2) return;
  }
  // rueda del mouse, barra espaciadora, o Ctrl (⌘) + clic izquierdo: mueven la hoja
  if (ev.button === 1 || spaceDown || (ev.button === 0 && (ev.ctrlKey || ev.metaKey))) {
    drag = { kind: "pan", x0: ev.clientX, y0: ev.clientY, p0: Object.assign({}, S.pan) };
    svg.classList.add("panning"); capturarPuntero(ev); return;
  }
  if (ev.button !== 0) return;
  const w = toWorld(ev), t = ev.target;
  capturarPuntero(ev);

  if (drag && drag.kind === "curve-new") {
    commit(); drag = null; render(); return;
  }

  // un dedo en el fondo mueve la hoja (con el mouse eso es la banda de selección)
  if (ev.pointerType === "touch" && esFondo(t) && pendiente !== "nodo" && !ramaCerca(w) && modo !== "multi") {
    S.sel = []; S.selR = [];
    drag = { kind: "pan", x0: ev.clientX, y0: ev.clientY, p0: Object.assign({}, S.pan) };
    render(); return;
  }
  if (pendiente === "nodo") {
    const desde = nodoDeSalida();              // se engancha solo al anterior
    const n = nuevoNodo(snapV(w.x), snapV(w.y));
    S.nodos.push(n);
    if (desde) S.ramas.push(nuevaRama(desde.id, n.id));
    S.sel = [n.id]; S.selR = [];
    setPendiente(null); commit(); render(); return;
  }
  const nid = idDeNodo(t);
  if (nid) {
    if (modo === "connect") {
      drag = { kind: "connect", fromId: nid, cur: w };
      render(); return;
    }
    if (sumandoALaSeleccion(ev)) S.sel = S.sel.includes(nid) ? S.sel.filter(x => x !== nid) : S.sel.concat(nid);
    else if (!S.sel.includes(nid)) { S.sel = [nid]; S.selR = []; }
    drag = { kind: "move", w0: w, orig: S.sel.map(id => { const n = getNodo(id); return { id, x: n.x, y: n.y }; }) };
    render(); return;
  }
  const rid = idDeRama(t) || (ramaCerca(w) || {}).id;
  if (rid) {
    if (sumandoALaSeleccion(ev)) S.selR = S.selR.includes(rid) ? S.selR.filter(x => x !== rid) : S.selR.concat(rid);
    else { S.selR = [rid]; S.sel = []; }
    drag = { kind: "curve", rid, w0: w, curva0: getRama(rid).curva || 0 };
    render(); return;
  }
  if (!sumandoALaSeleccion(ev)) { S.sel = []; S.selR = []; }
  drag = { kind: "band", band: { x1: w.x, y1: w.y, x2: w.x, y2: w.y } };
  render();
});
svg.addEventListener("pointermove", ev => {
  if (ev.pointerType === "touch") {
    if (dedos.has(ev.pointerId)) dedos.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pellizco) return moverPellizco();
    if (gestoZoom) return;
  }
  if (!drag) return;
  const w = toWorld(ev);
  if (drag.kind === "pan") {
    S.pan.x = drag.p0.x + (ev.clientX - drag.x0);
    S.pan.y = drag.p0.y + (ev.clientY - drag.y0);
    moverVista(); return;
  }
  if (drag.kind === "move") {
    const dx = w.x - drag.w0.x, dy = w.y - drag.w0.y;
    drag.orig.forEach(o => { const n = getNodo(o.id); if (n) { n.x = snapV(o.x + dx); n.y = snapV(o.y + dy); } });
    render(); return;
  }
  if (drag.kind === "curve") {
    const r = getRama(drag.rid);
    if (!r) return;
    const A = getNodo(r.de), B = getNodo(r.a);
    if (!A || !B) return;
    if (r.de === r.a) {
      r.curva = drag.curva0 - (w.y - drag.w0.y) * (drag.curva0 < 0 ? -1 : 1);
    } else {
      const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
      r.curva = drag.curva0 + ((w.x - drag.w0.x) * -dy / L + (w.y - drag.w0.y) * dx / L) * 2;
    }
    r.curvaFija = true;
    render(); return;
  }
  if (drag.kind === "curve-new") {
    const r = getRama(drag.rid);
    if (!r) return;
    const A = getNodo(r.de), B = getNodo(r.a);
    if (!A || !B) return;
    const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
    r.curva = ((w.x - mx) * nx + (w.y - my) * ny) * 2;
    r.curvaFija = true;
    render(); return;
  }
  if (drag.kind === "connect") { drag.cur = w; render(); return; }
  if (drag.kind === "band") { drag.band.x2 = w.x; drag.band.y2 = w.y; render(); return; }
});
svg.addEventListener("pointerup", ev => {
  if (soltarDedo(ev)) { render(); return; }
  if (!drag) return;
  const w = toWorld(ev);
  if (drag.kind === "connect") {
    const t = document.elementFromPoint(ev.clientX, ev.clientY);
    const destino = t ? idDeNodo(t) : null;
    if (destino) {
      const r = nuevaRama(drag.fromId, destino);
      S.ramas.push(r); S.selR = [r.id]; S.sel = [];
      if (drag.fromId !== destino) {
        drag = { kind: "curve-new", rid: r.id };
        return;
      }
      commit();
    }
  }
  if (drag.kind === "band") {
    const b = drag.band;
    const l = Math.min(b.x1, b.x2), r = Math.max(b.x1, b.x2);
    const t = Math.min(b.y1, b.y2), bo = Math.max(b.y1, b.y2);
    if (Math.abs(r - l) > 4 || Math.abs(bo - t) > 4)
      S.sel = S.nodos.filter(n => n.x >= l && n.x <= r && n.y >= t && n.y <= bo).map(n => n.id);
  }
  if (drag.kind === "move" || drag.kind === "curve") commit();
  svg.classList.remove("panning");
  drag = null; render();
});
instalarRueda();
function fit() {
  if (!S.nodos.length) { S.zoom = 1; S.pan = { x: 90, y: 70 }; render(); return; }
  acomodarRamas();                             // el encuadre tiene que ver los arcos ya acomodados
  encuadrar(bboxAll(), 60, 2);
}
