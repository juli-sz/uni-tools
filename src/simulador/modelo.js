/* ======================= modelo ======================= */
const getNode = (id) => S.nodes.find(n => n.id === id);
const getWire = (id) => S.wires.find(w => w.id === id);
function makeNode(type, x, y, extra) {
  let kind = null;
  if (type.indexOf(":") > 0) { const p = type.split(":"); type = p[0]; kind = p[1]; }
  const n = Object.assign({ id: uid("n"), type, x, y, label: "" }, extra || {});
  if (T[type].var) n.pins = n.pins || 2;
  if (type === "in") { n.on = !!n.on; n.label = n.label || proximaLetra(); }
  if (type === "clk") { n.on = !!n.on; n.modo = n.modo || "pulso"; n.corriendo = false; n.label = n.label || "CLK"; }
  if (type === "out") n.label = n.label || "S";
  if (type === "label") n.label = n.label || "Texto";
  if (type === "marco") {
    n.w = n.w || T.marco.w; n.h = n.h || T.marco.h;
    n.font = n.font || 12;
    completarMarco(n);
  }
  if (type === "ff") {
    let conClk = true;
    if (kind && kind.indexOf("-") > 0) { const q = kind.split("-"); kind = q[0]; conClk = q[1] !== "sin"; }
    n.kind = n.kind || kind || "d";
    if (n.conClk === undefined) n.conClk = conClk;
    n.pins = n.pins || pinsDe(n.kind, n.conClk);
    n.label = n.label || proximoNombreFF();
    n.q = n.q || 0; n.clkPrev = 0; n.clkArranque = false;
    n.salida = n.salida || "Q"; n.salidaNeg = n.salidaNeg || "Q";
    tablaDe(n);
  }
  return n;
}
function proximoNombreFF() {
  const usadas = new Set(S.nodes.filter(n => n.type === "ff").map(n => n.label));
  for (let i = 0; i < 26; i++) { const l = String.fromCharCode(65 + i); if (!usadas.has(l)) return l; }
  return "X";
}
function proximaLetra() {
  const usadas = new Set(S.nodes.filter(n => n.type === "in").map(n => n.label));
  for (let i = 0; i < 26; i++) { const l = String.fromCharCode(65 + i); if (!usadas.has(l)) return l; }
  return "X";
}

/* ======================= el documento =======================
   Lo que se guarda en el JSON, viaja adentro del SVG y entra al historial. */
/* El circuito entero, tal como se guarda en el JSON y como viaja adentro del SVG */
const docDatos = () => ({ version: VERSION_DOC, nombre: limpiarNombre(S.nombre), nodes: S.nodes,
  wires: S.wires.map(w => ({ id: w.id, from: w.from, to: w.to, variant: w.variant, color: w.color })),
  tema: S.tema, hoja: S.hoja });
function restore(js) {
  const d = JSON.parse(js);
  S.nodes = d.nodes; S.wires = d.wires; uidc = d.uidc || uidc;
  S.tema = Object.assign({}, TEMA_DEF, d.tema || {});
  S.hoja = d.hoja || null;
  S.nombre = d.nombre || S.nombre;
  S.sel = S.sel.filter(getNode); S.selW = S.selW.filter(getWire);
}
/* Lo que llega de un archivo (o del autoguardado) se depura: se descarta lo que no se
   puede dibujar y se completa lo que falte, sin tocar lo que ya está bien. */
function depurarNodos(lista) {
  return (Array.isArray(lista) ? lista : []).filter(n => esObj(n) && Object.prototype.hasOwnProperty.call(T, n.type)
      && (n.type !== "ff" || (typeof n.kind === "string" && Object.prototype.hasOwnProperty.call(BIESTABLES, n.kind) && Array.isArray(n.pins))))
    .map(n => {
      n.x = num(n.x, 0); n.y = num(n.y, 0);
      if (typeof n.label !== "string") n.label = "";
      if (n.type === "marco") {
        n.w = num(n.w, T.marco.w); n.h = num(n.h, T.marco.h);
        n.font = num(n.font, 12); n.grosor = num(n.grosor, 1.4); n.radio = num(n.radio, 6);
      }
      if (n.color !== undefined) { n.color = soloColores(n.color); if (!n.color) delete n.color; }
      if (T[n.type].var && !(Number.isInteger(n.pins) && n.pins >= 1)) n.pins = T[n.type].pins;
      return n;
    });
}
function depurarCables(lista, nodos) {
  const porId = new Map(nodos.map(n => [n.id, n]));
  return (Array.isArray(lista) ? lista : []).filter(w => {
    if (!esObj(w) || !esObj(w.from) || !esObj(w.to)) return false;
    const a = porId.get(w.from.id), b = porId.get(w.to.id);
    if (!a || !b || !esSalida(w.from.pin) || !Number.isInteger(w.to.pin)) return false;
    return idxSalida(w.from.pin) < nOut(a) && w.to.pin >= 0 && w.to.pin < nIn(b);
  });
}
function cargarDoc(d, desdeArchivo) {
  S.nodes = depurarNodos(d.nodes);
  S.wires = (Array.isArray(d.wires) ? d.wires : []).filter(esObj).map(w => {
    w = Object.assign({ variant: 0 }, w);
    if (w.color !== undefined) { w.color = soloColores(w.color); if (!w.color) delete w.color; }
    return w;
  });
  S.tema = Object.assign({}, TEMA_DEF, soloColores(d.tema) || {});
  S.hoja = hojaValida(d.hoja);
  S.nombre = limpiarNombre(desdeArchivo || d.nombre || NOMBRE_DEF);
  S.nodes.forEach(n => { if (n.type === "ff") n.clkArranque = false; });
  uidc = proximoUid(S.nodes, S.wires);
  const vistos = new Set();
  const repetidos = sanearIds(S.nodes, "n", vistos) + sanearIds(S.wires, "w", vistos);
  S.wires = depurarCables(S.wires, S.nodes);        // ya con los ids definitivos de los nodos
  if (repetidos) setTimeout(() => toast("Se renumeraron " + repetidos + " ids repetidos"), 60);
  S.sel = []; S.selW = []; VAL = new Map();
}
/* Pegar y duplicar: mete la foto de tomarSeleccion() con ids nuevos, corrida desp */
function insertar(cop, desp) {
  const map = {}, nuevos = [];
  cop.nodes.forEach(n => {
    const c = clonar(n); c.id = uid("n"); map[n.id] = c.id; c.x += desp; c.y += desp;
    S.nodes.push(c); nuevos.push(c.id);                 // se agrega ya: proximaLetra mira lo que hay
    // la letra se conserva si nadie más la usa (p. ej. al pegar lo cortado); si no, la próxima libre
    if (c.type === "in" && S.nodes.some(o => o !== c && o.type === "in" && o.label === c.label)) c.label = proximaLetra();
  });
  cop.wires.forEach(w => {
    const c = clonar(w);
    c.id = uid("w"); c.from.id = map[w.from.id]; c.to.id = map[w.to.id]; c.variant = 0;
    delete c.pts;
    S.wires.push(c);
  });
  S.sel = nuevos; S.selW = [];
}
