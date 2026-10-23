const { test, expect } = require("@playwright/test");
const { abrir, abrirTexto } = require("./ayudas");

test.beforeEach(async ({ page }, info) => { info.errores = await abrir(page, "simulador-logico.html"); });
test.afterEach(async ({}, info) => { expect(info.errores).toEqual([]); });

/* Arma entradas → una compuerta → salida y devuelve la tabla de verdad como [[ins],[salida]] */
async function tablaDeCompuerta(page, tipo, entradas) {
  const nodes = [], wires = [];
  for (let i = 0; i < entradas; i++) nodes.push({ id: "i" + i, type: "in", x: 0, y: i * 60, label: "ABCD"[i], on: false });
  nodes.push({ id: "g", type: tipo, x: 150, y: 30, label: "", pins: entradas });
  nodes.push({ id: "o", type: "out", x: 300, y: 30, label: "S" });
  for (let i = 0; i < entradas; i++) wires.push({ id: "w" + i, from: { id: "i" + i, pin: "o0" }, to: { id: "g", pin: i } });
  wires.push({ id: "wo", from: { id: "g", pin: "o0" }, to: { id: "o", pin: 0 } });
  await abrirTexto(page, JSON.stringify({ nodes, wires }));
  return page.evaluate(() => truthTable().rows.map((r) => [r.in.join(""), r.out[0]]));
}

test.describe("compuertas: tablas de verdad", () => {
  const dos = (f) => ["00", "01", "10", "11"].map((b) => [b, f(+b[0], +b[1]) ? 1 : 0]);
  const casos = {
    and: dos((a, b) => a & b), or: dos((a, b) => a | b), xor: dos((a, b) => a ^ b),
    nand: dos((a, b) => !(a & b)), nor: dos((a, b) => !(a | b)), xnor: dos((a, b) => !(a ^ b)),
  };
  for (const [tipo, esperada] of Object.entries(casos))
    test(tipo.toUpperCase(), async ({ page }) => {
      expect(await tablaDeCompuerta(page, tipo, 2)).toEqual(esperada);
    });
  test("NOT", async ({ page }) => {
    expect(await tablaDeCompuerta(page, "not", 1)).toEqual([["0", 1], ["1", 0]]);
  });
  test("AND de 3 entradas", async ({ page }) => {
    const t = await tablaDeCompuerta(page, "and", 3);
    expect(t.filter(([, s]) => s).map(([e]) => e)).toEqual(["111"]);
  });
});

test.describe("ejemplos", () => {
  test("semisumador: S = A⊕B y Cout = A·B", async ({ page }) => {
    await page.evaluate(() => cargarEjemplo("half"));
    const filas = await page.evaluate(() => truthTable().rows.map((r) => [r.in.join(""), ...r.out]));
    expect(filas).toEqual([["00", 0, 0], ["01", 1, 0], ["10", 1, 0], ["11", 0, 1]]);
  });
  test("sumador completo: suma y acarreo de las 8 combinaciones", async ({ page }) => {
    await page.evaluate(() => cargarEjemplo("full"));
    const filas = await page.evaluate(() => truthTable().rows.map((r) => [r.in.join(""), ...r.out]));
    expect(filas).toHaveLength(8);
    for (const [bits, s, c] of filas) {
      const suma = [...bits].reduce((a, b) => a + +b, 0);
      expect([s, c], bits).toEqual([suma & 1, suma >> 1]);
    }
  });
  test("todos los ejemplos cargan, se simulan y no oscilan", async ({ page }) => {
    for (const e of ["half", "full", "latch", "cont", "regd", "mux"]) {
      await page.evaluate((e) => cargarEjemplo(e), e);
      const r = await page.evaluate(() => { correr(); render(); return { osc: OSC, nodos: S.nodes.length }; });
      expect(r.nodos, e).toBeGreaterThan(0);
      expect(r.osc, e).toBe(false);
    }
  });
  test("mux 2→1 elige la entrada según el selector", async ({ page }) => {
    await page.evaluate(() => cargarEjemplo("mux"));
    const t = await page.evaluate(() => { const t = truthTable(); return { ins: t.ins.map((n) => n.label), rows: t.rows.map((r) => [r.in, r.out[0]]) }; });
    // la salida tiene que depender del selector: ni constante ni igual a una sola entrada
    expect(new Set(t.rows.map((r) => r[1])).size).toBe(2);
  });
});

test.describe("tabla de verdad en pantalla", () => {
  test("las expresiones usan las etiquetas reales, aunque no estén en orden alfabético", async ({ page }) => {
    await page.evaluate(() => {
      cargarEjemplo("half");
      const [a, b] = S.nodes.filter((n) => n.type === "in");
      a.label = "B"; b.label = "A"; render(); mostrarTabla();
    });
    const exprs = await page.$$eval("#tt-body .expr", (e) => e.map((x) => x.textContent));
    const cabecera = await page.$$eval("#tt-body th", (e) => e.map((x) => x.textContent));
    // la primera columna de la tabla es la primera entrada (x menor): su etiqueta ahora es "B"
    expect(cabecera.slice(0, 2)).toEqual(["B", "A"]);
    // A⊕B no cambia con el nombre, pero tiene que mencionar sólo letras que existan en la tabla
    expect(exprs[0]).toMatch(/^S = /);
    expect(exprs[0].replace(/Σm.*/, "")).toMatch(/B.*A|A.*B/);
  });
  test("una etiqueta con HTML no se ejecuta", async ({ page }) => {
    await page.evaluate(() => {
      cargarEjemplo("half");
      S.nodes.find((n) => n.type === "in").label = "<img src=x onerror=window.__pwn=1>";
      render(); mostrarTabla();
    });
    expect(await page.evaluate(() => window.__pwn === 1)).toBe(false);
    expect(await page.locator("#tt-body img").count()).toBe(0);
  });
  test("sin entradas ni salidas avisa en vez de romperse", async ({ page }) => {
    await page.evaluate(() => { S.nodes = []; S.wires = []; render(); mostrarTabla(); });
    await expect(page.locator("#tt-body .hint")).toBeVisible();
  });
});

test.describe("biestables", () => {
  test("la tabla de verdad no cambia el estado del circuito", async ({ page }) => {
    await page.evaluate(() => cargarEjemplo("regd"));
    const antes = await page.evaluate(() => JSON.stringify(S.nodes.map((n) => [n.id, n.on, n.q])));
    await page.evaluate(() => truthTable());
    expect(await page.evaluate(() => JSON.stringify(S.nodes.map((n) => [n.id, n.on, n.q])))).toBe(antes);
  });
});

test.describe("guardar y abrir", () => {
  test("JSON de ida y vuelta conserva nodos y cables", async ({ page }) => {
    await page.evaluate(() => cargarEjemplo("full"));
    const antes = await page.evaluate(() => [S.nodes.length, S.wires.length]);
    const json = await page.evaluate(() => JSON.stringify(docDatos()));
    await page.evaluate(() => { S.nodes = []; S.wires = []; render(); });
    await abrirTexto(page, json);
    expect(await page.evaluate(() => [S.nodes.length, S.wires.length])).toEqual(antes);
    // y el circuito sigue andando igual
    const filas = await page.evaluate(() => truthTable().rows.length);
    expect(filas).toBe(8);
  });
  test("el SVG exportado trae el circuito y se vuelve a abrir", async ({ page }) => {
    await page.evaluate(() => cargarEjemplo("half"));
    const svg = await page.evaluate(() => { const r = buildExportSVG(); return new XMLSerializer().serializeToString(r.svg || r); });
    expect(svg).toContain("uni-tools-datos");
    await page.evaluate(() => { S.nodes = []; S.wires = []; render(); });
    await abrirTexto(page, svg);
    expect(await page.evaluate(() => [S.nodes.length, S.wires.length])).toEqual([6, 6]);
  });
});

test("doble clic sobre una compuerta abre el editor del nombre, y Enter lo guarda", async ({ page }) => {
  await page.evaluate(() => cargarEjemplo("half"));
  const c = await page.evaluate(() => {
    const n = S.nodes.find((n) => n.type === "in"), r = document.getElementById("canvas").getBoundingClientRect();
    return { id: n.id, x: r.left + S.pan.x + n.x * S.zoom, y: r.top + S.pan.y + n.y * S.zoom };
  });
  await page.mouse.dblclick(c.x, c.y);
  await expect(page.locator(".editor-hoja")).toBeFocused();
  await page.keyboard.type("Q");
  await page.keyboard.press("Enter");
  expect(await page.evaluate((id) => getNode(id).label, c.id)).toBe("Q");
  await page.evaluate(() => undo());
  expect(await page.evaluate((id) => getNode(id).label, c.id)).not.toBe("Q");
});

test.describe("copiar y pegar (Ctrl+C / Ctrl+V)", () => {
  test("el circuito pegado funciona igual: los cables conservan sus patas", async ({ page }) => {
    await page.evaluate(() => cargarEjemplo("half"));
    const [n0, w0] = await page.evaluate(() => [S.nodes.length, S.wires.length]);
    await page.evaluate(() => { S.sel = S.nodes.map((n) => n.id); render(); });
    await page.keyboard.press("Control+c");
    await page.keyboard.press("Control+v");
    expect(await page.evaluate(() => [S.nodes.length, S.wires.length])).toEqual([n0 * 2, w0 * 2]);
    // todas las patas existen (antes Ctrl+D perdía la pata de salida de cada cable)
    expect(await page.evaluate(() => S.wires.every((w) => w.from.pin !== undefined && w.to.pin !== undefined))).toBe(true);
    // las entradas copiadas reciben letras distintas
    const etiquetas = await page.evaluate(() => S.nodes.filter((n) => n.type === "in").map((n) => n.label));
    expect(new Set(etiquetas).size).toBe(etiquetas.length);
    // la copia calcula lo mismo que el original: 2 entradas más → 4 entradas, 16 filas
    expect(await page.evaluate(() => truthTable().rows.length)).toBe(16);
    // y sobrevive a guardar y abrir (no se descarta ningún cable)
    const json = await page.evaluate(() => JSON.stringify(docDatos()));
    await abrirTexto(page, json);
    expect(await page.evaluate(() => S.wires.length)).toBe(w0 * 2);
  });
  test("Ctrl+D también conserva las patas de los cables", async ({ page }) => {
    await page.evaluate(() => { cargarEjemplo("half"); S.sel = S.nodes.map((n) => n.id); render(); });
    await page.keyboard.press("Control+d");
    expect(await page.evaluate(() => S.wires.every((w) => w.from.pin !== undefined))).toBe(true);
    expect(await page.evaluate(() => S.nodes.length)).toBe(12);
  });
});

test("Ctrl + clic izquierdo y arrastrar mueve la hoja; la rueda también", async ({ page }) => {
  const p = await page.evaluate(() => { const r = document.getElementById("canvas").getBoundingClientRect(); return { x: r.left + r.width - 80, y: r.top + r.height - 80 }; });
  const antes = await page.evaluate(() => [S.pan.x, S.pan.y]);
  await page.keyboard.down("Control");
  await page.mouse.move(p.x, p.y); await page.mouse.down();
  await page.mouse.move(p.x - 50, p.y - 30, { steps: 6 }); await page.mouse.up();
  await page.keyboard.up("Control");
  const d = await page.evaluate(() => [S.pan.x, S.pan.y]);
  expect([Math.round(d[0] - antes[0]), Math.round(d[1] - antes[1])]).toEqual([-50, -30]);
  await page.mouse.wheel(0, 100);
  await expect.poll(() => page.evaluate(() => S.pan.y)).toBeLessThan(d[1]);
});

test.describe("simplificación (Quine–McCluskey)", () => {
  test("da la expresión mínima aunque la elección golosa no la encuentre", async ({ page }) => {
    // Σm(0,1,3,4,7,9,11,13,15): la golosa daba A'C'D' + CD + AD + A'B'C' (10 literales);
    // la mínima es A'C'D' + CD + AD + B'D (9 literales)
    const e = await page.evaluate(() => simplify([0, 1, 3, 4, 7, 9, 11, 13, 15], 4));
    expect(e.split(" + ").sort()).toEqual(["A'C'D'", "AD", "B'D", "CD"].sort());
  });
  test("es correcta y mínima para todas las funciones de 3 variables y una muestra de 4", async ({ page }) => {
    const r = await page.evaluate(() => {
      const evalua = (e, n, m) => e === "1" || (e !== "0" && e.split(" + ").some((t) => {
        for (let i = 0; i < n; i++) {
          const x = new RegExp(String.fromCharCode(65 + i) + "('?)").exec(t); if (!x) continue;
          const bit = (m >> (n - 1 - i)) & 1; if (x[1] ? bit : !bit) return false;
        }
        return true;
      }));
      const cost = (e) => e === "0" || e === "1" ? [0, 0] : [e.split(" + ").length, (e.match(/[A-Z]/g) || []).length];
      // mínimo por fuerza bruta: todas las combinaciones de cubos válidos, de menor a mayor
      const minimo = (mt, n) => {
        const N = 1 << n, cubos = [];
        for (let mask = 0; mask < N; mask++) for (let bits = 0; bits < N; bits++) {
          if (bits & mask) continue; let ok = true, cov = 0;
          for (let m = 0; m < N; m++) if ((m & ~mask) === bits) { if (!mt.includes(m)) { ok = false; break; } cov |= 1 << m; }
          if (ok) { let l = 0; for (let i = 0; i < n; i++) if (!(mask & (1 << i))) l++; cubos.push([cov, l]); }
        }
        const full = mt.reduce((a, m) => a | (1 << m), 0); let best = null;
        for (let k = 1; k <= mt.length && !best; k++) (function rec(s, k, acc, lit) {
          if (!k) { if (acc === full && (!best || lit < best[1])) best = [0, lit]; return; }
          for (let i = s; i < cubos.length; i++) rec(i + 1, k - 1, acc | cubos[i][0], lit + cubos[i][1]);
        })(0, k, 0, 0), best && (best[0] = k);
        return best;
      };
      let malas = 0, noMin = 0, probadas = 0, sem = 5;
      const azar = () => (sem = (sem * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
      const casos = [];
      for (let f = 0; f < 256; f++) casos.push([3, [...Array(8).keys()].filter((m) => f >> m & 1)]);
      for (let t = 0; t < 120; t++) casos.push([4, [...Array(16).keys()].filter(() => azar() < .5)]);
      for (const [n, mt] of casos) {
        const e = simplify(mt, n); probadas++;
        for (let m = 0; m < (1 << n); m++) if (evalua(e, n, m) !== mt.includes(m)) { malas++; break; }
        if (mt.length && mt.length < (1 << n)) { const c = cost(e), b = minimo(mt, n); if (c[0] > b[0] || (c[0] === b[0] && c[1] > b[1])) noMin++; }
      }
      return { probadas, malas, noMin };
    });
    expect(r).toEqual({ probadas: 376, malas: 0, noMin: 0 });
  });
  test("con 10 entradas sigue respondiendo rápido", async ({ page }) => {
    const ms = await page.evaluate(() => {
      let sem = 11; const azar = () => (sem = (sem * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
      const mt = [...Array(1024).keys()].filter(() => azar() < .5);
      const t = performance.now(); simplify(mt, 10); return performance.now() - t;
    });
    expect(ms).toBeLessThan(2000);
  });
});

test.describe("área de impresión", () => {
  test("con hoja, la exportación es exactamente ese recorte", async ({ page }) => {
    await page.evaluate(() => cargarEjemplo("half"));
    const r = await page.evaluate(() => {
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
});

test("los cables no pasan por encima de la compuerta de la que salen o a la que llegan", async ({ page }) => {
  // en el latch SR los cables se cruzan de una NOR a la otra: tienen que rodearlas
  const cruces = await page.evaluate(() => {
    const malos = [];
    for (const ej of ["half", "full", "latch", "mux", "cont", "regd"]) {
      cargarEjemplo(ej); render();
      for (const w of S.wires) for (const id of [w.from.id, w.to.id]) {
        const R = rectOf(getNode(id));
        for (let i = 0; i + 1 < w.pts.length; i++) {
          const p = w.pts[i], q = w.pts[i + 1];
          if (Math.max(p.x, q.x) > R.l + 1 && Math.min(p.x, q.x) < R.r - 1 && Math.max(p.y, q.y) > R.t + 1 && Math.min(p.y, q.y) < R.b - 1)
            malos.push(ej + ": " + w.id);
        }
      }
    }
    return malos;
  });
  expect(cruces).toEqual([]);
});
