/* ======================= barra superior ======================= */
$("#m-select").onclick = () => setMode("select");
$("#m-multi").onclick = () => setMode(S.mode === "multi" ? "select" : "multi");
$("#m-connect").onclick = () => setMode("connect");
document.querySelectorAll("#atajos [data-modo]").forEach(e => e.onclick = () => setMode(e.dataset.modo));
document.querySelectorAll("#atajos [data-add]").forEach(e => e.onclick = () => setPending(pendingAdd === e.dataset.add ? null : e.dataset.add));
document.querySelectorAll("[data-align]").forEach(b => b.onclick = () => alinear(b.dataset.align));
$("#gridsize").onchange = e => {
  S.grid = +e.target.value;
  $("#gridPat").setAttribute("width", S.grid); $("#gridPat").setAttribute("height", S.grid);
  $("#gridPat").firstElementChild.setAttribute("d", `M${S.grid} 0H0V${S.grid}`);
  $("#gridPat10").setAttribute("width", S.grid * 5); $("#gridPat10").setAttribute("height", S.grid * 5);
  $("#gridPat10").firstElementChild.setAttribute("width", S.grid * 5);
  $("#gridPat10").firstElementChild.setAttribute("height", S.grid * 5);
  $("#gridPat10").lastElementChild.setAttribute("d", `M${S.grid * 5} 0H0V${S.grid * 5}`);
  render();
};
$("#b-snapall").onclick = () => {
  S.nodes.forEach(n => { n.x = Math.round(n.x / S.grid) * S.grid; n.y = Math.round(n.y / S.grid) * S.grid; });
  S.edges.forEach(rutaAuto);
  commit(); render(); toast("Todo alineado a la grilla");
};
$("#b-help").onclick = () => $("#ov-help").classList.add("show");
$("#b-clear").onclick = () => {
  if (!S.nodes.length || confirm("¿Vaciar la hoja? Se borra todo el diagrama.")) {
    S.nodes = []; S.edges = []; S.sel = []; S.selEdges = []; commit(); render();
  }
};
$("#b-example").onclick = () => { loadExample(); toast("Ejemplo cargado"); };
/* Los atajos de una letra de esta herramienta (los comunes están en comun/teclado.js) */
function teclaPropia(k) {
  if (k === "v") setMode("select");
  else if (k === "x") setMode("multi");
  else if (k === "c") setMode("connect");
  else if (k === "b") setPending("block");
  else if (k === "s") setPending("sum");
  else if (k === "n") setPending("node");
  else if (k === "e") setPending("io");
  else if (k === "t") setPending("text");
  else if (k === "m") setPending("marco");
  else return false;
  return true;
}
function alEscape() {
  if (drag) cancelarDrag();
  if (pendingAdd) setPending(null); else if (S.mode !== "select") setMode("select");
  S.sel = []; S.selEdges = []; render();
}
