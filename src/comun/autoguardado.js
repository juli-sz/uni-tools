/* ======================= autoguardado =======================
   Lo que se va haciendo queda guardado en este navegador (localStorage), una copia por
   herramienta: al volver a abrirla se recupera tal como quedó. Se guarda un rato después de
   cada cambio y siempre al salir de la página. Es una red de seguridad, no reemplaza a
   "Guardar": no viaja a otra compu ni a otro navegador. */
const CLAVE_AUTO = "uni-tools-autoguardado-" + HERRAMIENTA.clave;
let autoActivo = false, autoOk = true, autoTimer = 0;
function guardarAhora() {
  if (!autoActivo) return;
  clearTimeout(autoTimer);
  try { localStorage.setItem(CLAVE_AUTO, JSON.stringify({ guardado: Date.now(), doc: docDatos() })); autoOk = true; }
  catch (e) { autoOk = false; }                    // modo privado, cuota llena, etc.
}
function autoguardar() {
  if (!autoActivo) return;
  clearTimeout(autoTimer);
  autoTimer = setTimeout(guardarAhora, 400);
}
function recuperarAutoguardado() {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE_AUTO) || "null");
    if (!g || !esObj(g.doc) || !Array.isArray(g.doc[HERRAMIENTA.nodos])) return false;
    cargarDoc(g.doc);                                // pasa por la misma validación que un archivo
    return true;
  } catch (e) { return false; }
}
window.addEventListener("pagehide", guardarAhora);
document.addEventListener("visibilitychange", () => { if (document.hidden) guardarAhora(); });
// Si el navegador no deja guardar y hay algo dibujado, avisa antes de cerrar o recargar
window.addEventListener("beforeunload", ev => {
  guardarAhora();
  if (!autoOk && S[HERRAMIENTA.nodos].length) { ev.preventDefault(); ev.returnValue = ""; }
});

/* ======================= volver al inicio ======================= */
function irAlInicio() {
  guardarAhora();
  const msg = autoOk
    ? `¿Volver al inicio?\n\nTu diagrama queda guardado en este navegador: cuando vuelvas a abrir ${HERRAMIENTA.nombre} lo vas a encontrar como lo dejaste.`
    : "¿Volver al inicio?\n\nEste navegador no deja guardar automáticamente: si no descargaste el diagrama con «Guardar», se va a perder.";
  if (!S[HERRAMIENTA.nodos].length || confirm(msg)) location.href = "index.html";
}
document.getElementById("b-inicio").addEventListener("click", ev => { ev.preventDefault(); irAlInicio(); });

/* ======================= arranque =======================
   Lo último de cada herramienta: recupera lo autoguardado o, si no hay, carga su ejemplo. */
function arrancar(cargarEjemploInicial) {
  if (recuperarAutoguardado()) { fit(); setTimeout(() => toast("Se recuperó tu último diagrama"), 60); }
  else cargarEjemploInicial();
  lastSnap = snapshot(); undoStack = []; redoStack = [];
  autoActivo = true;
  window.addEventListener("resize", render);
}
