/* ======================= ventana de análisis ======================= */
function mostrarMason() {
  const A = analizar();
  conValores(A.P); conValores(A.L);
  const elSub = $("#mason-sub"), body = $("#mason-body");
  if (!A.entrada || !A.salida) {
    elSub.textContent = "Falta marcar los nodos de entrada y de salida.";
    body.innerHTML = `<div class="nada">Seleccioná un nodo y en el panel derecho elegí si es la
      entrada o la salida del sistema. Mason necesita una de cada una.</div>` + htmlEcuaciones() +
      seccionEquivalente();
    pintarEquivalente();
    $("#ov-mason").classList.add("show");
    return;
  }
  elSub.innerHTML = `Entrada ${conSub(A.entrada.nombre)} · Salida ${conSub(A.salida.nombre)} · ` +
    `${A.P.length} trayectoria${A.P.length === 1 ? "" : "s"} directa${A.P.length === 1 ? "" : "s"} · ` +
    `${A.L.length} lazo${A.L.length === 1 ? "" : "s"}`;

  let h = htmlEcuaciones();
  /* Mason toma la entrada como fuente. Si le llegan ramas, lo que calcula es la transferencia
     desde una señal que se suma en ese nodo, no salida/entrada: se avisa, con la salida de libro. */
  if (S.ramas.some(r => r.a === A.entrada.id))
    h = `<div class="aviso">A la entrada ${conSub(A.entrada.nombre)} le llegan ramas. La regla de Mason
      toma la entrada como una fuente, así que lo que sigue es la transferencia desde una señal que se
      suma en ${conSub(A.entrada.nombre)}, no ${conSub(A.salida.nombre)}/${conSub(A.entrada.nombre)}. Para
      ${conSub(A.salida.nombre)}/${conSub(A.entrada.nombre)}, agregá un nodo de entrada nuevo con una rama
      de transmitancia 1 hasta ${conSub(A.entrada.nombre)}.</div>` + h;

  h += `<h4>1 · Trayectorias directas</h4>`;
  h += A.P.length ? tabla(["", "Ganancia", "Recorrido"],
    A.P.map(p => [`<td class="simb">${conSub(p.simbolo)}</td>`, `<td class="exp">${conSub(p.gan)}</td>`,
                  `<td class="ruta">${conSub(p.ruta)}</td>`]))
    : `<div class="nada">No hay ningún camino de ${conSub(A.entrada.nombre)} a ${conSub(A.salida.nombre)}.</div>`;

  h += `<h4>2 · Lazos individuales</h4>`;
  h += A.L.length ? tabla(["", "Ganancia", "Recorrido"],
    A.L.map(l => [`<td class="simb">${conSub(l.simbolo)}</td>`, `<td class="exp">${conSub(l.gan)}</td>`,
                  `<td class="ruta">${conSub(l.ruta)}</td>`]))
    : `<div class="nada">El diagrama no tiene lazos: Δ = 1.</div>`;

  h += `<h4>3 · Lazos disjuntos tomados de a dos</h4>`;
  const pares = A.det.combos[2] || [];
  h += pares.length ? tabla(["Lazos", "Producto"],
    pares.map(c => [`<td class="simb">${c.map(i => conSub(A.L[i].simbolo)).join(" · ")}</td>`,
                    `<td class="exp">${conSub(producto(c.map(i => A.L[i].gan)))}</td>`]))
    : `<div class="nada">No hay dos lazos que no se toquen.</div>`;

  // si además hay grupos de tres o más, se muestran, porque entran en Δ
  const ordenes = Object.keys(A.det.combos).map(Number).filter(k => k >= 3).sort((a, b) => a - b);
  for (const k of ordenes) {
    h += `<h4>3.${k - 1} · Lazos disjuntos tomados de a ${k}</h4>`;
    h += tabla(["Lazos", "Producto"], A.det.combos[k].map(c =>
      [`<td class="simb">${c.map(i => conSub(A.L[i].simbolo)).join(" · ")}</td>`,
       `<td class="exp">${conSub(producto(c.map(i => A.L[i].gan)))}</td>`]));
  }

  h += `<h4>4 · Determinante y cofactores</h4>`;
  // los números sólo tienen sentido si todas las transmitancias son números
  const todoNumerico = A.L.every(l => l.valor !== null) && A.P.every(p => p.valor !== null)
    && (A.L.length + A.P.length) > 0;
  const dTexto = textoDelta(A.L, A.det);
  const dValor = todoNumerico ? valorDelta(A.L, A.det) : null;
  h += `<div class="caja">Δ = ${conSub(dTexto)}${dValor === null ? "" : `<br>Δ = ${redondear(dValor)}`}</div>`;
  if (A.cof.length) {
    h += tabla(["", "Cofactor", "Lazos que no la tocan"], A.cof.map((c, i) => {
      const t = textoDelta(c.libres, c.det);
      const v = todoNumerico ? valorDelta(c.libres, c.det) : null;
      return [`<td class="simb">Δ${sub(i + 1)}</td>`,
              `<td class="exp">${conSub(t)}${v === null ? "" : ` &nbsp;=&nbsp; ${redondear(v)}`}</td>`,
              `<td class="ruta">${c.libres.length ? c.libres.map(l => conSub(l.simbolo)).join(", ") : "ninguno"}</td>`];
    }));
  }

  h += `<h4>5 · Función de transferencia</h4>`;
  if (!A.P.length) {
    h += `<div class="nada">Sin trayectorias directas no hay función de transferencia.</div>`;
  } else {
    const num = A.P.map((p, i) => {
      const dk = textoDelta(A.cof[i].libres, A.cof[i].det);
      return dk === "1" ? p.simbolo : `${p.simbolo}·Δ${sub(i + 1)}`;
    }).join(" + ");
    // un término negativo se resta, en vez de quedar "+ -G3"
    const numDes = A.P.map((p, i) => {
      const dk = textoDelta(A.cof[i].libres, A.cof[i].det);
      return dk === "1" ? p.gan : `${envolver(p.gan)}·${envolver(dk)}`;
    }).map((t, i) => i === 0 ? t : /^-/.test(t) ? " − " + t.slice(1) : " + " + t).join("");
    h += `<div class="caja resultado">${conSub(A.salida.nombre)} / ${conSub(A.entrada.nombre)}
      = ( ${conSub(num)} ) / Δ<br><br>= ( ${conSub(numDes)} ) / ( ${conSub(dTexto)} )`;
    const vs = A.P.map((p, i) => {
      const dv = todoNumerico ? valorDelta(A.cof[i].libres, A.cof[i].det) : null;
      return (p.valor === null || dv === null) ? null : p.valor * dv;
    });
    if (dValor !== null && dValor !== 0 && !vs.some(v => v === null))
      h += `<br><br>= ${redondear(vs.reduce((a, b) => a + b, 0) / dValor)}`;
    h += `</div>`;
  }
  h += seccionEquivalente();
  body.innerHTML = h;
  pintarEquivalente();
  $("#ov-mason").classList.add("show");
}
function seccionEquivalente() {
  return `<h4>6 · Diagrama de bloques equivalente</h4>
    <div class="previo" id="bq-previo"></div>
    <div class="iconbar" style="margin-top:10px">
      <button class="btn" id="bq-png">Descargar PNG</button>
      <button class="btn" id="bq-json">Descargar JSON</button>
    </div>
    <div class="hint" style="margin-top:8px">Cada nodo con varias ramas entrando es un sumador
      —el signo de la transmitancia se lo queda el sumador— y cada rama con transmitancia
      distinta de 1 es un bloque. El JSON se abre con <b>Diagramas de bloques</b> desde
      Archivo → Abrir, así que de ahí lo seguís editando, lo acomodás y lo exportás.</div>`;
}
/* La vista previa y los dos botones de descarga del equivalente */
function pintarEquivalente() {
  const caja = $("#bq-previo");
  if (!caja) return;
  const datos = equivalenteEnBloques();
  if (!datos.nodes.length) {
    caja.innerHTML = `<div class="nada">Todavía no hay nada que convertir.</div>`;
    return;
  }
  const { svg: s } = svgDeBloques(datos);
  s.setAttribute("width", "100%"); s.removeAttribute("height");
  caja.innerHTML = ""; caja.appendChild(s);
  $("#bq-json").onclick = () => {
    download(limpiarNombre(datos.nombre) + ".json",
      new Blob([JSON.stringify(datos, null, 1)], { type: "application/json" }));
    toast("JSON descargado: abrilo en Diagramas de bloques");
  };
  $("#bq-png").onclick = () => {
    const { svg: s2, W, H } = svgDeBloques(datos);
    descargarPNG(s2, W, H, "#fff", limpiarNombre(datos.nombre) + ".png");
  };
}
function htmlEcuaciones() {
  const eqs = ecuaciones();
  if (!eqs.length) return `<h4>Sistema de ecuaciones</h4><div class="nada">Todavía no hay nodos.</div>`;
  return `<h4>Sistema de ecuaciones</h4><div class="caja eq">` +
    eqs.map(e => conSub(e.texto)).join("<br>") + `</div>`;
}
function tabla(cabeceras, filas) {
  return `<table><thead><tr>${cabeceras.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>` +
    filas.map(f => `<tr>${f.join("")}</tr>`).join("") + `</tbody></table>`;
}
const SUBS = "₀₁₂₃₄₅₆₇₈₉";
const sub = (n) => String(n).split("").map(d => SUBS[+d] || d).join("");
const envolver = (s) => /^[-+]?[\w.·()]+$/.test(s) && !/[+−]/.test(s) ? s : "(" + s + ")";
const redondear = (v) => Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(4).replace(/0+$/, "");
