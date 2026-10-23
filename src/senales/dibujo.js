/* ======================= dibujo ======================= */
function renderRama(r) {
  const c = curvaDe(r); if (!c) return;
  const g = el("g", { class: "rama" + (S.selR.includes(r.id) ? " sel" : ""), "data-rid": r.id }, gRamas);
  el("path", { class: "r-hit", d: c.d }, g);
  el("path", { class: "r-linea", d: c.d }, g);
  el("path", { class: "r-punta", transform: `translate(${c.px},${c.py}) rotate(${c.ang})`,
    d: "M -5.5 -4 L 5 0 L -5.5 4 Z" }, g);
  if (r.g !== "" && r.g != null) {
    const an = anchoTexto(r.g);
    el("rect", { class: "r-lab-bg", x: c.lx - an / 2, y: c.ly - 9, width: an, height: 18, rx: 3 }, g);
    ponerTexto(el("text", { class: "r-lab", x: c.lx, y: c.ly }, g), r.g);
  }
}
function renderNodo(n) {
  const g = el("g", { class: "nodo" + (S.sel.includes(n.id) ? " sel" : ""), "data-id": n.id,
    transform: `translate(${n.x},${n.y})` }, gNodos);
  if (n.tipo === "entrada") el("path", { class: "io-stub", d: "M -34 0 h 22 M -18 -4 l 5 4 -5 4" }, g);
  if (n.tipo === "salida") el("path", { class: "io-stub", d: "M 12 0 h 22 M 29 -4 l 5 4 -5 4" }, g);
  el("circle", { class: n.tipo === "normal" ? "n-dot" : "n-io", cx: 0, cy: 0, r: R_NODO }, g);
  el("circle", { class: "n-hit", cx: 0, cy: 0, r: 15 }, g);
  ponerTexto(el("text", { class: "n-name", x: 0, y: -20 }, g), n.nombre);
  if (n.tipo !== "normal") {
    const t = el("text", { class: "n-rol", x: 0, y: 20 }, g);
    t.textContent = n.tipo === "entrada" ? "ENTRADA" : "SALIDA";
  }
  if (S.sel.includes(n.id)) el("rect", { class: "sel-box", x: -18, y: -30, width: 36, height: 48 }, g);
}
function render() {
  acomodarRamas();
  gRamas.textContent = ""; gNodos.textContent = ""; gOv.textContent = "";
  moverVista();
  $("#gridbg").style.display = S.showGrid ? "" : "none";
  for (const r of S.ramas) renderRama(r);
  for (const n of S.nodos) renderNodo(n);
  if (drag && drag.kind === "connect" && drag.cur) {
    const A = getNodo(drag.fromId);
    el("path", { class: "ghostline", d: `M ${A.x} ${A.y} L ${drag.cur.x} ${drag.cur.y}` }, gOv);
  }
  if (drag && drag.kind === "band") {
    const b = drag.band;
    el("rect", { class: "band", x: Math.min(b.x1, b.x2), y: Math.min(b.y1, b.y2),
      width: Math.abs(b.x2 - b.x1), height: Math.abs(b.y2 - b.y1) }, gOv);
  }
  $("#st-n").textContent = S.nodos.length;
  $("#st-r").textContent = S.ramas.length;
  $("#st-s").textContent = (S.sel.length + S.selR.length)
    ? S.sel.length + " nodos · " + S.selR.length + " ramas" : "—";
  $("#zoomlab").textContent = Math.round(S.zoom * 100) + "%";
  $("#b-undo").disabled = !undoStack.length;
  $("#b-redo").disabled = !redoStack.length;
  if (document.activeElement !== $("#b-nombre")) $("#b-nombre").value = S.nombre || "";
  const falta = [];
  if (!S.nodos.some(n => n.tipo === "entrada")) falta.push("entrada");
  if (!S.nodos.some(n => n.tipo === "salida")) falta.push("salida");
  $("#st-warn").innerHTML = S.nodos.length && falta.length
    ? `<span class="warn">falta marcar ${falta.join(" y ")}</span>` : "";
  renderInspector();
}
