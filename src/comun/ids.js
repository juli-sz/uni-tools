/* ---------- identificadores ----------
   Un id repetido es veneno: buscar por id devuelve siempre el primero, así que el
   elemento nuevo termina moviendo, duplicando o borrando al viejo. Por eso el
   contador salta los que ya estén ocupados, y al abrir un archivo arranca del
   número más alto en uso (contar los elementos no alcanza: al borrar y duplicar
   los números se saltean y quedan ids muy por encima de la cantidad). */
let uidc = 1;
const idEnUso = (id) => S[HERRAMIENTA.nodos].some(n => n.id === id) ||
                        S[HERRAMIENTA.conexiones].some(c => c.id === id);
const uid = (p) => { let id; do { id = p + (uidc++); } while (idEnUso(id)); return id; };
function proximoUid(...listas) {
  let max = 0;
  for (const lista of listas) for (const o of (lista || [])) {
    const m = /(\d+)$/.exec(String((o && o.id) || ""));
    if (m) max = Math.max(max, +m[1]);
  }
  return max + 1;
}
/* Un archivo guardado mientras el contador estaba mal puede traer ids repetidos.
   El primero se queda con el suyo, que es a quien ya apuntaban las conexiones. */
function sanearIds(lista, prefijo, vistos) {
  let arreglados = 0;
  for (const o of lista) {
    // un id raro (que no sea texto simple) se renumera: también se usa adentro del HTML
    if (typeof o.id !== "string" || !/^[A-Za-z0-9_-]+$/.test(o.id) || vistos.has(o.id)) { o.id = uid(prefijo); arreglados++; }
    vistos.add(o.id);
  }
  return arreglados;
}
/* El elemento (nodo, bloque, compuerta) con ese id, sin importar cómo se llame la colección */
const buscarNodo = (id) => S[HERRAMIENTA.nodos].find(n => n.id === id);
