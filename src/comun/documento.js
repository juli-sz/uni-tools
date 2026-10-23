/* ======================= el documento: nombre, abrir, guardar y exportar =======================
   Lo que se guarda en el JSON y viaja adentro del SVG lo arma docDatos() de cada
   herramienta; lo que llega de un archivo lo valida su cargarDoc(). Esto es el resto,
   que es igual en las tres. */

/* Versión del formato del documento: viaja en el JSON y adentro del SVG para que, si
   cambia la forma de guardar, se sepa con qué se está tratando (los archivos viejos
   no la traen). Al subirla, migrar en cargarDoc() según la que venga. */
const VERSION_DOC = 1;

/* Un archivo mal armado (a mano, truncado, de otra versión) no tiene que tumbar la
   herramienta: se descarta lo que no se puede dibujar y se completa lo que falte,
   sin tocar lo que ya está bien. */
const esObj = (o) => !!o && typeof o === "object" && !Array.isArray(o);
const num = (v, def) => (typeof v === "number" && isFinite(v)) ? v : def;

/* Un nombre de archivo que no incomode a ningún sistema operativo */
function limpiarNombre(s) {
  const t = String(s || "").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 60);
  return t || NOMBRE_DEF;
}
const nombreArchivo = (ext) => limpiarNombre(S.nombre) + "." + ext;

/* Los SVG exportados llevan el documento adentro, en <metadata>, así que se
   pueden volver a abrir. Los exportados antes de esto no lo tienen. */
function datosDeSVG(txt) {
  const doc = new DOMParser().parseFromString(txt, "image/svg+xml");
  if (doc.querySelector("parsererror")) throw new Error("no es un SVG válido");
  const m = doc.querySelector("metadata#uni-tools-datos");
  if (!m || !m.textContent.trim()) throw new Error("ese SVG no trae los datos adentro");
  return JSON.parse(m.textContent);
}
function abrirTexto(txt, nombreDelArchivo) {
  const t = String(txt || "").trim();
  if (!t) return toast("No hay nada para abrir");
  let d;
  try {
    // lo que no empieza como JSON ni como SVG ni se intenta leer (Firefox se queja en la consola)
    if (t[0] !== "{" && t[0] !== "<") throw new Error("no es JSON ni SVG");
    d = t[0] === "{" ? JSON.parse(t) : datosDeSVG(t);
  } catch (e) {
    return toast(/metadata|datos/.test(e.message) ? HERRAMIENTA.textos.svgSinDatos : "Ese archivo no se pudo leer");
  }
  if (!d || !Array.isArray(d[HERRAMIENTA.nodos])) return toast(HERRAMIENTA.textos.noEsDoc);
  cargarDoc(d, nombreDelArchivo && nombreDelArchivo.replace(/\.(json|svg)$/i, ""));
  commit(); fit();
  $("#ov-io").classList.remove("show");
  toast(HERRAMIENTA.textos.cargado);
}

function download(name, blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
/* El PNG sale de dibujar el SVG en un canvas, al triple de tamaño */
function descargarPNG(s, W, H, fondo, nombre) {
  const img = new Image();
  img.onload = () => {
    const sc = 3, c = document.createElement("canvas");
    c.width = W * sc; c.height = H * sc;
    const ctx = c.getContext("2d");
    ctx.fillStyle = fondo; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    c.toBlob(bl => { download(nombre, bl); toast("PNG descargado (3×)"); });
  };
  img.onerror = () => toast("No se pudo generar el PNG");
  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(s))));
}

/* ---- armado del SVG exportado ----
   El esqueleto: tamaño, recorte (caja b con margen m) y el documento adentro. */
function svgExportado(b, m, W, H) {
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("width", W); s.setAttribute("height", H);   // el xmlns lo pone el serializador
  s.setAttribute("viewBox", `${b.l - m} ${b.t - m} ${W} ${H}`);
  // el documento viaja adentro del SVG para poder volver a abrirlo desde acá
  const meta = document.createElementNS(NS, "metadata");
  meta.setAttribute("id", "uni-tools-datos");
  meta.textContent = JSON.stringify(docDatos());
  s.appendChild(meta);
  return s;
}
function fondoExportado(s, b, m, W, H, color) {
  const bg = document.createElementNS(NS, "rect");
  bg.setAttribute("x", b.l - m); bg.setAttribute("y", b.t - m);
  bg.setAttribute("width", W); bg.setAttribute("height", H); bg.setAttribute("fill", color);
  s.appendChild(bg);
}
/* Copias de las capas del dibujo tal como se ven sin nada seleccionado */
function capasSinSeleccion(capas) {
  const sel = S.sel, selC = S[HERRAMIENTA.selConexiones];
  S.sel = []; S[HERRAMIENTA.selConexiones] = []; render();
  const copias = capas.map(c => c.cloneNode(true));
  S.sel = sel; S[HERRAMIENTA.selConexiones] = selC; render();
  return copias;
}

/* ---- botones de Archivo y ventana de abrir ---- */
$("#b-svg").onclick = () => {
  if (!S[HERRAMIENTA.nodos].length) return toast(HERRAMIENTA.textos.vacio);
  download(nombreArchivo("svg"), new Blob([new XMLSerializer().serializeToString(buildExportSVG().svg)], { type: "image/svg+xml" }));
  toast("SVG descargado");
};
$("#b-png").onclick = () => {
  if (!S[HERRAMIENTA.nodos].length) return toast(HERRAMIENTA.textos.vacio);
  const { svg: s, W, H } = buildExportSVG();
  descargarPNG(s, W, H, HERRAMIENTA.fondoPNG(), nombreArchivo("png"));
};
$("#b-save").onclick = () => {
  download(nombreArchivo("json"), new Blob([JSON.stringify(docDatos(), null, 1)], { type: "application/json" }));
  toast(HERRAMIENTA.textos.guardado);
};
$("#b-open").onclick = () => {
  $("#io-text").value = ""; $("#io-file").value = "";
  $("#io-file-nom").textContent = "Ningún archivo elegido";
  $("#ov-io").classList.add("show");
};
$("#io-cancel").onclick = () => $("#ov-io").classList.remove("show");
$("#io-file-btn").onclick = () => $("#io-file").click();
$("#io-file").onchange = (ev) => {
  const f = ev.target.files && ev.target.files[0];
  if (!f) return;
  $("#io-file-nom").textContent = f.name;
  const r = new FileReader();
  r.onload = () => abrirTexto(r.result, f.name);
  r.onerror = () => toast("No se pudo leer el archivo");
  r.readAsText(f);
};
$("#io-ok").onclick = () => abrirTexto($("#io-text").value);
// nombre del archivo: se usa para el SVG, el PNG y el JSON
$("#b-nombre").addEventListener("input", () => {
  S.nombre = $("#b-nombre").value;
  document.title = limpiarNombre(S.nombre) + " · " + HERRAMIENTA.titulo;
});
$("#b-nombre").addEventListener("change", () => {
  S.nombre = limpiarNombre($("#b-nombre").value);
  $("#b-nombre").value = S.nombre; commit();
});
$("#b-nombre").addEventListener("keydown", ev => ev.stopPropagation());
