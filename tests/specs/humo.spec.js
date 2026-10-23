/* Pruebas de humo: cada página abre sin errores y no pide nada fuera del repo. */
const { test, expect } = require("@playwright/test");

const PAGINAS = ["index.html", "diagrama-bloque.html", "simulador-logico.html", "diagrama-señales.html"];

for (const archivo of PAGINAS) {
  test(`${archivo} abre sin errores ni pedidos externos`, async ({ page }) => {
    const errores = [], externos = [];
    page.on("pageerror", (e) => errores.push(e.message));
    page.on("console", (m) => { if (["error", "warning"].includes(m.type())) errores.push(m.text()); });
    page.on("requestfailed", (r) => errores.push("falló: " + r.url()));
    page.on("request", (r) => { if (!r.url().startsWith("http://localhost")) externos.push(r.url()); });
    await page.goto("/" + encodeURI(archivo));
    await page.waitForLoadState("networkidle");
    expect(errores).toEqual([]);
    expect(externos, "la regla es: nada de CDN ni recursos externos").toEqual([]);
    expect(await page.title()).not.toBe("");
  });
}

test("la portada enlaza a las tres herramientas y los enlaces andan", async ({ page, request }) => {
  await page.goto("/index.html");
  const hrefs = await page.$$eval("a.boton", (as) => as.map((a) => a.getAttribute("href")));
  expect(hrefs.sort()).toEqual(["diagrama-bloque.html", "diagrama-señales.html", "simulador-logico.html"].sort());
  for (const h of hrefs) {
    const r = await request.get("/" + encodeURI(h));
    expect(r.ok(), h).toBeTruthy();
  }
});

test("cada herramienta es un único archivo: sin <script src> ni hojas de estilo externas", async ({ request }) => {
  for (const archivo of PAGINAS) {
    const html = await (await request.get("/" + encodeURI(archivo))).text();
    expect(html, archivo).not.toMatch(/<script[^>]+\bsrc\s*=/i);
    expect(html, archivo).not.toMatch(/<link[^>]+rel=["']stylesheet["']/i);
  }
});
