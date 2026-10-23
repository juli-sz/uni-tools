/* El analizador de ecuaciones de los bloques (el que arma el tipógrafo), sin
   navegador. Uso desde la raíz: node --test "tests/unidades/*.test.js" */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { cargar, clonar } = require("./cargar");

const e = cargar("src/bloque/ecuaciones.js");
const arb = (src) => clonar(e.analizar(src));

test("K/(s+1): una fracción apilada; al denominador se le cae el paréntesis", () => {
  assert.deepEqual(arb("K/(s+1)"), [
    { t: "frac",
      num: [{ t: "run", s: "K" }],
      den: [{ t: "run", s: "s" }, { t: "op", s: "+", esp: 0.24 }, { t: "run", s: "1" }] },
  ]);
});

test("a/b/c es una sola fracción: a·g_1 arriba y los grupos abajo multiplicados", () => {
  const [frac] = arb("a*g_1/(b*h_1+1)/(h_2+1)");
  assert.equal(frac.t, "frac");
  assert.equal(frac.num.length, 4);                       // a · g₁
  assert.equal(frac.num[1].s, "·");
  assert.deepEqual(frac.den.map(x => x.t), ["grupo", "op", "grupo"]);
  assert.equal(frac.den[1].s, "·");
});

test("s^-1 y \\omega_ns siguen a LaTeX", () => {
  assert.deepEqual(arb("s^-1"), [
    { t: "run", s: "s" },
    { t: "sup", items: [{ t: "op", s: "−", esp: 0 }, { t: "run", s: "1" }] },
  ]);
  assert.deepEqual(arb("\\omega_ns"), [
    { t: "run", s: "ω" },
    { t: "sub", items: [{ t: "run", s: "n" }] },
    { t: "run", s: "s" },
  ]);
});

test("G1 lleva subíndice; con llaves o \\frac va el contenido", () => {
  assert.deepEqual(arb("G1"),
    [{ t: "run", s: "G" }, { t: "sub", items: [{ t: "run", s: "1" }] }]);
  assert.deepEqual(arb("X_{12}"),
    [{ t: "run", s: "X" }, { t: "sub", items: [{ t: "run", s: "12" }] }]);
  assert.deepEqual(arb("\\frac{x}{y}"),
    [{ t: "frac", num: [{ t: "run", s: "x" }], den: [{ t: "run", s: "y" }] }]);
});

test("los paréntesis que envuelven una fracción suelta se caen solos", () => {
  assert.deepEqual(arb("G/(H)"),
    [{ t: "frac", num: [{ t: "run", s: "G" }], den: [{ t: "run", s: "H" }] }]);
  const t = arb("(a/b)*2");
  assert.equal(t.some(x => x.t === "grupo"), false);
});
