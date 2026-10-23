/* Los cálculos puros de la regla de Mason, sin navegador (corren en segundos).
   Uso desde la raíz del repo: node --test "tests/unidades/*.test.js" */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { cargar, clonar } = require("./cargar");

const nodo = (id, nombre, tipo) => ({ id, nombre, tipo, x: 0, y: 0 });
const rama = (de, a, g) => ({ id: de + ">" + a, de, a, g });
function conGrafo(nodos, ramas) {
  const m = cargar("src/senales/modelo.js", "src/senales/mason.js");
  m.S = { nodos, ramas };
  return m;
}

test("un lazo: trayectoria, lazo, Δ y su valor", () => {
  const m = conGrafo(
    [nodo("e", "e", "entrada"), nodo("a", "a", "normal"), nodo("s", "s", "salida")],
    [rama("e", "a", "2"), rama("a", "s", "3"), rama("s", "a", "-4")]
  );
  const r = clonar(m.analizar());
  assert.deepEqual(r.P.map(p => [p.simbolo, p.gan, p.ruta]),
    [["P1", "2·3", "e → a → s"]]);
  assert.deepEqual(r.L.map(l => [l.simbolo, l.gan, l.ruta]),
    [["L1", "3·(-4)", "a → s → a"]]);
  // el lazo toca la trayectoria: el cofactor queda sin lazos libres
  assert.equal(r.cof[0].libres.length, 0);
  assert.equal(m.textoDelta(r.L, r.det), "1 − L1");
  m.conValores(r.P); m.conValores(r.L);
  assert.equal(r.P[0].valor, 6);
  assert.equal(r.L[0].valor, -12);
  assert.equal(m.valorDelta(r.L, r.det), 13);            // 1 − (−12)
  assert.equal(r.P[0].valor / m.valorDelta(r.L, r.det), 6 / 13);
});

test("dos lazos disjuntos: Δ lleva el producto L1L2", () => {
  const m = conGrafo(
    [nodo("e", "e", "entrada"), nodo("a", "a", "normal"), nodo("s", "s", "salida")],
    [rama("e", "a", "1"), rama("a", "s", "1"), rama("a", "a", "2"), rama("s", "s", "3")]
  );
  const r = clonar(m.analizar());
  assert.equal(r.P.length, 1);
  assert.deepEqual(r.L.map(l => l.gan), ["2", "3"]);
  assert.equal(m.textoDelta(r.L, r.det), "1 − L1 − L2 + L1L2");
  m.conValores(r.L);
  assert.equal(m.valorDelta(r.L, r.det), 1 - 2 - 3 + 2 * 3);
});

test("producto: saca los 1 y encierra entre paréntesis el factor que lo necesita", () => {
  const m = conGrafo([], []);
  assert.equal(m.producto([]), "1");
  assert.equal(m.producto(["1", "G", "1"]), "G");
  assert.equal(m.producto(["-H", "2"]), "(-H)·2");
  assert.equal(m.producto(["s+1", "G1"]), "(s+1)·G1");
});

test("las ecuaciones nodo a nodo se arman con las ramas", () => {
  const m = conGrafo(
    [nodo("e", "e", "entrada"), nodo("a", "a", "normal"), nodo("s", "s", "salida")],
    [rama("e", "a", "2"), rama("a", "s", "-3")]
  );
  assert.deepEqual(clonar(m.ecuaciones()).map(x => x.texto),
    ["e = entrada del sistema", "a = 2·e", "s = −3·a"]);
});
