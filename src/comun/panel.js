/* ======================= panel derecho: utilidades =======================
   renderInspector() de cada herramienta arma el HTML del panel y wireInspector() lo
   conecta con estas. Mientras se escribe en un campo, lock() evita que render()
   rehaga el panel (y se pierda el foco). */
let inspLock = false;
function lock(fn) { inspLock = true; try { fn(); } finally { inspLock = false; } }
/* Un campo que se aplica en vivo mientras se escribe y entra al historial al confirmarlo.
   Con redibujar, además se rehace el panel al confirmar. */
function enVivo(id, fn, redibujar) {
  const e = document.getElementById(id); if (!e) return;
  e.addEventListener("input", () => lock(() => { fn(e.value); render(); }));
  e.addEventListener("change", () => { fn(e.value); commit(); if (redibujar) render(); });
  e.addEventListener("keydown", ev => ev.stopPropagation());
}
/* Un botón del panel: hace lo suyo, lo guarda en el historial y redibuja */
function alClic(id, fn) {
  const e = document.getElementById(id);
  if (e) e.onclick = () => { fn(); commit(); render(); };
}
/* Las opciones de un <select> a partir de una tabla { valor: "texto" } */
const opciones = (tabla, val) => Object.keys(tabla).map(k =>
  `<option value="${k}"${k === val ? " selected" : ""}>${tabla[k]}</option>`).join("");
