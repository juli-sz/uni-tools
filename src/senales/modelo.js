const getNodo = (id) => S.nodos.find(n => n.id === id);
const getRama = (id) => S.ramas.find(r => r.id === id);
const R_NODO = 6;                       // radio del puntito del nodo

/* Los nodos se llaman a, b, d… en minúscula, porque las mayúsculas son las
   ganancias. Quedan afuera la g y la h, que son las funciones de transferencia,
   y la r y la c, que son la entrada y la salida.
   El subíndice recién aparece cuando hay que repetir una letra: primero se
   reparten las 22 peladas y después empiezan a1, b1, d1… */
const LETRAS = "abdefijklmnopqstuvwxyz".split("");
function proximoNombre() {
  const usados = new Set(S.nodos.map(n => n.nombre));
  for (const l of LETRAS) if (!usados.has(l)) return l;
  for (let v = 1; v < 99; v++)
    for (const l of LETRAS) if (!usados.has(l + v)) return l + v;
  return "n";
}
function nuevoNodo(x, y, extra) {
  return Object.assign({ id: uid("n"), nombre: proximoNombre(), x, y, tipo: "normal" }, extra || {});
}
/* Para ordenar nombres de nodo: primero la letra, después el subíndice, así
   a < b y a < a1 < a2, que es lo que uno espera al mirarlos. */
function ordenNombre(s) {
  const m = /^([A-Za-zÀ-ÖØ-öø-ÿ]+)_?(\d*)$/.exec(String(s == null ? "" : s).trim());
  return m ? [m[1].toLowerCase(), +(m[2] || 0)] : [String(s || "").toLowerCase(), 0];
}
/* ¿La rama va para adelante? Manda la posición, que es lo que se ve; si los dos
   nodos están a la misma altura, desempata la letra. */
function vaHaciaAdelante(A, B) {
  if (Math.abs(B.x - A.x) > 1) return B.x > A.x;
  const [lA, nA] = ordenNombre(A.nombre), [lB, nB] = ordenNombre(B.nombre);
  return lA === lB ? nB > nA : lB > lA;
}
/* La transmitancia se estrena con nombre puesto: G para las que van hacia
   adelante y H para las que vuelven, con el primer subíndice libre de esa letra.
   Se normaliza sin guión bajo porque G_1 y G1 son la misma ganancia. */
function proximaGanancia(de, a) {
  const A = getNodo(de), B = getNodo(a);
  const letra = (A && B && de !== a && vaHaciaAdelante(A, B)) ? "G" : "H";
  const usadas = new Set(S.ramas.map(r => String(r.g == null ? "" : r.g).replace(/_/g, "").trim()));
  for (let i = 1; i < 999; i++) if (!usadas.has(letra + i)) return letra + i;
  return letra;
}
function nuevaRama(de, a, extra) {
  // La curvatura la acomoda acomodarRamas() en cada dibujado; 0 es línea recta.
  return Object.assign({ id: uid("r"), de, a, g: proximaGanancia(de, a),
                         curva: de === a ? 46 : 0 }, extra || {});
}
/* El nodo del que sale la rama nueva: el que tengas elegido, o el último puesto */
function nodoDeSalida() {
  if (S.sel.length === 1) return getNodo(S.sel[0]);
  return S.nodos.length ? S.nodos[S.nodos.length - 1] : null;
}

/* ======================= el documento =======================
   Lo que se guarda en el JSON, viaja adentro del SVG y entra al historial. */
const docDatos = () => ({ version: VERSION_DOC, nombre: limpiarNombre(S.nombre), nodos: S.nodos, ramas: S.ramas });
function restore(js) {
  const d = JSON.parse(js);
  S.nodos = d.nodos; S.ramas = d.ramas; uidc = d.uidc || uidc;
  S.nombre = d.nombre || S.nombre;
  S.sel = S.sel.filter(getNodo); S.selR = S.selR.filter(getRama);
}
/* Lo que llega de un archivo (o del autoguardado) se depura: se descarta lo que no se
   puede dibujar y se completa lo que falte, sin tocar lo que ya está bien. */
function depurarNodos(lista) {
  return (Array.isArray(lista) ? lista : []).filter(esObj).map(n => {
    n.x = num(n.x, 0); n.y = num(n.y, 0);
    if (typeof n.nombre !== "string") n.nombre = n.nombre == null ? "" : String(n.nombre);
    return n;
  });
}
function depurarRamas(lista, nodos) {
  const ids = new Set(nodos.map(n => n.id));
  return (Array.isArray(lista) ? lista : []).filter(r => esObj(r) && ids.has(r.de) && ids.has(r.a))
    .map(r => { r.curva = num(r.curva, 0); return r; });
}
function cargarDoc(d, desdeArchivo) {
  S.nodos = depurarNodos(d.nodos); S.ramas = Array.isArray(d.ramas) ? d.ramas.filter(esObj) : [];
  S.nombre = limpiarNombre(desdeArchivo || d.nombre || NOMBRE_DEF);
  uidc = proximoUid(S.nodos, S.ramas);
  const vistos = new Set();
  const repetidos = sanearIds(S.nodos, "n", vistos) + sanearIds(S.ramas, "r", vistos);
  S.ramas = depurarRamas(S.ramas, S.nodos);          // ya con los ids definitivos de los nodos
  if (repetidos) setTimeout(() => toast("Se renumeraron " + repetidos + " ids repetidos"), 60);
  S.sel = []; S.selR = [];
}
/* Pegar y duplicar: mete la foto de tomarSeleccion() con ids nuevos, corrida desp */
function insertar(cop, desp) {
  const map = {}, nuevos = [];
  cop.nodos.forEach(n => {
    const c = clonar(n); c.id = uid("n"); map[n.id] = c.id; c.x += desp; c.y += desp;
    S.nodos.push(c); nuevos.push(c.id);             // se agrega ya: proximoNombre mira lo que hay
    // nombre y tipo se conservan si no chocan con otro nodo (p. ej. al pegar lo cortado): si no,
    // nombre libre y nodo normal (entrada y salida hay una sola de cada una)
    const otros = S.nodos.filter(o => o !== c);
    if (otros.some(o => o.nombre === c.nombre)) c.nombre = proximoNombre();
    if (c.tipo !== "normal" && otros.some(o => o.tipo === c.tipo)) c.tipo = "normal";
  });
  cop.ramas.forEach(r => {
    const c = clonar(r); c.id = uid("r"); c.de = map[r.de]; c.a = map[r.a];
    S.ramas.push(c);
  });
  S.sel = nuevos; S.selR = [];
}
