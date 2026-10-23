/* Utilidades compartidas por los specs. */
const { expect } = require("@playwright/test");

/* Abre una herramienta y junta todo error de página/consola. Los errores se
   devuelven en `errores`: cada test decide si exige que esté vacío. */
async function abrir(page, archivo) {
  const errores = [];
  page.on("pageerror", (e) => errores.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errores.push("console: " + m.text()); });
  await page.goto("/" + encodeURI(archivo));
  await page.waitForFunction(() => typeof S !== "undefined" && typeof render === "function");
  return errores;
}

/* Coordenadas de pantalla de un punto del lienzo (x, y del modelo). */
const aPantalla = (page, x, y) => page.evaluate(([x, y]) => {
  const r = document.getElementById("canvas").getBoundingClientRect();
  return { x: r.left + S.pan.x + x * S.zoom, y: r.top + S.pan.y + y * S.zoom };
}, [x, y]);

async function arrastrar(page, desde, delta, pasos = 8) {
  await page.mouse.move(desde.x, desde.y);
  await page.mouse.down();
  await page.mouse.move(desde.x + delta[0], desde.y + delta[1], { steps: pasos });
  await page.mouse.up();
}

/* Intenta abrir un texto como si lo hubiera pegado el usuario; devuelve si algo se rompió. */
const abrirTexto = (page, txt) => page.evaluate((t) => {
  try { abrirTexto(t, "x"); render(); return null; } catch (e) { return String(e); }
}, txt);

module.exports = { abrir, aPantalla, arrastrar, abrirTexto, expect };
