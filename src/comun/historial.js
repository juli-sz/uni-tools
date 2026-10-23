/* ======================= historial =======================
   snapshot() es el documento entero (docDatos() de la herramienta, más el contador de
   ids) y commit() lo apila sólo si cambió. La regla: cambiar el estado y después
   llamar a commit() y render(). Lo que no esté en docDatos() no sobrevive un deshacer.
   Cómo se vuelve a una foto lo decide restore() de cada herramienta. */
let undoStack = [], redoStack = [], lastSnap = null;
const snapshot = () => JSON.stringify(Object.assign(docDatos(), { uidc }));
function commit() {
  const s = snapshot();
  if (s === lastSnap) return;
  if (lastSnap !== null) { undoStack.push(lastSnap); if (undoStack.length > 120) undoStack.shift(); }
  redoStack = []; lastSnap = s;
  autoguardar();
}
function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  const s = undoStack.pop(); restore(s); lastSnap = s; render();
}
function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  const s = redoStack.pop(); restore(s); lastSnap = s; render();
}
