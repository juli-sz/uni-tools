/* ======================= barra de arriba, panel y ventanas ======================= */
$("#b-undo").onclick = undo;
$("#b-redo").onclick = redo;
$("#b-del").onclick = () => { borrar(); commit(); render(); };
if ($("#b-dup")) $("#b-dup").onclick = duplicar;
if ($("#b-snap")) $("#b-snap").onclick = () => { S.snap = !S.snap; $("#b-snap").classList.toggle("on", S.snap); };
$("#b-help").onclick = () => $("#ov-help").classList.add("show");
// las ventanas se cierran con un clic afuera
document.querySelectorAll(".overlay").forEach(o =>
  o.addEventListener("click", e => { if (e.target === o) o.classList.remove("show"); }));
// los grupos de la barra se pliegan y despliegan con un clic en su nombre
document.querySelectorAll(".glab").forEach(g =>
  g.addEventListener("click", () => g.parentElement.classList.toggle("collapsed")));
// el panel lateral se oculta y se muestra; la hoja se redibuja cuando termina la transición
const togglePanelBtn = $("#b-toggle-panel"), inspectorPanel = $("#inspector");
togglePanelBtn.addEventListener("click", () => {
  inspectorPanel.classList.toggle("collapsed");
  togglePanelBtn.classList.toggle("on", !inspectorPanel.classList.contains("collapsed"));
  setTimeout(render, 210);
});
if (window.innerWidth <= 720) {              // en el celular la hoja va primero
  inspectorPanel.classList.add("collapsed");
  togglePanelBtn.classList.remove("on");
}
