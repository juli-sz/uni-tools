/* ======================= barra y teclado propios ======================= */
$("#m-select").onclick = () => setModo("select");
$("#m-multi").onclick = () => setModo(modo === "multi" ? "select" : "multi");
$("#m-connect").onclick = () => setModo("connect");
$("#b-mason").onclick = mostrarMason;
$("#b-clear").onclick = () => {
  if (!S.nodos.length || confirm("¿Vaciar el diagrama?")) {
    S.nodos = []; S.ramas = []; S.sel = []; S.selR = []; commit(); render();
  }
};
document.querySelectorAll(".ptool").forEach(b =>
  b.onclick = () => setPendiente(pendiente === b.dataset.add ? null : b.dataset.add));
/* Los atajos de una letra de esta herramienta (los comunes están en comun/teclado.js) */
function teclaPropia(k) {
  if (k === "n") setPendiente("nodo");
  else if (k === "v") setModo("select");
  else if (k === "x") setModo("multi");
  else if (k === "c") setModo("connect");
  else if (k === "a") mostrarMason();
  else return false;
  return true;
}
function alEscape() {
  setPendiente(null); S.sel = []; S.selR = [];
  render();
}
