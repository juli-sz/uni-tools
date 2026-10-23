/* Carga fragmentos de src/ dentro de un contexto de Node, igual que los pega la
   página armada: un solo scope global y el mismo orden de inclusión.
   Sirve sólo para archivos puros (sin DOM a la vista del cargador): mason.js, la
   lógica del simulador, el analizador de ecuaciones de bloques…
   Si uno de esos archivos empieza a tocar el DOM al cargarse, acá se nota, y hay
   que probarlo desde el navegador (tests/specs/).
   Uso desde la raíz del repo: node --test "tests/unidades/*.test.js" */
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");

const RAIZ = path.resolve(__dirname, "..", "..");

function cargar(...archivos) {
  const ctx = vm.createContext({});
  for (const a of archivos) {
    vm.runInContext(fs.readFileSync(path.join(RAIZ, a), "utf8"), ctx, { filename: a });
  }
  return ctx;
}

/* Lo que devuelven esas funciones vive en otro realm de JS: structuredClone lo
   trae a éste, así deepStrictEqual compara contra las mismas clases. */
const clonar = (v) => structuredClone(v);

module.exports = { cargar, clonar };
