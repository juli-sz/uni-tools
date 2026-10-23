/* Exactitud de lo que calculan las herramientas, contra referencias independientes escritas acá
   (lo esperado no se calcula con el código de la app):
   - Mason: transferencia, ecuaciones, trayectorias, lazos y el equivalente en bloques, contra
     resolver el sistema lineal de grafos al azar;
   - simplificación del simulador: equivalente a la tabla y mínima (búsqueda exhaustiva);
   - circuitos al azar: la tabla de verdad interna, la que se ve y la expresión que se ve;
   - biestables en funcionamiento contra el modelo de libro;
   - ecuaciones de los bloques: lo dibujado vale lo mismo que lo escrito y entra en el bloque.
   Cada prueba junta todas las fallas: la lista tiene que quedar vacía.
   Una versión más grande de cada una (miles de casos) se corrió al reestructurar en 2026-10. */
const { test, expect } = require("@playwright/test");
const { abrir } = require("./ayudas");

test.describe.configure({ timeout: 180_000 });

test("Mason coincide con resolver el sistema del grafo, también el equivalente en bloques", async ({ page }) => {
  const errores = await abrir(page, "diagrama-señales.html");
  const r = await page.evaluate((N) => {
    let semilla = 987654321;
    const rnd = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
    const elegir = (a) => a[Math.floor(rnd() * a.length)];

    /* ---- evaluador de expresiones del texto que muestra la app ---- */
    function evaluar(txt, vals) {
      const s = txt.replace(/\s+/g, "").replace(/−/g, "-").replace(/[·×*]/g, "*");
      let i = 0;
      const ver = () => s[i];
      function expr() { let v = term(); while (ver() === "+" || ver() === "-") { const o = s[i++]; const w = term(); v = o === "+" ? v + w : v - w; } return v; }
      function term() { let v = factor(); while (ver() === "*" || ver() === "/") { const o = s[i++]; const w = factor(); v = o === "*" ? v * w : v / w; } return v; }
      function factor() {
        if (ver() === "-") { i++; return -factor(); }
        if (ver() === "+") { i++; return factor(); }
        if (ver() === "(") { i++; const v = expr(); if (s[i++] !== ")") throw new Error("falta ) en " + txt); return v; }
        const m = /^(\d+(\.\d+)?|[A-Za-zΔ][A-Za-z0-9_Δ]*)/.exec(s.slice(i));
        if (!m) throw new Error("no entiendo «" + s.slice(i) + "» en " + txt);
        i += m[0].length;
        if (/^\d/.test(m[0])) {                       // número pegado a un símbolo: 2s = 2·s
          return +m[0];
        }
        if (m[0] in vals) return vals[m[0]];
        // símbolos pegados = producto (L1L2 es L1·L2)
        let resto = m[0], prod = 1;
        while (resto) {
          const k = Object.keys(vals).filter(x => resto.startsWith(x)).sort((a, b) => b.length - a.length)[0];
          if (!k) throw new Error("símbolo sin valor " + m[0] + " en " + txt);
          prod *= vals[k]; resto = resto.slice(k.length);
        }
        return prod;
      }
      const v = expr();
      if (i !== s.length) throw new Error("sobra «" + s.slice(i) + "» en " + txt);
      return v;
    }
    /* ---- sistema lineal: x = A x + b, con la entrada en 1 ---- */
    function resolver(nodos, ramas, gan, entrada) {
      const idx = new Map(nodos.map((n, k) => [n.id, k])), n = nodos.length;
      const M = Array.from({ length: n }, () => new Array(n + 1).fill(0));
      for (let k = 0; k < n; k++) M[k][k] = 1;
      for (const r of ramas) if (r.a !== entrada) M[idx.get(r.a)][idx.get(r.de)] -= gan(r);
      const ke = idx.get(entrada); for (let c = 0; c <= n; c++) M[ke][c] = 0; M[ke][ke] = 1; M[ke][n] = 1;
      for (let c = 0; c < n; c++) {                   // Gauss con pivoteo
        let p = c; for (let f = c + 1; f < n; f++) if (Math.abs(M[f][c]) > Math.abs(M[p][c])) p = f;
        if (Math.abs(M[p][c]) < 1e-9) return null;
        [M[c], M[p]] = [M[p], M[c]];
        for (let f = 0; f < n; f++) if (f !== c) { const k = M[f][c] / M[c][c]; for (let q = c; q <= n; q++) M[f][q] -= k * M[c][q]; }
      }
      const x = {}; nodos.forEach((nd, k) => x[nd.id] = M[k][n] / M[k][k]); return x;
    }
    /* ---- el equivalente en bloques, resuelto como sistema ---- */
    function resolverBloques(d, vals) {
      const n = d.nodes.length, idx = new Map(d.nodes.map((e, k) => [e.id, k]));
      const M = Array.from({ length: n }, () => new Array(n + 1).fill(0));
      const entran = new Map(d.nodes.map(e => [e.id, []]));
      for (const e of d.edges) entran.get(e.to.id).push(e);
      let entradaIo = null;
      for (const e of d.nodes) {
        const k = idx.get(e.id); M[k][k] = 1;
        const ins = entran.get(e.id);
        if (e.type === "block") {
          if (ins.length !== 1) throw new Error("bloque con " + ins.length + " entradas");
          M[k][idx.get(ins[0].from.id)] -= evaluar(e.label, vals);
        } else if (e.type === "sum") {
          for (const ed of ins) {
            const sg = e.signs[ed.to.port];
            if (sg !== "+" && sg !== "−") throw new Error("flecha a la pata " + ed.to.port + " de un sumador sin signo");
            M[k][idx.get(ed.from.id)] -= sg === "+" ? 1 : -1;
          }
          const usadas = ins.map(x => x.to.port);
          for (const p in e.signs) if (e.signs[p] && !usadas.includes(p)) throw new Error("sumador con signo en la pata " + p + " sin flecha");
        } else {
          if (ins.length > 1) throw new Error(e.type + " con varias entradas");
          if (ins.length) M[k][idx.get(ins[0].from.id)] -= 1;
          else if (e.type === "io" && e.label === d.__entrada) { M[k][n] = 1; entradaIo = e; }
        }
      }
      for (let c = 0; c < n; c++) {
        let p = c; for (let f = c + 1; f < n; f++) if (Math.abs(M[f][c]) > Math.abs(M[p][c])) p = f;
        if (Math.abs(M[p][c]) < 1e-12) return null;
        [M[c], M[p]] = [M[p], M[c]];
        for (let f = 0; f < n; f++) if (f !== c) { const k = M[f][c] / M[c][c]; for (let q = c; q <= n; q++) M[f][q] -= k * M[c][q]; }
      }
      const x = {}; d.nodes.forEach((e, k) => x[e.id] = M[k][n] / M[k][k]);
      return { x, entradaIo };
    }
    /* ---- fuerza bruta: caminos simples y ciclos simples ---- */
    function contar(nodos, ramas, de, a) {
      let caminos = 0; const ciclos = new Set();
      const sal = (id) => ramas.filter(r => r.de === id);
      const dfs = (u, vis) => { for (const r of sal(u)) { if (r.a === a) { caminos++; continue; } if (vis.has(r.a)) continue; vis.add(r.a); dfs(r.a, vis); vis.delete(r.a); } };
      if (de !== a) dfs(de, new Set([de]));
      // ciclos: secuencias de ramas que vuelven al inicio sin repetir nodos; se canonicaliza por el conjunto de ramas
      const rec = (ini, u, vis, cam) => { for (const r of sal(u)) { if (r.a === ini) { ciclos.add(cam.concat(r.id).sort().join(",")); continue; } if (vis.has(r.a)) continue; vis.add(r.a); rec(ini, r.a, vis, cam.concat(r.id)); vis.delete(r.a); } };
      for (const nd of nodos) rec(nd.id, nd.id, new Set([nd.id]), []);
      return { caminos, lazos: ciclos.size };
    }

    const fallas = []; let probados = 0, saltados = 0;
    const SIMB = ["G1", "G2", "G3", "G4", "H1", "H2", "H3", "K", "M", "Q"];
    for (let caso = 0; caso < N; caso++) {
      const nn = 3 + Math.floor(rnd() * 5), numerico = rnd() < 0.35;
      S.nodos = []; S.ramas = []; S.sel = []; S.selR = []; uidc = 1;
      for (let k = 0; k < nn; k++) S.nodos.push(nuevoNodo(k * 160 + Math.round(rnd() * 40), Math.round((rnd() - 0.5) * 200),
        { tipo: k === 0 ? "entrada" : k === nn - 1 ? "salida" : "normal" }));
      const gananciaAlAzar = () => numerico ? String(Math.round((rnd() * 1.6 - 0.8) * 100) / 100 || 0.5)
        : elegir([elegir(SIMB), "-" + elegir(SIMB), elegir(SIMB), "1", "2", "-1", elegir(SIMB) + "·" + elegir(SIMB), "(" + elegir(SIMB) + "+1)"]);
      for (let k = 0; k + 1 < nn; k++) S.ramas.push(nuevaRama(S.nodos[k].id, S.nodos[k + 1].id, { g: gananciaAlAzar() }));
      const extras = Math.floor(rnd() * (nn + 1) * (caso % 4 === 3 ? 3 : 1));
      for (let k = 0; k < extras; k++) {
        const de = 1 + Math.floor(rnd() * (nn - 1)), a = 1 + Math.floor(rnd() * (nn - 1));   // nada entra a la entrada
        S.ramas.push(nuevaRama(S.nodos[rnd() < 0.2 ? 0 : de].id, S.nodos[a].id, { g: gananciaAlAzar() }));
      }
      render();
      const entrada = S.nodos[0], salida = S.nodos[nn - 1];
      // valores al azar para cada símbolo
      const vals = {}; SIMB.forEach(x => vals[x] = Math.round((rnd() * 1.4 - 0.7) * 1000) / 1000 || 0.3);
      const gan = (r) => evaluar(r.g, vals);
      const x = resolver(S.nodos, S.ramas, gan, entrada.id);
      const det = (() => { try { return x && isFinite(x[salida.id]); } catch (e) { return false; } })();
      if (!det) { saltados++; continue; }
      const T = x[salida.id];
      probados++;
      const tag = `caso ${caso} (${S.ramas.map(r => `${S.nodos.findIndex(n => n.id === r.de)}→${S.nodos.findIndex(n => n.id === r.a)}:${r.g}`).join(" ")})`;
      try {
        // trayectorias y lazos contra fuerza bruta
        const A = analizar();
        const fb = contar(S.nodos, S.ramas, entrada.id, salida.id);
        if (A.P.length !== fb.caminos || A.L.length !== fb.lazos) fallas.push(`${tag}: ${A.P.length} trayectorias/${A.L.length} lazos, fuerza bruta ${fb.caminos}/${fb.lazos}`);
        mostrarMason();
        const body = document.getElementById("mason-body");
        // símbolo → ganancia de cada lazo y cada trayectoria, desde las tablas de la ventana
        const valsL = Object.assign({}, vals);
        body.querySelectorAll("tr").forEach(tr => {
          const s = tr.querySelector("td.simb"), e = tr.querySelector("td.exp");
          if (s && e && /^[PL]\d+$/.test(s.textContent.trim())) valsL[s.textContent.trim()] = evaluar(e.textContent, vals);
        });
        // la ganancia de cada trayectoria/lazo de la tabla es el producto de sus ramas
        for (const it of A.P.concat(A.L)) {
          const prod = it.ramas.reduce((p, r) => p * gan(r), 1);
          if (Math.abs(valsL[it.simbolo] - prod) > 1e-9 * Math.max(1, Math.abs(prod))) fallas.push(`${tag}: ${it.simbolo} = ${it.gan} vale ${valsL[it.simbolo]}, debería ${prod}`);
        }
        const res = body.querySelector(".caja.resultado");
        if (!A.P.length) {
          if (Math.abs(T) > 1e-9) fallas.push(`${tag}: dice que no hay trayectorias pero T = ${T}`);
        } else {
          const lineas = res.innerText.split("\n").map(l => l.trim()).filter(Boolean);
          // la segunda: "= ( numerador ) / ( Δ )"
          const exp = lineas.find(l => l.startsWith("= ("));
          const m = /^= \( (.*) \) \/ \( (.*) \)$/.exec(exp);
          if (!m) throw new Error("no encuentro la transferencia expandida en «" + res.innerText + "»");
          const t = evaluar(m[1], valsL) / evaluar(m[2], valsL);
          if (Math.abs(t - T) > 1e-6 * Math.max(1, Math.abs(T))) fallas.push(`${tag}: la transferencia mostrada vale ${t}, el sistema da ${T}  [${exp}]`);
          // la primera forma con Δk también tiene que coincidir: P1·Δ1 + … / Δ
          const caja4 = Array.from(body.querySelectorAll(".caja")).find(c => /^Δ =/.test(c.textContent.trim()));
          const dTxt = /^Δ = (.*?)(?:Δ =|$)/s.exec(caja4.innerText.replace(/\n/g, " "))[1].trim();
          const dv = evaluar(dTxt, valsL);
          if (Math.abs(dv - evaluar(m[2], valsL)) > 1e-9) fallas.push(`${tag}: Δ de la sección 4 no coincide con el de la transferencia`);
          // número final cuando todo es numérico
          if (numerico) {
            const ult = lineas[lineas.length - 1];
            const num = /^= (-?[\d.]+)$/.exec(ult);
            if (!num) { if (Math.abs(dv) > 1e-9) fallas.push(`${tag}: con todo numérico no muestra el valor (${ult})`); }
            else if (Math.abs(+num[1] - T) > 1e-3 * Math.max(1, Math.abs(T))) fallas.push(`${tag}: muestra ${num[1]}, el sistema da ${T}`);
          }
        }
        // cada ecuación del sistema se cumple con la solución
        const caja = body.querySelector(".caja.eq");
        const valsX = Object.assign({}, vals); S.nodos.forEach(n => valsX[n.nombre] = x[n.id]);
        caja.innerText.split("\n").map(l => l.trim()).filter(Boolean).forEach(l => {
          const [izq, der] = l.split(" = ");
          if (der === "entrada del sistema") { if (izq !== entrada.nombre) fallas.push(`${tag}: ${l}`); return; }
          const v = evaluar(der, valsX);
          if (Math.abs(v - valsX[izq]) > 1e-6 * Math.max(1, Math.abs(v))) fallas.push(`${tag}: la ecuación «${l}» no se cumple (${v} vs ${valsX[izq]})`);
        });
        // el equivalente en bloques tiene la misma transferencia
        const d = equivalenteEnBloques(); d.__entrada = entrada.nombre;
        const rb = resolverBloques(d, vals);
        if (!rb) fallas.push(`${tag}: el equivalente en bloques es singular`);
        else {
          const sal = d.nodes.find(e => e.type === "io" && e.label === salida.nombre);
          const tb = rb.x[sal.id];
          if (Math.abs(tb - T) > 1e-6 * Math.max(1, Math.abs(T))) fallas.push(`${tag}: el equivalente en bloques da ${tb}, el grafo ${T}`);
        }
      } catch (e) { fallas.push(`${tag}: ${e.message}`); }
      document.getElementById("ov-mason").classList.remove("show");
    }
    // los cuatro ejemplos con valores conocidos a mano
    const cat = {};
    for (const f of fallas) { const c = f.replace(/^caso \d+ \(.*?\): /, "").replace(/[-\d.e]+/g, "#").slice(0, 60); cat[c] = (cat[c] || 0) + 1; }
    return { probados, saltados, nfallas: fallas.length, fallas, cat };
  }, 120);
  expect(r.fallas).toEqual([]);
  expect(r.probados).toBeGreaterThan(100);
  expect(errores).toEqual([]);
});

test("la simplificación es equivalente a la tabla y mínima", async ({ page }) => {
  const errores = await abrir(page, "simulador-logico.html");
  const r = await page.evaluate(() => {
    // ---- referencia, escrita aparte de la app ----
    function implicantesPrimos(mt, n) {
      const on = new Set(mt), cubos = [];
      // un cubo: para cada variable 0, 1 o 2 (no importa)
      const total = 3 ** n;
      for (let c = 0; c < total; c++) {
        const d = []; let x = c; for (let i = 0; i < n; i++) { d.push(x % 3); x = Math.floor(x / 3); }
        let ok = true, cubre = [];
        for (let m = 0; m < (1 << n) && ok; m++) {
          let dentro = true;
          for (let i = 0; i < n; i++) { const b = (m >> (n - 1 - i)) & 1; if (d[i] !== 2 && d[i] !== b) { dentro = false; break; } }
          if (dentro) { if (!on.has(m)) ok = false; else cubre.push(m); }
        }
        if (ok && cubre.length) cubos.push({ d, cubre, lit: d.filter(v => v !== 2).length });
      }
      // primo: ningún otro cubo lo contiene estrictamente
      return cubos.filter(a => !cubos.some(b => b !== a && b.cubre.length > a.cubre.length && a.cubre.every(m => b.cubre.includes(m))));
    }
    function minimo(mt, n) {
      if (!mt.length) return { t: 0, l: 0 };
      if (mt.length === 1 << n) return { t: 1, l: 0 };
      const P = implicantesPrimos(mt, n);
      // búsqueda exacta: se ramifica sobre el minterm sin cubrir con menos primos que lo cubren
      const porM = new Map(mt.map(m => [m, P.filter(p => p.cubre.includes(m))]));
      let mejor = { t: Infinity, l: Infinity };
      const rec = (faltan, t, l) => {
        if (!faltan.size) { if (t < mejor.t || (t === mejor.t && l < mejor.l)) mejor = { t, l }; return; }
        if (t + 1 > mejor.t) return;
        let cands = null;
        for (const m of faltan) { const c = porM.get(m); if (!cands || c.length < cands.length) cands = c; }
        for (const p of cands) {
          if (t + 1 === mejor.t && l + p.lit >= mejor.l) continue;
          const q = new Set(faltan); p.cubre.forEach(m => q.delete(m));
          rec(q, t + 1, l + p.lit);
        }
      };
      rec(new Set(mt), 0, 0);
      return mejor;
    }
    // evalúa el texto devuelto: términos separados por " + ", literales NOMBRE con ' opcional
    function evaluar(expr, nombres, m, n) {
      if (expr === "0") return 0; if (expr === "1") return 1;
      return expr.split(" + ").some(t => {
        let s = t, ok = true;
        if (s === "1") return true;
        while (s.length) {
          const nom = nombres.filter(x => s.startsWith(x)).sort((a, b) => b.length - a.length)[0];
          if (!nom) throw new Error("no entiendo el término " + t + " de " + expr);
          s = s.slice(nom.length);
          let neg = false; if (s[0] === "'") { neg = true; s = s.slice(1); }
          const i = nombres.indexOf(nom), b = (m >> (n - 1 - i)) & 1;
          if ((neg ? 1 - b : b) !== 1) ok = false;
        }
        return ok;
      }) ? 1 : 0;
    }
    const contar = (expr) => expr === "0" ? { t: 0, l: 0 } : expr === "1" ? { t: 1, l: 0 } :
      { t: expr.split(" + ").length, l: (expr.match(/[A-Z][a-z0-9]*/g) || []).length };
    let pruebas = 0; const fallas = [];
    let semilla = 12345; const rnd = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
    const probar = (mt, n, exacta, nombres) => {
      pruebas++;
      const noms = nombres || Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
      const e = simplify(mt.slice(), n, nombres);
      const on = new Set(mt);
      for (let m = 0; m < 1 << n; m++) if (evaluar(e, noms, m, n) !== (on.has(m) ? 1 : 0)) { fallas.push(`n=${n} Σm(${mt}) → ${e}: mal en m=${m}`); return; }
      if (exacta) {
        const a = nombres ? { t: e === "0" ? 0 : e.split(" + ").length, l: e === "0" || e === "1" ? 0 : e.split(" + ").reduce((s, t) => s + noms.filter(x => true).length * 0 + (t.match(new RegExp(noms.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length).join("|"), "g")) || []).length, 0) } : contar(e);
        const b = minimo(mt, n);
        if (a.t !== b.t || a.l !== b.l) fallas.push(`n=${n} Σm(${mt}) → ${e}: ${a.t} términos/${a.l} literales, el mínimo es ${b.t}/${b.l}`);
      }
    };
    // todas las funciones de 1, 2 y 3 variables, y de 4
    for (const n of [1, 2, 3]) for (let f = 0; f < 2 ** (1 << n); f++) {
      const mt = []; for (let m = 0; m < 1 << n; m++) if ((f >> m) & 1) mt.push(m);
      probar(mt, n, true);
    }
    // al azar de 5 y 6 variables (exacta), de 7 y 8 sólo equivalencia
    for (const [n, cuantas, exacta] of [[4, 600, true], [5, 150, true], [6, 40, true], [7, 15, false]])
      for (let k = 0; k < cuantas; k++) {
        const dens = rnd(); const mt = []; for (let m = 0; m < 1 << n; m++) if (rnd() < dens) mt.push(m);
        probar(mt, n, exacta);
      }
    // nombres de entradas de verdad (varias letras, que empiezan igual)
    for (let k = 0; k < 60; k++) {
      const mt = []; for (let m = 0; m < 16; m++) if (rnd() < 0.5) mt.push(m);
      probar(mt, 4, true, ["A", "A1", "Cin", "B"]);
    }
    return { pruebas, fallas, nfallas: fallas.length };
  });
  expect(r.fallas).toEqual([]);
  expect(errores).toEqual([]);
});

test("circuitos al azar: la tabla y la expresión que se muestran son las del circuito", async ({ page }) => {
  const errores = await abrir(page, "simulador-logico.html");
  const r = await page.evaluate(() => {
    const fallas = []; let pruebas = 0;
    let semilla = 4242; const rnd = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
    const elegir = (a) => a[Math.floor(rnd() * a.length)];
    const REF = {
      and: v => v.every(x => x) ? 1 : 0, or: v => v.some(x => x) ? 1 : 0,
      nand: v => v.every(x => x) ? 0 : 1, nor: v => v.some(x => x) ? 0 : 1,
      xor: v => v.reduce((a, b) => a ^ b, 0), xnor: v => 1 - v.reduce((a, b) => a ^ b, 0),
      not: v => 1 - v[0], buf: v => v[0],
    };
    const limpiar = () => { S.nodes = []; S.wires = []; S.sel = []; S.selW = []; VAL = new Map(); uidc = 1; };
    const cable = (a, pa, b, pb) => S.wires.push({ id: uid("w"), from: { id: a.id, pin: pa }, to: { id: b.id, pin: pb }, variant: 0 });
    // lee la ventana: nombres de las columnas, filas y expresiones tal como se ven
    function leerVentana() {
      mostrarTabla();
      const body = document.getElementById("tt-body");
      const th = Array.from(body.querySelectorAll("th")).map(t => t.textContent);
      const filas = Array.from(body.querySelectorAll("tbody tr")).map(tr => Array.from(tr.querySelectorAll("td")).map(td => td.textContent));
      const exprs = Array.from(body.querySelectorAll(".expr")).map(e => e.textContent);
      document.getElementById("ov-truth").classList.remove("show");
      return { th, filas, exprs };
    }
    function evaluarExpr(expr, nombres, valores) {
      if (expr === "0") return 0; if (expr === "1") return 1;
      return expr.split(" + ").some(t => {
        if (t === "1") return true;
        let s = t, ok = true;
        while (s.length) {
          const nom = nombres.filter(x => s.startsWith(x)).sort((a, b) => b.length - a.length)[0];
          if (!nom) throw new Error("no entiendo «" + t + "»");
          s = s.slice(nom.length);
          let neg = false; if (s[0] === "′") { neg = true; s = s.slice(1); }
          const v = valores[nombres.indexOf(nom)];
          if ((neg ? 1 - v : v) !== 1) ok = false;
        }
        return ok;
      }) ? 1 : 0;
    }

    // ---- 1. cada compuerta con 1 a 5 entradas, girada al azar ----
    for (const tipo of Object.keys(REF)) for (const k of (tipo === "not" || tipo === "buf") ? [1] : [2, 3, 4, 5]) {
      limpiar(); pruebas++;
      const ins = Array.from({ length: k }, (_, i) => { const n = makeNode("in", 0, i * 60, { label: "E" + i }); S.nodes.push(n); return n; });
      const g = makeNode(tipo, 200, 100, k > 2 ? { pins: k } : {}); g.rot = elegir([0, 90, 180, 270]); S.nodes.push(g);
      const o = makeNode("out", 400, 100, { label: "S" }); S.nodes.push(o);
      ins.forEach((n, i) => cable(n, "o0", g, i)); cable(g, "o0", o, 0);
      render();
      const tt = truthTable();
      tt.rows.forEach(row => { const esp = REF[tipo](row.in); if (row.out[0] !== esp) fallas.push(`${tipo} ${k} entradas: con ${row.in.join("")} da ${row.out[0]}, debería ${esp}`); });
    }
    // ---- 2. sumadores: el bloque solo y en cascada ----
    for (const tipo of ["hadd", "fadd"]) {
      limpiar(); pruebas++;
      const k = tipo === "hadd" ? 2 : 3;
      const ins = Array.from({ length: k }, (_, i) => { const n = makeNode("in", 0, i * 60, { label: "ABC"[i] }); S.nodes.push(n); return n; });
      const s = makeNode(tipo, 200, 100); S.nodes.push(s);
      const oS = makeNode("out", 400, 60, { label: "S" }), oR = makeNode("out", 400, 160, { label: "R" }); S.nodes.push(oS, oR);
      ins.forEach((n, i) => cable(n, "o0", s, i)); cable(s, "o0", oS, 0); cable(s, "o1", oR, 0);
      render();
      truthTable().rows.forEach(row => { const suma = row.in.reduce((a, b) => a + b, 0);
        if (row.out[0] !== (suma & 1) || row.out[1] !== (suma >> 1)) fallas.push(`${tipo} con ${row.in.join("")}: S=${row.out[0]} R=${row.out[1]}, debería ${suma & 1} ${suma >> 1}`); });
    }
    for (const bits of [2, 3, 4]) {                  // sumador en cascada: A + B de `bits` bits
      limpiar(); pruebas++;
      const A = [], B = [], sal = [];
      for (let i = 0; i < bits; i++) { A.push(makeNode("in", 0, i * 50, { label: "A" + i })); B.push(makeNode("in", 0, 300 + i * 50, { label: "B" + i })); }
      S.nodes.push(...A, ...B);
      let acarreo = null;
      for (let i = 0; i < bits; i++) {
        const s = makeNode(i === 0 ? "hadd" : "fadd", 300 + (bits - i) * 160, 200); S.nodes.push(s);
        cable(A[i], "o0", s, 0); cable(B[i], "o0", s, 1);
        if (acarreo) cable(acarreo, "o1", s, 2);
        const o = makeNode("out", 300 + (bits - i) * 160, 60, { label: "S" + i }); S.nodes.push(o); cable(s, "o0", o, 0); sal.push(o);
        acarreo = s;
      }
      const oc = makeNode("out", 200, 60, { label: "C" }); S.nodes.push(oc); cable(acarreo, "o1", oc, 0); sal.push(oc);
      render();
      const tt = truthTable();
      const iA = tt.ins.map((n, k) => n.label);
      tt.rows.forEach(row => {
        const v = (pre) => row.in.reduce((acc, b, k) => iA[k].startsWith(pre) ? acc + (b << +iA[k].slice(1)) : acc, 0);
        const total = v("A") + v("B");
        const outs = tt.outs.map(o => o.label);
        const obt = row.out.reduce((acc, b, k) => acc + (b << (outs[k] === "C" ? bits : +outs[k].slice(1))), 0);
        if (obt !== total) fallas.push(`sumador de ${bits} bits: ${v("A")}+${v("B")} da ${obt}`);
      });
    }
    // ---- 3. circuitos combinacionales al azar ----
    for (let caso = 0; caso < 80; caso++) {
      limpiar(); pruebas++;
      const nIn = 1 + Math.floor(rnd() * 5), nG = 1 + Math.floor(rnd() * 9), nOut = 1 + Math.floor(rnd() * 3);
      const nombres = ["A", "B", "Cin", "D1", "D"].slice(0, nIn);
      const ins = nombres.map((nm, i) => { const n = makeNode("in", 0, i * 60, { label: nm }); S.nodes.push(n); return n; });
      const fuentes = ins.map(n => ({ n, pin: "o0", f: (v) => v[ins.indexOf(n)] }));
      for (let g = 0; g < nG; g++) {
        const tipo = elegir(["and", "or", "xor", "nand", "nor", "xnor", "not", "buf", "hadd", "fadd"]);
        const x = 200 + g * 120, y = Math.round(rnd() * 400);
        if (tipo === "hadd" || tipo === "fadd") {
          const k = tipo === "hadd" ? 2 : 3, b = makeNode(tipo, x, y); S.nodes.push(b);
          const ent = Array.from({ length: k }, () => elegir(fuentes));
          ent.forEach((s, i) => cable(s.n, s.pin, b, i));
          const suma = (v) => ent.reduce((a, s) => a + s.f(v), 0);
          fuentes.push({ n: b, pin: "o0", f: (v) => suma(v) & 1 }, { n: b, pin: "o1", f: (v) => suma(v) >> 1 });
        } else {
          const k = tipo === "not" || tipo === "buf" ? 1 : 2 + Math.floor(rnd() * 3);
          const gg = makeNode(tipo, x, y, k > 2 ? { pins: k } : {}); gg.rot = elegir([0, 0, 90, 180, 270]); S.nodes.push(gg);
          const ent = Array.from({ length: k }, () => elegir(fuentes));
          ent.forEach((s, i) => cable(s.n, s.pin, gg, i));
          fuentes.push({ n: gg, pin: "o0", f: (v) => REF[tipo](ent.map(s => s.f(v))) });
        }
      }
      const salidas = Array.from({ length: nOut }, (_, k) => {
        const s = elegir(fuentes.slice(nIn).length ? fuentes.slice(nIn) : fuentes);
        const o = makeNode("out", 1500, k * 80, { label: ["S", "Cout", "Y2"][k] }); S.nodes.push(o); cable(s.n, s.pin, o, 0);
        return { o, f: s.f };
      });
      ins.forEach(n => n.on = rnd() < 0.5);
      render();
      const tt = truthTable();
      // orden de columnas: entradas por x y luego y; todas en x=0, así que por y = orden de creación
      const orden = tt.ins.map(n => ins.indexOf(n));
      const v = (row) => { const val = new Array(nIn); row.in.forEach((b, k) => val[orden[k]] = b); return val; };
      const outsOrden = tt.outs.map(o => salidas.findIndex(s => s.o === o));
      tt.rows.forEach(row => row.out.forEach((b, k) => {
        const esp = salidas[outsOrden[k]].f(v(row));
        if (b !== esp) fallas.push(`circuito ${caso}: ${tt.outs[k].label} con ${row.in.join("")} da ${b}, debería ${esp}`);
      }));
      // lo que se ve en la ventana
      const w = leerVentana();
      const noms = tt.ins.map(n => n.label);
      if (w.filas.length !== 1 << nIn) fallas.push(`circuito ${caso}: la ventana muestra ${w.filas.length} filas`);
      w.filas.forEach((f, m) => {
        const row = tt.rows[m];
        f.slice(0, nIn).forEach((c, k) => { if (+c !== row.in[k]) fallas.push(`circuito ${caso}: fila ${m}, columna ${noms[k]} muestra ${c}`); });
        f.slice(nIn).forEach((c, k) => { if (c !== String(row.out[k])) fallas.push(`circuito ${caso}: fila ${m}, salida ${k} muestra ${c}, es ${row.out[k]}`); });
      });
      w.exprs.forEach((e, k) => {
        const m = /^(.*?) = (.*?)\s+Σm\((.*)\)$/.exec(e.replace(/ /g, " "));
        if (!m) { fallas.push(`circuito ${caso}: no entiendo la expresión «${e}»`); return; }
        if (m[1] !== tt.outs[k].label) fallas.push(`circuito ${caso}: la expresión ${k} es de «${m[1]}»`);
        const mts = m[3] === "—" ? [] : m[3].split(",").map(Number);
        tt.rows.forEach(row => {
          const val = evaluarExpr(m[2].trim(), noms, row.in);
          if (val !== row.out[k]) fallas.push(`circuito ${caso}: ${m[1]} = ${m[2].trim()} da ${val} con ${row.in.join("")}, la tabla dice ${row.out[k]}`);
          if (mts.includes(row.m) !== (row.out[k] === 1)) fallas.push(`circuito ${caso}: Σm de ${m[1]} no coincide en m=${row.m}`);
        });
      });
    }
    // ---- 4. biestables ----
    const LIBRO = {   // tabla característica: (datos, q) -> q+  (null = prohibido/indefinido)
      rs: (d, q) => d[0] && d[1] ? null : d[0] ? 1 : d[1] ? 0 : q,
      jk: (d, q) => d[0] && d[1] ? 1 - q : d[0] ? 1 : d[1] ? 0 : q,
      d: (d) => d[0], t: (d, q) => d[0] ? 1 - q : q,
    };
    const EXC = {     // excitación de libro: transición q→q+ -> patrón de entradas
      jk: { "00": "0X", "01": "1X", "10": "X1", "11": "X0" },
      rs: { "00": "0X", "01": "10", "10": "01", "11": "X0" },
      d: { "00": "0", "01": "1", "10": "0", "11": "1" },
      t: { "00": "0", "01": "1", "10": "1", "11": "0" },
    };
    for (const kind of ["rs", "jk", "d", "t"]) {
      pruebas++;
      const n = makeNode("ff:" + kind, 0, 0);
      const tab = tablaDe(n), dd = datosDe(n).length;
      for (let k = 0; k < tab.length; k++) {
        const q = k & 1, bits = k >> 1, datos = Array.from({ length: dd }, (_, i) => (bits >> (dd - 1 - i)) & 1);
        const esp = LIBRO[kind](datos, q);
        if (tab[k] !== esp) fallas.push(`${kind}: con datos ${datos.join("")} y Q=${q} la tabla dice ${tab[k]}, el libro ${esp}`);
      }
      excitacion(n).forEach(f => { const clave = "" + f.q + f.qn, pat = f.patron.join("");
        if (pat !== EXC[kind][clave]) fallas.push(`${kind}: excitación ${f.q}→${f.qn} da ${pat}, el libro ${EXC[kind][clave]}`); });
    }
    // contador del ejemplo: cada pulso suma 1 (Q1 Q0)
    cargarEjemplo("cont"); render(); pruebas++;
    const P = S.nodes.find(n => n.type === "clk"), q0 = S.nodes.find(n => n.label === "Q0"), q1 = S.nodes.find(n => n.label === "Q1");
    const cuenta = () => (valorDe(q1.id) ? 2 : 0) + (valorDe(q0.id) ? 1 : 0);
    const vistos = [cuenta()];
    for (let k = 0; k < 8; k++) { P.on = true; render(); P.on = false; render(); vistos.push(cuenta()); }
    const espc = vistos.map((_, k) => (vistos[0] + k) % 4);
    if (vistos.join() !== espc.join()) fallas.push(`contador: cuenta ${vistos.join(",")}`);
    // registro D: copia D sólo en el flanco
    cargarEjemplo("regd"); render(); pruebas++;
    const D = S.nodes.find(n => n.label === "D"), C = S.nodes.find(n => n.type === "clk"), Q = S.nodes.find(n => n.label === "Q"), Qn = S.nodes.find(n => n.label === "Qneg");
    for (const d of [1, 0, 1, 1, 0]) {
      const antes = valorDe(Q.id);
      D.on = !!d; render();
      if (valorDe(Q.id) !== antes) fallas.push("registro D: cambió sin flanco");
      C.on = true; render(); C.on = false; render();
      if (valorDe(Q.id) !== !!d || valorDe(Qn.id) === valorDe(Q.id)) fallas.push(`registro D: tras el flanco con D=${d} Q=${valorDe(Q.id)} Q̄=${valorDe(Qn.id)}`);
    }
    // latch SR con NOR: guarda el estado
    cargarEjemplo("latch"); render(); pruebas++;
    const R = S.nodes.find(n => n.label === "R"), Sx = S.nodes.find(n => n.label === "S" && n.type === "in"), QL = S.nodes.find(n => n.label === "Q");
    Sx.on = true; render(); Sx.on = false; render();
    if (!valorDe(QL.id)) fallas.push("latch: después de S queda Q=0");
    R.on = true; render(); R.on = false; render();
    if (valorDe(QL.id)) fallas.push("latch: después de R queda Q=1");
    if (OSC) fallas.push("latch: dice que oscila");
    return { pruebas, nfallas: fallas.length, fallas };
  });
  expect(r.fallas).toEqual([]);
  expect(errores).toEqual([]);
});

test("biestables con reloj siguen al modelo de libro", async ({ page }) => {
  const errores = await abrir(page, "simulador-logico.html");
  const r = await page.evaluate(() => {
    const fallas = []; let pasos = 0;
    let semilla = 31337; const rnd = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
    const LIBRO = {
      rs: (d, q) => d[0] && d[1] ? q : d[0] ? 1 : d[1] ? 0 : q,     // S=R=1 prohibido: el circuito retiene
      jk: (d, q) => d[0] && d[1] ? 1 - q : d[0] ? 1 : d[1] ? 0 : q,
      d: (d) => d[0], t: (d, q) => d[0] ? 1 - q : q,
    };
    for (const kind of ["rs", "jk", "d", "t", "custom"]) for (let rep = 0; rep < 5; rep++) {
      S.nodes = []; S.wires = []; S.sel = []; S.selW = []; VAL = new Map(); uidc = 1;
      const ff = makeNode("ff:" + kind, 300, 200); S.nodes.push(ff);
      let modelo = LIBRO[kind];
      if (kind === "custom") {                       // tabla al azar: cada fila 0, 1 o indefinido (retiene)
        const tab = tablaDe(ff).map(() => [0, 1, null][Math.floor(rnd() * 3)]); ff.tabla = tab;
        modelo = (d, q) => { const v = tab[(d[0] << 1) | q]; return v === null ? q : v; };
      }
      const datos = datosDe(ff), ic = clkDe(ff);
      const ins = datos.map((i, k) => { const n = makeNode("in", 0, k * 60, { label: "D" + k }); S.nodes.push(n);
        S.wires.push({ id: uid("w"), from: { id: n.id, pin: "o0" }, to: { id: ff.id, pin: i }, variant: 0 }); return n; });
      const clk = makeNode("in", 0, 300, { label: "CK" }); S.nodes.push(clk);
      S.wires.push({ id: uid("w"), from: { id: clk.id, pin: "o0" }, to: { id: ff.id, pin: ic }, variant: 0 });
      const q = makeNode("out", 500, 150, { label: "Q" }), qn = makeNode("out", 500, 250, { label: "Qn" }); S.nodes.push(q, qn);
      S.wires.push({ id: uid("w"), from: { id: ff.id, pin: "o0" }, to: { id: q.id, pin: 0 }, variant: 0 });
      S.wires.push({ id: uid("w"), from: { id: ff.id, pin: "o1" }, to: { id: qn.id, pin: 0 }, variant: 0 });
      render();
      let esperado = ff.q ? 1 : 0;
      for (let k = 0; k < 60; k++) {
        pasos++;
        const v = datos.map(() => rnd() < 0.5 ? 1 : 0);
        ins.forEach((n, i) => n.on = !!v[i]); render();
        if ((valorDe(q.id) ? 1 : 0) !== esperado) fallas.push(`${kind}: cambió sin flanco (paso ${k})`);
        clk.on = true; render();
        esperado = modelo(v, esperado);
        const Q = valorDe(q.id) ? 1 : 0, QN = valorDe(qn.id) ? 1 : 0;
        if (Q !== esperado || QN !== 1 - esperado) fallas.push(`${kind}: con ${v.join("")} quedó Q=${Q} Q̄=${QN}, el modelo ${esperado}`);
        clk.on = false; render();
        if ((valorDe(q.id) ? 1 : 0) !== esperado) fallas.push(`${kind}: cambió en el flanco de bajada`);
      }
    }
    // D sin reloj: sigue a D todo el tiempo (latch transparente)
    S.nodes = []; S.wires = []; VAL = new Map(); uidc = 1;
    const ff = makeNode("ff:d-sin", 300, 200), d = makeNode("in", 0, 0, { label: "D" }), q = makeNode("out", 500, 200, { label: "Q" });
    S.nodes.push(ff, d, q);
    S.wires.push({ id: uid("w"), from: { id: d.id, pin: "o0" }, to: { id: ff.id, pin: 0 }, variant: 0 }, { id: uid("w"), from: { id: ff.id, pin: "o0" }, to: { id: q.id, pin: 0 }, variant: 0 });
    for (const v of [1, 0, 0, 1, 1, 0]) { d.on = !!v; render(); pasos++; if ((valorDe(q.id) ? 1 : 0) !== v) fallas.push("D sin reloj no sigue a D"); }
    return { pasos, nfallas: fallas.length, fallas };
  });
  expect(r.fallas).toEqual([]);
  expect(errores).toEqual([]);
});

test("las ecuaciones de los bloques se dibujan con el mismo valor que lo escrito", async ({ page }) => {
  const errores = await abrir(page, "diagrama-bloque.html");
  const r = await page.evaluate(() => {
    const fallas = []; let pruebas = 0;
    const GRIEGAS = { omega: 1, zeta: 1, tau: 1, alpha: 1, beta: 1, pi: 1, sigma: 1, theta: 1 };
    let semilla = 777; const rnd = () => (semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648;
    const vals = {};
    const valor = (nombre) => { if (!(nombre in vals)) vals[nombre] = 0.3 + rnd() * 1.7; return vals[nombre]; };

    /* ---- intérprete propio del texto escrito ----
       Convenciones (las de la ayuda): el número pegado a un nombre de hasta 2 letras que no sea s
       es subíndice (G1 = G_1); _x subíndice; ^ potencia; \frac{a}{b}; \omega etc. son nombres;
       la multiplicación implícita vale lo mismo que · y todo es asociativo a izquierda. */
    function interpretar(src) {
      const s = src; let i = 0;
      const blanco = () => { while (i < s.length && /\s/.test(s[i])) i++; };
      const ver = () => { blanco(); return s[i]; };
      function expr() { let v = term(); for (;;) { const c = ver(); if (c === "+" || c === "-") { i++; const w = term(); v = c === "+" ? v + w : v - w; } else return v; } }
      function term() {
        let v = signo();
        for (;;) {
          const c = ver();
          if (c === "*" || c === "·" || c === "×") { i++; v *= signo(); }
          else if (c === "/") { i++; v /= signo(); }
          else if (c !== undefined && /[A-Za-z0-9(\[\\Α-Ωα-ω]/.test(c)) v *= potencia();
          else return v;
        }
      }
      function signo() { const c = ver(); if (c === "-") { i++; return -signo(); } if (c === "+") { i++; return signo(); } return potencia(); }
      function potencia() {
        let b = atomo();
        for (;;) {
          const c = ver();
          if (c === "^") { i++; b = Math.pow(b, llave()); }
          else if (c === "_") { i++; b = sub(b); }
          else return b;
        }
      }
      let ultimoNombre = null;
      function sub(b) {                              // el subíndice cambia el nombre: G_1 es otro símbolo
        const t = textoLlave();
        if (ultimoNombre === null) throw new Error("subíndice sin nombre");
        const nom = ultimoNombre + "_" + t; ultimoNombre = null;
        return b / valor(ultimoNombreOriginal) * valor(nom);
      }
      let ultimoNombreOriginal = null;
      function textoLlave() {
        blanco();
        if (s[i] === "{") { const j = s.indexOf("}", i); const t = s.slice(i + 1, j < 0 ? s.length : j); i = j < 0 ? s.length : j + 1; return t.replace(/\s/g, ""); }
        const m = /^(\\[A-Za-z]+|[0-9]+(\.[0-9]+)?|[A-Za-zΑ-Ωα-ω])/.exec(s.slice(i)); if (!m) return ""; i += m[0].length; return m[0].replace(/^\\/, "");
      }
      function llave() {
        blanco();
        if (s[i] === "{") { i++; const v = expr(); blanco(); if (s[i] === "}") i++; return v; }
        // sin llaves: un átomo con su signo; de un nombre, sólo la primera letra
        let neg = 1; for (;;) { const c = ver(); if (c === "-") { neg = -neg; i++; } else if (c === "+") i++; else break; }
        blanco();
        if (/[A-Za-zΑ-Ωα-ω]/.test(s[i] || "") && /[A-Za-zΑ-Ωα-ω]/.test(s[i + 1] || "")) { const nom = s[i++]; ultimoNombre = ultimoNombreOriginal = nom; return neg * valor(nom); }
        return neg * atomo();
      }
      function atomo() {
        blanco(); const c = s[i];
        if (c === "(" || c === "[") { i++; const v = expr(); blanco(); if (s[i] === ")" || s[i] === "]") i++; ultimoNombre = null; return v; }
        if (c === "\\") {
          const m = /^\\([A-Za-z]+)/.exec(s.slice(i)); i += m[0].length;
          if (m[1] === "frac") { const a = llave(), b = llave(); ultimoNombre = null; return a / b; }
          const nom = SIMBOLOS[m[1]] ? "\\" + m[1] : m[1];          // un comando desconocido se escribe tal cual
          ultimoNombre = ultimoNombreOriginal = nom; return valor(nom);
        }
        let m = /^[0-9]+(\.[0-9]+)?/.exec(s.slice(i));
        if (m) { i += m[0].length; ultimoNombre = null; return +m[0]; }
        m = /^[A-Za-zΑ-Ωα-ω]+/.exec(s.slice(i));
        if (m) {
          i += m[0].length; let nom = m[0];
          const d = /^[0-9]+(?!\.)/.exec(s.slice(i));
          if (d && nom.length <= 2 && nom.toLowerCase() !== "s" && s[i + d[0].length] !== ".") { i += d[0].length; nom = nom + "_" + d[0]; }
          ultimoNombre = ultimoNombreOriginal = nom; return valor(nom);
        }
        throw new Error("no entiendo «" + s.slice(i) + "»");
      }
      const v = expr(); blanco();
      if (i < s.length) throw new Error("sobra «" + s.slice(i) + "»");
      return v;
    }
    /* ---- valor del árbol que arma la app (lo que se dibuja) ---- */
    function valorArbol(items) {
      // se arma un texto equivalente con nombres explícitos y se evalúa con el mismo intérprete
      const txt = (its) => {
        let out = "";
        for (let k = 0; k < its.length; k++) {
          const it = its[k];
          if (it.t === "run") {
            const prev = out.slice(-1);
            if (/^[0-9.]+$/.test(it.s)) out += (prev && /[A-Za-z0-9)}_]/.test(prev) ? "*" : "") + it.s;
            else { const nom = Object.keys(SIMBOLOS).find(x => SIMBOLOS[x] === it.s); out += (prev && /[A-Za-z0-9)}]/.test(prev) ? "*" : "") + (nom ? "\\" + nom : it.s); }
          }
          else if (it.t === "op") out += it.s === "−" ? "-" : it.s === "·" ? "*" : it.s;
          else if (it.t === "sub") out += "_{" + plano(it.items) + "}";
          else if (it.t === "sup") out += "^{" + txt(it.items) + "}";
          else if (it.t === "frac") out += (/[A-Za-z0-9)}]/.test(out.slice(-1)) ? "*" : "") + "\\frac{" + txt(it.num) + "}{" + txt(it.den) + "}";
          else if (it.t === "grupo") out += (/[A-Za-z0-9)}]/.test(out.slice(-1)) ? "*" : "") + "(" + txt(it.items) + ")";
        }
        return out;
      };
      const plano = (its) => its.map(it => it.t === "run" ? it.s : it.items ? plano(it.items) : "").join("");
      const t = txt(items);
      return { v: interpretar(t), t };
    }
    // del texto del dibujo: todo lo que aparece escrito, en orden
    const textoDibujado = (g) => Array.from(g.querySelectorAll("text")).map(t => t.textContent).join("");

    const CASOS = ["G1", "G_1", "K/(s+1)", "(G_2/H_1)*(G_4/H_2)", "a*g_1/(b*h_1+1)/(h_2+1)", "\\frac{a}{b}", "s^2", "\\omega_n",
      "1/(s^2+2*\\zeta*\\omega_n*s+\\omega_n^2)", "K*(s+2)/(s*(s+1)*(s+5))", "e^-sT", "e^{-sT}", "s^-1", "10/(s+1)^2",
      "2s+1", "(s+1)(s+2)", "G1G2/(1+G1H1)", "-K/s", "1/(1+1/s)", "a/b/c", "a/b*c", "(a+b)/(c-d)", "x^{n+1}", "K_p+K_i/s+K_d*s",
      "\\tau s+1", "\\frac{1}{\\tau s+1}", "[1/(s+1)]", "1-(G1+G2)/(1+H)", "s^2/(s^2+1)", "3.5/(0.2s+1)", "G1*G2*G3", "a(b+c)", "a/(b(c+d))"];
    // y expresiones al azar
    const piezas = ["G1", "H2", "K", "s", "a", "b", "2", "3.5", "\\omega_n", "\\tau", "G_3"];
    const azar = (prof) => {
      const r = rnd();
      if (prof <= 0 || r < 0.3) return piezas[Math.floor(rnd() * piezas.length)];
      if (r < 0.45) return "(" + azar(prof - 1) + "+" + azar(prof - 1) + ")";
      if (r < 0.6) return azar(prof - 1) + "/" + azar(prof - 1);
      if (r < 0.7) return azar(prof - 1) + "*" + azar(prof - 1);
      if (r < 0.78) return "(" + azar(prof - 1) + "-" + azar(prof - 1) + ")";
      if (r < 0.86) return "s^" + (rnd() < 0.5 ? "2" : "{" + azar(prof - 2) + "}");
      if (r < 0.93) return "\\frac{" + azar(prof - 1) + "}{" + azar(prof - 1) + "}";
      return azar(prof - 1) + azar(prof - 1).replace(/^[0-9.]+/, "K").replace(/^\\/, "K\\");
    };
    for (let k = 0; k < 300; k++) CASOS.push(azar(5));

    S.nodes = []; S.edges = []; S.sel = []; S.selEdges = []; uidc = 1;
    for (const src of CASOS) {
      pruebas++;
      for (const k in vals) delete vals[k];
      let esperado, obtenido;
      try { esperado = interpretar(src); } catch (e) { fallas.push(`«${src}»: mi intérprete no lo entiende (${e.message})`); continue; }
      try { obtenido = valorArbol(analizar(src)); } catch (e) { fallas.push(`«${src}»: el árbol no se puede evaluar (${e.message})`); continue; }
      if (!isFinite(esperado) || Math.abs(esperado) > 1e12) { pruebas--; continue; }   // división por cero en el caso generado
      if (!(Math.abs(obtenido.v - esperado) <= 1e-9 * Math.max(1, Math.abs(esperado))))
        fallas.push(`«${src}» se dibuja como «${obtenido.t}»: vale ${obtenido.v}, debería ${esperado}`);
      // dibujado en un bloque: nada sale del rectángulo, y no se pierden caracteres
      const n = makeNode("block", 0, 0, { label: src }); S.nodes = [n]; S.edges = []; render();
      const g = document.querySelector(`[data-id="${n.id}"]`);
      const caja = g.querySelector("rect.n-shape").getBBox(), dentro = Array.from(g.children).filter(e => e.tagName !== "rect");
      const tot = dentro.reduce((b, e) => { const q = e.getBBox(); return { l: Math.min(b.l, q.x), r: Math.max(b.r, q.x + q.width), t: Math.min(b.t, q.y), b: Math.max(b.b, q.y + q.height) }; }, { l: 1e9, r: -1e9, t: 1e9, b: -1e9 });
      if (tot.l < caja.x - 0.5 || tot.r > caja.x + caja.width + 0.5 || tot.t < caja.y - 0.5 || tot.b > caja.y + caja.height + 0.5)
        fallas.push(`«${src}»: el texto se sale del bloque (${JSON.stringify(tot)} vs ${JSON.stringify(caja)})`);
      const escrito = textoDibujado(g).replace(/\s/g, "");
      const letras = src.replace(/\\(frac)/g, "").replace(/\\([A-Za-z]+)/g, (m, c) => SIMBOLOS[c] || c).replace(/[\s{}()\[\]*·×^_\/+\-−]/g, "");
      const dib = escrito.replace(/[()\[\]+\-−·]/g, "");
      if (letras.split("").sort().join("") !== dib.split("").sort().join("")) fallas.push(`«${src}»: se escribe «${escrito}», faltan o sobran caracteres`);
    }
    return { pruebas, nfallas: fallas.length, fallas };
  });
  expect(r.fallas).toEqual([]);
  expect(errores).toEqual([]);
});
