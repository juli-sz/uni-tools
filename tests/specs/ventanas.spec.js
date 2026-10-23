/* Con una ventana abierta, los atajos no pueden tocar el diagrama de atrás, y Ctrl+C tiene que
   copiar el texto seleccionado en la ventana (antes lo bloqueaba el copiar/pegar de elementos). */
const { test, expect } = require("@playwright/test");
const { abrir } = require("./ayudas");

const CASOS = [
  ["diagrama-bloque.html", "nodes", "ov-help", "#ov-help .modal"],
  ["simulador-logico.html", "nodes", "ov-truth", "#tt-body"],
  ["diagrama-señales.html", "nodos", "ov-mason", "#mason-body"],
];

for (const [archivo, clave, ventana, contenido] of CASOS) {
  test.describe(archivo, () => {
    test.beforeEach(async ({ page }, info) => {
      info.errores = await abrir(page, archivo);
      await page.evaluate(([k, v]) => {
        if (typeof cargarEjemplo === "function" && k === "nodes") cargarEjemplo("half");
        if (v === "ov-truth") mostrarTabla();
        else if (v === "ov-mason") mostrarMason();
        else document.getElementById(v).classList.add("show");
      }, [clave, ventana]);
      await expect(page.locator("#" + ventana)).toHaveClass(/show/);
    });
    test.afterEach(async ({}, info) => { expect(info.errores).toEqual([]); });

    test("Ctrl+C copia el texto seleccionado en la ventana", async ({ page }) => {
      await page.evaluate((sel) => {
        window.__copiado = null;
        document.addEventListener("copy", () => { window.__copiado = String(getSelection()); });
        const r = document.createRange(); r.selectNodeContents(document.querySelector(sel));
        getSelection().removeAllRanges(); getSelection().addRange(r);
      }, contenido);
      await page.keyboard.press("Control+c");
      const copiado = await page.evaluate(() => window.__copiado);
      expect(copiado).not.toBeNull();
      expect(copiado.length).toBeGreaterThan(0);
    });

    test("Supr, Ctrl+V, Ctrl+Z, Ctrl+A y las letras no tocan el diagrama de atrás", async ({ page }) => {
      const foto = () => page.evaluate((k) => JSON.stringify([S[k].map((n) => n.id), S.sel]), clave);
      // algo copiado y algo seleccionado, para que cada atajo tuviera de qué agarrarse
      await page.evaluate((k) => { portapapeles = { nodes: [], wires: [], edges: [], nodos: [], ramas: [] }; S.sel = [S[k][0].id]; }, clave);
      const antes = await foto();
      for (const tecla of ["Delete", "Backspace", "Control+v", "Control+z", "Control+a", "Control+d", "b", "s", "n", "1"])
        await page.keyboard.press(tecla);
      expect(await foto()).toBe(antes);
      await expect(page.locator("#" + ventana)).toHaveClass(/show/);
    });

    test("Esc cierra la ventana y después los atajos vuelven a andar", async ({ page }) => {
      await page.keyboard.press("Escape");
      await expect(page.locator("#" + ventana)).not.toHaveClass(/show/);
      await page.evaluate((k) => { S.sel = [S[k][0].id]; render(); }, clave);
      const n = await page.evaluate((k) => S[k].length, clave);
      await page.keyboard.press("Delete");
      expect(await page.evaluate((k) => S[k].length, clave)).toBe(n - 1);
    });
  });
}
