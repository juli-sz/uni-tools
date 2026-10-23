/* Botón «Inicio», aviso antes de salir y autoguardado por herramienta. */
const { test, expect } = require("@playwright/test");
const { abrir } = require("./ayudas");

const HERRAMIENTAS = [
  { archivo: "diagrama-bloque.html", lista: "nodes", clave: "bloque",
    agregar: () => { S.nodes.push(makeNode("block", 900, 600, { label: "Nuevo" })); commit(); render(); } },
  { archivo: "simulador-logico.html", lista: "nodes", clave: "simulador",
    agregar: () => { S.nodes.push(makeNode("and", 900, 600, { label: "Nuevo" })); commit(); render(); } },
  { archivo: "diagrama-señales.html", lista: "nodos", clave: "senales",
    agregar: () => { S.nodos.push(nuevoNodo(900, 600, { nombre: "Nuevo" })); commit(); render(); } },
];
const etiquetas = (page, lista) => page.evaluate((k) => S[k].map((n) => n.label !== undefined ? n.label : n.nombre), lista);

for (const h of HERRAMIENTAS) {
  test.describe(h.archivo, () => {
    test("tiene un botón Inicio visible que lleva a la portada", async ({ page }) => {
      const errores = await abrir(page, h.archivo);
      const b = page.locator("#b-inicio");
      await expect(b).toBeVisible();
      expect(await b.getAttribute("href")).toBe("index.html");
      expect(errores).toEqual([]);
    });

    test("sin nada guardado arranca con el ejemplo de siempre", async ({ page }) => {
      await abrir(page, h.archivo);
      expect(await page.evaluate((k) => S[k].length, h.lista)).toBeGreaterThan(0);
      expect(await page.evaluate(() => undoStack.length)).toBe(0);
    });

    test("avisa antes de ir al inicio; si se cancela, se queda", async ({ page }) => {
      await abrir(page, h.archivo);
      let mensaje = null;
      page.once("dialog", (d) => { mensaje = d.message(); d.dismiss(); });
      await page.click("#b-inicio");
      expect(mensaje).toMatch(/Volver al inicio/);
      expect(mensaje).toMatch(/queda guardado/);
      expect(page.url()).toContain(encodeURI(h.archivo));
    });

    test("al aceptar va al inicio, y al volver recupera el diagrama tal como quedó", async ({ page }) => {
      await abrir(page, h.archivo);
      await page.evaluate(h.agregar);
      const antes = await etiquetas(page, h.lista);
      page.once("dialog", (d) => d.accept());
      await page.click("#b-inicio");
      await page.waitForURL(/index\.html$/);
      // la portada avisa que hay algo guardado en esa herramienta
      await expect(page.locator(`[data-auto="${h.clave}"] .guardado`)).toBeVisible();
      await page.click(`[data-auto="${h.clave}"]`);
      await page.waitForFunction(() => typeof S !== "undefined" && typeof autoActivo !== "undefined" && autoActivo);
      expect(await etiquetas(page, h.lista)).toEqual(antes);
      await expect(page.locator("#toast")).toContainText("Se recuperó");
    });

    test("con la hoja vacía va directo, sin preguntar", async ({ page }) => {
      await abrir(page, h.archivo);
      await page.evaluate((k) => { S[k] = []; (S.edges || S.wires || S.ramas).length = 0; commit(); render(); }, h.lista);
      let pregunto = false;
      page.on("dialog", (d) => { pregunto = true; d.accept(); });
      await page.click("#b-inicio");
      await page.waitForURL(/index\.html$/);
      expect(pregunto).toBe(false);
    });

    test("se guarda solo, también lo deshecho, y sobrevive a recargar la página", async ({ page }) => {
      await abrir(page, h.archivo);
      await page.evaluate(h.agregar);
      await page.evaluate(h.agregar);
      await page.evaluate(() => undo());                 // queda un solo "Nuevo"
      const antes = await etiquetas(page, h.lista);
      await page.reload();
      await page.waitForFunction(() => typeof autoActivo !== "undefined" && autoActivo);
      expect(await etiquetas(page, h.lista)).toEqual(antes);
      expect((await etiquetas(page, h.lista)).filter((e) => e === "Nuevo")).toHaveLength(1);
    });

    test("un autoguardado roto no rompe nada: arranca con el ejemplo", async ({ page }) => {
      await page.goto("/index.html");
      await page.evaluate((c) => localStorage.setItem("uni-tools-autoguardado-" + c, "{roto"), h.clave);
      const errores = await abrir(page, h.archivo);
      expect(await page.evaluate((k) => S[k].length, h.lista)).toBeGreaterThan(0);
      expect(errores).toEqual([]);
    });
  });
}

test("cada herramienta guarda lo suyo: no se pisan entre sí", async ({ page }) => {
  await abrir(page, "diagrama-bloque.html");
  await page.evaluate(() => { S.nodes = [makeNode("block", 100, 100, { label: "SoloBloques" })]; S.edges = []; commit(); render(); });
  await page.evaluate(() => guardarAhora());
  await abrir(page, "simulador-logico.html");
  expect(await page.evaluate(() => S.nodes.some((n) => n.label === "SoloBloques"))).toBe(false);
  await abrir(page, "diagrama-bloque.html");
  expect(await page.evaluate(() => S.nodes.map((n) => n.label))).toEqual(["SoloBloques"]);
});
