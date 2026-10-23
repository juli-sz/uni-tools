/* ======================= Mason =======================
   Todo el análisis sale de recorrer el grafo: caminos simples de la entrada a la
   salida, ciclos simples, y qué ciclos no se tocan entre sí. */
const nodosDeRamas = (ramas) => {
  const s = new Set();
  for (const r of ramas) { s.add(r.de); s.add(r.a); }
  return s;
};
const salientesDe = (id) => S.ramas.filter(r => r.de === id);

function trayectorias(desde, hasta) {
  const res = [];
  if (!desde || !hasta || desde === hasta) return res;
  const paso = (actual, visitados, ramas) => {
    for (const r of salientesDe(actual)) {
      if (r.a === hasta) { res.push(ramas.concat(r)); continue; }
      if (visitados.has(r.a)) continue;
      visitados.add(r.a); ramas.push(r);
      paso(r.a, visitados, ramas);
      ramas.pop(); visitados.delete(r.a);
    }
  };
  paso(desde, new Set([desde]), []);
  return res;
}
/* Cada ciclo se cuenta una sola vez: arranca siempre por su nodo de menor índice */
function lazos() {
  const res = [];
  const idx = new Map(S.nodos.map((n, i) => [n.id, i]));
  for (const inicio of S.nodos) {
    const i0 = idx.get(inicio.id);
    const paso = (actual, visitados, ramas) => {
      for (const r of salientesDe(actual)) {
        if (r.a === inicio.id) { res.push(ramas.concat(r)); continue; }
        if (idx.get(r.a) < i0 || visitados.has(r.a)) continue;
        visitados.add(r.a); ramas.push(r);
        paso(r.a, visitados, ramas);
        ramas.pop(); visitados.delete(r.a);
      }
    };
    paso(inicio.id, new Set([inicio.id]), []);
  }
  return res;
}
const seTocan = (a, b) => { for (const n of a) if (b.has(n)) return true; return false; };

/* Todas las combinaciones de lazos que no se tocan, agrupadas por cuántos son */
function combinacionesDisjuntas(ls) {
  const porTamano = {};
  const paso = (desde, actual) => {
    if (actual.length >= 2) (porTamano[actual.length] = porTamano[actual.length] || []).push(actual.slice());
    for (let i = desde; i < ls.length; i++) {
      if (actual.every(j => !seTocan(ls[j].nodos, ls[i].nodos))) { actual.push(i); paso(i + 1, actual); actual.pop(); }
    }
  };
  paso(0, []);
  return porTamano;
}
/* Δ = 1 − ΣL + ΣLL − ΣLLL + …  Se arma para el grafo entero o para el subconjunto
   de lazos que no tocan una trayectoria (ahí sale el cofactor). */
function determinante(ls) {
  const combos = combinacionesDisjuntas(ls);
  const terminos = [];                       // { orden, indices }
  ls.forEach((l, i) => terminos.push({ orden: 1, indices: [i] }));
  Object.keys(combos).map(Number).sort((a, b) => a - b)
    .forEach(k => combos[k].forEach(c => terminos.push({ orden: k, indices: c })));
  return { terminos, combos };
}
const gananciaDe = (ramas) => ramas.map(r => (r.g === "" || r.g == null) ? "1" : String(r.g));
/* Producto simbólico: saca los 1 y encierra el factor que lo necesite, incluido
   el negativo, para que no quede un "G_1·-H_1" difícil de leer */
function producto(factores) {
  const utiles = factores.filter(f => f !== "1");
  if (!utiles.length) return "1";
  if (utiles.length === 1) return utiles[0];
  return utiles.map(f => /^[\w.]+$/.test(f) ? f : "(" + f + ")").join("·");
}
const rutaDe = (ramas) => {
  if (!ramas.length) return "";
  const nombres = [nombreNodo(ramas[0].de)].concat(ramas.map(r => nombreNodo(r.a)));
  return nombres.join(" → ");
};
const nombreNodo = (id) => { const n = getNodo(id); return n ? n.nombre : "?"; };
const numerico = (s) => { const v = Number(String(s).trim()); return Number.isFinite(v) ? v : null; };

function analizar() {
  const entrada = S.nodos.find(n => n.tipo === "entrada");
  const salida = S.nodos.find(n => n.tipo === "salida");
  const P = trayectorias(entrada && entrada.id, salida && salida.id).map((ramas, i) => ({
    simbolo: "P" + (i + 1), ramas, nodos: nodosDeRamas(ramas),
    gan: producto(gananciaDe(ramas)), ruta: rutaDe(ramas)
  }));
  const L = lazos().map((ramas, i) => ({
    simbolo: "L" + (i + 1), ramas, nodos: nodosDeRamas(ramas),
    gan: producto(gananciaDe(ramas)), ruta: rutaDe(ramas)
  }));
  const det = determinante(L);
  // cofactores: el mismo Δ pero sólo con los lazos que no tocan esa trayectoria
  const cof = P.map(p => {
    const libres = L.filter(l => !seTocan(l.nodos, p.nodos));
    const d = determinante(libres);
    return { p, libres, det: d };
  });
  return { entrada, salida, P, L, det, cof };
}
/* Δ escrito como texto, a partir de los términos y de cómo se llama cada lazo */
function textoDelta(ls, det) {
  if (!ls.length) return "1";
  let s = "1";
  const porOrden = {};
  det.terminos.forEach(t => (porOrden[t.orden] = porOrden[t.orden] || []).push(t));
  Object.keys(porOrden).map(Number).sort((a, b) => a - b).forEach(k => {
    const signo = k % 2 ? " − " : " + ";
    s += signo + porOrden[k].map(t => t.indices.map(i => ls[i].simbolo).join("")).join(signo === " − " ? " − " : " + ");
  });
  return s;
}
function valorDelta(ls, det) {
  if (ls.some(l => l.valor === null)) return null;
  let v = 1;
  det.terminos.forEach(t => {
    const prod = t.indices.reduce((a, i) => a * ls[i].valor, 1);
    v += (t.orden % 2 ? -1 : 1) * prod;
  });
  return v;
}
/* Si todas las transmitancias son números, además del simbólico da el resultado */
function conValores(items) {
  items.forEach(it => {
    const vs = gananciaDe(it.ramas).map(numerico);
    it.valor = vs.some(v => v === null) ? null : vs.reduce((a, b) => a * b, 1);
  });
  return items;
}

/* ======================= sistema de ecuaciones ======================= */
function ecuaciones() {
  return S.nodos.map(n => {
    const entra = S.ramas.filter(r => r.a === n.id);
    if (!entra.length) return { nodo: n, texto: n.nombre + " = " + (n.tipo === "entrada" ? "entrada del sistema" : "0") };
    // el término negativo se escribe restando, en vez de quedar como "+ -H·x"
    const partes = entra.map(r => {
      let g = ((r.g === "" || r.g == null) ? "1" : String(r.g)).trim();
      let signo = "+";
      if (g[0] === "-") { signo = "−"; g = g.slice(1).trim() || "1"; }
      const factor = g === "1" ? "" : (/^[\w.]+$/.test(g) ? g : "(" + g + ")") + "·";
      return { signo, txt: factor + nombreNodo(r.de) };
    });
    const texto = n.nombre + " = " + partes.map((p, i) =>
      (i === 0 ? (p.signo === "−" ? "−" : "") : " " + p.signo + " ") + p.txt).join("");
    return { nodo: n, texto };
  });
}
