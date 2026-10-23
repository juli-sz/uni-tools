/* ======================= ejemplos ======================= */
$("#ejemplos").onchange = e => { if (e.target.value) { cargarEjemplo(e.target.value); e.target.value = ""; } };
function cargarEjemplo(cual) {
  S.nodos = []; S.ramas = []; S.sel = []; S.selR = []; uidc = 1;
  const K = {};
  const nodo = (k, nombre, x, y, tipo) => {
    const n = nuevoNodo(x, y, { nombre, tipo: tipo || "normal" });
    K[k] = n.id; S.nodos.push(n); return n;
  };
  const rama = (a, b, g) => S.ramas.push(nuevaRama(K[a], K[b], { g }));   // la curva la acomoda sola

  if (cual === "simple") {
    nodo("R", "R", 0, 0, "entrada"); nodo("x1", "x_1", 180, 0); nodo("x2", "x_2", 380, 0);
    nodo("C", "C", 560, 0, "salida");
    rama("R", "x1", "1"); rama("x1", "x2", "G_1"); rama("x2", "C", "G_2");
    rama("x2", "x1", "-H", -60);
  } else if (cual === "dos") {
    nodo("R", "R", 0, 0, "entrada"); nodo("x1", "x_1", 180, 0); nodo("x2", "x_2", 380, 0);
    nodo("x3", "x_3", 560, 0); nodo("C", "C", 740, 0, "salida");
    rama("R", "x1", "1"); rama("x1", "x2", "G_1"); rama("x2", "x3", "G_2"); rama("x3", "C", "1");
    rama("x2", "x1", "-H_1", -60); rama("x3", "x2", "-H_2", -60);
  } else if (cual === "disjuntos") {
    nodo("R", "R", 0, 0, "entrada"); nodo("x1", "x_1", 180, 0); nodo("x2", "x_2", 360, 0);
    nodo("x3", "x_3", 540, 0); nodo("x4", "x_4", 720, 0); nodo("C", "C", 900, 0, "salida");
    rama("R", "x1", "1"); rama("x1", "x2", "G_1"); rama("x2", "x3", "G_2");
    rama("x3", "x4", "G_3"); rama("x4", "C", "1");
    rama("x2", "x1", "-H_1", -60); rama("x4", "x3", "-H_2", -60);
  } else if (cual === "dostray") {
    nodo("R", "R", 0, 0, "entrada"); nodo("x1", "x_1", 200, 0); nodo("x2", "x_2", 440, 0);
    nodo("C", "C", 660, 0, "salida");
    rama("R", "x1", "1"); rama("x1", "x2", "G_1"); rama("x1", "x2", "G_2", -80);
    rama("x2", "C", "1"); rama("x2", "x1", "-H", -140);
  }
  commit(); fit();
}
