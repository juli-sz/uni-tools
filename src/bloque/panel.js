/* ======================= inspector ======================= */
function renderInspector() {
  if (inspLock) return;
  const box = $("#insp");
  const nsel = S.sel.map(getNode).filter(Boolean);
  const esel = S.selEdges.map(getEdge).filter(Boolean);
  if (!nsel.length && !esel.length) {
    box.innerHTML = `<div class="empty">Nada seleccionado.<br>Elegí un elemento o una flecha para editarlo.<br><br>
      <span style="font-size:11px">Arrastrá desde los puntos azules para conectar.</span></div>
      <div class="sec"><h3>Hoja</h3>
        <div class="row"><label>Fondo</label><div class="fill"><select id="p-grid">
          <option value="1">Grilla visible</option><option value="0">Hoja limpia</option></select></div></div>
        <div class="hint">La grilla no se exporta al SVG ni al PNG.</div>
      </div>` + seccionHoja() + seccionTema() + seccionPaleta();
    const g = $("#p-grid"); g.value = S.showGrid ? "1" : "0";
    g.onchange = () => { S.showGrid = g.value === "1"; render(); };
    wireHoja(); wireTema();
    return;
  }
  let h = "";
  if (esel.length) {
    const e = esel[0];
    h += `<div class="sec"><h3>Flecha (${esel.length})</h3>
      <div class="row"><label>Etiqueta</label><div class="fill"><input type="text" id="e-label" value="${esc(e.label || "")}" placeholder="opcional"></div></div>
      <div class="row"><label>Trazo</label><div class="fill"><select id="e-style">
        <option value="solid">Continuo</option><option value="dashed">Punteado</option></select></div></div>
      <div class="row"><label>Punta</label><div class="fill"><select id="e-arrow">
        <option value="1">Con flecha</option><option value="0">Sin flecha</option></select></div></div>
      <div class="row"><label>Grosor</label><div class="fill"><input type="number" id="e-width" step="0.2" min="0.6" max="6" value="${e.width || 1.6}"></div></div>
      <div class="iconbar" style="margin-top:10px">
        <button class="btn" id="e-split">Insertar bifurcación</button>
        <button class="btn" id="e-alt">Ruta alternativa</button>
        <button class="btn" id="e-reset">Ruta automática</button>
        <button class="btn" id="e-flip">Invertir sentido</button>
      </div>
      <div class="hint" style="margin-top:8px">Las flechas se rutean solas esquivando bloques y otras líneas. Con la flecha
        seleccionada, arrastrá los cuadraditos de sus tramos (o la línea misma) para acomodarla a mano;
        «Ruta automática» la suelta de nuevo. También podés probar rutas alternativas.</div>
      <div class="row" style="margin-top:10px"><label>Origen</label><div class="fill"><select id="e-fp">
        ${portOpts(e.from.port)}</select></div></div>
      <div class="row"><label>Destino</label><div class="fill"><select id="e-tp">
        ${portOpts(e.to.port)}</select></div></div>
    </div>`;
    h += seccionColorPropio(e, "ec-", ["flecha"]);
  }
  if (nsel.length) {
    const n = nsel[0];
    const T = { block: "Bloque", sum: "Sumador", node: "Bifurcación", io: "Entrada / salida",
                text: "Texto", marco: "Recuadro" }[n.type];
    h += `<div class="sec"><h3>${T}${nsel.length > 1 ? " (" + nsel.length + ")" : ""}</h3>`;
    if (n.type === "marco") {
      h += `<div class="row"><label>Título</label><div class="fill"><input type="text" id="n-label" value="${esc(n.label || "")}" placeholder="opcional, arriba a la izquierda"></div></div>
        <div class="row"><label>Tamaño letra</label><div class="fill"><input type="number" id="n-font" min="8" max="40" value="${n.font}"></div></div>`;
    } else if (n.type !== "node") {
      h += `<div class="row"><label>Contenido</label><div class="fill"><input type="text" id="n-label" value="${esc(n.label)}" placeholder="K/(s+1), G_1, C(s)…"></div></div>
        <div class="row"><label>Tamaño letra</label><div class="fill"><input type="number" id="n-font" min="8" max="40" value="${n.font}"></div></div>`;
    } else {
      h += `<div class="row"><label>Nombre</label><div class="fill"><input type="text" id="n-label" value="${esc(n.label || "")}" placeholder="opcional"></div></div>`;
    }
    if (n.type === "marco") {
      h += `<div class="hint">Sirve para encuadrar un grupo de elementos y ponerle nombre.
        No se cablea ni desvía las flechas.</div>`;
    } else if (n.type !== "node") {
      h += `<div class="hint">Ecuaciones: las barras se apilan a cualquier profundidad —
      <b>(G_2/H_1)*(G_4/H_2)</b> da dos fracciones multiplicadas y <b>a/b/c</b> una sola con
      <b>b·c</b> abajo. Además <b>s^2</b> o <b>s^-1</b> exponente, <b>H_2</b> o <b>H2</b> subíndice (<b>H_{ent}</b> si son varias letras),
      <b>\\omega \\zeta \\tau</b> griegas y <b>\\frac{a}{b}</b> para forzar la fracción.</div>`;
    }
    h += `<div class="row" style="margin-top:10px"><div class="fill">
      <button class="btn" id="n-dup" style="width:100%;display:flex;align-items:center;justify-content:space-between" title="Duplicar selección (Ctrl+D)"><span style="display:flex;align-items:center;gap:6px"><svg viewBox="0 0 24 24" style="width:14px;height:14px"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/></svg>Duplicar</span><kbd>Ctrl+D</kbd></button>
    </div></div></div>`;

    if (n.type === "marco") {
      h += `<div class="sec"><h3>Recuadro</h3>${filasRecuadro(n, "los elementos")}
        <div class="grid4">
          <div class="row"><label style="width:22px">An</label><div class="fill"><input type="number" id="n-w" step="10" min="20" value="${n.w}"></div></div>
          <div class="row"><label style="width:22px">Al</label><div class="fill"><input type="number" id="n-h" step="10" min="20" value="${n.h}"></div></div>
          <div class="row"><label style="width:22px">X</label><div class="fill"><input type="number" id="n-x" step="${S.grid}" value="${Math.round(n.x)}"></div></div>
          <div class="row"><label style="width:22px">Y</label><div class="fill"><input type="number" id="n-y" step="${S.grid}" value="${Math.round(n.y)}"></div></div>
        </div>
        <div class="hint" style="margin-top:8px">Para moverlo, arrastralo de la asa de arriba a la
          izquierda (anda siempre), del borde o de cualquier parte vacía de adentro. Los elementos que
          tiene adentro no se mueven con él.</div></div>`;
    }

    if (n.type === "sum") {
      h += `<div class="sec"><h3>Signos del sumador</h3>
        <div class="signbox">
          <div></div><div>${signSel("t", n.signs.t)}</div><div></div>
          <div>${signSel("l", n.signs.l)}</div><div class="mid"></div><div>${signSel("r", n.signs.r)}</div>
          <div></div><div>${signSel("b", n.signs.b)}</div><div></div>
        </div>
        <div class="row" style="margin-top:10px"><label>Cruz interna</label><div class="fill"><select id="s-cross">
          <option value="1">Mostrar</option><option value="0">Ocultar</option></select></div></div>
        <div class="row"><label>Diámetro</label><div class="fill"><input type="number" id="n-w" min="20" max="120" step="2" value="${n.w}"></div></div>
        <div class="hint">Vacío = ese lado queda sin signo.</div>
      </div>`;
    } else if (n.type === "block" || n.type === "io" || n.type === "text") {   // el marco tiene su propia sección
      const auto = n.auto !== false, dis = auto ? " disabled" : "";
      h += `<div class="sec"><h3>Geometría</h3>
        <div class="row"><label>Tamaño</label><div class="fill"><select id="n-auto">
          <option value="1"${auto ? " selected" : ""}>Ajustar al contenido</option>
          <option value="0"${auto ? "" : " selected"}>Manual</option></select></div></div>
        <div class="grid4">
          <div class="row"><label style="width:22px">An</label><div class="fill"><input type="number" id="n-w" step="2" value="${n.w}"${dis}></div></div>
          <div class="row"><label style="width:22px">Al</label><div class="fill"><input type="number" id="n-h" step="2" value="${n.h}"${dis}></div></div>
          <div class="row"><label style="width:22px">X</label><div class="fill"><input type="number" id="n-x" step="${S.grid}" value="${Math.round(n.x)}"></div></div>
          <div class="row"><label style="width:22px">Y</label><div class="fill"><input type="number" id="n-y" step="${S.grid}" value="${Math.round(n.y)}"></div></div>
        </div>
        ${auto ? `<div class="hint" style="margin-top:8px">El bloque crece o se achica solo con la ecuación que escribas.${
          n.type === "block" ? " Si lo estirás con los tiradores de las esquinas, pasa a tamaño manual." : ""}</div>` : ""}
      </div>`;
    }
    h += seccionColorPropio(n, "nc-", clavesColor(n));
  }
  h += seccionHoja() + seccionTema() + seccionPaleta();
  box.innerHTML = h;
  wireInspector(nsel, esel);
}
/* ---- colores: una sección para todo el diagrama y otra para el elemento elegido ---- */
const clavesColor = (n) => n.type === "node" ? ["flecha"]
  : n.type === "marco" ? ["borde", "relleno"]
  : (n.type === "text" || n.type === "io") ? ["texto"]
  : ["relleno", "borde", "texto"];
const portOpts = (v) => ["l", "r", "t", "b"].map(p =>
  `<option value="${p}"${p === v ? " selected" : ""}>${{ l: "Izquierda", r: "Derecha", t: "Arriba", b: "Abajo" }[p]}</option>`).join("");
function signSel(side, val) {
  const o = (v, t) => `<option value="${v}"${v === val ? " selected" : ""}>${t}</option>`;
  return `<select class="sgn" data-side="${side}">${o("+", "+")}${o(MINUS, MINUS)}${o("", "—vacío—")}</select>`;
}
function wireInspector(nsel, esel) {
  const live = (id, fn) => enVivo(id, fn);
  live("n-label", v => nsel.forEach(n => n.label = v));
  live("n-font", v => nsel.forEach(n => n.font = +v || 14));
  live("n-w", v => nsel.forEach(n => { n.w = +v || n.w; if (n.type === "sum") n.h = n.w; else if (!esMarco(n)) n.auto = false; }));
  live("n-h", v => nsel.forEach(n => { n.h = +v || n.h; if (!esMarco(n)) n.auto = false; }));
  live("n-x", v => nsel.forEach(n => n.x = +v));
  live("n-y", v => nsel.forEach(n => n.y = +v));
  const autoSel = document.getElementById("n-auto");
  if (autoSel) autoSel.onchange = () => {
    nsel.forEach(n => n.auto = autoSel.value === "1");
    commit(); render();
  };
  // recuadro: línea, grosor, relleno y en qué capa va
  wireRecuadro(nsel);

  const cross = document.getElementById("s-cross");
  if (cross) { cross.value = nsel[0].cross ? "1" : "0"; cross.onchange = () => { nsel.forEach(n => n.cross = cross.value === "1"); commit(); render(); }; }
  document.querySelectorAll(".sgn").forEach(sel => {
    sel.onchange = () => { nsel.forEach(n => { if (n.signs) n.signs[sel.dataset.side] = sel.value; }); commit(); render(); };
  });
  if ($("#n-dup")) $("#n-dup").onclick = duplicar;        // duplicar() ya guarda y redibuja

  live("e-label", v => esel.forEach(e => e.label = v));
  live("e-width", v => esel.forEach(e => e.width = +v || 1.6));
  const st = document.getElementById("e-style");
  if (st) { st.value = esel[0].dashed ? "dashed" : "solid"; st.onchange = () => { esel.forEach(e => e.dashed = st.value === "dashed"); commit(); render(); }; }
  const ar = document.getElementById("e-arrow");
  if (ar) { ar.value = esel[0].arrow === false ? "0" : "1"; ar.onchange = () => { esel.forEach(e => e.arrow = ar.value === "1"); commit(); render(); }; }
  alClic("e-split", () => esel.forEach(splitEdge));
  alClic("e-alt", () => esel.forEach(e => { e.variant = (e.variant || 0) + 1; delete e.manual; }));
  alClic("e-reset", () => esel.forEach(rutaAuto));
  alClic("e-flip", () => esel.forEach(e => { const f = e.from; e.from = e.to; e.to = f; rutaAuto(e); }));
  const fp = document.getElementById("e-fp"), tp = document.getElementById("e-tp");
  if (fp) fp.onchange = () => { esel.forEach(e => { e.from.port = fp.value; rutaAuto(e); }); commit(); render(); };
  if (tp) tp.onchange = () => { esel.forEach(e => { e.to.port = tp.value; rutaAuto(e); }); commit(); render(); };

  if (nsel.length) wireColorPropio("nc-", clavesColor(nsel[0]), nsel);
  if (esel.length) wireColorPropio("ec-", ["flecha"], esel);
  wireHoja(); wireTema();
}
