/* El lienzo tiene que seguir respondiendo después de copiar, pegar, mover y deseleccionar
   (en Firefox quedaba trabado por la selección / arrastre nativo del navegador). */
const { test, expect } = require("@playwright/test");
const { abrir } = require("./ayudas");

const HERRAMIENTAS = [["diagrama-bloque.html", "nodes"], ["simulador-logico.html", "nodes"], ["diagrama-señales.html", "nodos"]];

for (const [archivo, clave] of HERRAMIENTAS) {
  test.describe(archivo, () => {
    test("el navegador no puede seleccionar ni arrastrar el lienzo", async ({ page }) => {
      const errores = await abrir(page, archivo);
      expect(await page.evaluate(() => getComputedStyle(document.getElementById("canvas")).userSelect)).toBe("none");
      const r = await page.evaluate(() => {
        const svgEl = document.getElementById("canvas");
        const f = (tipo) => { const e = new Event(tipo, { bubbles: true, cancelable: true }); svgEl.dispatchEvent(e); return e.defaultPrevented; };
        return { drag: f("dragstart"), seleccion: f("selectstart") };
      });
      expect(r).toEqual({ drag: true, seleccion: true });
      expect(errores).toEqual([]);
    });

    test("mover la hoja (arrastre o rueda) no redibuja todo: sólo corre la vista", async ({ page }) => {
      const errores = await abrir(page, archivo);
      await page.evaluate(() => { window.__renders = 0; const r = render; render = function () { window.__renders++; return r.apply(this, arguments); }; });
      const p = await page.evaluate(() => { const r = document.getElementById("canvas").getBoundingClientRect(); return { x: r.right - 90, y: r.bottom - 90 }; });
      const antes = await page.evaluate(() => [S.pan.x, S.pan.y]);
      const dibujo = await page.evaluate(() => document.getElementById("viewport").innerHTML.length);
      await page.keyboard.down("Control");
      await page.mouse.move(p.x, p.y); await page.mouse.down();
      await page.evaluate(() => { window.__renders = 0; });
      await page.mouse.move(p.x - 40, p.y - 25, { steps: 10 });
      const durante = await page.evaluate(() => window.__renders);
      await page.mouse.up(); await page.keyboard.up("Control");
      expect(durante).toBe(0);
      const d = await page.evaluate(() => [S.pan.x, S.pan.y]);
      expect([Math.round(d[0] - antes[0]), Math.round(d[1] - antes[1])]).toEqual([-40, -25]);
      expect(await page.evaluate(() => document.getElementById("viewport").getAttribute("transform")))
        .toBe(`translate(${d[0]},${d[1]}) scale(${await page.evaluate(() => S.zoom)})`);
      // la rueda mueve sin redibujar; Ctrl + rueda (zoom) sí redibuja
      await page.evaluate(() => { window.__renders = 0; });
      await page.mouse.wheel(0, 120);
      await expect.poll(() => page.evaluate(() => S.pan.y)).toBeLessThan(d[1]);
      expect(await page.evaluate(() => window.__renders)).toBe(0);
      await page.keyboard.down("Control"); await page.mouse.wheel(0, -120); await page.keyboard.up("Control");
      await expect.poll(() => page.evaluate(() => window.__renders)).toBeGreaterThan(0);
      // y lo dibujado sigue igual
      expect(await page.evaluate(() => document.getElementById("viewport").innerHTML.length)).toBeGreaterThan(dibujo * 0.5);
      expect(errores).toEqual([]);
    });

    test("una selección de texto que haya quedado se limpia al apretar sobre el lienzo", async ({ page }) => {
      await abrir(page, archivo);
      await page.evaluate(() => { const s = getSelection(), r = document.createRange(); r.selectNodeContents(document.body); s.removeAllRanges(); s.addRange(r); });
      expect(await page.evaluate(() => getSelection().isCollapsed)).toBe(false);
      const p = await page.evaluate(() => { const r = document.getElementById("canvas").getBoundingClientRect(); return { x: r.right - 90, y: r.bottom - 90 }; });
      await page.mouse.click(p.x, p.y);
      expect(await page.evaluate(() => getSelection().isCollapsed)).toBe(true);
    });

    test("copiar, pegar, mover lo pegado y deseleccionar deja andando Ctrl+clic y la banda", async ({ page }) => {
      const errores = await abrir(page, archivo);
      const aPantalla = (x, y) => page.evaluate(([x, y]) => { const r = document.getElementById("canvas").getBoundingClientRect(); return { x: r.left + S.pan.x + x * S.zoom, y: r.top + S.pan.y + y * S.zoom }; }, [x, y]);
      // un único elemento, a la vista y lejos de los paneles
      await page.evaluate((k) => {
        const n = S[k].find((n) => n.type === "block" || n.type === "and" || n.tipo === "normal") || S[k][0];
        S[k] = [n]; (S.edges || S.wires || S.ramas).length = 0; n.x = 400; n.y = 300; S.sel = [];
        S.zoom = 1; S.pan = { x: 100, y: 60 }; commit(); render();
      }, clave);
      const id = await page.evaluate((k) => S[k][0].id, clave);
      const c = await aPantalla(400, 300);
      await page.mouse.click(c.x, c.y);                                  // 1. seleccionar
      await page.keyboard.press("Control+c");                            // 2. copiar y pegar
      await page.keyboard.press("Control+v");
      expect(await page.evaluate((k) => S[k].length, clave)).toBe(2);
      const pegado = await page.evaluate(() => S.sel[0]);
      const pos = await page.evaluate(([k, i]) => { const n = S[k].find((n) => n.id === i); return { x: n.x, y: n.y }; }, [clave, pegado]);
      const q = await aPantalla(pos.x, pos.y);
      await page.mouse.move(q.x, q.y); await page.mouse.down();         // 3. mover lo pegado
      await page.mouse.move(q.x + 160, q.y + 90, { steps: 8 }); await page.mouse.up();
      await page.mouse.click(c.x + 400, c.y + 250);                      // 4. clic afuera: deselecciona
      expect(await page.evaluate(() => S.sel.length)).toBe(0);
      // 5. Ctrl+clic mueve la hoja
      const antes = await page.evaluate(() => [S.pan.x, S.pan.y]);
      await page.keyboard.down("Control");
      await page.mouse.move(c.x + 400, c.y + 250); await page.mouse.down();
      await page.mouse.move(c.x + 350, c.y + 220, { steps: 5 }); await page.mouse.up();
      await page.keyboard.up("Control");
      const despues = await page.evaluate(() => [S.pan.x, S.pan.y]);
      expect([Math.round(despues[0] - antes[0]), Math.round(despues[1] - antes[1])]).toEqual([-50, -30]);
      // 6. la banda de selección también anda: encierra al original
      await page.mouse.move(c.x - 120, c.y - 120); await page.mouse.down();
      await page.mouse.move(c.x + 60, c.y + 60, { steps: 6 });
      expect(await page.evaluate(() => drag && drag.kind)).toBe("band");
      await page.mouse.up();
      expect(await page.evaluate(() => drag)).toBeNull();
      expect(await page.evaluate((i) => S.sel.includes(i), id)).toBe(true);
      expect(errores).toEqual([]);
    });
  });
}
