/* ======================= colores =======================
   El dibujo toma los colores de variables CSS puestas en el <svg> (--c-relleno,
   --c-borde…). Un elemento con color propio redefine la variable en su propio <g> y
   todo lo que cuelga adentro la hereda. Las claves (TEMA_DEF) y sus nombres en el panel
   (NOMBRE_COLOR) los define cada herramienta; aplicarTema() también es suyo. */

/* Los colores terminan escritos en el SVG y en el HTML del panel: sólo se aceptan #rgb … #rrggbbaa.
   De un objeto de colores ({ relleno: "#fff", … }) quedan nada más las entradas válidas. */
const colorValido = (c) => typeof c === "string" && /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(c);
/* <input type="color"> sólo acepta #rrggbb: #rgb se expande y la transparencia (#rgba, #rrggbbaa)
   no se puede mostrar ahí, así que se deja de lado sólo para el selector. */
function aHex6(c) {
  if (!colorValido(c)) return "#000000";
  let h = c.slice(1).toLowerCase();
  if (h.length <= 4) h = h.slice(0, 3).split("").map(x => x + x).join("");
  return "#" + h.slice(0, 6);
}
const soloColores = (o) => {
  if (!esObj(o)) return undefined;
  const r = {};
  for (const k of Object.keys(o)) if (colorValido(o[k])) r[k] = o[k];
  return Object.keys(r).length ? r : undefined;
};
/* Paleta a mano: los cinco primeros vienen fijos y los que agregues quedan guardados
   en este navegador (no en el documento), así te siguen entre diagramas. */
const PALETA_BASE = ["#101418", "#166534", "#0d5bd6", "#c81e1e", "#c2410c"];
const NOMBRE_PALETA = { "#101418": "Negro", "#166534": "Verde oscuro", "#0d5bd6": "Azul",
                        "#c81e1e": "Rojo", "#c2410c": "Naranja", "#ffffff": "Blanco" };
const CLAVE_PALETA = "uni-tools-paleta";
function leerPaleta() {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE_PALETA) || "[]");
    return PALETA_BASE.concat(g.filter(c => /^#[0-9a-f]{6}$/i.test(c) &&
      PALETA_BASE.indexOf(c.toLowerCase()) < 0).map(c => c.toLowerCase()));
  } catch (e) { return PALETA_BASE.slice(); }
}
function guardarPaleta() {
  try {
    localStorage.setItem(CLAVE_PALETA,
      JSON.stringify(paleta.filter(c => PALETA_BASE.indexOf(c) < 0)));
  } catch (e) {}                       // sin localStorage la paleta dura la sesión
}
let paleta = leerPaleta();
S.tema = Object.assign({}, TEMA_DEF);
const temaDe = (k) => (S.tema && S.tema[k]) || TEMA_DEF[k];
/* Un color propio se aplica redefiniendo la variable CSS en el <g> del elemento:
   todo lo que cuelga adentro la hereda sin tocar el resto del dibujo. */
const estiloColor = (c) => !c ? "" :
  Object.keys(c).filter(k => c[k]).map(k => `--c-${k}:${c[k]}`).join(";");
const colorEfectivo = (o, k) => (o && o.color && o.color[k]) || temaDe(k);

/* ---- en el panel: una sección para todo el documento y otra para lo que esté elegido ---- */
/* Una fila = el tirito de la paleta + el selector libre, todo apuntando al mismo id */
function filaColor(id, k, valor) {
  const v = aHex6(valor);
  const muestras = paleta.map(c =>
    `<button type="button" class="pcol${c === v ? " sel" : ""}" data-pal="${id}" data-c="${c}"
      style="background:${c}" title="${NOMBRE_PALETA[c] || c}"></button>`).join("");
  return `<label for="${id}">${NOMBRE_COLOR[k]}</label>
    <div class="paleta">${muestras}<input type="color" class="swatch" id="${id}" value="${v}"
      title="Otro color"></div>`;
}
function seccionPaleta() {
  const propios = paleta.filter(c => PALETA_BASE.indexOf(c) < 0);
  return `<div class="sec"><h3>Mi paleta</h3><div class="paleta">` +
    paleta.map(c => {
      const fijo = PALETA_BASE.indexOf(c) >= 0;
      return `<button type="button" class="pcol grande${fijo ? "" : " quitable"}" style="background:${c}"
        title="${fijo ? (NOMBRE_PALETA[c] || c) : c + " — clic para sacarlo de la paleta"}"
        ${fijo ? "" : `data-quitar="${c}"`}></button>`;
    }).join("") +
    `<input type="color" class="swatch" id="pal-add" value="#7c3aed" title="Agregar este color a la paleta">
    </div>
    <div class="hint" style="margin-top:8px">Negro, verde oscuro, azul, rojo y naranja vienen fijos.
      Con el cuadradito de la derecha sumás el tuyo${propios.length ? ", y con un clic en uno agregado lo sacás" : ""}.
      Quedan guardados en este navegador, no en el ${HERRAMIENTA.textos.doc}.</div></div>`;
}
function wirePaletaDe(id, aplicar) {
  document.querySelectorAll(`[data-pal="${id}"]`).forEach(b => {
    b.onclick = () => aplicar(b.dataset.c, true);
  });
  const e = document.getElementById(id);
  if (!e) return;
  e.addEventListener("input", () => aplicar(e.value, false));
  e.addEventListener("change", () => aplicar(e.value, true));
}
function wirePaleta() {
  const add = document.getElementById("pal-add");
  if (add) add.addEventListener("change", () => {
    const c = add.value.toLowerCase();
    if (paleta.indexOf(c) < 0) { paleta.push(c); guardarPaleta(); render(); }
  });
  document.querySelectorAll("[data-quitar]").forEach(b => b.onclick = () => {
    paleta = paleta.filter(c => c !== b.dataset.quitar);
    guardarPaleta(); render();
  });
}
function seccionTema() {
  const doc = HERRAMIENTA.textos.doc;
  return `<div class="sec"><h3>Colores del ${doc}</h3><div class="cgrid">` +
    Object.keys(TEMA_DEF).map(k => filaColor("t-" + k, k, temaDe(k))).join("") +
    `</div><div class="iconbar" style="margin-top:10px">
      <button class="btn" id="t-reset">Volver al blanco y negro</button></div>
    <div class="hint" style="margin-top:8px">Valen para todo el ${doc} y se guardan con él.
      ${HERRAMIENTA.textos.despegar}</div></div>`;
}
function seccionColorPropio(o, pre, claves) {
  const propio = o.color && Object.keys(o.color).some(k => o.color[k]);
  const doc = HERRAMIENTA.textos.doc;
  return `<div class="sec"><h3>Color propio</h3><div class="cgrid">` +
    claves.map(k => filaColor(pre + k, k, colorEfectivo(o, k))).join("") + `</div>` +
    (propio ? `<div class="iconbar" style="margin-top:10px">
      <button class="btn" id="${pre}reset">Usar los del ${doc}</button></div>` : "") +
    `<div class="hint" style="margin-top:8px">${propio
      ? "Tiene colores propios: no lo toca lo que cambies abajo."
      : `Todavía sigue los colores del ${doc}. Tocá uno y se despega.`}</div></div>`;
}
function wireTema() {
  for (const k in TEMA_DEF)
    wirePaletaDe("t-" + k, (v, definitivo) => {
      if (definitivo) { S.tema[k] = v; commit(); render(); }
      else lock(() => { S.tema[k] = v; render(); });
    });
  const r = document.getElementById("t-reset");
  if (r) r.onclick = () => { S.tema = Object.assign({}, TEMA_DEF); commit(); render(); };
  wirePaleta();
}
function wireColorPropio(pre, claves, objs) {
  const pintar = (k, v) => objs.forEach(o => { o.color = Object.assign({}, o.color); o.color[k] = v; });
  for (const k of claves)
    wirePaletaDe(pre + k, (v, definitivo) => {
      if (definitivo) { pintar(k, v); commit(); render(); }
      else lock(() => { pintar(k, v); render(); });
    });
  const r = document.getElementById(pre + "reset");
  if (r) r.onclick = () => { objs.forEach(o => delete o.color); commit(); render(); };
}
