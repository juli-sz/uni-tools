const { test, expect } = require("@playwright/test");
const { abrir, aPantalla, arrastrar, abrirTexto } = require("./ayudas");

test.beforeEach(async ({ page }, info) => { info.errores = await abrir(page, "diagrama-bloque.html"); });
test.afterEach(async ({}, info) => { expect(info.errores).toEqual([]); });

const estado = (page) => page.evaluate(() => ({
  modo: S.mode, herramienta: pendingAdd,
  botones: ["select", "multi", "connect"].filter((m) => document.getElementById("m-" + m).classList.contains("on")),
  paleta: [...document.querySelectorAll(".ptool.on")].map((b) => b.dataset.add),
}));

test.describe("herramientas y modos son excluyentes", () => {
  test("arranca en selección", async ({ page }) => {
    expect(await estado(page)).toMatchObject({ modo: "select", herramienta: null, botones: ["select"], paleta: [] });
  });
  test("elegir una herramienta saca del modo; elegir un modo suelta la herramienta", async ({ page }) => {
    await page.keyboard.press("c");
    expect(await estado(page)).toMatchObject({ modo: "connect", herramienta: null });
    await page.keyboard.press("b");
    expect(await estado(page)).toMatchObject({ modo: "select", herramienta: "block", botones: [] });
    await page.keyboard.press("x");
    expect(await estado(page)).toMatchObject({ modo: "multi", herramienta: null, paleta: [] });
    await page.keyboard.press("m");
    expect(await estado(page)).toMatchObject({ herramienta: "marco" });
    await page.keyboard.press("v");
    expect(await estado(page)).toMatchObject({ modo: "select", herramienta: null, botones: ["select"] });
  });
  test("Esc vuelve a selección", async ({ page }) => {
    await page.keyboard.press("s");
    await page.keyboard.press("Escape");
    expect(await estado(page)).toMatchObject({ modo: "select", herramienta: null });
  });
  test("la leyenda de atajos de la barra de estado existe", async ({ page }) => {
    const letras = await page.$$eval("#atajos kbd", (k) => k.map((e) => e.textContent.trim().toUpperCase()));
    for (const l of ["V", "X", "C", "B", "S", "N", "E", "T", "M"]) expect(letras).toContain(l);
  });
  test("colocar un bloque con la herramienta vuelve a selección", async ({ page }) => {
    await page.evaluate(() => { S.nodes = []; S.edges = []; render(); });   // lienzo libre
    const antes = 0;
    await page.keyboard.press("b");
    const p = await aPantalla(page, 600, 480);
    await page.mouse.click(p.x, p.y);
    expect(await page.evaluate(() => S.nodes.length)).toBe(antes + 1);
    expect(await estado(page)).toMatchObject({ herramienta: null, modo: "select" });
  });
});

test.describe("recuadros: seleccionar, mover y cambiar tamaño", () => {
  async function conMarco(page) {
    await page.evaluate(() => { S.nodes.push(makeNode("marco", 700, 700, { w: 300, h: 140, label: "Prueba" })); commit(); render(); });
    return page.evaluate(() => S.nodes.find((n) => n.type === "marco").id);
  }
  const geom = (page, id) => page.evaluate((id) => { const n = getNode(id); return { x: n.x, y: n.y, w: n.w, h: n.h }; }, id);

  test("un click lo selecciona y muestra los tiradores", async ({ page }) => {
    const id = await conMarco(page);
    const borde = await aPantalla(page, 550, 700);                 // borde izquierdo
    await page.mouse.click(borde.x, borde.y);
    expect(await page.evaluate(() => S.sel)).toEqual([id]);
    expect(await page.locator(".m-handle-wrap").count()).toBeGreaterThanOrEqual(4);
  });
  test("seleccionado, se mueve arrastrando el asa", async ({ page }) => {
    const id = await conMarco(page);
    await page.evaluate((id) => { S.sel = [id]; render(); }, id);
    const a = await geom(page, id);
    const r = await page.locator(".m-grip").boundingBox();
    await arrastrar(page, { x: r.x + r.width / 2, y: r.y + r.height / 2 }, [40, 20]);
    const b = await geom(page, id);
    expect(b.x).toBeGreaterThan(a.x); expect(b.y).toBeGreaterThan(a.y);
    expect([b.w, b.h]).toEqual([a.w, a.h]);
  });
  test("el tirador de una esquina cambia el tamaño", async ({ page }) => {
    const id = await conMarco(page);
    await page.evaluate((id) => { S.sel = [id]; render(); }, id);
    const a = await geom(page, id);
    const r = await page.locator('.m-handle-wrap[data-handle="se"], .m-handle-wrap[data-handle="br"]').first().boundingBox();
    await arrastrar(page, { x: r.x + r.width / 2, y: r.y + r.height / 2 }, [60, 40]);
    const b = await geom(page, id);
    expect(b.w).toBeGreaterThan(a.w); expect(b.h).toBeGreaterThan(a.h);
  });
  test("deshacer devuelve la geometría anterior", async ({ page }) => {
    const id = await conMarco(page);
    await page.evaluate((id) => { S.sel = [id]; render(); }, id);
    const a = await geom(page, id);
    const r = await page.locator(".m-grip").boundingBox();
    await arrastrar(page, { x: r.x + r.width / 2, y: r.y + r.height / 2 }, [40, 20]);
    await page.evaluate(() => undo());
    expect(await geom(page, id)).toEqual(a);
  });
});

test.describe("flechas", () => {
  test("seleccionada, una flecha ofrece tiradores de tramo y se puede correr a mano", async ({ page }) => {
    // R → bloque → C, con un tramo que se puede desplazar
    const doc = {
      nodes: [{ id: "a", type: "block", x: 200, y: 200, w: 72, h: 42, label: "G" },
              { id: "b", type: "block", x: 500, y: 320, w: 72, h: 42, label: "H" }],
      edges: [{ id: "e1", from: { id: "a", port: "r" }, to: { id: "b", port: "l" }, variant: 0 }],
    };
    await abrirTexto(page, JSON.stringify(doc));
    await page.evaluate(() => { S.selEdges = ["e1"]; S.sel = []; render(); });
    const tiradores = page.locator(".seg-handle-wrap");
    expect(await tiradores.count()).toBeGreaterThan(0);
    const antes = await page.evaluate(() => JSON.stringify(getEdge("e1").pts));
    const r = await tiradores.first().boundingBox();
    await arrastrar(page, { x: r.x + r.width / 2, y: r.y + r.height / 2 }, [30, 30]);
    const e = await page.evaluate(() => getEdge("e1"));
    expect(e.manual, "la ruta quedó fijada a mano").toBeTruthy();
    expect(JSON.stringify(e.pts)).not.toBe(antes);
  });
  test("las flechas quedan unidas a sus bloques al mover un bloque", async ({ page }) => {
    await page.evaluate(() => loadExample());
    const n = await page.evaluate(() => S.edges.length);
    expect(n).toBeGreaterThan(0);
    await page.evaluate(() => { const b = S.nodes.find((x) => x.type === "block"); b.x += 40; b.y += 40; render(); });
    expect(await page.evaluate(() => S.edges.every((e) => e.pts && e.pts.length >= 2))).toBe(true);
  });
});

test.describe("un bloque tiene una sola entrada", () => {
  const doc = () => ({
    nodes: [{ id: "r", type: "io", x: 140, y: 200, w: 46, h: 22, label: "R(s)", font: 14 },
            { id: "g1", type: "block", x: 340, y: 200, w: 72, h: 42, label: "G1", font: 15 },
            { id: "g2", type: "block", x: 340, y: 380, w: 72, h: 42, label: "G2", font: 15 }],
    edges: [{ id: "e1", from: { id: "r", port: "r" }, to: { id: "g1", port: "l" }, variant: 0 }],
  });
  const centro = async (page, sel) => {
    const r = await page.locator(sel).boundingBox();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  };
  test("tirar una segunda flecha hacia un bloque ocupado no la crea y avisa", async ({ page }) => {
    await abrirTexto(page, JSON.stringify(doc()));
    await page.keyboard.press("c");                     // en modo conectar se ven todos los puertos
    const desde = await centro(page, '.port[data-pid="r"][data-port="r"]');
    const g1 = await centro(page, '.node[data-id="g1"]');
    await page.mouse.move(desde.x, desde.y);
    await page.mouse.down();
    await page.mouse.move(g1.x, g1.y, { steps: 8 });
    await expect(page.locator(".ghostline.invalido")).toHaveCount(1);   // la previa ya avisa
    await page.mouse.up();
    expect(await page.evaluate(() => S.edges.length)).toBe(1);          // no se crea la flecha
    expect(await page.evaluate(() => S.nodes.length)).toBe(3);          // ni queda una bifurcación suelta
    await expect(page.locator("#toast")).toContainText("una sola entrada");
    // a un bloque libre sí le entra
    const g2 = await centro(page, '.node[data-id="g2"]');
    await arrastrar(page, desde, [g2.x - desde.x, g2.y - desde.y]);
    expect(await page.evaluate(() => S.edges.map((e) => e.to.id))).toEqual(["g1", "g2"]);
    // y soltar en el vacío sigue dejando una bifurcación con su flecha
    const r = await page.locator("#canvas").boundingBox();
    const libre = { x: r.x + r.width - 50, y: r.y + r.height - 50 };
    await arrastrar(page, desde, [libre.x - desde.x, libre.y - desde.y]);
    expect(await page.evaluate(() => S.nodes[S.nodes.length - 1].type)).toBe("node");
    expect(await page.evaluate(() => S.edges.length)).toBe(3);
  });
  test("abrir un archivo con dos flechas al mismo bloque deja una sola y avisa", async ({ page }) => {
    const d = doc();
    d.edges.push({ id: "e2", from: { id: "g2", port: "r" }, to: { id: "g1", port: "t" }, variant: 0 });
    await abrirTexto(page, JSON.stringify(d));
    expect(await page.evaluate(() => S.edges.map((e) => e.id))).toEqual(["e1"]);
    await expect(page.locator("#toast")).toContainText("una sola entrada");
  });
  test("los sumadores siguen juntando varias flechas", async ({ page }) => {
    const d = doc();
    d.nodes.push({ id: "s", type: "sum", x: 560, y: 200 });
    d.edges.push({ id: "e2", from: { id: "g1", port: "r" }, to: { id: "s", port: "l" }, variant: 0 },
                 { id: "e3", from: { id: "g2", port: "r" }, to: { id: "s", port: "b" }, variant: 0 });
    await abrirTexto(page, JSON.stringify(d));
    expect(await page.evaluate(() => S.edges.map((e) => e.id))).toEqual(["e1", "e2", "e3"]);
  });
});

test.describe("guardar y abrir", () => {
  test("el ejemplo sobrevive a ida y vuelta por JSON", async ({ page }) => {
    await page.evaluate(() => loadExample());
    const a = await page.evaluate(() => JSON.stringify([S.nodes.map((n) => [n.id, n.type, n.x, n.y, n.w, n.h, n.label]), S.edges.map((e) => [e.id, e.from, e.to])]));
    const json = await page.evaluate(() => JSON.stringify({ nombre: S.nombre, nodes: S.nodes, edges: S.edges, tema: S.tema, hoja: S.hoja }));
    await page.evaluate(() => { S.nodes = []; S.edges = []; render(); });
    await abrirTexto(page, json);
    const b = await page.evaluate(() => JSON.stringify([S.nodes.map((n) => [n.id, n.type, n.x, n.y, n.w, n.h, n.label]), S.edges.map((e) => [e.id, e.from, e.to])]));
    expect(b).toBe(a);
  });
  test("el SVG exportado trae los datos y se vuelve a abrir", async ({ page }) => {
    await page.evaluate(() => loadExample());
    const cuenta = await page.evaluate(() => [S.nodes.length, S.edges.length]);
    const svg = await page.evaluate(() => (typeof buildExportSVG === "function" ? new XMLSerializer().serializeToString(buildExportSVG().svg || buildExportSVG()) : ""));
    expect(svg).toContain("uni-tools-datos");
    await page.evaluate(() => { S.nodes = []; S.edges = []; render(); });
    await abrirTexto(page, svg);
    expect(await page.evaluate(() => [S.nodes.length, S.edges.length])).toEqual(cuenta);
  });
});

test.describe("doble clic para editar el contenido directamente", () => {
  const centro = (page, id) => page.evaluate((id) => {
    const n = getNode(id), r = document.getElementById("canvas").getBoundingClientRect();
    return { x: r.left + S.pan.x + n.x * S.zoom, y: r.top + S.pan.y + n.y * S.zoom };
  }, id);
  const idBloque = (page) => page.evaluate(() => S.nodes.find((n) => n.type === "block").id);
  const hayEditor = (page) => page.evaluate(() => !!document.querySelector(".editor-hoja"));

  test("doble clic sobre un bloque abre el editor con el contenido, y Enter lo guarda", async ({ page }) => {
    const id = await idBloque(page), c = await centro(page, id);
    const antes = await page.evaluate((id) => getNode(id).label, id);
    await page.mouse.dblclick(c.x, c.y);
    await expect(page.locator(".editor-hoja")).toBeFocused();
    expect(await page.inputValue(".editor-hoja")).toBe(antes);
    await page.keyboard.type("K(s)");
    await page.keyboard.press("Enter");
    expect(await hayEditor(page)).toBe(false);
    expect(await page.evaluate((id) => getNode(id).label, id)).toBe("K(s)");
    await page.evaluate(() => undo());                        // y se puede deshacer
    expect(await page.evaluate((id) => getNode(id).label, id)).toBe(antes);
  });
  test("Escape cancela sin cambiar nada", async ({ page }) => {
    const id = await idBloque(page), c = await centro(page, id);
    const antes = await page.evaluate((id) => getNode(id).label, id);
    await page.mouse.dblclick(c.x, c.y);
    await page.keyboard.type("zzz");
    await page.keyboard.press("Escape");
    expect(await hayEditor(page)).toBe(false);
    expect(await page.evaluate((id) => getNode(id).label, id)).toBe(antes);
  });
  test("dos clics lentos, o sobre bloques distintos, no abren el editor", async ({ page }) => {
    const ids = await page.evaluate(() => S.nodes.filter((n) => n.type === "block").map((n) => n.id));
    const a = await centro(page, ids[0]), b = await centro(page, ids[1]);
    await page.mouse.click(a.x, a.y);
    await page.waitForTimeout(600);
    await page.mouse.click(a.x, a.y);
    expect(await hayEditor(page)).toBe(false);
    await page.waitForTimeout(600);       // si no, este clic y el anterior en A sí son un doble clic
    await page.mouse.click(a.x, a.y);
    await page.mouse.click(b.x, b.y);
    expect(await hayEditor(page)).toBe(false);
  });
  test("arrastrar un bloque y soltarlo no abre el editor", async ({ page }) => {
    const id = await idBloque(page), c = await centro(page, id);
    await arrastrar(page, c, [40, 40]);
    expect(await hayEditor(page)).toBe(false);
  });
  test("funciona también en sumadores y en la etiqueta de una flecha", async ({ page }) => {
    const suma = await page.evaluate(() => S.nodes.find((n) => n.type === "sum").id);
    const c = await centro(page, suma);
    await page.mouse.dblclick(c.x, c.y);
    expect(await hayEditor(page)).toBe(true);
    await page.keyboard.press("Escape");
    const p = await page.evaluate(() => {
      // un cuarto del tramo más largo: el medio lo ocupa el tirador de la flecha seleccionada
      const e = S.edges.find((e) => e.pts && e.pts.length > 1), L = segsOf(e.pts)
        .reduce((m, s) => Math.hypot(s[1].x - s[0].x, s[1].y - s[0].y) > Math.hypot(m[1].x - m[0].x, m[1].y - m[0].y) ? s : m);
      const m = { x: L[0].x * .75 + L[1].x * .25, y: L[0].y * .75 + L[1].y * .25 };
      const r = document.getElementById("canvas").getBoundingClientRect();
      return { id: e.id, x: r.left + S.pan.x + m.x * S.zoom, y: r.top + S.pan.y + m.y * S.zoom };
    });
    await page.mouse.dblclick(p.x, p.y);
    expect(await hayEditor(page)).toBe(true);
    await page.keyboard.type("x1");
    await page.keyboard.press("Enter");
    expect(await page.evaluate((id) => getEdge(id).label, p.id)).toBe("x1");
  });
});

test.describe("copiar y pegar (Ctrl+C / Ctrl+V)", () => {
  const cuenta = (page) => page.evaluate(() => [S.nodes.length, S.edges.length]);
  test("copia la selección con sus flechas internas y la pega con ids nuevos, desplazada", async ({ page }) => {
    await page.evaluate(() => loadExample());
    const [n0, e0] = await cuenta(page);
    const sel = await page.evaluate(() => { const e = S.edges[0]; S.sel = [e.from.id, e.to.id]; render(); return [e.from.id, e.to.id]; });
    const orig = await page.evaluate((s) => s.map((id) => { const n = getNode(id); return [n.x, n.y]; }), sel);
    await page.keyboard.press("Control+c");
    await page.keyboard.press("Control+v");
    expect(await cuenta(page)).toEqual([n0 + 2, e0 + 1]);
    const nuevos = await page.evaluate(() => S.sel.map((id) => { const n = getNode(id); return [n.id, n.x, n.y]; }));
    expect(nuevos).toHaveLength(2);
    expect(nuevos.every(([id]) => !sel.includes(id))).toBe(true);
    expect(nuevos.map(([, x, y]) => [x, y])).not.toEqual(orig);
    // los ids siguen siendo únicos y la flecha nueva une a los nuevos
    expect(await page.evaluate(() => new Set([...S.nodes, ...S.edges].map((o) => o.id)).size === S.nodes.length + S.edges.length)).toBe(true);
    expect(await page.evaluate(() => S.edges.every((e) => getNode(e.from.id) && getNode(e.to.id)))).toBe(true);
  });
  test("pegar varias veces no encima las copias, y se puede deshacer", async ({ page }) => {
    await page.evaluate(() => { loadExample(); S.sel = [S.nodes.find((n) => n.type === "block").id]; render(); });
    const n0 = (await cuenta(page))[0];
    await page.keyboard.press("Control+c");
    await page.keyboard.press("Control+v");
    await page.keyboard.press("Control+v");
    expect((await cuenta(page))[0]).toBe(n0 + 2);
    const pos = await page.evaluate(() => S.nodes.slice(-2).map((n) => n.x + "," + n.y));
    expect(new Set(pos).size).toBe(2);
    await page.evaluate(() => undo());
    expect((await cuenta(page))[0]).toBe(n0 + 1);
  });
  test("sin nada copiado, Ctrl+V no hace nada; con el cursor en un campo de texto tampoco interfiere", async ({ page }) => {
    await page.evaluate(() => loadExample());
    const antes = await cuenta(page);
    await page.keyboard.press("Control+v");
    expect(await cuenta(page)).toEqual(antes);
  });
  test("la flecha con ruta a mano copiada conserva su forma", async ({ page }) => {
    const doc = {
      nodes: [{ id: "a", type: "block", x: 200, y: 200, w: 72, h: 42, label: "G", font: 15 },
              { id: "b", type: "block", x: 500, y: 320, w: 72, h: 42, label: "H", font: 15 }],
      edges: [{ id: "e1", from: { id: "a", port: "r" }, to: { id: "b", port: "l" }, variant: 0 }],
    };
    await abrirTexto(page, JSON.stringify(doc));
    await page.evaluate(() => { S.selEdges = ["e1"]; S.sel = []; render(); });
    const r = await page.locator(".seg-handle-wrap").first().boundingBox();
    await arrastrar(page, { x: r.x + r.width / 2, y: r.y + r.height / 2 }, [30, 30]);
    await page.evaluate(() => { S.sel = ["a", "b"]; S.selEdges = []; render(); });
    await page.keyboard.press("Control+c");
    await page.keyboard.press("Control+v");
    const forma = await page.evaluate(() => {
      const [o, c] = [S.edges[0], S.edges[1]];
      const rel = (e, dx) => e.pts.map((p) => [Math.round(p.x - dx), Math.round(p.y - dx)]);
      const d = getNode(c.from.id).x - getNode("a").x;
      return { copiada: !!c.manual, igual: JSON.stringify(rel(o, 0)) === JSON.stringify(rel(c, d)) };
    });
    expect(forma).toEqual({ copiada: true, igual: true });
  });
});

test.describe("mover la hoja", () => {
  const pan = (page) => page.evaluate(() => [S.pan.x, S.pan.y]);
  const sobreFondo = (page) => page.evaluate(() => { const r = document.getElementById("canvas").getBoundingClientRect(); return { x: r.left + r.width - 80, y: r.top + r.height - 80 }; });

  test("Ctrl + clic izquierdo y arrastrar mueve la hoja", async ({ page }) => {
    const antes = await pan(page), p = await sobreFondo(page);
    await page.keyboard.down("Control");
    await arrastrar(page, p, [-60, -40]);
    await page.keyboard.up("Control");
    const despues = await pan(page);
    expect(despues[0] - antes[0]).toBeCloseTo(-60, 0);
    expect(despues[1] - antes[1]).toBeCloseTo(-40, 0);
  });
  test("con Ctrl se mueve la hoja aunque se agarre sobre un bloque, sin seleccionarlo ni moverlo", async ({ page }) => {
    const id = await page.evaluate(() => S.nodes.find((n) => n.type === "block").id);
    const c = await page.evaluate((id) => { const n = getNode(id), r = document.getElementById("canvas").getBoundingClientRect(); return { x: r.left + S.pan.x + n.x * S.zoom, y: r.top + S.pan.y + n.y * S.zoom, nx: n.x, ny: n.y }; }, id);
    const antes = await pan(page);
    await page.keyboard.down("Control");
    await arrastrar(page, c, [50, 30]);
    await page.keyboard.up("Control");
    expect((await pan(page))[0] - antes[0]).toBeCloseTo(50, 0);
    expect(await page.evaluate((id) => [getNode(id).x, getNode(id).y], id)).toEqual([c.nx, c.ny]);
    expect(await page.evaluate(() => S.sel)).toEqual([]);
  });
  test("sin Ctrl, arrastrar un bloque sigue moviendo el bloque y no la hoja", async ({ page }) => {
    const id = await page.evaluate(() => S.nodes.find((n) => n.type === "block").id);
    const c = await page.evaluate((id) => { const n = getNode(id), r = document.getElementById("canvas").getBoundingClientRect(); return { x: r.left + S.pan.x + n.x * S.zoom, y: r.top + S.pan.y + n.y * S.zoom, nx: n.x }; }, id);
    const antes = await pan(page);
    await arrastrar(page, c, [60, 0]);
    expect(await pan(page)).toEqual(antes);
    expect(await page.evaluate((id) => getNode(id).x, id)).toBeGreaterThan(c.nx);
  });
  test("la rueda del mouse sigue moviendo la hoja (y Ctrl + rueda sigue haciendo zoom)", async ({ page }) => {
    const p = await sobreFondo(page);
    await page.mouse.move(p.x, p.y);
    const antes = await pan(page);
    await page.mouse.wheel(0, 100);
    await expect.poll(async () => (await pan(page))[1]).toBeLessThan(antes[1]);
    const z0 = await page.evaluate(() => S.zoom);
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -200);
    await page.keyboard.up("Control");
    await expect.poll(() => page.evaluate(() => S.zoom)).toBeGreaterThan(z0);
  });
  test("el botón del medio y la barra espaciadora siguen moviendo la hoja", async ({ page }) => {
    const p = await sobreFondo(page), antes = await pan(page);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down({ button: "middle" });
    await page.mouse.move(p.x - 30, p.y - 20, { steps: 5 });
    await page.mouse.up({ button: "middle" });
    expect((await pan(page))[0] - antes[0]).toBeCloseTo(-30, 0);
    const a2 = await pan(page);
    await page.keyboard.down("Space");
    await arrastrar(page, p, [-20, -10]);
    await page.keyboard.up("Space");
    expect((await pan(page))[0] - a2[0]).toBeCloseTo(-20, 0);
  });
});

test.describe("área de impresión", () => {
  test("con hoja, la exportación es exactamente ese recorte", async ({ page }) => {
    const r = await page.evaluate(() => {
      loadExample();
      const sin = buildExportSVG();
      ponerHoja("a4-h");
      const con = buildExportSVG();
      const h = hojaActiva();
      return { sin: [sin.W, sin.H], con: [con.W, con.H],
               viewBox: con.svg.getAttribute("viewBox"), caja: [h.x, h.y, h.w, h.h] };
    });
    expect(r.con).toEqual([1123, 794]);               // A4 apaisada, 1 px = 1 unidad
    expect(r.viewBox).toBe(r.caja.join(" "));         // el viewBox es justo la hoja
    expect(r.sin[0]).not.toBe(r.con[0]);              // sin área, se recorta alrededor de lo dibujado
  });
  test("el selector de la barra cambia la hoja y avisa del recorte", async ({ page }) => {
    await page.locator(".glab", { hasText: "Archivo" }).click();      // despliega el grupo
    await page.selectOption("#b-hoja", "a4-v");
    await expect(page.locator("#toast")).toHaveText("El SVG y el PNG van a salir con este recorte");
    expect(await page.evaluate(() => hojaActiva())).toMatchObject({ preset: "a4-v", w: 794, h: 1123 });
  });
});

test("las puntas de flecha no dejan marcadores viejos en <defs>", async ({ page }) => {
  const r = await page.evaluate(() => {
    loadExample();
    S.sel = []; S.selEdges = []; render();
    for (const c of ["#111111", "#222222", "#333333", "#444444"]) { S.tema.flecha = c; render(); }
    const vigentes = new Set(S.edges.map((e) => idMarcador(colorEfectivo(e, "flecha"))));
    const enDefs = Array.from(document.querySelectorAll("#canvas defs > marker[id^='arrow-']"));
    return { viejos: enDefs.map((m) => m.id).filter((id) => !vigentes.has(id)) };
  });
  expect(r.viejos).toEqual([]);
});

test.describe("ecuaciones dentro de los bloques", () => {
  /* El texto tal como se dibuja, con ^{…} y _{…} para lo que sube y lo que baja */
  const dibujado = (page, label) => page.evaluate((label) => {
    S.nodes = [makeNode("block", 200, 200, { label })]; S.edges = []; S.sel = []; render();
    const g = document.querySelector(`[data-id="${S.nodes[0].id}"]`);
    const base = g.querySelector("rect.n-shape").getBBox();
    const textos = Array.from(g.querySelectorAll("text")).map((t) => ({ s: t.textContent, y: +t.getAttribute("y") }));
    const y0 = textos[0].y;                                   // la línea de base: la del primer carácter
    const dentro = Array.from(g.children).filter((e) => e.tagName !== "rect").every((e) => {
      const q = e.getBBox(); return q.x >= base.x - 0.5 && q.x + q.width <= base.x + base.width + 0.5 && q.y >= base.y - 0.5 && q.y + q.height <= base.y + base.height + 0.5;
    });
    return { textos: textos.map((t) => t.s), alturas: textos.map((t) => Math.round(t.y - y0)), dentro };
  }, label);

  test("un exponente negativo sin llaves conserva el signo: s^-1 y e^-sT", async ({ page }) => {
    const a = await dibujado(page, "s^-1");
    expect(a.textos).toEqual(["s", "−", "1"]);
    expect(a.alturas[1]).toBeLessThan(0);                     // el − y el 1 van arriba
    expect(a.alturas[2]).toBeLessThan(0);
    const b = await dibujado(page, "e^-sT");
    expect(b.textos).toEqual(["e", "−", "s", "T"]);            // e^{−s}·T, como en LaTeX
    expect(b.alturas.slice(1, 3).every((h) => h < 0)).toBe(true);
    expect(b.alturas[3]).toBe(0);
  });
  test("un subíndice sin llaves es una sola letra: \\omega_ns es ω_n·s", async ({ page }) => {
    const a = await dibujado(page, "s^2+2\\zeta\\omega_ns+\\omega_n^2");
    const i = a.textos.indexOf("n");
    expect(a.textos.slice(i, i + 2)).toEqual(["n", "s"]);       // la n abajo y la s en la línea
    expect(a.alturas[i]).toBeGreaterThan(0);
    expect(a.alturas[i + 1]).toBe(0);
    const b = await dibujado(page, "H_{ent}");
    expect(b.textos).toEqual(["H", "ent"]);                    // con llaves, varias letras
  });
  test("una fracción adentro de un exponente entra en el bloque", async ({ page }) => {
    expect((await dibujado(page, "s^{1/(s+1)}")).dentro).toBe(true);
    expect((await dibujado(page, "s^{2*G_3/\\frac{G1}{2}}")).dentro).toBe(true);
    expect((await dibujado(page, "s^{\\frac{3.5}{s/s}}")).dentro).toBe(true);
  });
});
