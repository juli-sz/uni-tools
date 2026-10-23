/* ======================= teclado =======================
   Lo común a las tres herramientas. Lo propio (insertar, cambiar de modo, análisis)
   lo atiende teclaPropia(k, ev) de cada una, que devuelve true si la usó, y Esc lo
   resuelve alEscape(). */
window.addEventListener("keydown", ev => {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName)) return;
  const k = ev.key.toLowerCase();
  // Con una ventana abierta (ayuda, tabla de verdad, análisis, abrir) los atajos no tocan el
  // diagrama de atrás: Ctrl+C copia el texto de la ventana, Supr no borra lo seleccionado, etc.
  // Sólo Esc hace algo: cerrarla.
  if (document.querySelector(".overlay.show")) {
    if (k === "escape") document.querySelectorAll(".overlay.show").forEach(o => o.classList.remove("show"));
    return;
  }
  if (ev.code === "Space") { spaceDown = true; ev.preventDefault(); return; }
  if (ev.ctrlKey || ev.metaKey) {
    if (k === "z") { ev.preventDefault(); ev.shiftKey ? redo() : undo(); }
    else if (k === "y") { ev.preventDefault(); redo(); }
    else if (k === "c") { ev.preventDefault(); copiarSel(); }
    else if (k === "x") { ev.preventDefault(); cortarSel(); }
    else if (k === "v") { ev.preventDefault(); pegarSel(); }
    else if (k === "d") { ev.preventDefault(); duplicar(); }
    else if (k === "a") { ev.preventDefault(); S.sel = S[HERRAMIENTA.nodos].map(n => n.id); render(); }
    return;
  }
  if (k === "delete" || k === "backspace") { ev.preventDefault(); borrar(); commit(); render(); return; }
  if (k === "escape") return alEscape();
  if (teclaPropia(k, ev)) return;
  if (k === "f") return fit();
  if (k === "?") return $("#ov-help").classList.add("show");
  if (ev.key.startsWith("Arrow") && S.sel.length) {        // un paso de grilla; con Shift, 1 px
    ev.preventDefault();
    const d = ev.shiftKey ? 1 : S.grid;
    const dx = ev.key === "ArrowLeft" ? -d : ev.key === "ArrowRight" ? d : 0;
    const dy = ev.key === "ArrowUp" ? -d : ev.key === "ArrowDown" ? d : 0;
    S.sel.map(buscarNodo).forEach(n => { if (n) { n.x += dx; n.y += dy; } });
    render(); clearTimeout(window._kt); window._kt = setTimeout(commit, 400);
  }
});
window.addEventListener("keyup", ev => { if (ev.code === "Space") spaceDown = false; });
