/* Lo que las tres herramientas comparten desde src/comun: tiene que comportarse igual en
   las tres. Cada prueba corre una vez por herramienta. */
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const { abrir } = require("./ayudas");

const HERRAMIENTAS = [
  { archivo: "diagrama-bloque.html", lista: "nodes", uniones: "edges", preparar: "loadExample()" },
  { archivo: "simulador-logico.html", lista: "nodes", uniones: "wires", preparar: "cargarEjemplo('half')" },
  { archivo: "diagrama-señales.html", lista: "nodos", uniones: "ramas", preparar: "cargarEjemplo('dos')" },
];

/* Un punto del fondo de la hoja, lejos de todo lo dibujado */
const sobreFondo = (page) => page.evaluate(() => {
  const r = document.getElementById("canvas").getBoundingClientRect();
  return { x: r.left + r.width - 60, y: r.top + r.height - 60 };
});

for (const h of HERRAMIENTAS) {
  test.describe(h.archivo, () => {
    test.beforeEach(async ({ page }, info) => { info.errores = await abrir(page, h.archivo); await page.evaluate(h.preparar); });
    test.afterEach(async ({}, info) => { expect(info.errores).toEqual([]); });

    test("Ctrl+D sin nada seleccionado avisa y no toca el diagrama ni el historial", async ({ page }) => {
      const antes = await page.evaluate(([l, u]) => { S.sel = []; render(); return [JSON.stringify(docDatos()), undoStack.length, S[l].length, S[u].length]; }, [h.lista, h.uniones]);
      await page.keyboard.press("Control+d");
      await expect(page.locator("#toast")).toHaveText("Elegí algo para duplicar");
      const despues = await page.evaluate(([l, u]) => [JSON.stringify(docDatos()), undoStack.length, S[l].length, S[u].length], [h.lista, h.uniones]);
      expect(despues).toEqual(antes);
    });

    test("el aviso se queda el tiempo suficiente para leerlo y la cruz lo cierra", async ({ page }) => {
      // Cuánto dura el aviso se mide adentro de la página (con la suite en paralelo, el
      // driver puede hablar con el navegador más tarde y correr cualquier espera fija)
      await page.evaluate(() => {
        const t = document.getElementById("toast");
        window.__aviso = { aparece: 0, seVa: 0 };
        const vigilar = () => {
          const ahora = performance.now();
          if (t.classList.contains("show") && !window.__aviso.aparece) window.__aviso.aparece = ahora;
          else if (window.__aviso.aparece && !t.classList.contains("show") && !window.__aviso.seVa) window.__aviso.seVa = ahora;
          requestAnimationFrame(vigilar);
        };
        vigilar();
      });
      await page.evaluate(() => { S.sel = []; render(); });
      await page.keyboard.press("Control+d");
      const duracion = await page.evaluate(() => new Promise((res) => {
        const iv = setInterval(() => {
          if (window.__aviso.seVa) { clearInterval(iv); res(Math.round(window.__aviso.seVa - window.__aviso.aparece)); }
        }, 50);
        setTimeout(() => { clearInterval(iv); res(-1); }, 9000);
      }));
      expect(duracion).toBeGreaterThanOrEqual(2600);        // el mensaje corto ya dura ~3 s (antes: 1900 ms)
      // la cruz: con el aviso a la vista se puede apretar y lo cierra; oculta, no se come clics
      const cruz = await page.evaluate(() => {
        const t = document.getElementById("toast");
        toast("Un aviso de prueba", 60000);
        const x = t.querySelector(".x");
        const visible = getComputedStyle(x).pointerEvents;
        x.click();
        return [visible, getComputedStyle(x).pointerEvents, t.classList.contains("show")];
      });
      expect(cruz).toEqual(["auto", "none", false]);
    });

    test("duplicar deja un solo paso en el historial: un Ctrl+Z lo deshace entero", async ({ page }) => {
      const [n0, deshacer0] = await page.evaluate((l) => { S.sel = [S[l][0].id, S[l][1].id]; render(); return [S[l].length, undoStack.length]; }, h.lista);
      // por el botón del panel donde lo hay (bloques y simulador), si no por el teclado
      const boton = page.locator("#n-dup");
      if (await boton.count()) await boton.click(); else await page.keyboard.press("Control+d");
      expect(await page.evaluate(([l, d]) => [S[l].length, undoStack.length - d], [h.lista, deshacer0])).toEqual([n0 + 2, 1]);
      await page.keyboard.press("Control+z");
      expect(await page.evaluate((l) => S[l].length, h.lista)).toBe(n0);
    });

    test("? abre la ayuda y Esc la cierra", async ({ page }) => {
      await page.mouse.click(...Object.values(await sobreFondo(page)));
      await page.keyboard.press("Shift+?");
      await expect(page.locator("#ov-help")).toHaveClass(/show/);
      await page.keyboard.press("Escape");
      await expect(page.locator("#ov-help")).not.toHaveClass(/show/);
    });

    test("Shift + rueda mueve la hoja a lo ancho; Ctrl + rueda hace zoom sin correr el punto del puntero", async ({ page }) => {
      const p = await sobreFondo(page);
      await page.mouse.move(p.x, p.y);
      const antes = await page.evaluate(() => [S.pan.x, S.pan.y]);
      await page.keyboard.down("Shift"); await page.mouse.wheel(0, 100); await page.keyboard.up("Shift");
      await expect.poll(() => page.evaluate(() => S.pan.x)).toBeLessThan(antes[0]);
      expect(await page.evaluate(() => S.pan.y)).toBe(antes[1]);
      // el punto de la hoja que está debajo del puntero no se mueve al hacer zoom
      const enHoja = () => page.evaluate(([x, y]) => {
        const r = document.getElementById("canvas").getBoundingClientRect();
        return [(x - r.left - S.pan.x) / S.zoom, (y - r.top - S.pan.y) / S.zoom];
      }, [p.x, p.y]);
      const w0 = await enHoja(), z0 = await page.evaluate(() => S.zoom);
      await page.keyboard.down("Control"); await page.mouse.wheel(0, -200); await page.keyboard.up("Control");
      await expect.poll(() => page.evaluate(() => S.zoom)).toBeGreaterThan(z0);
      const w1 = await enHoja();
      expect(w1[0]).toBeCloseTo(w0[0], 6);
      expect(w1[1]).toBeCloseTo(w0[1], 6);
    });

    test("el nombre del archivo saca los caracteres que no admite ningún sistema operativo", async ({ page }) => {
      const nombres = await page.evaluate(() => [limpiarNombre('a\\b/c:d*e?f"g<h>i|j'), limpiarNombre("  hola   mundo  "), limpiarNombre(""), limpiarNombre("x".repeat(80)).length]);
      expect(nombres[0]).toBe("a-b-c-d-e-f-g-h-i-j");
      expect(nombres[1]).toBe("hola mundo");
      expect(nombres[2]).toBe(await page.evaluate(() => NOMBRE_DEF));
      expect(nombres[3]).toBe(60);
    });

    test("al encuadrar, la paleta flotante no tapa nada de lo dibujado", async ({ page }) => {
      const tapados = await page.evaluate((h) => {
        const ejemplos = h.archivo.startsWith("simulador") ? ["half", "full", "latch", "mux", "cont", "regd"]
          : h.archivo.startsWith("diagrama-se") ? ["simple", "dos", "disjuntos", "dostray"] : [null];
        const malos = [];
        for (const ej of ejemplos) {
          if (ej) cargarEjemplo(ej); else loadExample();
          fit();
          const p = document.getElementById("palette").getBoundingClientRect();
          document.querySelectorAll("#viewport [data-id]").forEach((g) => {
            const b = g.getBoundingClientRect();
            if (b.left < p.right && b.right > p.left && b.top < p.bottom && b.bottom > p.top) malos.push((ej || "ejemplo") + ": " + g.dataset.id);
          });
        }
        return malos;
      }, h);
      expect(tapados).toEqual([]);
    });

    test("la ventana Abrir explica que el SVG exportado se puede volver a abrir", async ({ page }) => {
      await page.evaluate(() => document.getElementById("b-open").click());
      await expect(page.locator("#ov-io")).toHaveClass(/show/);
      await expect(page.locator("#ov-io .sub")).toContainText("así que se puede volver a abrir y editar");
      await page.locator("#io-cancel").click();
      await expect(page.locator("#ov-io")).not.toHaveClass(/show/);
    });

    test("el PNG se descarga y es un PNG del triple del recorte exportado", async ({ page }) => {
      const { W, H } = await page.evaluate(() => { const r = buildExportSVG(); return { W: r.W, H: r.H }; });
      const [descarga] = await Promise.all([
        page.waitForEvent("download"),
        page.evaluate(() => document.getElementById("b-png").click()),
      ]);
      expect(await descarga.failure()).toBeNull();
      expect(descarga.suggestedFilename()).toMatch(".png");
      const bytes = fs.readFileSync(await descarga.path());
      expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");   // firma del PNG
      const ancho = bytes.readUInt32BE(16), alto = bytes.readUInt32BE(20);
      expect(Math.abs(ancho - W * 3)).toBeLessThanOrEqual(1);                 // se dibuja al triple
      expect(ancho / alto).toBeCloseTo(W / H, 2);
    });

    test("el documento guardado lleva la versión del formato, también adentro del SVG", async ({ page }) => {
      const v = await page.evaluate(() => [docDatos().version, VERSION_DOC]);
      expect(Number.isInteger(v[0]) && v[0] >= 1).toBe(true);
      expect(v[0]).toBe(v[1]);
      const enSVG = await page.evaluate(() =>
        JSON.parse(buildExportSVG().svg.querySelector("metadata").textContent).version);
      expect(enSVG).toBe(v[0]);
    });

    test("gestos táctiles: un dedo en el fondo mueve la hoja y dos dedos hacen zoom", async ({ page }) => {
      const puntero = (tipo, id, x, y) => page.evaluate(([tipo, id, x, y]) => {
        document.getElementById("canvas").dispatchEvent(new PointerEvent(tipo, {
          pointerId: id, pointerType: "touch", isPrimary: id === 1,
          clientX: x, clientY: y, bubbles: true, cancelable: true }));
      }, [tipo, id, x, y]);
      const p = await sobreFondo(page);
      // un dedo en el fondo: la hoja se corre con el dedo
      const pan0 = await page.evaluate(() => ({ x: S.pan.x, y: S.pan.y }));
      await puntero("pointerdown", 1, p.x, p.y);
      await puntero("pointermove", 1, p.x + 60, p.y + 30);
      await puntero("pointerup", 1, p.x + 60, p.y + 30);
      const pan1 = await page.evaluate(() => ({ x: S.pan.x, y: S.pan.y }));
      expect(pan1.x - pan0.x).toBeCloseTo(60, 0);
      expect(pan1.y - pan0.y).toBeCloseTo(30, 0);
      // dos dedos que se separan al doble: el zoom se duplica sobre el mismo punto de la hoja
      await page.evaluate(() => { S.zoom = 1; render(); });
      const enHoja = (x, y) => page.evaluate(([x, y]) => {
        const r = document.getElementById("canvas").getBoundingClientRect();
        return [(x - r.left - S.pan.x) / S.zoom, (y - r.top - S.pan.y) / S.zoom];
      }, [x, y]);
      const w0 = await enHoja(p.x, p.y);
      await puntero("pointerdown", 1, p.x - 50, p.y);
      await puntero("pointerdown", 2, p.x + 50, p.y);
      await puntero("pointermove", 1, p.x - 100, p.y);
      await puntero("pointermove", 2, p.x + 100, p.y);
      await puntero("pointerup", 1, p.x - 100, p.y);
      await puntero("pointerup", 2, p.x + 100, p.y);
      expect(await page.evaluate(() => S.zoom)).toBeCloseTo(2, 2);
      const w1 = await enHoja(p.x, p.y);
      expect(w1[0]).toBeCloseTo(w0[0], 3);
      expect(w1[1]).toBeCloseTo(w0[1], 3);
    });
  });
}
