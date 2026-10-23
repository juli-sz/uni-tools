/* ======================= recuadros =======================
   Sirven para encuadrar un grupo y ponerle nombre: no se cablean, no desvían las
   conexiones y no simulan nada. Pueden ir adelante o atrás (capa gAtras). */
const esMarco = (n) => !!n && n.type === "marco";
const TRAZOS = { solid: "Continuo", dashed: "Rayado", dotted: "Punteado" };
const RELLENOS = { no: "Sin relleno", suave: "Suave (color del trazo)", solido: "Sólido (color de fondo)" };
/* Los valores por defecto de un recuadro nuevo */
function completarMarco(n) {
  n.trazo = n.trazo || "dashed";
  n.grosor = n.grosor || 1.4;
  n.relleno = n.relleno || "no";
  n.atras = !!n.atras;                 // arranca adelante: sin relleno no tapa nada
  n.radio = n.radio === undefined ? 6 : n.radio;
}
/* El rayado se escala con el grosor para que no se empaste en trazos gruesos */
function guiones(n) {
  const g = Math.max(0.6, n.grosor || 1.4);
  return n.trazo === "dashed" ? `${g * 5} ${g * 3.6}`
       : n.trazo === "dotted" ? `${g} ${g * 2.6}` : "";
}
/* Con agarrable, un borde ancho e invisible para tomarlo aunque no tenga relleno */
function dibujarMarco(g, n, agarrable) {
  if (agarrable) el("rect", { class: "m-hit", x: -n.w / 2, y: -n.h / 2, width: n.w, height: n.h, rx: n.radio }, g);
  el("rect", { class: "m-shape" + (n.relleno === "solido" ? " solido" : n.relleno === "suave" ? " suave" : ""),
    x: -n.w / 2, y: -n.h / 2, width: n.w, height: n.h, rx: n.radio,
    "stroke-width": n.grosor, "stroke-dasharray": guiones(n) }, g);
  if (n.label)
    el("text", { class: "m-label", x: -n.w / 2 + 9, y: -n.h / 2 + n.font, "font-size": n.font }, g)
      .textContent = n.label;
}
/* Las filas del panel que comparten todos los recuadros; "los elementos" o "las compuertas" */
function filasRecuadro(n, cuales) {
  return `
        <div class="row"><label>Línea</label><div class="fill"><select id="m-trazo">${opciones(TRAZOS, n.trazo)}</select></div></div>
        <div class="row"><label>Grosor</label><div class="fill"><input type="number" id="m-grosor" step="0.2" min="0.4" max="8" value="${n.grosor}"></div></div>
        <div class="row"><label>Relleno</label><div class="fill"><select id="m-relleno">${opciones(RELLENOS, n.relleno)}</select></div></div>
        <div class="row"><label>Orden</label><div class="fill"><select id="m-orden">
          <option value="0"${n.atras ? "" : " selected"}>Adelante de ${cuales}</option>
          <option value="1"${n.atras ? " selected" : ""}>Atrás de ${cuales}</option></select></div></div>
        <div class="row"><label>Esquinas</label><div class="fill"><input type="number" id="m-radio" step="1" min="0" max="40" value="${n.radio}"></div></div>`;
}
function wireRecuadro(nsel) {
  const elegir = (id, fn) => {
    const e = document.getElementById(id);
    if (e) e.onchange = () => { nsel.forEach(n => fn(n, e.value)); commit(); render(); };
  };
  elegir("m-trazo", (n, v) => n.trazo = v);
  elegir("m-relleno", (n, v) => n.relleno = v);
  elegir("m-orden", (n, v) => n.atras = v === "1");
  enVivo("m-grosor", v => nsel.forEach(n => n.grosor = Math.min(8, Math.max(0.4, +v || 1.4))));
  enVivo("m-radio", v => nsel.forEach(n => n.radio = Math.min(40, Math.max(0, +v || 0))));
}
