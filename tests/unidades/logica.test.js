/* Compuertas, simplificación y tablas de verdad del simulador, sin navegador.
   Uso desde la raíz del repo: node --test "tests/unidades/*.test.js" */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { cargar, clonar } = require("./cargar");

/* evalGate y simplify no dependen de nada; las tablas cargan además el modelo,
   los tipos y el esMarco de los recuadros, como la página armada. */
const l = cargar("src/simulador/logica.js");
const s = cargar("src/comun/recuadros.js", "src/simulador/tipos.js",
  "src/simulador/modelo.js", "src/simulador/logica.js");

const nodo = (id, type, x, y, extra) =>
  Object.assign({ id, type, x, y, label: "", on: false }, extra);
function conCircuito(nodes, wires) { s.S = { nodes, wires }; return s; }
const tabla = (t) => t.rows.map(r => r.in.join("") + "→" + r.out.join(""));

test("evalGate: el valor de cada compuerta", () => {
  assert.equal(l.evalGate("and", [1, 1]), 1);
  assert.equal(l.evalGate("and", [1, 0]), 0);
  assert.equal(l.evalGate("or", [0, 0]), 0);
  assert.equal(l.evalGate("or", [0, 1]), 1);
  assert.equal(l.evalGate("xor", [1, 1]), 0);
  assert.equal(l.evalGate("xor", [1, 0, 1]), 0);        // dos unos: par
  assert.equal(l.evalGate("xnor", [0, 0]), 1);
  assert.equal(l.evalGate("nand", [1, 1]), 0);
  assert.equal(l.evalGate("nor", [1, 0]), 0);
  assert.equal(l.evalGate("not", [0]), 1);
  assert.equal(l.evalGate("buf", [1]), 1);
  assert.equal(l.evalGate("out", [0]), 0);
});

test("simplify: la suma de productos mínima, con nombres propios", () => {
  assert.equal(l.simplify([], 3), "0");
  assert.equal(l.simplify([0, 1, 2, 3], 2), "1");
  assert.equal(l.simplify([1, 2], 2), "A'B + AB'");     // XOR
  assert.equal(l.simplify([1, 3], 2), "B");
  assert.equal(l.simplify([5, 7, 6, 4], 3), "A");
  assert.equal(l.simplify([0, 4], 3), "B'C'");
  assert.equal(l.simplify([1], 2, ["X", "Y"]), "X'Y");
});

test("tabla de verdad: una AND de dos entradas", () => {
  conCircuito(
    [nodo("i1", "in", 0, 0, { label: "A" }), nodo("i2", "in", 0, 40, { label: "B" }),
     nodo("g1", "and", 100, 20), nodo("o1", "out", 200, 20, { label: "S" })],
    [{ from: { id: "i1", pin: "o" }, to: { id: "g1", pin: 0 } },
     { from: { id: "i2", pin: "o" }, to: { id: "g1", pin: 1 } },
     { from: { id: "g1", pin: "o" }, to: { id: "o1", pin: 0 } }]
  );
  assert.deepEqual(tabla(clonar(s.truthTable())), ["00→0", "01→0", "10→0", "11→1"]);
});

test("tabla de verdad: semisumador (S = A ⊕ B, R = A · B)", () => {
  conCircuito(
    [nodo("i1", "in", 0, 0, { label: "A" }), nodo("i2", "in", 0, 40, { label: "B" }),
     nodo("h1", "hadd", 120, 20),
     nodo("o1", "out", 240, 0, { label: "S" }), nodo("o2", "out", 240, 40, { label: "R" })],
    [{ from: { id: "i1", pin: "o" }, to: { id: "h1", pin: 0 } },
     { from: { id: "i2", pin: "o" }, to: { id: "h1", pin: 1 } },
     { from: { id: "h1", pin: "o0" }, to: { id: "o1", pin: 0 } },
     { from: { id: "h1", pin: "o1" }, to: { id: "o2", pin: 0 } }]
  );
  assert.deepEqual(tabla(clonar(s.truthTable())), ["00→00", "01→10", "10→10", "11→01"]);
});
