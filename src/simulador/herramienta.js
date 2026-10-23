/* ======================= simulador de circuitos lógicos =======================
   Lo que el código común (src/comun) necesita saber de esta herramienta. */
const HERRAMIENTA = {
  nombre: "Circuitos lógicos",                     // en el aviso de «Inicio»
  titulo: "Simulador de circuitos lógicos",        // título de la pestaña, después del nombre del archivo
  clave: "simulador",                              // autoguardado: uni-tools-autoguardado-simulador
  // cómo se llaman las colecciones en S (y en el JSON)
  nodos: "nodes", conexiones: "wires", selConexiones: "selW",
  extremos: (w) => [w.from.id, w.to.id],           // las dos compuertas que une un cable
  fondoPNG: () => temaDe("fondo"),
  textos: {
    elementos: "elementos",                        // "Copiados 3 elementos"
    vacio: "El circuito está vacío",
    guardado: "Circuito guardado",
    cargado: "Circuito cargado",
    noEsDoc: "Ese archivo no tiene un circuito adentro",
    svgSinDatos: "Ese SVG no trae los datos del circuito: se exportó con una versión anterior",
    doc: "circuito",                               // "Colores del circuito", "Usar los del circuito"
    dibujo: "circuito",                            // "Centrar en el circuito"
    losElementos: "las compuertas",                // "acomodar las compuertas dentro del recuadro"
    despegar: "Si querés que una compuerta se despegue del resto, seleccionala y cambiale el color ahí.",
  },
};
const gAtras = $("#gAtras");            // recuadros que van por debajo de todo
const gWires = $("#gWires"), gNodes = $("#gNodes"), gOv = $("#gOverlay");
let S = { nodes: [], wires: [], sel: [], selW: [], snap: true, grid: 20,
  showGrid: true, zoom: 1, pan: { x: 80, y: 60 }, tema: null,
  hoja: null,                         // área de impresión: null = se exporta lo que haya
  nombre: "circuito" };               // con este nombre se descargan el SVG, el PNG y el JSON
const NOMBRE_DEF = "circuito";
/* Colores del circuito. Cada compuerta o cable puede pisar los que quiera en su .color */
const TEMA_DEF = { relleno: "#ffffff", borde: "#101418", texto: "#101418",
                   cable: "#9aa5ae", activo: "#12a150", fondo: "#ffffff" };
const NOMBRE_COLOR = { relleno: "Relleno", borde: "Contorno", texto: "Letras",
                       cable: "Cables", activo: "Señal en 1", fondo: "Fondo" };
/* Los colores van al <svg> y también a la página: el panel (interruptores, lámparas) sigue el color de la señal */
function aplicarTema() {
  for (const k in TEMA_DEF) {
    svg.style.setProperty("--c-" + k, temaDe(k));
    document.documentElement.style.setProperty("--c-" + k, temaDe(k));   // el panel también sigue el color
  }
  $("#stage").style.background = temaDe("fondo");
}
