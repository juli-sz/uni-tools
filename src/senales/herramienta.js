/* ======================= diagrama de flujo de señales =======================
   Lo que el código común (src/comun) necesita saber de esta herramienta. */
const HERRAMIENTA = {
  nombre: "Flujo de señales",                      // en el aviso de «Inicio»
  titulo: "Diagramas de flujo de señales",         // título de la pestaña, después del nombre del archivo
  clave: "senales",                                // autoguardado: uni-tools-autoguardado-senales
  // cómo se llaman las colecciones en S (y en el JSON)
  nodos: "nodos", conexiones: "ramas", selConexiones: "selR",
  extremos: (r) => [r.de, r.a],                    // los dos nodos que une una rama
  fondoPNG: () => "#fff",
  textos: {
    elementos: "nodos",                            // "Copiados 3 nodos"
    vacio: "El diagrama está vacío",
    guardado: "Diagrama guardado",
    cargado: "Diagrama cargado",
    noEsDoc: "Ese archivo no tiene un diagrama de flujo adentro",
    svgSinDatos: "Ese SVG no trae los datos del diagrama: se exportó con otra herramienta",
  },
};
const gRamas = $("#gRamas"), gNodos = $("#gNodos"), gOv = $("#gOverlay");

/* ======================= modelo =======================
   nodos: la variable del sistema. ramas: de dónde a dónde y con qué transmitancia.
   La entrada y la salida son dos nodos marcados; Mason necesita una de cada una. */
let S = {
  nodos: [],            // { id, nombre, x, y, tipo: "normal" | "entrada" | "salida" }
  ramas: [],            // { id, de, a, g, curva }
  sel: [], selR: [],
  snap: true, grid: 20, showGrid: true, zoom: 1, pan: { x: 90, y: 70 },
  nombre: "flujo-de-senales"
};
const NOMBRE_DEF = "flujo-de-senales";
