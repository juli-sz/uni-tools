/* Las páginas de la raíz se arman con src/construir.js: tienen que estar al día con sus
   fuentes y no pueden quedar con restos del armado. */
const { test, expect } = require("@playwright/test");
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");

const RAIZ = path.resolve(__dirname, "..", "..");
const PAGINAS = ["diagrama-bloque.html", "simulador-logico.html", "diagrama-señales.html"];

test("las páginas de la raíz coinciden con lo que arma src/construir.js", () => {
  // si falla: correr «node src/construir.js» y commitear las páginas que cambien
  const salida = execFileSync(process.execPath, [path.join(RAIZ, "src", "construir.js"), "--comprobar"], { encoding: "utf8" });
  expect(salida).toContain("al día");
});

for (const p of PAGINAS) {
  test(`${p}: sin directivas ni parámetros sin resolver, con LF y un solo <script>`, () => {
    const html = fs.readFileSync(path.join(RAIZ, p), "utf8");
    expect(html).not.toMatch(/@incluir/);
    expect(html).not.toMatch(/\{\{[\w-]+\}\}/);
    expect(html).not.toContain("\r");
    expect(html.match(/<script>/g)).toHaveLength(1);
    expect(html).not.toMatch(/<script\s+src|<link[^>]+stylesheet/);
  });
}
