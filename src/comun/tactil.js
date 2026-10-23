/* ======================= gestos táctiles =======================
   Un dedo en el fondo mueve la hoja, un dedo sobre un elemento lo selecciona y lo
   arrastra igual que con el mouse, y dos dedos hacen zoom. Qué es "fondo" lo dice
   esFondo() de cada herramienta, y sus manejadores del puntero llaman a estas. */
const dedos = new Map();                     // pointerId -> posición en pantalla
let pellizco = null, gestoZoom = false;
function centroDedos() {
  const p = Array.from(dedos.values());
  return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2,
           d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) };
}
/* Al aparecer el segundo dedo (o con Esc) se deshace lo que se había empezado a arrastrar.
   Lo que no sea mover elementos lo deshace cancelarArrastre() de la herramienta, si tiene. */
function cancelarDrag() {
  if (drag && drag.kind === "move" && drag.orig)
    drag.orig.forEach(o => { const n = buscarNodo(o.id); if (n) { n.x = o.x; n.y = o.y; } });
  if (HERRAMIENTA.cancelarArrastre) HERRAMIENTA.cancelarArrastre(drag);
  drag = null;
  svg.classList.remove("panning");
}
function arrancarPellizco() {
  cancelarDrag();
  gestoZoom = true;
  const c = centroDedos();
  pellizco = { d0: c.d || 1, z0: S.zoom, cx: c.x, cy: c.y, px: S.pan.x, py: S.pan.y };
  render();
}
/* El punto de la hoja que estaba abajo del centro de los dedos se queda ahí */
function moverPellizco() {
  if (!pellizco || dedos.size < 2) return;
  const c = centroDedos(), r = svg.getBoundingClientRect();
  const z = Math.min(4, Math.max(.2, pellizco.z0 * (c.d / pellizco.d0)));
  const mx0 = pellizco.cx - r.left, my0 = pellizco.cy - r.top;
  S.zoom = z;
  S.pan.x = (c.x - r.left) - (mx0 - pellizco.px) * (z / pellizco.z0);
  S.pan.y = (c.y - r.top) - (my0 - pellizco.py) * (z / pellizco.z0);
  render();
}
function soltarDedo(ev) {
  if (ev.pointerType !== "touch") return false;
  dedos.delete(ev.pointerId);
  if (dedos.size < 2) pellizco = null;
  if (!dedos.size) { const hubo = gestoZoom; gestoZoom = false; if (hubo) { drag = null; return true; } }
  return gestoZoom;                          // mientras queden dedos del pellizco, no se arrastra
}
