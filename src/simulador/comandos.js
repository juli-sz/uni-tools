/* ======================= comandos ======================= */
function rotar(paso) {
  const ns = S.sel.map(getNode).filter(n => n && puedeGirar(n));
  if (!ns.length) { toast("Elegí una compuerta para girarla"); return; }
  ns.forEach(n => n.rot = (((n.rot || 0) + paso) % 360 + 360) % 360);
  recalcularCables(new Set(ns.map(n => n.id)));
  commit(); render();
}
/* Los cables quedan atados a la misma pata: si el bloque se mueve o gira,
   el extremo va con la pata y el recorrido se rehace desde ahí. */
function recalcularCables(ids) {
  S.wires.forEach(w => { if (ids.has(w.from.id) || ids.has(w.to.id)) rutaAuto(w); });
}
function fit() {
  const hj = hojaActiva();                      // con área definida, encuadrar es ver la hoja entera
  if (!S.nodes.length && !hj) { S.zoom = 1; S.pan = { x: 80, y: 60 }; render(); return; }
  encuadrar(hj ? cajaHoja(hj) : bboxAll(), 70, 1.8);
}
