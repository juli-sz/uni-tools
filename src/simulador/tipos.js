/* ======================= tipos ======================= */
const T = {
  and:  { w: 56, h: 44, pins: 2, nombre: "AND",  var: true },
  or:   { w: 58, h: 44, pins: 2, nombre: "OR",   var: true },
  xor:  { w: 62, h: 44, pins: 2, nombre: "XOR",  var: true },
  nand: { w: 56, h: 44, pins: 2, nombre: "NAND", var: true, bubble: true },
  nor:  { w: 58, h: 44, pins: 2, nombre: "NOR",  var: true, bubble: true },
  xnor: { w: 62, h: 44, pins: 2, nombre: "XNOR", var: true, bubble: true },
  not:  { w: 44, h: 36, pins: 1, nombre: "NOT",  bubble: true },
  buf:  { w: 44, h: 36, pins: 1, nombre: "Buffer" },
  in:   { w: 48, h: 30, pins: 0, nombre: "Entrada" },
  out:  { w: 30, h: 30, pins: 1, nombre: "Salida" },
  label:{ w: 60, h: 20, pins: 0, nombre: "Texto" },
  clk:  { w: 52, h: 32, pins: 0, nombre: "Señal de reloj" },
  ff:   { w: 104, h: 76, pins: 0, nombre: "Biestable" },
  marco:{ w: 240, h: 150, pins: 0, nombre: "Recuadro" },
  hadd: { w: 100, h: 66, pins: 2, nombre: "Semisumador" },
  fadd: { w: 100, h: 66, pins: 3, nombre: "Sumador completo" }
};
/* Biestables: cada uno define sus patas y su tabla característica.
   La tabla es un array de 2^(datos+1) posiciones: índice = (bits de datos << 1) | Q,
   valor = 0, 1 o null (indefinido, se queda como estaba). */
const BIESTABLES = {
  rs: { nombre: "RS", pins: [{ n: "S" }, { n: "CLK", clk: true }, { n: "R" }],
        f: (d, q) => d[0] && d[1] ? null : d[0] ? 1 : d[1] ? 0 : q,
        nota: "S=R=1 es la combinación prohibida" },
  jk: { nombre: "JK", pins: [{ n: "J" }, { n: "CLK", clk: true }, { n: "K" }],
        f: (d, q) => d[0] && d[1] ? (q ? 0 : 1) : d[0] ? 1 : d[1] ? 0 : q,
        nota: "J=K=1 conmuta" },
  d:  { nombre: "D", pins: [{ n: "D" }, { n: "CLK", clk: true }],
        f: (d) => d[0] ? 1 : 0, nota: "Copia D en cada flanco" },
  t:  { nombre: "T", pins: [{ n: "T" }, { n: "CLK", clk: true }],
        f: (d, q) => d[0] ? (q ? 0 : 1) : q, nota: "T=1 conmuta" },
  custom: { nombre: "Custom", pins: [{ n: "X" }, { n: "CLK", clk: true }], f: null,
        nota: "Editá la tabla y el circuito la respeta" }
};
/* Sumadores: bloques cerrados que se dibujan como en los esquemas de sumador en
   cascada. Los bits a sumar entran por abajo, el acarreo anterior entra por la
   derecha, el acarreo que se propaga sale por la izquierda y la suma sale para
   arriba: encadenando bloques, la R de uno cae en la Rant del que tiene al lado. */
const SUMADORES = {
  hadd: { corto: "½ Σ",
          ins:  [{ n: "A", lado: "abajo" }, { n: "B", lado: "abajo" }],
          outs: [{ n: "S", lado: "arriba" }, { n: "R", lado: "izq" }],
          nota: "Suma dos bits: S = A ⊕ B y el acarreo R = A · B. No recibe acarreo anterior, por eso es medio sumador: sirve para la primera columna." },
  fadd: { corto: "Σ",
          ins:  [{ n: "A", lado: "abajo" }, { n: "B", lado: "abajo" }, { n: "Rant", lado: "der" }],
          outs: [{ n: "S", lado: "arriba" }, { n: "R", lado: "izq" }],
          nota: "Suma tres bits: A, B y el acarreo anterior Rant. La R que sale por la izquierda es el acarreo de esta columna: va a la Rant del bloque de la izquierda." }
};
const esSum = (n) => n.type === "hadd" || n.type === "fadd";
const LADOS = { izq: { x: -1, y: 0 }, der: { x: 1, y: 0 },
                arriba: { x: 0, y: -1 }, abajo: { x: 0, y: 1 } };
/* Dónde apoya cada pata del sumador: se reparten a lo largo del lado que les toca,
   una sola al medio y dos a un tercio y dos tercios. */
function sumPata(n, pin) {
  const d = SUMADORES[n.type];
  const p = esSalida(pin) ? d.outs[idxSalida(pin)] : d.ins[pin];
  const dir = LADOS[p.lado], w = bodyW(n) / 2, h = T[n.type].h / 2;
  const mismos = d.ins.concat(d.outs).filter(q => q.lado === p.lado);
  const t = (mismos.indexOf(p) + 1) / (mismos.length + 1);
  const base = dir.x !== 0 ? { x: dir.x * w, y: -h + 2 * h * t }
                           : { x: -w + 2 * w * t, y: dir.y * h };
  return { p, dir, base, punta: { x: base.x + dir.x * STUB, y: base.y + dir.y * STUB } };
}
function sumaDe(type, v) {                      // bits de entrada -> [S, R]
  const unos = v.reduce((a, b) => a + (b === 1 ? 1 : 0), 0);
  return type === "hadd" ? [unos === 1 ? 1 : 0, unos === 2 ? 1 : 0]
                         : [unos & 1, unos >= 2 ? 1 : 0];
}
function pinsDe(kind, conClk) {
  const base = JSON.parse(JSON.stringify(BIESTABLES[kind].pins));
  return conClk ? base : base.filter(p => !p.clk);
}
const datosDe = (n) => n.pins.map((p, i) => p.clk ? -1 : i).filter(i => i >= 0);
const clkDe = (n) => n.pins.findIndex(p => p.clk);
function tablaDe(n) {                          // arma (o completa) la tabla característica
  const d = datosDe(n).length, largo = 1 << (d + 1);
  if (!Array.isArray(n.tabla) || n.tabla.length !== largo) {
    const f = BIESTABLES[n.kind] && BIESTABLES[n.kind].f;
    n.tabla = Array.from({ length: largo }, (_, k) => {
      const q = k & 1, bits = k >> 1;
      const datos = Array.from({ length: d }, (_, i) => (bits >> (d - 1 - i)) & 1);
      return f ? f(datos, q) : q;              // el custom arranca reteniendo
    });
  }
  return n.tabla;
}
function proximoQ(n, datos, q) {
  const d = datos.length;
  const bits = datos.reduce((a, b, i) => a | ((b ? 1 : 0) << (d - 1 - i)), 0);
  const v = tablaDe(n)[(bits << 1) | (q ? 1 : 0)];
  return v === null || v === undefined ? q : (v ? 1 : 0);
}
/* La tabla de excitación es la misma información leída al revés:
   para cada transición Q → Q(t+1), qué hay que poner en las entradas. */
function excitacion(n) {
  const idx = datosDe(n), d = idx.length, tab = tablaDe(n);
  return [[0, 0], [0, 1], [1, 0], [1, 1]].map(([q, qn]) => {
    const combos = [];
    for (let c = 0; c < (1 << d); c++) if (tab[(c << 1) | q] === qn) combos.push(c);
    const patron = Array.from({ length: d }, (_, i) => {
      if (!combos.length) return "—";
      const bits = combos.map(c => (c >> (d - 1 - i)) & 1);
      return bits.every(b => b === bits[0]) ? String(bits[0]) : "X";
    });
    return { q, qn, patron, combos };
  });
}
function aplicarExcitacion(n, fila, patron) {   // patrón con 0/1/X → vuelca a la tabla
  const d = datosDe(n).length, tab = tablaDe(n);
  for (let c = 0; c < (1 << d); c++) {
    let ok = true;
    for (let i = 0; i < d; i++) {
      const b = (c >> (d - 1 - i)) & 1;
      if (patron[i] !== "X" && patron[i] !== "—" && +patron[i] !== b) { ok = false; break; }
    }
    if (ok) tab[(c << 1) | fila.q] = fila.qn;
  }
}
const STUB = 10;                     // largo de las patitas
const bodyW = (n) => esMarco(n) ? n.w : T[n.type].w;
const FF_CAB = 24, FF_FILA = 26;              // alto del encabezado y de cada fila
const bodyH = (n) => n.type === "label" ? T.label.h
  : esMarco(n) ? n.h
  : n.type === "ff" ? FF_CAB + Math.max(2, nIn(n)) * FF_FILA
  : esSum(n) ? T[n.type].h
  : Math.max(T[n.type].h, (nIn(n) > 2 ? nIn(n) * 17 + 12 : T[n.type].h));
const nIn = (n) => n.type === "ff" ? n.pins.length
  : esMarco(n) ? 0
  : n.type === "out" ? 1 : (T[n.type].var ? (n.pins || 2) : T[n.type].pins);
const nOut = (n) => (n.type === "ff" || esSum(n)) ? 2
  : (n.type === "out" || n.type === "label" || esMarco(n) ? 0 : 1);
const esSalida = (pin) => typeof pin === "string" && pin[0] === "o";
const idxSalida = (pin) => pin === "o" ? 0 : +String(pin).slice(1);
const claveSal = (id, i) => id + "#" + i;
const bubR = (n) => T[n.type].bubble ? 5 : 0;
const outX = (n) => bodyW(n) / 2 + bubR(n) * 2 + STUB;
const inX  = (n) => -bodyW(n) / 2 - STUB;
