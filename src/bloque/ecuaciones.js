/* ===================================================================
   Tipógrafo de ecuaciones para el interior de los bloques.
   Analizador con precedencia real, así que las barras de fracción se
   arman a cualquier profundidad de paréntesis:
     G1                      G_1
     K/(s+1)                 fracción apilada
     (G_2/H_1)*(G_4/H_2)     dos fracciones multiplicadas
     a*g_1/(b*h_1+1)/(h_2+1) una sola fracción: arriba a·g_1, abajo el producto
     \frac{a}{b}  s^2  \omega_n
   =================================================================== */
const SIMBOLOS = { alpha:"α",beta:"β",gamma:"γ",delta:"δ",epsilon:"ε",zeta:"ζ",eta:"η",
  theta:"θ",kappa:"κ",lambda:"λ",mu:"μ",nu:"ν",xi:"ξ",pi:"π",rho:"ρ",sigma:"σ",tau:"τ",
  phi:"φ",chi:"χ",psi:"ψ",omega:"ω",Gamma:"Γ",Delta:"Δ",Theta:"Θ",Lambda:"Λ",Xi:"Ξ",
  Pi:"Π",Sigma:"Σ",Phi:"Φ",Psi:"Ψ",Omega:"Ω",infty:"∞",pm:"±",mp:"∓",cdot:"·",times:"×",
  le:"≤",ge:"≥",ne:"≠",approx:"≈",sqrt:"√",int:"∫",partial:"∂",to:"→" };

/* ---------- 1. de texto a fichas ---------- */
function fichas(src) {
  const s = String(src == null ? "" : src), t = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "\\") {
      const m = /^\\([A-Za-z]+)/.exec(s.slice(i));
      if (m) { t.push({ k: "cmd", v: m[1] }); i += m[0].length; continue; }
      i++; continue;
    }
    if (/[0-9]/.test(c)) { const m = /^[0-9]+(\.[0-9]+)?/.exec(s.slice(i)); t.push({ k: "num", v: m[0] }); i += m[0].length; continue; }
    if (/[A-Za-zΑ-Ωα-ω]/.test(c)) { const m = /^[A-Za-zΑ-Ωα-ω]+/.exec(s.slice(i)); t.push({ k: "id", v: m[0] }); i += m[0].length; continue; }
    t.push({ k: "op", v: c }); i++;
  }
  return t;
}

/* ---------- 2. de fichas a árbol ---------- */
const MULT = ["*", "·", "×"];
function analizar(src) {
  const tk = fichas(src);
  let p = 0;
  const ficha = () => tk[p];
  const esOp = (...vs) => tk[p] && tk[p].k === "op" && vs.indexOf(tk[p].v) >= 0;

  function expr() {                                   // sumas, restas y comparaciones
    let items = termino();
    while (esOp("+", "-", "=", "<", ">", "≤", "≥", "≠", ",")) {
      const op = tk[p++].v;
      const der = termino();
      items = items.concat([{ t: "op", s: op === "-" ? "−" : op, esp: op === "," ? 0 : .24 }], der);
    }
    return items;
  }
  function termino() {                                // productos y divisiones
    const f0 = factor();
    if (!f0) return [];
    const facs = [{ op: "ini", items: f0 }];
    for (;;) {
      if (esOp.apply(null, MULT.concat(["/"]))) {
        const op = tk[p++].v;
        const g = factor();
        if (!g) break;
        facs.push({ op: op === "/" ? "/" : "·", items: g });
      } else if (empiezaAtomo()) {                    // multiplicación implícita: s(s+1), 2s
        const g = factor();
        if (!g) break;
        facs.push({ op: "imp", items: g });
      } else break;
    }
    if (!facs.some(f => f.op === "/")) return producto(facs);
    // a/b/c es lo mismo que a/(b·c): una sola fracción, mucho más legible
    const arriba = facs.filter(f => f.op !== "/"), abajo = facs.filter(f => f.op === "/");
    return [{ t: "frac", num: producto(arriba, true), den: producto(abajo, true) }];
  }
  function producto(facs, solos) {
    let out = [];
    facs.forEach((f, i) => {
      if (i > 0 && f.op !== "imp") out.push({ t: "op", s: "·", esp: .14 });
      out = out.concat(desnudar(f.items, solos && facs.length === 1));
    });
    return out;
  }
  function factor() {
    if (esOp("-", "+")) {                             // signo delante
      const sg = tk[p++].v;
      const r = factor();
      return [{ t: "op", s: sg === "-" ? "−" : "+", esp: 0 }].concat(r || []);
    }
    let base = atomo();
    if (!base) return null;
    while (esOp("^", "_")) {
      const op = tk[p++].v;
      base = base.concat([{ t: op === "^" ? "sup" : "sub", items: llave() }]);
    }
    return base;
  }
  /* Lo que va en un exponente o un subíndice. Entre llaves, cualquier cosa. Sin llaves, como en
     LaTeX: un átomo con su signo (s^-1 es s elevado a −1, no s elevado a nada) y, de un nombre, sólo
     la primera letra (\omega_ns es ω_n·s; para varias letras, H_{ent}). */
  function llave() {
    if (esOp("{")) { p++; const e = expr(); if (esOp("}")) p++; return e; }
    if (esOp("-", "+")) {
      const sg = tk[p++].v;
      return [{ t: "op", s: sg === "-" ? "−" : "+", esp: 0 }].concat(llave());
    }
    const t = ficha();
    if (t && t.k === "id" && t.v.length > 1) {        // el resto del nombre sigue afuera
      tk[p] = { k: "id", v: t.v.slice(1) };
      return [{ t: "run", s: t.v[0] }];
    }
    return atomo() || [];
  }
  function atomo() {
    const t = ficha();
    if (!t) return null;
    if (t.k === "op" && (t.v === "(" || t.v === "[")) {
      const cierra = t.v === "(" ? ")" : "]";
      p++;
      const dentro = expr();
      if (esOp(cierra)) p++;                          // si falta el cierre, no pasa nada
      return [{ t: "grupo", items: dentro, izq: t.v, der: cierra }];
    }
    if (t.k === "num") { p++; return [{ t: "run", s: t.v }]; }
    if (t.k === "id") {
      p++;
      const items = [{ t: "run", s: t.v }];
      // G1 → G con subíndice 1 (la s de Laplace queda como está: para s² se escribe s^2)
      if (tk[p] && tk[p].k === "num" && t.v.length <= 2 && t.v.toLowerCase() !== "s" && tk[p].v.indexOf(".") < 0) {
        items.push({ t: "sub", items: [{ t: "run", s: tk[p].v }] }); p++;
      }
      return items;
    }
    if (t.k === "cmd") {
      p++;
      if (t.v === "frac") { const a = llave(), b = llave(); return [{ t: "frac", num: desnudar(a, true), den: desnudar(b, true) }]; }
      return [{ t: "run", s: SIMBOLOS[t.v] || t.v }];
    }
    if (t.k === "op" && "+-*/^_(){}[]".indexOf(t.v) < 0) { p++; return [{ t: "run", s: t.v }]; }
    p++; return null;                                 // ficha suelta que no encaja: la salteo
  }
  function empiezaAtomo() {
    const t = ficha();
    if (!t) return false;
    return t.k === "id" || t.k === "num" || t.k === "cmd" || t.v === "(" || t.v === "[";
  }
  const r = expr();
  return r.length ? r : [];
}
/* paréntesis que sobran: los que envuelven todo un numerador, o los de una
   fracción suelta dentro de un producto */
function desnudar(items, siempre) {
  if (items.length === 1 && items[0].t === "grupo") {
    const dentro = items[0].items;
    if (siempre) return dentro;
    if (dentro.length === 1 && dentro[0].t === "frac") return dentro;
  }
  return items;
}

/* ---------- 3. medición del texto en el propio SVG ---------- */
let _mt = null; const _mcache = new Map();
function anchoTexto(str, fs) {
  const k = fs + "|" + str;
  if (_mcache.has(k)) return _mcache.get(k);
  if (!_mt) {
    _mt = el("text", { class: "n-math" }, document.getElementById("gMeasure"));
    _mt.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve");
  }
  _mt.setAttribute("font-size", fs);
  _mt.textContent = str;
  let w = 0;
  try { w = _mt.getComputedTextLength(); } catch (e) { w = str.length * fs * .55; }
  if (!w && str) w = str.length * fs * .55;
  _mcache.set(k, w);
  return w;
}

/* ---------- 4. del árbol a cajas con alto y ancho ---------- */
function cajaFila(items, fs) {
  const cajas = (items || []).map(it => cajaDe(it, fs));
  const w = cajas.reduce((a, c) => a + c.w, 0);
  const up = Math.max.apply(null, [fs * .55].concat(cajas.map(c => c.up)));
  const down = Math.max.apply(null, [fs * .45].concat(cajas.map(c => c.down)));
  return { w, up, down, draw(g, x, y) { let cx = x; for (const c of cajas) { c.draw(g, cx, y); cx += c.w; } } };
}
function cajaDe(it, fs) {
  if (it.t === "run" || it.t === "op") {
    const esp = it.t === "op" ? (it.esp === undefined ? .18 : it.esp) * fs : 0;
    const w = anchoTexto(it.s, fs);
    return { w: w + esp * 2, up: fs * .55, down: fs * .45, draw(g, x, y) {
      const t = el("text", { class: "n-math", x: x + esp, y, "font-size": fs }, g);
      t.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve");
      t.textContent = it.s;
    } };
  }
  if (it.t === "sup" || it.t === "sub") {
    const f2 = fs * .72, dentro = cajaFila(it.items, f2);
    const dy = it.t === "sup" ? -fs * .34 : fs * .28;
    // lo de adentro puede ser alto (una fracción en el exponente): la caja lo cubre entero
    return { w: dentro.w + fs * .04,
      up: it.t === "sup" ? -dy + dentro.up : Math.max(fs * .55, -dy + dentro.up),
      down: it.t === "sub" ? dy + dentro.down : Math.max(fs * .45, dy + dentro.down),
      draw(g, x, y) { dentro.draw(g, x, y + dy); } };
  }
  if (it.t === "frac") {
    const num = cajaFila(it.num, fs), den = cajaFila(it.den, fs);
    const pad = Math.max(4, fs * .28), hueco = fs * .30;
    const w = Math.max(num.w, den.w) + pad * 2;
    return { w, up: hueco + num.down + num.up, down: hueco + den.up + den.down,
      draw(g, x, y) {
        el("line", { class: "n-bar", x1: x + 1.5, y1: y, x2: x + w - 1.5, y2: y }, g);
        num.draw(g, x + (w - num.w) / 2, y - hueco - num.down);
        den.draw(g, x + (w - den.w) / 2, y + hueco + den.up);
      } };
  }
  if (it.t === "grupo") {
    const dentro = cajaFila(it.items, fs);
    const alto = dentro.up + dentro.down;
    const estirar = alto > fs * 1.5;                  // si adentro hay una fracción, crecen
    const pw = estirar ? Math.max(fs * .24, alto * .075) : anchoTexto(it.izq, fs);
    const up = estirar ? dentro.up + 1.5 : Math.max(dentro.up, fs * .58);
    const down = estirar ? dentro.down + 1.5 : Math.max(dentro.down, fs * .48);
    return { w: dentro.w + pw * 2 + fs * .08, up, down,
      draw(g, x, y) {
        const xd = x + pw + fs * .04;
        dentro.draw(g, xd, y);
        if (!estirar) {
          for (const [s, px] of [[it.izq, x], [it.der, xd + dentro.w + fs * .04]]) {
            const t = el("text", { class: "n-math", x: px, y, "font-size": fs }, g);
            t.textContent = s;
          }
        } else {
          const t = y - up, b = y + down, xr = xd + dentro.w + fs * .04;
          if (it.izq === "(") {
            el("path", { class: "n-paren", d: `M ${x + pw} ${t} Q ${x - pw} ${y} ${x + pw} ${b}` }, g);
            el("path", { class: "n-paren", d: `M ${xr} ${t} Q ${xr + 2 * pw} ${y} ${xr} ${b}` }, g);
          } else {
            el("path", { class: "n-paren", d: `M ${x + pw} ${t} H ${x} V ${b} H ${x + pw}` }, g);
            el("path", { class: "n-paren", d: `M ${xr} ${t} H ${xr + pw} V ${b} H ${xr}` }, g);
          }
        }
      } };
  }
  return { w: 0, up: fs * .55, down: fs * .45, draw() {} };
}
const _bcache = new Map();
function cajaEtiqueta(label, fs) {
  const k = fs + "|" + label;
  if (_bcache.has(k)) return _bcache.get(k);
  const b = cajaFila(analizar(label), fs);
  _bcache.set(k, b);
  return b;
}
function dibujarMath(g, label, fs, cx, cy) {
  if (!label) return;
  const b = cajaEtiqueta(label, fs);
  b.draw(g, cx - b.w / 2, cy + (b.up - b.down) / 2);
}
/* los bloques se agrandan solos para que la ecuación entre cómoda */
function actualizarTamaños() {
  for (const n of S.nodes) {
    if (n.type === "sum" || n.type === "node" || n.type === "marco") continue;
    const b = cajaEtiqueta(n.label, n.font);
    if (n.auto === false) continue;
    const esBloque = n.type === "block";
    const padX = esBloque ? 15 : 3, padY = esBloque ? 11 : 2;
    const w = Math.max(esBloque ? 56 : 12, Math.ceil((b.w + padX * 2) / 2) * 2);
    const h = Math.max(esBloque ? 38 : 14, Math.ceil((b.up + b.down + padY * 2) / 2) * 2);
    if (n.w !== w || n.h !== h) { n.w = w; n.h = h; }
  }
}
