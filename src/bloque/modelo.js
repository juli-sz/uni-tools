/* ======================= modelo ======================= */
const DEF = {
  block: { w: 72, h: 42, label: "G", font: 15 },
  sum:   { w: 50, h: 50, label: "", font: 13, signs: { l: "+", t: "", r: "", b: "−" }, cross: true },
  node:  { w: 10, h: 10, label: "" },
  io:    { w: 46, h: 22, label: "R(s)", font: 14 },
  text:  { w: 60, h: 20, label: "Texto", font: 13 },
  marco: { w: 240, h: 150, label: "", font: 12 }
};
const MINUS = "−";

function makeNode(type, x, y, extra) {
  const d = DEF[type];
  const n = Object.assign({ id: uid("n"), type, x, y, w: d.w, h: d.h,
    label: d.label, font: d.font || 14 }, JSON.parse(JSON.stringify(extra || {})));
  if (type === "sum") { n.signs = Object.assign({}, DEF.sum.signs, n.signs); n.cross = n.cross !== false; }
  if (type === "marco") completarMarco(n);
  return n;
}
const getNode = (id) => S.nodes.find(n => n.id === id);
const getEdge = (id) => S.edges.find(e => e.id === id);
/* Un bloque admite una sola entrada: para juntar dos señales está el sumador. */
const admiteEntrada = (id) => {
  const n = getNode(id);
  return !(n && n.type === "block") || !S.edges.some(e => e.to.id === id);
};

/* ======================= el documento =======================
   Lo que se guarda en el JSON, viaja adentro del SVG y entra al historial. */
/* El documento entero, tal como se guarda en el JSON y como viaja adentro del SVG */
const docDatos = () => ({ version: VERSION_DOC, nombre: limpiarNombre(S.nombre), nodes: S.nodes,
                          edges: S.edges, tema: S.tema, hoja: S.hoja });
function restore(js) {
  const d = JSON.parse(js);
  S.nodes = d.nodes; S.edges = d.edges; uidc = d.uidc || uidc;
  S.tema = Object.assign({}, TEMA_DEF, d.tema || {});
  S.hoja = d.hoja || null;
  S.nombre = d.nombre || S.nombre;
  S.sel = S.sel.filter(id => getNode(id)); S.selEdges = S.selEdges.filter(id => getEdge(id));
}
/* Lo que llega de un archivo (o del autoguardado) se depura: se descarta lo que no se
   puede dibujar y se completa lo que falte, sin tocar lo que ya está bien. */
function depurarNodos(lista) {
  return (Array.isArray(lista) ? lista : []).filter(n => esObj(n) && Object.prototype.hasOwnProperty.call(DEF, n.type))
    .map(n => {
      const d = DEF[n.type];
      n.x = num(n.x, 0); n.y = num(n.y, 0);
      n.w = num(n.w, d.w); n.h = num(n.h, d.h);
      n.font = num(n.font, d.font || 14);
      if (typeof n.label !== "string") n.label = d.label;
      if (n.type === "sum" && !esObj(n.signs)) n.signs = Object.assign({}, DEF.sum.signs);
      if (n.type === "marco") { n.grosor = num(n.grosor, 1.4); n.radio = num(n.radio, 6); }
      if (n.color !== undefined) { n.color = soloColores(n.color); if (!n.color) delete n.color; }
      return n;
    });
}
let flechasDeMas = 0;                            // entradas repetidas que descartó la última depuración
function depurarFlechas(lista, nodos) {
  const ids = new Set(nodos.map(n => n.id));
  const porId = new Map(nodos.map(n => [n.id, n]));
  const conEntrada = new Set();                  // bloques que ya tienen su flecha
  flechasDeMas = 0;
  return (Array.isArray(lista) ? lista : []).filter(e => {
    if (!(esObj(e) && esObj(e.from) && esObj(e.to) && ids.has(e.from.id) && ids.has(e.to.id))) return false;
    const destino = porId.get(e.to.id);
    if (destino.type === "block") {              // un bloque admite una sola entrada
      if (conEntrada.has(destino.id)) { flechasDeMas++; return false; }
      conEntrada.add(destino.id);
    }
    return true;
  }).map(e => {
    if (e.manual !== undefined && !(esObj(e.manual) && Array.isArray(e.manual.c) && e.manual.c.every(v => typeof v === "number" && isFinite(v)))) delete e.manual;
    if (e.width !== undefined) { e.width = num(e.width, undefined); if (e.width === undefined) delete e.width; }
    if (e.color !== undefined) { e.color = soloColores(e.color); if (!e.color) delete e.color; }
    return e;
  });
}
function cargarDoc(d, desdeArchivo) {
  S.nodes = depurarNodos(d.nodes); S.edges = Array.isArray(d.edges) ? d.edges.filter(esObj) : [];
  S.tema = Object.assign({}, TEMA_DEF, soloColores(d.tema) || {});
  S.hoja = hojaValida(d.hoja);
  S.nombre = limpiarNombre(desdeArchivo || d.nombre || NOMBRE_DEF);
  uidc = proximoUid(S.nodes, S.edges);
  const vistos = new Set();
  const repetidos = sanearIds(S.nodes, "n", vistos) + sanearIds(S.edges, "e", vistos);
  S.edges = depurarFlechas(S.edges, S.nodes);       // ya con los ids definitivos de los nodos
  const avisos = [];
  if (flechasDeMas) avisos.push("Un bloque admite una sola entrada: " + (flechasDeMas === 1 ? "se quitó una flecha" : "se quitaron " + flechasDeMas + " flechas") + " de más");
  if (repetidos) avisos.push("Se renumeraron " + repetidos + " ids repetidos");
  if (avisos.length) setTimeout(() => toast(avisos.join(" · ")), 60);
  S.sel = []; S.selEdges = [];
}
/* Pegar y duplicar: mete la foto de tomarSeleccion() con ids nuevos, corrida desp */
function insertar(cop, desp) {
  const map = {};
  const nodes = cop.nodes.map(n => { const c = clonar(n); c.id = uid("n"); map[n.id] = c.id; c.x += desp; c.y += desp; return c; });
  const edges = cop.edges.map(e => {
    const c = clonar(e);
    c.id = uid("e"); c.from.id = map[e.from.id]; c.to.id = map[e.to.id]; c.variant = 0;
    delete c.pts;
    // la ruta a mano son coordenadas de líneas: moverlas lo mismo en x e y sirve en cualquier tramo
    if (c.manual && Array.isArray(c.manual.c)) c.manual.c = c.manual.c.map(v => v + desp);
    return c;
  });
  S.nodes.push(...nodes); S.edges.push(...edges);
  S.sel = nodes.map(c => c.id); S.selEdges = [];
}
