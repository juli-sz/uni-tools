/* ======================= lógica ======================= */
let VAL = new Map(), OSC = false;      // valor de cada salida y si el circuito oscila
function evalGate(t, v) {
  const some = v.some(x => x === 1), every = v.every(x => x === 1);
  const par = v.reduce((a, b) => a ^ (b === 1 ? 1 : 0), 0);
  switch (t) {
    case "and": return every ? 1 : 0;
    case "nand": return every ? 0 : 1;
    case "or": return some ? 1 : 0;
    case "nor": return some ? 0 : 1;
    case "xor": return par;
    case "xnor": return par ? 0 : 1;
    case "not": return v[0] === 1 ? 0 : 1;
    case "buf": case "out": return v[0] === 1 ? 1 : 0;
    default: return 0;
  }
}
/* Simulación en dos tiempos:
   1) se asienta la parte combinacional con los biestables quietos;
   2) se buscan flancos de subida de reloj, se actualizan los Q y se vuelve a asentar
      (así funcionan los contadores en cascada, donde un flanco dispara el siguiente). */
function simulate(nodes, wires, prev) {
  const val = new Map();
  const src = new Map();
  for (const w of wires) src.set(w.to.id + ":" + w.to.pin, { id: w.from.id, i: idxSalida(w.from.pin || "o") });
  const leer = (id, i) => val.get(claveSal(id, i)) || 0;
  const entrada = (n, i) => { const q = src.get(n.id + ":" + i); return q ? leer(q.id, q.i) : 0; };
  for (const n of nodes) {
    if (n.type === "in" || n.type === "clk") val.set(claveSal(n.id, 0), n.on ? 1 : 0);
    else if (n.type === "ff") { val.set(claveSal(n.id, 0), n.q ? 1 : 0); val.set(claveSal(n.id, 1), n.q ? 0 : 1); }
    else for (let i = 0; i < Math.max(1, nOut(n)); i++)
      val.set(claveSal(n.id, i), (prev && prev.get(claveSal(n.id, i))) || 0);
  }
  const comb = nodes.filter(n => !/^(in|clk|ff|label|marco)$/.test(n.type));
  const asincronos = nodes.filter(n => n.type === "ff" && n.conClk === false);
  const asentar = () => {
    for (let pass = 0; ; pass++) {
      let cambio = false;
      for (const n of comb) {
        const v = [];
        for (let i = 0; i < nIn(n); i++) v.push(entrada(n, i));
        const r = esSum(n) ? sumaDe(n.type, v) : [evalGate(n.type, v)];
        for (let i = 0; i < r.length; i++)
          if (r[i] !== leer(n.id, i)) { val.set(claveSal(n.id, i), r[i]); cambio = true; }
      }
      for (const n of asincronos) {          // sin reloj: siguen a sus entradas, como un latch
        const datos = datosDe(n).map(i => entrada(n, i));
        const nq = proximoQ(n, datos, n.q ? 1 : 0);
        if (nq !== n.q) { n.q = nq; cambio = true; }
        val.set(claveSal(n.id, 0), n.q ? 1 : 0);
        val.set(claveSal(n.id, 1), n.q ? 0 : 1);
      }
      if (!cambio) return false;
      if (pass > 60) return true;
    }
  };
  let osc = asentar();
  const ffs = nodes.filter(n => n.type === "ff" && n.conClk !== false);
  if (ffs.length) for (let vuelta = 0; vuelta < 16; vuelta++) {
    let disparo = false;
    for (const n of ffs) {
      const ic = clkDe(n);
      const clk = ic >= 0 ? entrada(n, ic) : 0;
      if (!n.clkArranque) { n.clkArranque = true; n.clkPrev = clk; }   // al abrir no hay flanco
      else if (clk === 1 && !n.clkPrev) {                  // flanco de subida
        const datos = datosDe(n).map(i => entrada(n, i));
        const nq = proximoQ(n, datos, n.q ? 1 : 0);
        if (nq !== n.q) disparo = true;
        n.q = nq;
      }
      n.clkPrev = clk;
      val.set(claveSal(n.id, 0), n.q ? 1 : 0);
      val.set(claveSal(n.id, 1), n.q ? 0 : 1);
    }
    if (!disparo) break;
    osc = asentar() || osc;
  }
  return { val, osc };
}
function correr() { const r = simulate(S.nodes, S.wires, VAL); VAL = r.val; OSC = r.osc; }
const valorDe = (id, i) => VAL.get(claveSal(id, i || 0)) === 1;
function truthTable() {
  const ins = S.nodes.filter(n => n.type === "in").sort((a, b) => a.x - b.x || a.y - b.y);
  const outs = S.nodes.filter(n => n.type === "out").sort((a, b) => a.y - b.y || a.x - b.x);
  if (!ins.length || !outs.length) return null;
  if (ins.length > 10) return { demasiadas: ins.length };
  const copia = S.nodes.map(n => JSON.parse(JSON.stringify(n)));   // los biestables no deben cambiar de estado
  const rows = [], total = 1 << ins.length;
  for (let m = 0; m < total; m++) {
    for (let i = 0; i < ins.length; i++)
      copia.find(n => n.id === ins[i].id).on = !!((m >> (ins.length - 1 - i)) & 1);
    const { val, osc } = simulate(copia, S.wires);
    rows.push({ m, in: ins.map((n, i) => (m >> (ins.length - 1 - i)) & 1),
      out: outs.map(o => val.get(claveSal(o.id, 0)) || 0), osc });
  }
  return { ins, outs, rows };
}
function simplify(minterms, n, nombres) {
  if (!minterms.length) return "0";
  if (minterms.length === (1 << n)) return "1";
  let grupo = minterms.map(m => ({ bits: m, mask: 0 }));
  const primos = [];
  while (grupo.length) {
    const sig = new Map(), usado = new Array(grupo.length).fill(false);
    for (let i = 0; i < grupo.length; i++) for (let j = i + 1; j < grupo.length; j++) {
      const a = grupo[i], b = grupo[j];
      if (a.mask !== b.mask) continue;
      const dif = a.bits ^ b.bits;
      if (dif && (dif & (dif - 1)) === 0) {
        usado[i] = usado[j] = true;
        const bits = a.bits & ~dif, mask = a.mask | dif;
        sig.set(bits + "/" + mask, { bits, mask });
      }
    }
    grupo.forEach((g, i) => { if (!usado[i] && !primos.some(p => p.bits === g.bits && p.mask === g.mask)) primos.push(g); });
    grupo = Array.from(sig.values());
  }
  const cubre = (p, m) => (m & ~p.mask) === p.bits;
  const falta = new Set(minterms), elegidos = [];
  for (const m of minterms) {
    const c = primos.filter(p => cubre(p, m));
    if (c.length === 1 && !elegidos.includes(c[0])) elegidos.push(c[0]);
  }
  for (const p of elegidos) for (const m of Array.from(falta)) if (cubre(p, m)) falta.delete(m);
  // Lo que no cubren los esenciales se cubre con la combinación de primos más barata: menos
  // términos y, a igual cantidad, menos literales. Primero una pasada golosa (rápida) que da una
  // solución válida y sirve de cota; después una búsqueda exacta con poda que la mejora si puede.
  // La búsqueda tiene un tope de tiempo (150 ms por salida) para no colgar la página con 9 o 10
  // entradas: si se corta, queda lo mejor encontrado, que nunca es peor que la golosa.
  const literales = (p) => { let c = 0; for (let i = 0; i < n; i++) if (!(p.mask & (1 << i))) c++; return c; };
  const resto = primos.filter(p => !elegidos.includes(p));
  const golosa = [], faltaG = new Set(falta);
  while (faltaG.size) {
    let mejor = null, cuenta = -1;
    for (const p of resto) {
      if (golosa.includes(p)) continue;
      let c = 0; for (const m of faltaG) if (cubre(p, m)) c++;
      if (c > cuenta || (c === cuenta && mejor && literales(p) < literales(mejor))) { cuenta = c; mejor = p; }
    }
    if (!mejor || cuenta <= 0) break;
    golosa.push(mejor);
    for (const m of Array.from(faltaG)) if (cubre(mejor, m)) faltaG.delete(m);
  }
  let mejorSel = golosa, mejorLit = golosa.reduce((a, p) => a + literales(p), 0);
  // datos precalculados para que cada paso sea barato: qué primos cubren cada minterm que falta
  const porM = new Map();
  for (const m of falta) porM.set(m, resto.filter(p => cubre(p, m)).sort((a, b) => literales(a) - literales(b)));
  const limite = Date.now() + 150;                              // ms como mucho por salida
  let pasos = 0;
  const buscar = (faltan, sel, lit) => {
    if ((++pasos & 255) === 0 && Date.now() > limite) pasos = -Infinity;
    if (pasos < 0) return;
    if (!faltan.size) {
      if (sel.length < mejorSel.length || (sel.length === mejorSel.length && lit < mejorLit)) { mejorSel = sel.slice(); mejorLit = lit; }
      return;
    }
    if (sel.length + 1 > mejorSel.length) return;               // hace falta al menos un término más
    // se ramifica sobre el minterm con menos primos que lo cubren
    let cands = null;
    for (const m of faltan) { const c = porM.get(m); if (!cands || c.length < cands.length) { cands = c; if (c.length <= 1) break; } }
    for (const p of cands) {
      if (sel.length + 1 === mejorSel.length && lit + literales(p) >= mejorLit) continue;
      const quedan = new Set(); for (const m of faltan) if (!cubre(p, m)) quedan.add(m);
      sel.push(p); buscar(quedan, sel, lit + literales(p)); sel.pop();
    }
  };
  if (falta.size && !faltaG.size) buscar(falta, [], 0);
  elegidos.push(...mejorSel);
  return elegidos.map(p => termino(p, n, nombres)).join(" + ") || "0";
}
function termino(p, n, nombres) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const bit = 1 << (n - 1 - i);
    if (p.mask & bit) continue;
    s += (nombres ? nombres[i] : String.fromCharCode(65 + i)) + ((p.bits & bit) ? "" : "'");
  }
  return s || "1";
}
