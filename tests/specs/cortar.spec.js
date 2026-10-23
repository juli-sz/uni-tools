/* Ctrl+X corta: copia la selección (con lo que la une por dentro) y la borra.
   El primer Ctrl+V la devuelve al mismo lugar; los siguientes se van corriendo. */
const { test, expect } = require("@playwright/test");
const { abrir } = require("./ayudas");

const HERRAMIENTAS = [
  { archivo: "diagrama-bloque.html", lista: "nodes", uniones: "edges", desde: (e) => e.from.id, hasta: (e) => e.to.id,
    preparar: "loadExample()", nombre: (n) => n.label },
  { archivo: "simulador-logico.html", lista: "nodes", uniones: "wires", desde: (e) => e.from.id, hasta: (e) => e.to.id,
    preparar: "cargarEjemplo('half')", nombre: (n) => n.label },
  { archivo: "diagrama-señales.html", lista: "nodos", uniones: "ramas", desde: (r) => r.de, hasta: (r) => r.a,
    preparar: "cargarEjemplo('dos')", nombre: (n) => n.nombre },
];

for (const h of HERRAMIENTAS) {
  test.describe(h.archivo, () => {
    test.beforeEach(async ({ page }, info) => { info.errores = await abrir(page, h.archivo); await page.evaluate(h.preparar); });
    test.afterEach(async ({}, info) => { expect(info.errores).toEqual([]); });

    // dos elementos unidos entre sí, para que también se corte lo que los une
    const elegirPar = (page) => page.evaluate(([lista, uniones, d, a]) => {
      const desde = new Function("x", "return (" + d + ")(x)"), hasta = new Function("x", "return (" + a + ")(x)");
      const u = S[uniones].find((x) => desde(x) !== hasta(x));
      S.sel = [desde(u), hasta(u)]; render();
      return S.sel.slice();
    }, [h.lista, h.uniones, h.desde.toString(), h.hasta.toString()]);
    const foto = (page) => page.evaluate(([lista, uniones]) => ({
      n: S[lista].length, u: S[uniones].length,
      pos: S[lista].map((n) => [n.x, n.y]).sort().join(";"),
    }), [h.lista, h.uniones]);

    test("Ctrl+X borra la selección y Ctrl+V la devuelve en el mismo lugar, con sus uniones", async ({ page }) => {
      const antes = await foto(page);
      await elegirPar(page);
      await page.keyboard.press("Control+x");
      const cortado = await foto(page);
      expect(cortado.n).toBe(antes.n - 2);
      expect(cortado.u).toBeLessThan(antes.u);
      await page.keyboard.press("Control+v");
      const pegado = await foto(page);
      expect(pegado.n).toBe(antes.n);
      expect(pegado.pos).toBe(antes.pos);                       // mismo lugar
      // lo que los unía por dentro vuelve; lo que los unía con el resto, no (se cortó)
      expect(pegado.u).toBeGreaterThan(cortado.u);
      expect(await page.evaluate(([lista, uniones, d, a]) => {
        const desde = new Function("x", "return (" + d + ")(x)"), hasta = new Function("x", "return (" + a + ")(x)");
        const ids = new Set(S[lista].map((n) => n.id));
        return S[uniones].every((u) => ids.has(desde(u)) && ids.has(hasta(u)));
      }, [h.lista, h.uniones, h.desde.toString(), h.hasta.toString()])).toBe(true);
    });

    test("después de cortar, cada pegado extra sale corrido, y todo se deshace", async ({ page }) => {
      const antes = await foto(page);
      await elegirPar(page);
      await page.keyboard.press("Control+x");
      await page.keyboard.press("Control+v");
      await page.keyboard.press("Control+v");
      const dos = await foto(page);
      expect(dos.n).toBe(antes.n + 2);
      expect(new Set(dos.pos.split(";")).size).toBe(dos.n);     // nada encimado
      await page.evaluate(() => { undo(); undo(); undo(); });
      expect(await foto(page)).toEqual(antes);
    });

    test("pegar lo cortado conserva los nombres, que siguen siendo únicos", async ({ page }) => {
      const sel = await elegirPar(page);
      const nombres = await page.evaluate(([lista, ids, f]) => {
        const nom = new Function("x", "return (" + f + ")(x)");
        return S[lista].filter((n) => ids.includes(n.id)).map(nom).sort();
      }, [h.lista, sel, h.nombre.toString()]);
      await page.keyboard.press("Control+x");
      await page.keyboard.press("Control+v");
      const despues = await page.evaluate(([lista, f]) => {
        const nom = new Function("x", "return (" + f + ")(x)");
        return { sel: S[lista].filter((n) => S.sel.includes(n.id)).map(nom).sort(), todos: S[lista].map(nom) };
      }, [h.lista, h.nombre.toString()]);
      expect(despues.sel).toEqual(nombres);
      const conNombre = despues.todos.filter((x) => x);
      expect(new Set(conNombre).size).toBe(conNombre.length);
    });

    test("sin selección, Ctrl+X no hace nada", async ({ page }) => {
      await page.evaluate(() => { S.sel = []; render(); });
      const antes = await foto(page);
      await page.keyboard.press("Control+x");
      expect(await foto(page)).toEqual(antes);
      await expect(page.locator("#toast")).toContainText("Elegí algo para cortar");
    });
  });
}

test("señales: cortar y pegar la entrada la deja como entrada (Mason sigue andando)", async ({ page }) => {
  await abrir(page, "diagrama-señales.html");
  await page.evaluate(() => { cargarEjemplo("simple"); S.sel = [S.nodos.find((n) => n.tipo === "entrada").id]; render(); });
  const P = await page.evaluate(() => analizar().P.length);
  await page.keyboard.press("Control+x");
  await page.keyboard.press("Control+v");
  expect(await page.evaluate(() => S.nodos.filter((n) => n.tipo === "entrada").length)).toBe(1);
  // la rama que salía de la entrada se cortó con ella (unía con el resto): la trayectoria se pierde
  expect(await page.evaluate(() => analizar().P.length)).toBe(0);
  // y deshacer lo vuelve todo a como estaba
  await page.evaluate(() => { undo(); undo(); });
  expect(await page.evaluate(() => analizar().P.length)).toBe(P);
});
