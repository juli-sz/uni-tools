/* ======================= área de impresión =======================
   Un rectángulo en coordenadas de la hoja que marca qué se va a exportar. Los
   tamaños están en px a 96 dpi, que es como el navegador mide una hoja real. */
const HOJAS = {
  "a4-h":    { nombre: "A4 apaisada",   w: 1123, h: 794 },
  "a4-v":    { nombre: "A4 vertical",   w: 794,  h: 1123 },
  "a3-h":    { nombre: "A3 apaisada",   w: 1587, h: 1123 },
  "a3-v":    { nombre: "A3 vertical",   w: 1123, h: 1587 },
  "a5-h":    { nombre: "A5 apaisada",   w: 794,  h: 559 },
  "a5-v":    { nombre: "A5 vertical",   w: 559,  h: 794 },
  "carta-h": { nombre: "Carta apaisada", w: 1056, h: 816 },
  "carta-v": { nombre: "Carta vertical", w: 816,  h: 1056 },
  "16-9":    { nombre: "16:9 diapositiva", w: 1280, h: 720 },
  "1-1":     { nombre: "Cuadrada",      w: 900,  h: 900 }
};
const hojaActiva = () => S.hoja && S.hoja.preset ? S.hoja : null;
const hojaValida = (h) => esObj(h) && ["x", "y", "w", "h"].every(k => num(h[k], null) !== null) ? h : null;
/* El área se guarda con su propio ancho y alto: si después la estirás a mano,
   el preset queda como referencia pero mandan los números. */
function ponerHoja(preset) {
  if (!preset) { S.hoja = null; return; }
  const d = HOJAS[preset] || HOJAS["a4-h"];
  const prev = hojaActiva();
  const cx = prev ? prev.x + prev.w / 2 : centroVista().x;
  const cy = prev ? prev.y + prev.h / 2 : centroVista().y;
  S.hoja = { preset, w: d.w, h: d.h, x: Math.round(cx - d.w / 2), y: Math.round(cy - d.h / 2) };
}
function centroVista() {                       // el medio de lo dibujado, o de lo que se ve
  if (S[HERRAMIENTA.nodos].length) { const b = bboxAll(); return { x: (b.l + b.r) / 2, y: (b.t + b.b) / 2 }; }
  const r = svg.getBoundingClientRect();
  return { x: (r.width / 2 - S.pan.x) / S.zoom, y: (r.height / 2 - S.pan.y) / S.zoom };
}
function centrarHoja() {
  const H = hojaActiva(); if (!H) return;
  const c = centroVista();
  H.x = Math.round(c.x - H.w / 2); H.y = Math.round(c.y - H.h / 2);
}
/* La caja que se exporta y que se encuadra: la hoja si hay, si no todo lo dibujado */
const cajaHoja = (H) => ({ l: H.x, t: H.y, r: H.x + H.w, b: H.y + H.h });
function renderHoja() {
  const H = hojaActiva(); if (!H) return;
  const g = el("g", { class: "hoja" }, gOv);
  const M = 40000;                              // el sombreado tapa todo lo que quede afuera
  for (const [x, y, w, h] of [[H.x - M, H.y - M, M * 2 + H.w, M], [H.x - M, H.y + H.h, M * 2 + H.w, M],
                              [H.x - M, H.y, M, H.h], [H.x + H.w, H.y, M, H.h]])
    el("rect", { class: "hoja-fuera", x, y, width: w, height: h }, g);
  el("rect", { class: "hoja-borde", x: H.x, y: H.y, width: H.w, height: H.h }, g);
  const t = el("text", { class: "hoja-nombre", x: H.x, y: H.y - 9,
    "font-size": Math.max(11, Math.round(11 / S.zoom)) }, g);
  t.textContent = `${(HOJAS[H.preset] || {}).nombre || "Área"} · ${H.w} × ${H.h}`;
}
function seccionHoja() {
  const H = hojaActiva();
  let h = `<div class="sec"><h3>Área de impresión</h3>
    <div class="row"><label>Tamaño</label><div class="fill"><select id="h-preset">
      <option value="">Sin área fija</option>` +
    Object.keys(HOJAS).map(k => `<option value="${k}"${H && H.preset === k ? " selected" : ""}>${HOJAS[k].nombre}</option>`).join("") +
    `</select></div></div>`;
  if (!H) return h + `<div class="hint">Sin área fija, la exportación recorta sola alrededor de lo que
    haya dibujado. Elegí un tamaño para acomodar ${HERRAMIENTA.textos.losElementos} dentro del recuadro y que el SVG y el
    PNG salgan con esas proporciones.</div></div>`;
  h += `<div class="grid4">
      <div class="row"><label style="width:22px">An</label><div class="fill"><input type="number" id="h-w" step="10" min="60" value="${H.w}"></div></div>
      <div class="row"><label style="width:22px">Al</label><div class="fill"><input type="number" id="h-h" step="10" min="60" value="${H.h}"></div></div>
      <div class="row"><label style="width:22px">X</label><div class="fill"><input type="number" id="h-x" step="${S.grid}" value="${Math.round(H.x)}"></div></div>
      <div class="row"><label style="width:22px">Y</label><div class="fill"><input type="number" id="h-y" step="${S.grid}" value="${Math.round(H.y)}"></div></div>
    </div>
    <div class="iconbar" style="margin-top:10px">
      <button class="btn" id="h-centrar">Centrar en el ${HERRAMIENTA.textos.dibujo}</button>
      <button class="btn" id="h-girar">Girar la hoja</button>
    </div>
    <div class="hint" style="margin-top:8px">Lo que quede afuera del recuadro se ve sombreado y no
      entra en la exportación. <kbd>F</kbd> encuadra la hoja entera.</div></div>`;
  return h;
}
function wireHoja() {
  const sel = document.getElementById("h-preset");
  if (sel) sel.onchange = () => { ponerHoja(sel.value); commit(); render(); };
  const H = hojaActiva(); if (!H) return;
  enVivo("h-w", v => { if (+v >= 60) H.w = +v; }, true);
  enVivo("h-h", v => { if (+v >= 60) H.h = +v; }, true);
  enVivo("h-x", v => H.x = +v, true);
  enVivo("h-y", v => H.y = +v, true);
  alClic("h-centrar", centrarHoja);
  alClic("h-girar", () => {                       // gira sobre su propio centro
    const cx = H.x + H.w / 2, cy = H.y + H.h / 2;
    const w = H.w; H.w = H.h; H.h = w;
    H.x = Math.round(cx - H.w / 2); H.y = Math.round(cy - H.h / 2);
    const par = Object.keys(HOJAS).find(k => HOJAS[k].w === H.w && HOJAS[k].h === H.h);
    if (par) H.preset = par;
  });
}
// selector de área de impresión de la barra
$("#b-hoja").innerHTML = `<option value="">Sin área fija</option>` +
  Object.keys(HOJAS).map(k => `<option value="${k}">${HOJAS[k].nombre}</option>`).join("");
$("#b-hoja").onchange = (ev) => {
  ponerHoja(ev.target.value);
  commit(); render();
  if (hojaActiva()) { fit(); toast("El SVG y el PNG van a salir con este recorte"); }
};
