/* ======================= vista: mover la hoja y hacer zoom ======================= */
let drag = null, spaceDown = false;
function toWorld(ev) {
  const r = svg.getBoundingClientRect();
  return { x: (ev.clientX - r.left - S.pan.x) / S.zoom, y: (ev.clientY - r.top - S.pan.y) / S.zoom };
}
const snapV = (v) => S.snap ? Math.round(v / S.grid) * S.grid : Math.round(v);
/* Mover la hoja (sin cambiar el zoom) no cambia nada de lo dibujado: alcanza con correr la vista.
   Redibujar todo en cada movimiento del mouse re-ruteaba todas las flechas y con diagramas
   grandes se trababa. Si algo dibujado pasara a depender de S.pan, hay que redibujarlo acá. */
function moverVista() {
  viewport.setAttribute("transform", `translate(${S.pan.x},${S.pan.y}) scale(${S.zoom})`);
}
/* Encuadra la caja b (l, t, r, b en coordenadas de la hoja) dejando un margen en pantalla.
   La paleta flota arriba a la izquierda: si queda lugar, lo dibujado se acomoda a su derecha
   para que no tape nada (en una pantalla angosta no alcanza y se usa la hoja entera). */
function encuadrar(b, margen, zoomMax) {
  const r = svg.getBoundingClientRect(), p = $("#palette").getBoundingClientRect();
  const izq = p.width && r.width - (p.right - r.left) > 500 ? p.right - r.left : 0;
  const ancho = r.width - izq;
  S.zoom = Math.max(.2, Math.min((ancho - margen * 2) / Math.max(1, b.r - b.l),
                                 (r.height - margen * 2) / Math.max(1, b.b - b.t), zoomMax));
  S.pan.x = izq + (ancho - (b.r - b.l) * S.zoom) / 2 - b.l * S.zoom;
  S.pan.y = (r.height - (b.b - b.t) * S.zoom) / 2 - b.t * S.zoom;
  render();
}
/* La rueda mueve la hoja; el pellizco del trackpad llega como rueda con Ctrl apretado,
   y eso es zoom (alrededor del puntero). */
const instalarRueda = () => svg.addEventListener("wheel", ev => {
  ev.preventDefault();
  const r = svg.getBoundingClientRect();
  if (ev.ctrlKey || ev.metaKey) {
    const mx = ev.clientX - r.left, my = ev.clientY - r.top;
    const wx = (mx - S.pan.x) / S.zoom, wy = (my - S.pan.y) / S.zoom;
    S.zoom = Math.min(4, Math.max(.2, S.zoom * Math.exp(-ev.deltaY * .0016)));
    S.pan.x = mx - wx * S.zoom; S.pan.y = my - wy * S.zoom;
  } else {
    const f = ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? r.height : 1;   // líneas o páginas
    let dx = ev.deltaX, dy = ev.deltaY;
    if (ev.shiftKey && !dx) { dx = dy; dy = 0; }                             // shift: a lo ancho
    S.pan.x -= dx * f;
    S.pan.y -= dy * f;
  }
  if (ev.ctrlKey || ev.metaKey) render(); else moverVista();   // el zoom sí cambia tamaños
}, { passive: false });
$("#b-zoomin").onclick = () => { S.zoom = Math.min(4, S.zoom * 1.2); render(); };
$("#b-zoomout").onclick = () => { S.zoom = Math.max(.2, S.zoom / 1.2); render(); };
$("#b-fit").onclick = () => fit();
$("#b-gridshow").onclick = () => { S.showGrid = !S.showGrid; render(); };
