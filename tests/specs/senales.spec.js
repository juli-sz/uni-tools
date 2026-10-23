const { test, expect } = require("@playwright/test");
const { abrir, abrirTexto } = require("./ayudas");

test.beforeEach(async ({ page }, info) => { info.errores = await abrir(page, "diagrama-señales.html"); });
test.afterEach(async ({}, info) => { expect(info.errores).toEqual([]); });

const mason = (page, ejemplo) => page.evaluate((e) => {
  cargarEjemplo(e);
  const A = analizar();
  return { P: A.P.map((p) => p.gan), L: A.L.map((l) => l.gan), delta: textoDelta(A.L, A.det),
           cof: A.cof.map((c) => textoDelta(c.libres, c.det)) };
}, ejemplo);

test.describe("regla de Mason", () => {
  test("un lazo simple: Δ = 1 − L1", async ({ page }) => {
    expect(await mason(page, "simple")).toEqual({ P: ["G_1·G_2"], L: ["G_1·(-H)"], delta: "1 − L1", cof: ["1"] });
  });
  test("dos lazos que se tocan: no hay término L1L2", async ({ page }) => {
    const m = await mason(page, "dos");
    expect(m.L).toHaveLength(2);
    expect(m.delta).toBe("1 − L1 − L2");
  });
  test("dos lazos que no se tocan: aparece +L1L2", async ({ page }) => {
    expect((await mason(page, "disjuntos")).delta).toBe("1 − L1 − L2 + L1L2");
  });
  test("dos trayectorias directas", async ({ page }) => {
    const m = await mason(page, "dostray");
    expect(m.P).toEqual(["G_1", "G_2"]);
    expect(m.cof).toEqual(["1", "1"]);
  });
  test("sin entrada ni salida marcadas no se rompe", async ({ page }) => {
    await page.evaluate(() => { cargarEjemplo("simple"); S.nodos.forEach((n) => (n.tipo = "normal")); });
    const A = await page.evaluate(() => { const a = analizar(); return { P: a.P.length, L: a.L.length }; });
    expect(A.P).toBe(0);
    await page.evaluate(() => mostrarMason());
    await expect(page.locator("#mason-sub")).toContainText("Falta marcar");
  });
  test("con valores numéricos calcula la transferencia", async ({ page }) => {
    // R →(1) x1 →(2) C, con realimentación −3 de C a x1... T = 2 / (1 + 2·3) = 2/7
    const doc = {
      nodos: [{ id: "R", nombre: "R", x: 0, y: 0, tipo: "entrada" }, { id: "x", nombre: "x", x: 150, y: 0, tipo: "normal" },
              { id: "C", nombre: "C", x: 300, y: 0, tipo: "salida" }],
      ramas: [{ id: "r1", de: "R", a: "x", g: "1", curva: 0 }, { id: "r2", de: "x", a: "C", g: "2", curva: 0 },
              { id: "r3", de: "C", a: "x", g: "-3", curva: -60 }],
    };
    await abrirTexto(page, JSON.stringify(doc));
    const r = await page.evaluate(() => {
      const A = analizar(); conValores(A.P); conValores(A.L);
      return { P: A.P.map((p) => p.valor), L: A.L.map((l) => l.valor), d: valorDelta(A.L, A.det) };
    });
    expect(r.P).toEqual([2]);
    expect(r.L).toEqual([-6]);
    expect(r.d).toBe(7);
  });
});

test.describe("equivalente en bloques", () => {
  test("el JSON generado se abre en Diagramas de bloques sin romper nada", async ({ page, browser }) => {
    const datos = await page.evaluate(() => { cargarEjemplo("dos"); return JSON.stringify(equivalenteEnBloques()); });
    const p2 = await browser.newPage();
    const errores = await abrir(p2, "diagrama-bloque.html");
    expect(await abrirTexto(p2, datos)).toBeNull();
    const r = await p2.evaluate(() => ({ n: S.nodes.length, e: S.edges.length,
      huerfanas: S.edges.filter((e) => !getNode(e.from.id) || !getNode(e.to.id)).length }));
    expect(r.n).toBeGreaterThan(0);
    expect(r.huerfanas).toBe(0);
    expect(errores).toEqual([]);
    await p2.close();
  });
});

/* Transferencia del diagrama de bloques equivalente, resolviendo su sistema lineal: cada bloque
   multiplica (las etiquetas son números), cada sumador suma con el signo de su pata. */
const transferenciaDeBloques = (page) => page.evaluate(() => {
  const d = equivalenteEnBloques(), n = d.nodes.length, idx = new Map(d.nodes.map((e, k) => [e.id, k]));
  const entrada = S.nodos.find((x) => x.tipo === "entrada"), salida = S.nodos.find((x) => x.tipo === "salida");
  const M = Array.from({ length: n }, () => new Array(n + 1).fill(0)), problemas = [];
  for (const e of d.nodes) {
    const k = idx.get(e.id), ins = d.edges.filter((x) => x.to.id === e.id);
    M[k][k] = 1;
    if (e.type === "block") M[k][idx.get(ins[0].from.id)] -= Number(e.label);
    else if (e.type === "sum") ins.forEach((x) => {
      const sg = e.signs[x.to.port];
      if (sg !== "+" && sg !== "−") problemas.push("flecha a una pata sin signo");
      M[k][idx.get(x.from.id)] -= sg === "+" ? 1 : -1;
    });
    else if (ins.length > 1) problemas.push(e.type + " " + e.label + " con " + ins.length + " entradas");
    else if (ins.length) M[k][idx.get(ins[0].from.id)] -= 1;
    else if (e.label === entrada.nombre) M[k][n] = 1;
  }
  for (let c = 0; c < n; c++) {
    let p = c; for (let f = c + 1; f < n; f++) if (Math.abs(M[f][c]) > Math.abs(M[p][c])) p = f;
    [M[c], M[p]] = [M[p], M[c]];
    for (let f = 0; f < n; f++) if (f !== c) { const k = M[f][c] / M[c][c]; for (let q = c; q <= n; q++) M[f][q] -= k * M[c][q]; }
  }
  const ks = d.nodes.findIndex((e) => e.type === "io" && e.label === salida.nombre);
  return { T: M[ks][n] / M[ks][ks], problemas, sumadores: d.nodes.filter((e) => e.type === "sum").length };
});
/* La transferencia que calcula Mason (con ganancias numéricas) */
const transferenciaDeMason = (page) => page.evaluate(() => {
  const A = analizar(); conValores(A.P); conValores(A.L);
  const d = valorDelta(A.L, A.det);
  return A.P.reduce((s, p, i) => s + p.valor * valorDelta(A.cof[i].libres, A.cof[i].det), 0) / d;
});
/* Arma un grafo: nodos en fila (el primero es la entrada y el último la salida) y ramas [de, a, g] */
const grafo = (page, cant, ramas) => page.evaluate(([cant, ramas]) => {
  S.nodos = []; S.ramas = []; S.sel = []; S.selR = []; uidc = 1;
  for (let k = 0; k < cant; k++) S.nodos.push(nuevoNodo(k * 160, 0, { tipo: k === 0 ? "entrada" : k === cant - 1 ? "salida" : "normal" }));
  for (const [de, a, g] of ramas) S.ramas.push(nuevaRama(S.nodos[de].id, S.nodos[a].id, { g }));
  render();
}, [cant, ramas]);

test.describe("el equivalente en bloques tiene la misma transferencia", () => {
  test("cuando a la salida le llegan varias ramas, va un sumador antes del rótulo", async ({ page }) => {
    // dos caminos que se juntan en la salida, y un lazo sobre ella
    await grafo(page, 4, [[0, 1, "1"], [1, 2, "0.5"], [2, 3, "2"], [1, 3, "-0.25"], [3, 2, "0.3"]]);
    const b = await transferenciaDeBloques(page);
    expect(b.problemas).toEqual([]);
    expect(b.T).toBeCloseTo(await transferenciaDeMason(page), 10);
  });
  test("con un autolazo sobre la salida también", async ({ page }) => {
    await grafo(page, 3, [[0, 1, "2"], [1, 2, "0.5"], [2, 2, "-0.4"]]);
    const b = await transferenciaDeBloques(page);
    expect(b.problemas).toEqual([]);
    expect(b.T).toBeCloseTo(1 / 1.4, 10);           // x2 = 0.5·x1 − 0.4·x2, x1 = 2
  });
  test("un nodo con cinco ramas entrando usa sumadores encadenados y no mezcla signos", async ({ page }) => {
    await grafo(page, 4, [[0, 1, "1"], [0, 2, "2"], [1, 2, "-3"], [0, 2, "0.5"], [1, 2, "-0.25"], [2, 2, "0.1"], [2, 3, "1"]]);
    const b = await transferenciaDeBloques(page);
    expect(b.problemas).toEqual([]);
    expect(b.sumadores).toBeGreaterThan(1);
    // x2 = 2 − 3 + 0.5 − 0.25 + 0.1·x2  →  x2 = −0.75 / 0.9
    expect(b.T).toBeCloseTo(-0.75 / 0.9, 10);
    expect(await transferenciaDeMason(page)).toBeCloseTo(-0.75 / 0.9, 10);
  });
});

test("en la vista previa del equivalente, cada flecha llega desde afuera del puerto y sin punta a las bifurcaciones", async ({ page }) => {
  await grafo(page, 4, [[0, 1, "1"], [1, 2, "G1"], [2, 3, "G2"], [1, 3, "-G3"], [3, 2, "H1"]]);
  const malas = await page.evaluate(() => {
    const d = equivalenteEnBloques(), { svg } = svgDeBloques(d), porId = new Map(d.nodes.map((n) => [n.id, n]));
    const caminos = Array.from(svg.querySelectorAll("path[marker-end], path[stroke-linejoin]"));
    const malas = [];
    d.edges.forEach((e, k) => {
      const nums = caminos[k].getAttribute("d").match(/-?[\d.]+/g).map(Number);
      const [x1, y1, x2, y2] = nums.slice(-4), B = porId.get(e.to.id);
      if (B.type === "node") { if (caminos[k].getAttribute("marker-end")) malas.push("punta en una bifurcación"); return; }
      const dir = DIRP[e.to.port];                       // la normal hacia afuera del puerto
      if ((x2 - x1) * dir.x + (y2 - y1) * dir.y >= 0) malas.push(`${B.type} ${B.label || ""} ${e.to.port}: llega desde adentro`);
    });
    return malas;
  });
  expect(malas).toEqual([]);
});

test("en la transferencia, una trayectoria negativa se resta: G1·G2 − G3", async ({ page }) => {
  await grafo(page, 4, [[0, 1, "1"], [1, 2, "G1"], [2, 3, "G2"], [1, 3, "-G3"], [3, 2, "H1"]]);
  await page.evaluate(() => mostrarMason());
  const t = await page.locator("#mason-body .caja.resultado").innerText();
  expect(t).toContain("G1·G2 − G3");
  expect(t).not.toContain("+ -");
});

test("si a la entrada le llegan ramas, el análisis lo avisa", async ({ page }) => {
  await grafo(page, 3, [[0, 1, "2"], [1, 2, "3"], [1, 0, "0.5"]]);
  await page.evaluate(() => mostrarMason());
  await expect(page.locator("#mason-body .aviso")).toContainText("le llegan ramas");
  await page.keyboard.press("Escape");
  await grafo(page, 3, [[0, 1, "2"], [1, 2, "3"], [2, 1, "0.5"]]);
  await page.evaluate(() => mostrarMason());
  await expect(page.locator("#mason-body .aviso")).toHaveCount(0);
});

test.describe("edición", () => {
  test("guardar y abrir conserva nodos y ramas", async ({ page }) => {
    await page.evaluate(() => cargarEjemplo("disjuntos"));
    const antes = await page.evaluate(() => [S.nodos.length, S.ramas.length]);
    const json = await page.evaluate(() => JSON.stringify({ nombre: S.nombre, nodos: S.nodos, ramas: S.ramas }));
    await page.evaluate(() => { S.nodos = []; S.ramas = []; render(); });
    await abrirTexto(page, json);
    expect(await page.evaluate(() => [S.nodos.length, S.ramas.length])).toEqual(antes);
  });
  test("deshacer y rehacer", async ({ page }) => {
    await page.evaluate(() => cargarEjemplo("simple"));
    const n = await page.evaluate(() => S.nodos.length);
    await page.evaluate(() => { S.nodos.push(nuevoNodo(500, 300)); commit(); render(); });
    expect(await page.evaluate(() => S.nodos.length)).toBe(n + 1);
    await page.evaluate(() => undo());
    expect(await page.evaluate(() => S.nodos.length)).toBe(n);
    await page.evaluate(() => redo());
    expect(await page.evaluate(() => S.nodos.length)).toBe(n + 1);
  });
});

test("doble clic sobre un nodo abre el editor del nombre, y sobre una rama el de su transmitancia", async ({ page }) => {
  const nodo = await page.evaluate(() => {
    const n = S.nodos[1], r = document.getElementById("canvas").getBoundingClientRect();
    return { id: n.id, x: r.left + S.pan.x + n.x * S.zoom, y: r.top + S.pan.y + n.y * S.zoom };
  });
  await page.mouse.dblclick(nodo.x, nodo.y);
  await expect(page.locator(".editor-hoja")).toBeFocused();
  await page.keyboard.type("z");
  await page.keyboard.press("Enter");
  expect(await page.evaluate((id) => getNodo(id).nombre, nodo.id)).toBe("z");
  // sobre la etiqueta de una rama
  const rama = await page.evaluate(() => {
    const r0 = S.ramas.find((r) => r.de !== r.a), c = curvaDe(r0), r = document.getElementById("canvas").getBoundingClientRect();
    return { id: r0.id, x: r.left + S.pan.x + c.lx * S.zoom, y: r.top + S.pan.y + c.ly * S.zoom };
  });
  await page.mouse.dblclick(rama.x, rama.y);
  await expect(page.locator(".editor-hoja")).toBeFocused();
  await page.keyboard.type("K");
  await page.keyboard.press("Enter");
  expect(await page.evaluate((id) => getRama(id).g, rama.id)).toBe("K");
});

test.describe("copiar y pegar (Ctrl+C / Ctrl+V)", () => {
  test("los nodos pegados tienen nombre libre y no duplican entrada ni salida", async ({ page }) => {
    await page.evaluate(() => { cargarEjemplo("dos"); S.sel = S.nodos.map((n) => n.id); render(); });
    const [n0, r0] = await page.evaluate(() => [S.nodos.length, S.ramas.length]);
    await page.keyboard.press("Control+c");
    await page.keyboard.press("Control+v");
    expect(await page.evaluate(() => [S.nodos.length, S.ramas.length])).toEqual([n0 * 2, r0 * 2]);
    const r = await page.evaluate(() => ({
      nombres: S.nodos.map((n) => n.nombre),
      entradas: S.nodos.filter((n) => n.tipo === "entrada").length,
      salidas: S.nodos.filter((n) => n.tipo === "salida").length,
      ramasOk: S.ramas.every((r) => getNodo(r.de) && getNodo(r.a)),
    }));
    expect(new Set(r.nombres).size).toBe(r.nombres.length);
    expect([r.entradas, r.salidas, r.ramasOk]).toEqual([1, 1, true]);
    // Mason sigue calculando sobre el original
    expect(await page.evaluate(() => analizar().P.length)).toBe(1);
  });
  test("deshacer saca lo pegado; sin copiar, Ctrl+V no hace nada", async ({ page }) => {
    await page.evaluate(() => cargarEjemplo("simple"));
    const n0 = await page.evaluate(() => S.nodos.length);
    await page.keyboard.press("Control+v");
    expect(await page.evaluate(() => S.nodos.length)).toBe(n0);
    await page.evaluate(() => { S.sel = [S.nodos[1].id]; render(); });
    await page.keyboard.press("Control+c");
    await page.keyboard.press("Control+v");
    expect(await page.evaluate(() => S.nodos.length)).toBe(n0 + 1);
    await page.evaluate(() => undo());
    expect(await page.evaluate(() => S.nodos.length)).toBe(n0);
  });
});

test("Ctrl + clic izquierdo y arrastrar mueve la hoja; la rueda también", async ({ page }) => {
  const p = await page.evaluate(() => { const r = document.getElementById("canvas").getBoundingClientRect(); return { x: r.left + r.width - 80, y: r.top + r.height - 80 }; });
  const antes = await page.evaluate(() => [S.pan.x, S.pan.y]);
  await page.keyboard.down("Control");
  await page.mouse.move(p.x, p.y); await page.mouse.down();
  await page.mouse.move(p.x - 50, p.y - 30, { steps: 6 }); await page.mouse.up();
  await page.keyboard.up("Control");
  const d = await page.evaluate(() => [S.pan.x, S.pan.y]);
  expect([Math.round(d[0] - antes[0]), Math.round(d[1] - antes[1])]).toEqual([-50, -30]);
  await page.mouse.wheel(0, 100);
  await expect.poll(() => page.evaluate(() => S.pan.y)).toBeLessThan(d[1]);
});

test.describe("duplicar (Ctrl+D)", () => {
  test("duplica los nodos seleccionados con sus ramas, corridos, y se deshace", async ({ page }) => {
    await page.evaluate(() => { cargarEjemplo("dos"); S.sel = S.nodos.slice(1, 3).map((n) => n.id); render(); });
    const [n0, r0, internas] = await page.evaluate(() => [S.nodos.length, S.ramas.length,
      S.ramas.filter((r) => S.sel.includes(r.de) && S.sel.includes(r.a)).length]);
    const orig = await page.evaluate(() => S.sel.map((id) => { const n = getNodo(id); return [n.x, n.y]; }));
    await page.keyboard.press("Control+d");
    expect(await page.evaluate(() => [S.nodos.length, S.ramas.length])).toEqual([n0 + 2, r0 + internas]);
    const nuevos = await page.evaluate(() => S.sel.map((id) => { const n = getNodo(id); return [n.x, n.y, n.tipo, n.nombre]; }));
    expect(nuevos.map(([x, y]) => [x - 40, y - 40])).toEqual(orig);           // dos pasos de grilla
    expect(nuevos.every(([, , tipo]) => tipo === "normal")).toBe(true);
    const nombres = await page.evaluate(() => S.nodos.map((n) => n.nombre));
    expect(new Set(nombres).size).toBe(nombres.length);
    await page.evaluate(() => undo());
    expect(await page.evaluate(() => [S.nodos.length, S.ramas.length])).toEqual([n0, r0]);
  });
  test("no pisa lo copiado con Ctrl+C, y sin selección no hace nada", async ({ page }) => {
    await page.evaluate(() => { cargarEjemplo("simple"); S.sel = [S.nodos[1].id]; render(); });
    await page.keyboard.press("Control+c");
    await page.evaluate(() => { S.sel = [S.nodos[2].id]; render(); });
    await page.keyboard.press("Control+d");
    const n = await page.evaluate(() => S.nodos.length);
    await page.evaluate(() => { S.sel = []; render(); });
    await page.keyboard.press("Control+d");
    expect(await page.evaluate(() => S.nodos.length)).toBe(n);
    expect(await page.evaluate(() => portapapeles.nodos.length)).toBe(1);
  });
});
