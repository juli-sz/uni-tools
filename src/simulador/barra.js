/* ======================= barra y teclado propios ======================= */
document.querySelectorAll("[data-align]").forEach(b => b.onclick = () => alinear(b.dataset.align));
instalarRueda();
$("#b-truth").onclick = mostrarTabla;
$("#b-clear").onclick = () => {
  if (!S.nodes.length || confirm("¿Vaciar el circuito?")) { S.nodes = []; S.wires = []; S.sel = []; S.selW = []; VAL = new Map(); commit(); render(); }
};
$("#ejemplos").onchange = e => { if (e.target.value) { cargarEjemplo(e.target.value); e.target.value = ""; } };
/* Los atajos de una letra de esta herramienta (los comunes están en comun/teclado.js) */
const ATAJOS = { "1": "and", "2": "or", "3": "not", "4": "nand", "5": "nor", "6": "xor", "7": "xnor",
  "i": "in", "o": "out", "b": "buf", "l": "label", "p": "clk", "h": "hadd", "s": "fadd",
  "m": "marco",
  "8": "ff:rs", "9": "ff:jk", "0": "ff:d" };
function teclaPropia(k, ev) {
  if (k === "t") mostrarTabla();
  else if (k === "r") { ev.preventDefault(); rotar(ev.shiftKey ? -90 : 90); }
  else if (ATAJOS[k]) setPendiente(ATAJOS[k]);
  else return false;
  return true;
}
function alEscape() {
  setPendiente(null); S.sel = []; S.selW = [];
  render();
}
