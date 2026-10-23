/* ======================= borrar, copiar, cortar, pegar y duplicar =======================
   Lo copiado es una foto de los elementos seleccionados y de las conexiones que unen
   dos de ellos (con clones profundos: un cable tiene que conservar todo, patas y
   colores). Cada pegado la inserta con ids nuevos, corrida un poco más que el anterior
   para que no queden encimadas. Duplicar (Ctrl+D) es copiar y pegar en un solo paso, sin
   tocar lo copiado. Cómo se inserta la foto (ids nuevos, nombres que no choquen) lo
   decide insertar() de cada herramienta. */
let portapapeles = null, pegados = 0;
const clonar = (o) => JSON.parse(JSON.stringify(o));
function borrar() {
  const K = HERRAMIENTA, ids = new Set(S.sel), selC = S[K.selConexiones];
  S[K.nodos] = S[K.nodos].filter(n => !ids.has(n.id));
  S[K.conexiones] = S[K.conexiones].filter(c => !K.extremos(c).some(id => ids.has(id)) && !selC.includes(c.id));
  S.sel = []; S[K.selConexiones] = [];
}
function tomarSeleccion() {
  const K = HERRAMIENTA, ids = new Set(S.sel);
  return { [K.nodos]: S[K.nodos].filter(n => ids.has(n.id)).map(clonar),
           [K.conexiones]: S[K.conexiones].filter(c => K.extremos(c).every(id => ids.has(id))).map(clonar) };
}
function duplicar() {
  if (!S.sel.length) { toast("Elegí algo para duplicar"); return; }
  insertar(tomarSeleccion(), S.grid * 2);
  commit(); render();
}
/* Cortar (Ctrl+X): copia y borra. El primer pegado después de cortar vuelve al mismo lugar;
   los siguientes se van corriendo como siempre. Sólo se corta lo que se copia (la selección
   y lo que la une por dentro): una conexión suelta seleccionada aparte no se borra. */
function cortarSel() {
  if (!S.sel.length) { toast("Elegí algo para cortar"); return; }
  portapapeles = tomarSeleccion(); pegados = -1;
  S[HERRAMIENTA.selConexiones] = []; borrar(); commit(); render();
  const k = portapapeles[HERRAMIENTA.nodos].length;
  toast(k === 1 ? "Cortado" : "Cortados " + k + " " + HERRAMIENTA.textos.elementos);
}
function copiarSel() {
  if (!S.sel.length) { toast("Elegí algo para copiar"); return; }
  portapapeles = tomarSeleccion(); pegados = 0;
  const k = portapapeles[HERRAMIENTA.nodos].length;
  toast(k === 1 ? "Copiado" : "Copiados " + k + " " + HERRAMIENTA.textos.elementos);
}
function pegarSel() {
  if (!portapapeles) { toast("No hay nada copiado"); return; }
  insertar(portapapeles, S.grid * 2 * ++pegados);
  commit(); render();
}
