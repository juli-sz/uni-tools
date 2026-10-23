/* ======================= diagramas de bloques =======================
   Lo que el código común (src/comun) necesita saber de esta herramienta. */
const HERRAMIENTA = {
  nombre: "Diagramas de bloques",                  // en el aviso de «Inicio»
  titulo: "Editor de diagramas de bloques",        // título de la pestaña, después del nombre del archivo
  clave: "bloque",                                 // autoguardado: uni-tools-autoguardado-bloque
  // cómo se llaman las colecciones en S (y en el JSON)
  nodos: "nodes", conexiones: "edges", selConexiones: "selEdges",
  extremos: (e) => [e.from.id, e.to.id],           // los dos elementos que une una flecha
  fondoPNG: () => temaDe("fondo"),
  cancelarArrastre: (d) => cancelarArrastrePropio(d),
  textos: {
    elementos: "elementos",                        // "Copiados 3 elementos"
    vacio: "La hoja está vacía",
    guardado: "Diagrama guardado",
    cargado: "Diagrama cargado",
    noEsDoc: "Ese archivo no tiene un diagrama adentro",
    svgSinDatos: "Ese SVG no trae los datos del diagrama: se exportó con una versión anterior",
    doc: "diagrama",                               // "Colores del diagrama", "Usar los del diagrama"
    dibujo: "dibujo",                              // "Centrar en el dibujo"
    losElementos: "los elementos",                 // "acomodar los elementos dentro del recuadro"
    despegar: "Si querés que un elemento se despegue del resto, seleccionalo y cambiale el color ahí.",
  },
};
const gAtras = $("#gAtras");            // recuadros que van por debajo de todo
const gEdges = $("#gEdges"), gNodes = $("#gNodes"), gOv = $("#gOverlay");

/* ======================= modelo ======================= */
let S = {
  nodes: [],
  edges: [],
  sel: [],           // ids
  selEdges: [],      // ids
  mode: "select",
  snap: true,
  grid: 20,
  showGrid: true,
  zoom: 1,
  pan: { x: 60, y: 40 },
  tema: null,                // se completa abajo con TEMA_DEF
  hoja: null,                // área de impresión: null = se exporta lo que haya
  nombre: "diagrama-bloques" // con este nombre se descargan el SVG, el PNG y el JSON
};
const NOMBRE_DEF = "diagrama-bloques";
/* Colores del diagrama. Cada elemento puede pisar los que quiera en su propio .color */
const TEMA_DEF = { relleno: "#ffffff", borde: "#101418", texto: "#101418",
                   flecha: "#101418", fondo: "#ffffff" };
const NOMBRE_COLOR = { relleno: "Relleno", borde: "Contorno", texto: "Letras",
                       flecha: "Flechas", fondo: "Fondo" };
function aplicarTema() {
  for (const k in TEMA_DEF) svg.style.setProperty("--c-" + k, temaDe(k));
  $("#stage").style.background = temaDe("fondo");
}
/* Las puntas de flecha viven en <defs> y no heredan el color de cada flecha,
   así que hay un marcador por color, creado a medida que hace falta. */
const idMarcador = (color) => "arrow-" + color.replace(/[^0-9a-zA-Z]/g, "");
const marcadoresUsados = new Set();          // los que usó el render en curso
function markerPara(color) {
  const id = idMarcador(color);
  marcadoresUsados.add(id);
  if (!svg.querySelector("#" + id)) {
    const m = el("marker", { id, viewBox: "0 0 10 10", refX: 9.2, refY: 5,
      markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse", markerUnits: "strokeWidth" },
      svg.querySelector("defs"));
    el("path", { d: "M0.5 1.2 L9.5 5 L0.5 8.8 z", fill: color }, m);
  }
  return `url(#${id})`;
}
/* Los marcadores de colores que ya no se usan se sacan al terminar cada render: si no,
   arrastrar el selector de color deja uno en <defs> por cada tono por el que se pasa. */
function limpiarMarcadores() {
  for (const m of svg.querySelectorAll("defs > marker"))
    if (m.id.startsWith("arrow-") && !marcadoresUsados.has(m.id)) m.remove();
}
