/* ======================= dibujo ======================= */
function renderNode(n, destino) {
  const g = el("g", { class: "node" + (S.sel.includes(n.id) ? " sel" : ""), "data-id": n.id,
    style: estiloColor(n.color), transform: `translate(${n.x},${n.y})` }, destino || gNodes);
  if (n.type === "marco") {
    dibujarMarco(g, n, true);
  } else if (n.type === "block") {
    el("rect", { class: "n-shape", x: -n.w / 2, y: -n.h / 2, width: n.w, height: n.h, rx: 0 }, g);
    dibujarMath(g, n.label, n.font, 0, 0);
  } else if (n.type === "sum") {
    const r = Math.min(n.w, n.h) / 2;
    el("circle", { class: "n-shape", cx: 0, cy: 0, r }, g);
    if (n.cross) {
      const k = r * Math.SQRT1_2;
      el("path", { class: "n-cross", d: `M ${-k} ${-k} L ${k} ${k} M ${k} ${-k} L ${-k} ${k}` }, g);
    }
    const fs = Math.max(9, r * .52);
    for (const k in n.signs) {
      const sg = n.signs[k];
      if (!sg) continue;
      const d = DIRS[k];                     // centrado en el sector de la cruz de ese lado
      const t = el("text", { class: "n-sign", x: d.x * r * .58, y: d.y * r * .58,
        "font-size": fs }, g);
      t.textContent = sg;
    }
    if (n.label) dibujarMath(g, n.label, 12, 0, -r - 12);
  } else if (n.type === "node") {
    el("circle", { cx: 0, cy: 0, r: 4.5, stroke: "none",
      class: S.sel.includes(n.id) ? "n-dot sel-dot" : "n-dot" }, g);
    el("circle", { cx: 0, cy: 0, r: 11, fill: "transparent" }, g);
    if (n.label) dibujarMath(g, n.label, 12, 0, -14);
  } else {
    dibujarMath(g, n.label, n.font, 0, 0);
    el("rect", { x: -n.w / 2, y: -n.h / 2, width: n.w, height: n.h, fill: "transparent" }, g);
  }
  if (S.sel.includes(n.id) && !esMarco(n)) {
    const R = rectOf(n);
    el("rect", { class: "sel-box", x: R.l - n.x - 4, y: R.t - n.y - 4, width: R.w + 8, height: R.h + 8 }, g);
  }
  return g;
}
function renderEdge(e) {
  if (!e.pts) return;
  const sel = S.selEdges.includes(e.id);
  const g = el("g", { class: sel ? "edge-sel" : "", "data-eid": e.id, style: estiloColor(e.color) }, gEdges);
  el("path", { class: "edge-hit", d: pathD(e.pts, 6) }, g);
  const tgt = getNode(e.to.id);
  const noHead = e.arrow === false || (tgt && tgt.type === "node");  // una bifurcación no lleva punta
  const p = el("path", {
    class: "edge" + (e.dashed ? " dashed" : "") + (sel ? " sel" : ""),
    d: pathD(e.pts, 6),
    "marker-end": noHead ? "" : (sel ? "url(#arrowSel)" : markerPara(colorEfectivo(e, "flecha")))
  }, g);
  if (e.width) p.setAttribute("stroke-width", e.width);
  if (e.label) {
    const segs = segsOf(e.pts);
    let best = segs[0], bl = 0;
    for (const s of segs) { const L = Math.hypot(s[1].x - s[0].x, s[1].y - s[0].y); if (L > bl) { bl = L; best = s; } }
    const mx = (best[0].x + best[1].x) / 2, my = (best[0].y + best[1].y) / 2;
    const wpx = e.label.length * 6.4 + 8;
    el("rect", { class: "e-label-bg", x: mx - wpx / 2, y: my - 9, width: wpx, height: 18, rx: 3 }, g);
    const t = el("text", { class: "e-label", x: mx, y: my }, g); t.textContent = e.label;
  }
}
function renderPorts() {
  const ids = new Set(S.sel);
  const connecting = drag && drag.kind === "connect";
  const list = (S.mode === "connect" || connecting) ? S.nodes
             : S.nodes.filter(n => ids.has(n.id) || n.id === hoverNode);
  for (const n of list) {
    if (esMarco(n)) continue;                 // un recuadro no se cablea
    if (n.type === "node") {
      for (const p of ["l", "r", "t", "b"]) {
        const d = DIRS[p];
        el("line", { class: "port-stem", x1: n.x, y1: n.y, x2: n.x + d.x * 13, y2: n.y + d.y * 13 }, gOv);
        el("circle", { class: "port", cx: n.x + d.x * 15, cy: n.y + d.y * 15, r: 5.5,
          "data-port": p, "data-pid": n.id }, gOv);
      }
      continue;
    }
    for (const p of ["l", "r", "t", "b"]) {
      const q = portPoint(n, p);
      el("circle", { class: "port", cx: q.x, cy: q.y, r: 5, "data-port": p, "data-pid": n.id }, gOv);
    }
  }
}
/* Tiradores de tamaño. Se pueden estirar los recuadros, los bloques y los sumadores. Los
   recuadros tienen además los cuatro lados; en bloques y sumadores los lados están ocupados
   por los puertos de conexión, así que sólo llevan las esquinas. */
const esEstirable = (n) => !!n && (n.type === "marco" || n.type === "block" || n.type === "sum");
function renderHandles() {
  renderTiradoresTramo();
  if (S.sel.length !== 1) return;
  const n = getNode(S.sel[0]);
  if (!esEstirable(n)) return;
  const R = rectOf(n);
  const tiradores = [
    { dir: "nw", x: R.l, y: R.t }, { dir: "ne", x: R.r, y: R.t },
    { dir: "se", x: R.r, y: R.b }, { dir: "sw", x: R.l, y: R.b }
  ];
  if (esMarco(n)) tiradores.push(
    { dir: "n", x: R.cx, y: R.t }, { dir: "s", x: R.cx, y: R.b },
    { dir: "w", x: R.l, y: R.cy }, { dir: "e", x: R.r, y: R.cy });
  if (esMarco(n)) {                            // asa de arriba a la izquierda, por fuera del recuadro
    const gx = R.l + 10, gy = R.t - 24;
    const g = el("g", { class: "m-grip-wrap", "data-nid": n.id }, gOv);
    el("rect", { class: "m-grip", x: gx, y: gy, width: 26, height: 18, rx: 4 }, g);
    el("path", { class: "m-grip-ico", d: `M ${gx + 13} ${gy + 4} V ${gy + 14} M ${gx + 8} ${gy + 9} H ${gx + 18}
      M ${gx + 13} ${gy + 4} l -2 2 M ${gx + 13} ${gy + 4} l 2 2 M ${gx + 13} ${gy + 14} l -2 -2 M ${gx + 13} ${gy + 14} l 2 -2
      M ${gx + 8} ${gy + 9} l 2 -2 M ${gx + 8} ${gy + 9} l 2 2 M ${gx + 18} ${gy + 9} l -2 -2 M ${gx + 18} ${gy + 9} l -2 2` }, g);
  }
  // el cuadrito de dibujo queda por fuera de la caja de selección punteada
  const sal = esMarco(n) ? 0 : 4;
  for (const c of tiradores) {
    const x = c.x + (c.dir.includes("e") ? sal : c.dir.includes("w") ? -sal : 0);
    const y = c.y + (c.dir.includes("s") ? sal : c.dir.includes("n") ? -sal : 0);
    const g = el("g", { class: "m-handle-wrap", "data-handle": c.dir, "data-nid": n.id }, gOv);
    el("rect", { x: x - 9, y: y - 9, width: 18, height: 18, fill: "transparent" }, g);
    el("rect", { class: "m-handle", x: x - 5, y: y - 5, width: 10, height: 10, rx: 2 }, g);
  }
}
// una flecha seleccionada muestra un tirador en el medio de cada tramo
function renderTiradoresTramo() {
  for (const id of S.selEdges) {
    const e = getEdge(id);
    if (!e || !e.pts) continue;
    for (let i = 0; i < e.pts.length - 1; i++) {
      const a = e.pts[i], b = e.pts[i + 1];
      if (Math.hypot(b.x - a.x, b.y - a.y) < 18) continue;   // muy cortito: sigue pudiéndose arrastrar la línea
      const h = tramoHoriz(e, i), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const g = el("g", { class: "seg-handle-wrap " + (h ? "h" : "v"),
        "data-seg-eid": e.id, "data-seg": i }, gOv);
      el("rect", { x: mx - 11, y: my - 11, width: 22, height: 22, fill: "transparent" }, g);
      el("rect", { class: "seg-handle", x: mx - (h ? 8 : 3.5), y: my - (h ? 3.5 : 8),
        width: h ? 16 : 7, height: h ? 7 : 16, rx: 3 }, g);
    }
  }
}
let hoverNode = null;
function render() {
  actualizarTamaños();
  routeAll();
  aplicarTema();
  gAtras.textContent = ""; gEdges.textContent = ""; gNodes.textContent = ""; gOv.textContent = "";
  marcadoresUsados.clear();
  moverVista();
  $("#gridbg").style.display = S.showGrid ? "" : "none";
  // los recuadros "atrás" van en su propia capa, debajo de flechas y elementos
  for (const n of S.nodes) if (esMarco(n) && n.atras) renderNode(n, gAtras);
  for (const e of S.edges) renderEdge(e);
  for (const p of junctionDots()) el("circle", { class: "n-dot", cx: p.x, cy: p.y, r: 4.5 }, gEdges);
  for (const n of S.nodes) if (!esMarco(n)) renderNode(n);
  for (const n of S.nodes) if (esMarco(n) && !n.atras) renderNode(n);
  renderHoja();
  renderPorts();
  renderHandles();
  if (drag && drag.kind === "connect" && drag.cur) {
    const a = drag.start;
    el("path", { class: "ghostline" + (drag.invalido ? " invalido" : ""), d: `M ${a.x} ${a.y} L ${drag.cur.x} ${a.y} L ${drag.cur.x} ${drag.cur.y}` }, gOv);
  }
  if (drag && drag.kind === "band") {
    const b = drag.band;
    el("rect", { class: "band", x: Math.min(b.x1, b.x2), y: Math.min(b.y1, b.y2),
      width: Math.abs(b.x2 - b.x1), height: Math.abs(b.y2 - b.y1) }, gOv);
  }
  if (drag && drag.kind === "draw-marco") {
    const x1 = drag.start.x, y1 = drag.start.y;
    const x2 = drag.cur.x, y2 = drag.cur.y;
    const l = Math.min(x1, x2), t = Math.min(y1, y2);
    const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
    el("rect", { class: "m-shape",
      style: "stroke:var(--accent);stroke-dasharray:4 3;stroke-width:1.5;fill:rgba(13,91,214,.06)",
      x: l, y: t, width: w, height: h, rx: 6 }, gOv);
  }
  $("#st-n").textContent = S.nodes.length;
  $("#st-e").textContent = S.edges.length;
  $("#st-s").textContent = (S.sel.length + S.selEdges.length) ? (S.sel.length + " elem · " + S.selEdges.length + " flechas") : "—";
  $("#zoomlab").textContent = Math.round(S.zoom * 100) + "%";
  $("#b-hoja").value = S.hoja ? S.hoja.preset : "";
  if (document.activeElement !== $("#b-nombre")) $("#b-nombre").value = S.nombre || "";
  $("#b-undo").disabled = !undoStack.length;
  $("#b-redo").disabled = !redoStack.length;
  limpiarMarcadores();
  renderInspector();
}
