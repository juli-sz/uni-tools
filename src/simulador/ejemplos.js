/* ======================= ejemplos ======================= */
function cargarEjemplo(cual) {
  S.nodes = []; S.wires = []; S.sel = []; S.selW = []; VAL = new Map(); uidc = 1;
  const K = {};
  const add = (k, type, x, y, ex) => { const n = makeNode(type, x, y, ex); K[k] = n.id; S.nodes.push(n); return n; };
  const cab = (a, b, pin) => S.wires.push({ id: uid("w"), from: { id: K[a], pin: "o0" }, to: { id: K[b], pin: pin || 0 }, variant: 0 });
  if (cual === "half") {
    add("A", "in", 80, 140, { label: "A" }); add("B", "in", 80, 260, { label: "B" });
    add("X", "xor", 280, 160); add("Y", "and", 280, 280);
    add("S", "out", 440, 160, { label: "S" }); add("C", "out", 440, 280, { label: "Cout" });
    cab("A", "X", 0); cab("B", "X", 1); cab("A", "Y", 0); cab("B", "Y", 1); cab("X", "S"); cab("Y", "C");
  } else if (cual === "full") {
    add("A", "in", 60, 100, { label: "A" }); add("B", "in", 60, 200, { label: "B" }); add("Ci", "in", 60, 320, { label: "Cin" });
    add("X1", "xor", 240, 140); add("X2", "xor", 440, 200);
    add("A1", "and", 440, 340); add("A2", "and", 240, 440); add("O1", "or", 640, 380);
    add("S", "out", 620, 200, { label: "S" }); add("Co", "out", 800, 380, { label: "Cout" });
    cab("A", "X1", 0); cab("B", "X1", 1); cab("X1", "X2", 0); cab("Ci", "X2", 1);
    cab("X1", "A1", 0); cab("Ci", "A1", 1); cab("A", "A2", 0); cab("B", "A2", 1);
    cab("A1", "O1", 0); cab("A2", "O1", 1); cab("X2", "S"); cab("O1", "Co");
  } else if (cual === "latch") {
    add("R", "in", 80, 120, { label: "R" }); add("S", "in", 80, 340, { label: "S" });
    add("N1", "nor", 300, 160); add("N2", "nor", 300, 300);
    add("Q", "out", 500, 160, { label: "Q" }); add("Qn", "out", 500, 300, { label: "Q'" });
    cab("R", "N1", 0); cab("N2", "N1", 1); cab("N1", "N2", 0); cab("S", "N2", 1);
    cab("N1", "Q"); cab("N2", "Qn");
    add("t", "label", 300, 60, { label: "Latch SR: prendé S y apagalo, Q se queda en 1" });
  } else if (cual === "cont") {
    add("P", "clk", 90, 200, { label: "CLK" });
    add("U", "in", 90, 300, { label: "1", on: true });
    add("F0", "ff:jk", 300, 200, { label: "0" });
    add("F1", "ff:jk", 520, 200, { label: "1" });
    add("Q0", "out", 460, 150, { label: "Q0" }); add("Q1", "out", 680, 150, { label: "Q1" });
    cab("P", "F0", 1); cab("U", "F0", 0); cab("U", "F0", 2);
    cab("U", "F1", 0); cab("U", "F1", 2);
    S.wires.push({ id: uid("w"), from: { id: K.F0, pin: "o1" }, to: { id: K.F1, pin: 1 }, variant: 0 });
    S.wires.push({ id: uid("w"), from: { id: K.F0, pin: "o0" }, to: { id: K.Q0, pin: 0 }, variant: 0 });
    S.wires.push({ id: uid("w"), from: { id: K.F1, pin: "o0" }, to: { id: K.Q1, pin: 0 }, variant: 0 });
    add("t", "label", 380, 90, { label: "Contador de 2 bits: apretá el pulso de reloj" });
  } else if (cual === "regd") {
    add("D", "in", 90, 200, { label: "D" });
    add("P", "clk", 90, 300, { label: "CLK" });
    add("F", "ff:d", 300, 240, { label: "A" });
    add("Q", "out", 470, 210, { label: "Q" }); add("Qn", "out", 470, 290, { label: "Qneg" });
    cab("D", "F", 0); cab("P", "F", 1);
    S.wires.push({ id: uid("w"), from: { id: K.F, pin: "o0" }, to: { id: K.Q, pin: 0 }, variant: 0 });
    S.wires.push({ id: uid("w"), from: { id: K.F, pin: "o1" }, to: { id: K.Qn, pin: 0 }, variant: 0 });
    add("t", "label", 300, 120, { label: "El valor de D se copia recién en el flanco de reloj" });
  } else if (cual === "mux") {
    add("A", "in", 60, 100, { label: "D0" }); add("B", "in", 60, 200, { label: "D1" }); add("Sel", "in", 60, 340, { label: "Sel" });
    add("N", "not", 220, 340); add("A1", "and", 400, 120); add("A2", "and", 400, 260);
    add("O", "or", 580, 190); add("Y", "out", 740, 190, { label: "Y" });
    cab("Sel", "N", 0); cab("A", "A1", 0); cab("N", "A1", 1);
    cab("B", "A2", 0); cab("Sel", "A2", 1); cab("A1", "O", 0); cab("A2", "O", 1); cab("O", "Y");
  }
  S.nodes.forEach(n => { if (n.type === "ff") n.clkArranque = false; });
  commit(); fit();
}
