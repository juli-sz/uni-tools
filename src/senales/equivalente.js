/* ======================= diagrama de bloques equivalente =======================
   El grafo y el diagrama de bloques dicen lo mismo de dos formas: un nodo con
   varias ramas que entran es un sumador, una rama con transmitancia distinta de 1
   es un bloque, y un nodo del que salen varias ramas es un punto de bifurcación.
   El resultado sale en el mismo formato que usa "Diagramas de bloques", así que
   el JSON se abre allá y se puede seguir editando. */
const MENOS = "−";
const aGrilla = (v) => Math.round(v / 20) * 20;
const ALTO_BLOQUE = 40, ANCHO_SUMA = 50, ALTO_SUMA = 50;
/* El aire se mide en cuadraditos de la grilla: uno entre cosas que van pegadas
   —el sumador y su bifurcación— y uno y medio a lo largo de la línea. */
const AIRE = 20, AIRE_X = 30;
const PISO_ARCO = 60;                          // primer nivel de arcos, contra la línea principal
/* Corre el bloque a lo largo de su tramo hasta encontrar un lugar donde no quede
   pegado a nada: arranca del medio y va probando para los dos lados. Devuelve null
   si en ese tramo no hay lugar, para que el que llama lo baje un nivel. */
function xLibre(bl, x1, x2, puestos) {
  const estorban = puestos.filter(e => Math.abs(e.y - bl.y) < (e.h + bl.h) / 2 + AIRE);
  const choca = (x) => estorban.some(e => Math.abs(e.x - x) < (e.w + bl.w) / 2 + AIRE);
  const centro = (x1 + x2) / 2, alcance = Math.max(0, (x2 - x1) / 2);
  for (let d = 0; d <= alcance; d += AIRE)
    for (const x of (d ? [centro - d, centro + d] : [centro]))
      if (!choca(aGrilla(x))) return aGrilla(x);
  return null;
}
/* Los bloques los redimensiona el editor de bloques según lo que digan, así que
   acá alcanza con estimar el ancho para dejarles el lugar. */
const anchoTextoAprox = (s, tam) => Math.max(26, trozosDeTexto(s)
  .reduce((a, p) => a + p.t.length * tam * (p.sub ? 0.45 : 0.62), 0));
/* La transmitancia como se ve en el bloque: si el destino es un sumador, el signo
   se lo queda el sumador y el bloque queda en positivo. */
function etiquetaDeRama(r, destino) {
  const g = String(r.g == null ? "1" : r.g).trim();
  return (destino && destino.type === "sum" && /^-/.test(g)) ? g.slice(1).trim() : g;
}
/* Por dónde sale y por dónde entra cada rama. La recta va por la línea principal;
   los arcos de ida —los prealimentados— por arriba, y los de vuelta por abajo.
   Esto es lo que decide en qué pata del sumador cae cada signo. */
function ladoDeRama(r) {
  if (r.de === r.a) return "b";
  const A = getNodo(r.de), B = getNodo(r.a);
  if (!A || !B) return "recto";
  if (!r.curva) return B.x >= A.x ? "recto" : "b";
  return B.x >= A.x ? "t" : "b";
}
function equivalenteEnBloques() {
  const nodes = [], edges = [];
  let c = 0;
  const nid = () => "bn" + (++c), eid = () => "be" + (++c);
  const entraEn = new Map(), saleDe = new Map();   // nodo del grafo -> dónde llega / de dónde sale
  const cadenaDe = new Map();                     // nodo del grafo -> sus elementos, de izquierda a derecha
  const destino = new Map();                      // rama que entra a un sumador -> { el, p }: a cuál y por qué pata

  // Vertical: sólo hace falta estirar si el grafo tiene nodos a distintas alturas
  let pasoY = Infinity;
  for (const a of S.nodos) for (const b of S.nodos)
    if (a !== b && Math.abs(a.y - b.y) > 1) pasoY = Math.min(pasoY, Math.abs(a.y - b.y));
  const escY = isFinite(pasoY) ? Math.max(1, (ALTO_SUMA + 2 * AIRE) / pasoY) : 1;
  const gy = (v) => aGrilla(v * escY);


  const agregar = (e) => { nodes.push(e); return e; };
  const unir = (A, pA, B, pB) =>
    edges.push({ id: eid(), from: { id: A.id, port: pA }, to: { id: B.id, port: pB }, variant: 0 });

  const enOrden = S.nodos.slice().sort((a, b) => a.x - b.x);
  for (const n of enOrden) {
    const ent = S.ramas.filter(r => r.a === n.id);
    const sal = S.ramas.filter(r => r.de === n.id);
    const base = () => ({ id: nid(), x: 0, y: gy(n.y), label: "", font: 14 });
    const io = () => agregar(Object.assign(base(),
      { type: "io", w: anchoTextoAprox(n.nombre, 14) + 12, h: 20, label: n.nombre }));
    /* Un sumador con las ramas que le tocan: cada una entra por la pata de su lado y deja
       ahí su signo. La pata derecha es la salida; si viene encadenado, la izquierda ya la usa
       el sumador anterior. */
    const sumador = (ramas, encadenado) => {
      const signos = { l: encadenado ? "+" : "", t: "", r: "", b: "" };
      const prefe = { recto: ["l", "t", "b"], t: ["t", "l", "b"], b: ["b", "l", "t"] };
      const el = agregar(Object.assign(base(),
        { type: "sum", w: ANCHO_SUMA, h: ALTO_SUMA, font: 13, signs: signos, cross: true }));
      for (const r of ramas) {
        const p = (prefe[ladoDeRama(r)] || prefe.recto).find(q => !signos[q]);
        signos[p] = /^\s*-/.test(String(r.g)) ? MENOS : "+";
        destino.set(r.id, { el, p });
      }
      return el;
    };
    let cadena;
    const autolazo = ent.some(r => r.de === n.id);
    if (n.tipo === "entrada" || !ent.length) {     // la entrada, o un nodo sin nada que le entre
      cadena = [io()];
    } else if (n.tipo === "salida" && ent.length === 1 && !autolazo) {
      cadena = [io()];                             // la salida con una sola rama: el rótulo y listo
    } else if (ent.length >= 2 || n.tipo === "salida") {
      /* Varias ramas entrando (o la salida con un autolazo): sumador. Entran tres por
         sumador; si son más, se encadenan, y cada uno recibe al anterior por la izquierda. */
      const resto = ent.slice();
      cadena = [];
      while (resto.length) {
        const s = sumador(resto.splice(0, cadena.length ? 2 : 3), cadena.length > 0);
        if (cadena.length) unir(cadena[cadena.length - 1], "r", s, "l");
        cadena.push(s);
      }
      const ultimo = cadena[cadena.length - 1];
      if (n.tipo === "salida") {                   // el rótulo de la salida va después de la suma
        cadena.push(io()); unir(ultimo, "r", cadena[cadena.length - 1], "l");
      } else if (sal.length >= 2) {                // y si además reparte, va un punto de bifurcación
        cadena.push(agregar(Object.assign(base(), { type: "node", w: 10, h: 10 })));
        unir(ultimo, "r", cadena[cadena.length - 1], "l");
      }
    } else {                                       // una sola entrada: un punto sobre la línea
      cadena = [agregar(Object.assign(base(), { type: "node", w: 10, h: 10 }))];
    }
    cadenaDe.set(n.id, cadena);
    entraEn.set(n.id, cadena[0]); saleDe.set(n.id, cadena[cadena.length - 1]);
  }

  /* Acomodo de izquierda a derecha: cada cosa se apoya contra la anterior dejando
     el aire justo. Un paso de columna único no sirve, porque le da a los tramos
     vacíos el mismo espacio que a los que tienen que alojar un bloque. */
  const bloqueDeRecta = new Map();                 // rama recta con bloque -> su elemento
  let borde = 0;
  // se pega a la grilla en el momento, no al final: si no, el redondeo se come el aire
  const apoyar = (e, aire) => {
    e.x = aGrilla(borde + aire + e.w / 2);
    if (e.x - e.w / 2 < borde + aire - 0.5) e.x += 20;
    borde = e.x + e.w / 2;
  };
  // a dónde llega cada rama: a su sumador (y su pata), o al primer elemento del nodo
  const llegadaDe = (r) => destino.has(r.id) ? destino.get(r.id).el : entraEn.get(r.a);
  enOrden.forEach((n, i) => {
    const cadena = cadenaDe.get(n.id);
    apoyar(cadena[0], i === 0 ? -cadena[0].w / 2 : AIRE_X);
    for (const e of cadena.slice(1)) apoyar(e, AIRE);   // lo que sigue va pegado: sumadores, bifurcación, rótulo
    const sig = enOrden[i + 1];
    if (!sig) return;
    const r = S.ramas.find(x => x.de === n.id && x.a === sig.id && ladoDeRama(x) === "recto");
    const et = r && etiquetaDeRama(r, llegadaDe(r));
    if (!et || et === "1") return;                 // sin bloque en el medio: siguen de largo
    const bl = agregar({ id: nid(), type: "block", h: ALTO_BLOQUE, font: 15, label: et,
      w: anchoTextoAprox(et, 15) + 30, x: 0, y: gy((n.y + sig.y) / 2) });
    apoyar(bl, AIRE_X);
    bloqueDeRecta.set(r.id, bl);
  });


  /* Altura de cada arco: la más cerca de la línea principal que no choque, y contando
     arriba y abajo por separado. Dos líneas que se pisan en x se separan un poco; si
     además se pisan los bloques, hace falta el alto del bloque entero. */
  const alturaDeArco = new Map(), puestos = { t: [], b: [] };
  const franjaDe = (r) => {
    const A = saleDe.get(r.de), B = llegadaDe(r);
    if (!A || !B) return null;
    const et = etiquetaDeRama(r, B), lleva = et !== "1" && et !== "";
    const ancho = lleva ? anchoTextoAprox(et, 15) + 30 : 0;
    const bx = r.de === r.a ? A.x : (A.x + B.x) / 2;
    return { x1: Math.min(A.x, B.x), x2: Math.max(A.x, B.x),
             bx1: lleva ? bx - ancho / 2 : 0, bx2: lleva ? bx + ancho / 2 : -1 };
  };
  S.ramas.filter(r => ladoDeRama(r) !== "recto")
    .map(r => ({ r, f: franjaDe(r) })).filter(o => o.f)
    .sort((a, b) => (a.f.x2 - a.f.x1) - (b.f.x2 - b.f.x1))   // los cortos, más cerca de la línea
    .forEach(({ r, f }) => {
      const lista = puestos[ladoDeRama(r)] || puestos.b;
      let h = PISO_ARCO;
      while (lista.some(c => {
        const lineas = Math.min(c.x2, f.x2) - Math.max(c.x1, f.x1) > 4;
        // dos bloques a menos de un cuadradito de distancia ya se leen como uno solo
        const bloques = Math.min(c.bx2, f.bx2) - Math.max(c.bx1, f.bx1) > -AIRE;
        if (!lineas && !bloques) return false;
        return Math.abs(c.h - h) < (bloques ? ALTO_BLOQUE + AIRE : AIRE);
      })) h += AIRE;
      lista.push(Object.assign({ h }, f));
      alturaDeArco.set(r.id, h);
    });

  for (const r of S.ramas) {
    const A = saleDe.get(r.de), B = llegadaDe(r);
    if (!A || !B) continue;
    const etiqueta = etiquetaDeRama(r, B);
    const lado = ladoDeRama(r);
    const pSal = lado === "recto" ? "r" : lado;
    const pEnt = destino.has(r.id) ? destino.get(r.id).p : (lado === "recto" ? "l" : lado);
    if (etiqueta === "1" || etiqueta === "") {      // transmitancia 1: línea pelada, sin bloque
      unir(A, pSal, B, pEnt);
      continue;
    }
    let bl = bloqueDeRecta.get(r.id);               // las rectas ya quedaron ubicadas al acomodar
    if (!bl) {
      bl = { id: nid(), type: "block", h: ALTO_BLOQUE, font: 15, label: etiqueta,
        w: anchoTextoAprox(etiqueta, 15) + 30, x: 0, y: 0 };
      const x1 = Math.min(A.x, B.x), x2 = Math.max(A.x, B.x);
      // dentro de su tramo el bloque se corre hasta donde no le pegue a nada; si en
      // ese tramo no entra —una realimentación corta, por ejemplo— baja un nivel
      let hueco = alturaDeArco.get(r.id) || PISO_ARCO, x = null;
      for (let intento = 0; intento < 10 && x === null; intento++, hueco += AIRE) {
        bl.y = aGrilla(lado === "t" ? Math.min(A.y, B.y) - hueco : Math.max(A.y, B.y) + hueco);
        x = r.de === r.a ? aGrilla(A.x) : xLibre(bl, x1, x2, nodes);
      }
      bl.x = x === null ? aGrilla((x1 + x2) / 2) : x;
      agregar(bl);
    }
    // el bloque se atraviesa siempre de izquierda a derecha en la ida y al revés en la vuelta
    const entraAlBloque = lado === "b" ? "r" : "l", saleDelBloque = lado === "b" ? "l" : "r";
    unir(A, pSal, bl, entraAlBloque);
    unir(bl, saleDelBloque, B, pEnt);
  }
  return { nombre: limpiarNombre(S.nombre) + "-bloques", nodes, edges,
           tema: { relleno: "#ffffff", borde: "#101418", texto: "#101418",
                   flecha: "#101418", fondo: "#ffffff" }, hoja: null };
}

/* ---- dibujo del equivalente: un SVG suelto, para la vista previa y el PNG ---- */
const DIRP = { l: { x: -1, y: 0 }, r: { x: 1, y: 0 }, t: { x: 0, y: -1 }, b: { x: 0, y: 1 } };
function puntoPuerto(n, p) {
  if (n.type === "node") return { x: n.x, y: n.y };     // la bifurcación es un punto
  const d = DIRP[p] || DIRP.l;
  return { x: n.x + d.x * n.w / 2, y: n.y + d.y * n.h / 2 };
}
function caminoOrto(p1, d1, p2, d2) {          // ruteo en ángulo recto, como en el editor
  const s = 20;
  const a = { x: p1.x + d1.x * s, y: p1.y + d1.y * s };
  const b = { x: p2.x + d2.x * s, y: p2.y + d2.y * s };   // se llega desde afuera del puerto
  const medio = [];
  const h1 = d1.x !== 0, h2 = d2.x !== 0;
  if (h1 && h2) { const mx = (a.x + b.x) / 2; medio.push({ x: mx, y: a.y }, { x: mx, y: b.y }); }
  else if (h1 && !h2) medio.push({ x: b.x, y: a.y });
  else if (!h1 && h2) medio.push({ x: a.x, y: b.y });
  else { const my = (a.y + b.y) / 2; medio.push({ x: a.x, y: my }, { x: b.x, y: my }); }
  return [p1, a].concat(medio, [b, p2])
    .filter((p, i, l) => i === 0 || Math.abs(p.x - l[i - 1].x) > .5 || Math.abs(p.y - l[i - 1].y) > .5);
}
function svgDeBloques(d) {
  const m = 34;
  let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
  for (const n of d.nodes) {
    l = Math.min(l, n.x - n.w / 2 - m); r = Math.max(r, n.x + n.w / 2 + m);
    t = Math.min(t, n.y - n.h / 2 - m); b = Math.max(b, n.y + n.h / 2 + m);
  }
  if (!d.nodes.length) { l = 0; t = 0; r = 200; b = 120; }
  const W = r - l, H = b - t;
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("width", W); s.setAttribute("height", H);
  s.setAttribute("viewBox", l + " " + t + " " + W + " " + H);
  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML = '<marker id="pta" viewBox="0 0 10 10" refX="9.2" refY="5" markerWidth="7"' +
    ' markerHeight="7" orient="auto-start-reverse" markerUnits="strokeWidth">' +
    '<path d="M0.5 1.2 L9.5 5 L0.5 8.8 z" fill="#101418"/></marker>';
  s.appendChild(defs);
  el("rect", { x: l, y: t, width: W, height: H, fill: "#ffffff" }, s);
  const porId = new Map(d.nodes.map(n => [n.id, n]));
  for (const e of d.edges) {
    const A = porId.get(e.from.id), B = porId.get(e.to.id);
    if (!A || !B) continue;
    const pts = caminoOrto(puntoPuerto(A, e.from.port), DIRP[e.from.port] || DIRP.r,
                           puntoPuerto(B, e.to.port), DIRP[e.to.port] || DIRP.l);
    el("path", { d: "M " + pts.map(p => p.x + " " + p.y).join(" L "), fill: "none",
      stroke: "#101418", "stroke-width": 1.6, "stroke-linejoin": "round",
      "marker-end": B.type === "node" ? "" : "url(#pta)" }, s);   // a una bifurcación no se le pone punta
  }
  const texto = (x, y, cont, tam) => {
    const e = el("text", { x, y, "font-family": "Arial,Helvetica,sans-serif", "font-size": tam,
      fill: "#101418", "text-anchor": "middle", "dominant-baseline": "central" }, s);
    ponerTexto(e, cont); return e;             // los números pegados a una letra van abajo
  };
  for (const n of d.nodes) {
    if (n.type === "block") {
      el("rect", { x: n.x - n.w / 2, y: n.y - n.h / 2, width: n.w, height: n.h,
        fill: "#ffffff", stroke: "#101418", "stroke-width": 1.6 }, s);
      texto(n.x, n.y, n.label, 15);
    } else if (n.type === "sum") {
      const rad = n.w / 2, k = rad * Math.SQRT1_2;
      el("circle", { cx: n.x, cy: n.y, r: rad, fill: "#ffffff", stroke: "#101418", "stroke-width": 1.6 }, s);
      el("path", { d: "M " + (n.x - k) + " " + (n.y - k) + " L " + (n.x + k) + " " + (n.y + k) +
        " M " + (n.x + k) + " " + (n.y - k) + " L " + (n.x - k) + " " + (n.y + k),
        stroke: "#101418", "stroke-width": 1.4, fill: "none" }, s);
      for (const p in n.signs) {
        if (!n.signs[p]) continue;
        const dd = DIRP[p];
        texto(n.x + dd.x * rad * 0.58, n.y + dd.y * rad * 0.58, n.signs[p], 13);
      }
    } else if (n.type === "node") {
      el("circle", { cx: n.x, cy: n.y, r: 4.5, fill: "#101418" }, s);
    } else {
      texto(n.x, n.y, n.label, 14);
    }
  }
  return { svg: s, W, H };
}
