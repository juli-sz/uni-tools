/* ======================= inspector ======================= */
function renderInspector() {
  if (inspLock) return;
  const box = $("#insp");
  const nsel = S.sel.map(getNode).filter(Boolean), wsel = S.selW.map(getWire).filter(Boolean);
  let h = "";
  if (wsel.length) {
    h += `<div class="sec"><h3>Cable (${wsel.length})</h3>
      <div class="iconbar"><button class="btn" id="w-alt">Ruta alternativa</button>
      <button class="btn" id="w-reset">Ruta automática</button></div>
      <div class="hint" style="margin-top:8px">Los cables se rutean solos esquivando compuertas; los que salen de la misma salida comparten tronco.</div></div>`;
    h += seccionColorPropio(wsel[0], "wc-", ["cable"]);
  }
  if (nsel.length) {
    const n = nsel[0];
    const titulo = n.type === "ff" ? "Biestable " + BIESTABLES[n.kind].nombre : T[n.type].nombre;
    h += `<div class="sec"><h3>${titulo}${nsel.length > 1 ? " (" + nsel.length + ")" : ""}</h3>`;
    h += `<div class="row"><label>Nombre</label><div class="fill"><input type="text" id="n-label" value="${esc(n.label || "")}" placeholder="${n.type === "in" ? "A" : n.type === "out" ? "S" : "opcional"}"></div></div>`;
    if (T[n.type].var && n.type !== "ff")
      h += `<div class="row"><label>Entradas</label><div class="fill"><select id="n-pins">
        ${[2,3,4,5].map(k => `<option value="${k}"${k === nIn(n) ? " selected" : ""}>${k}</option>`).join("")}</select></div></div>`;
    if (n.type === "in")
      h += `<div class="row"><label>Valor</label><div class="fill"><button class="btn" id="n-toggle" style="width:100%">${n.on ? "1 — pasar a 0" : "0 — pasar a 1"}</button></div></div>`;
    if (n.type === "clk") {
      h += `<div class="row"><label>Modo</label><div class="fill"><select id="clk-modo">
          <option value="pulso"${n.modo === "pulso" ? " selected" : ""}>Pulso (un flanco)</option>
          <option value="fijo"${n.modo === "fijo" ? " selected" : ""}>Mantenido (toggle)</option>
          <option value="auto"${n.modo === "auto" ? " selected" : ""}>Automático</option></select></div></div>`;
      if (n.modo === "fijo") h += `<div class="io-row"><span class="io-name">Nivel</span>
        <span class="sw${n.on ? " on" : ""}" data-sw="${n.id}" role="button" tabindex="0"></span>
        <span class="bit${n.on ? " on" : ""}">${n.on ? 1 : 0}</span></div>`;
      if (n.modo === "auto") h += `<div class="row"><div class="fill"><button class="btn" id="clk-run" style="width:100%">
        ${n.corriendo ? "Frenar el reloj" : "Arrancar el reloj"}</button></div></div>`;
      h += `<div class="hint">En <b>mantenido</b> el toggle deja la señal en 1 hasta que la vuelvas a tocar; en la hoja alcanza con hacerle clic.</div>`;
    }
    if (puedeGirar(n))
      h += `<div class="row"><label>Rotación</label><div class="fill" style="display:flex;gap:6px">
        <button class="btn" id="rot-izq" title="Girar a la izquierda (Shift+R)" style="flex:1">⟲</button>
        <button class="btn" id="rot-der" title="Girar a la derecha (R)" style="flex:1">⟳</button>
        <select id="rot-sel" style="flex:2">${[0,90,180,270].map(a =>
          `<option value="${a}"${ROT(n) === a ? " selected" : ""}>${a}°</option>`).join("")}</select></div></div>`;
    h += `<div class="row"><label>Posición</label><div class="fill" style="display:flex;gap:6px">
      <input type="number" id="n-x" step="${S.grid}" value="${Math.round(n.x)}">
      <input type="number" id="n-y" step="${S.grid}" value="${Math.round(n.y)}"></div></div>`;
    h += `<div class="row" style="margin-top:10px"><div class="fill">
      <button class="btn" id="n-dup" style="width:100%;display:flex;align-items:center;justify-content:space-between" title="Duplicar selección (Ctrl+D)"><span style="display:flex;align-items:center;gap:6px"><svg viewBox="0 0 24 24" style="width:14px;height:14px"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/></svg>Duplicar</span><kbd>Ctrl+D</kbd></button>
    </div></div></div>`;
    if (esMarco(n)) {
      h += `<div class="sec"><h3>Recuadro</h3>${filasRecuadro(n, "las compuertas")}
        <div class="grid4">
          <div class="row"><label style="width:22px">An</label><div class="fill"><input type="number" id="m-w" step="10" min="20" value="${n.w}"></div></div>
          <div class="row"><label style="width:22px">Al</label><div class="fill"><input type="number" id="m-h" step="10" min="20" value="${n.h}"></div></div>
        </div>
        <div class="row"><label>Tamaño letra</label><div class="fill"><input type="number" id="m-font" min="8" max="40" value="${n.font}"></div></div>
        <div class="hint" style="margin-top:8px">Sirve para encuadrar un grupo de compuertas y ponerle
          nombre: no se cablea ni desvía los cables. Sin relleno lo agarrás por el borde y los clics de
          adentro pasan a lo que haya debajo.</div></div>`;
    }
    h += seccionColorPropio(n, "nc-", clavesColor(n));
    if (n.type === "ff") h += panelBiestable(n);
    if (esSum(n)) h += panelSumador(n);
  }
  // panel de control siempre visible
  const ins = S.nodes.filter(n => n.type === "in"), outs = S.nodes.filter(n => n.type === "out");
  h += `<div class="sec"><h3>Entradas</h3>`;
  h += ins.length ? ins.map(n => `<div class="io-row">
      <span class="io-name">${esc(n.label)}</span>
      <span class="sw${n.on ? " on" : ""}" data-sw="${n.id}" role="button" tabindex="0"></span>
      <span class="bit${n.on ? " on" : ""}">${n.on ? 1 : 0}</span></div>`).join("")
    : `<div class="hint">Todavía no hay interruptores. Insertá uno con <kbd>I</kbd>.</div>`;
  h += `</div><div class="sec"><h3>Salidas</h3>`;
  h += outs.length ? outs.map(n => { const v = valorDe(n.id, 0);
      return `<div class="io-row"><span class="io-name">${esc(n.label)}</span>
        <span class="lamp${v ? " on" : ""}"></span><span class="bit${v ? " on" : ""}">${v ? 1 : 0}</span></div>`; }).join("")
    : `<div class="hint">Agregá una salida con <kbd>O</kbd> para ver el resultado.</div>`;
  h += `</div>`;
  if (!nsel.length && !wsel.length)
    h += `<div class="empty">Elegí una compuerta o un cable para editarlo.<br>
      <span style="font-size:11px">Arrastrá de un pin a otro para cablear.</span></div>`;
  h += seccionHoja() + seccionTema() + seccionPaleta();
  box.innerHTML = h;
  wireInspector(nsel, wsel);
}
function panelBiestable(n) {
  const idx = datosDe(n), d = idx.length, tab = tablaDe(n);
  const custom = n.kind === "custom";
  const nom = idx.map(i => n.pins[i].n);
  let h = `<div class="sec"><h3>Patas y salidas</h3>`;
  n.pins.forEach((p, i) => {
    h += `<div class="row"><label>${p.clk ? "Reloj" : "Entrada " + (idx.indexOf(i) + 1)}</label>
      <div class="fill"><input type="text" data-pin="${i}" class="pin-name" value="${esc(p.n)}"></div></div>`;
  });
  h += `<div class="row"><label>Salida</label><div class="fill" style="display:flex;gap:6px">
      <input type="text" id="ff-out" value="${esc(n.salida)}"><input type="text" id="ff-outn" value="${esc(n.salidaNeg)}"></div></div>
    <div class="hint">Las salidas se dibujan como <b>${esc(n.salida + n.label)}</b> y <b>${esc(n.salidaNeg + n.label)}</b> (con barra de negado): siempre llevan el nombre del biestable.</div>`;
  h += `<div class="row" style="margin-top:8px"><label>Reloj</label><div class="fill"><select id="ff-clk">
      <option value="1"${n.conClk !== false ? " selected" : ""}>Con clock (por flanco)</option>
      <option value="0"${n.conClk === false ? " selected" : ""}>Sin clock (continuo)</option></select></div></div>`;
  if (custom) h += `<div class="row"><label>Nº entradas</label><div class="fill"><select id="ff-nin">
      ${[1,2,3].map(k => `<option value="${k}"${k === d ? " selected" : ""}>${k}</option>`).join("")}</select></div></div>`;
  h += `<div class="row"><label>Estado Q</label><div class="fill">
      <button class="btn" id="ff-q" style="width:100%">${n.q ? "1 — poner en 0" : "0 — poner en 1"}</button></div></div></div>`;

  // ---- tabla característica ----
  h += `<div class="sec"><h3>Tabla de verdad</h3><table class="tt"><thead><tr>` +
    nom.map(x => `<th>${esc(x)}</th>`).join("") + `<th>Q</th><th class="sep">Q⁺</th></tr></thead><tbody>`;
  for (let k = 0; k < tab.length; k++) {
    const q = k & 1, bits = k >> 1;
    const cel = tab[k] === null || tab[k] === undefined ? "—" : tab[k];
    h += `<tr>` +
      Array.from({ length: d }, (_, i) => `<td>${(bits >> (d - 1 - i)) & 1}</td>`).join("") +
      `<td>${q}</td><td class="sep ${cel === 1 ? "v1" : ""}${custom ? " edit" : ""}"
        ${custom ? `data-tab="${k}"` : ""}>${cel}</td></tr>`;
  }
  h += `</tbody></table>`;
  h += custom ? `<div class="hint" style="margin-top:8px">Tocá cada Q⁺ para ciclar 0 → 1 → — (indefinido). El circuito usa esta tabla en cada flanco.</div>`
    : `<div class="hint" style="margin-top:8px">${BIESTABLES[n.kind].nota}.</div>`;
  h += `</div>`;

  // ---- tabla de excitación ----
  h += `<div class="sec"><h3>Tabla de excitación</h3><table class="tt"><thead><tr>
    <th>Q</th><th>Q⁺</th>` + nom.map(x => `<th class="sep">${esc(x)}</th>`).join("") + `</tr></thead><tbody>`;
  excitacion(n).forEach((f, r) => {
    h += `<tr><td>${f.q}</td><td>${f.qn}</td>` + f.patron.map((v, i) =>
      `<td class="sep${custom ? " edit" : ""}"${custom ? ` data-exc="${r}" data-col="${i}"` : ""}>${v}</td>`).join("") + `</tr>`;
  });
  h += `</tbody></table><div class="hint" style="margin-top:8px">
    ${custom ? "Tocá una celda para ciclar 0 → 1 → X. Al editarla se actualiza la tabla de verdad, porque son la misma información leída al revés."
             : "Qué hay que poner en las entradas para lograr cada transición. X = indistinto."}</div></div>`;
  return h;
}
function panelSumador(n) {
  const d = SUMADORES[n.type], k = d.ins.length;
  let h = `<div class="sec"><h3>Tabla de verdad</h3><table class="tt"><thead><tr>` +
    d.ins.map(x => `<th>${esc(x.n)}</th>`).join("") +
    d.outs.map((x, i) => `<th${i === 0 ? ' class="sep"' : ""}>${esc(x.n)}</th>`).join("") +
    `</tr></thead><tbody>`;
  for (let c = 0; c < (1 << k); c++) {
    const bits = Array.from({ length: k }, (_, i) => (c >> (k - 1 - i)) & 1);
    h += `<tr>` + bits.map(b => `<td>${b}</td>`).join("") +
      sumaDe(n.type, bits).map((v, i) =>
        `<td class="${i === 0 ? "sep " : ""}${v ? "v1" : ""}">${v}</td>`).join("") + `</tr>`;
  }
  h += `</tbody></table><div class="hint" style="margin-top:8px">${d.nota}</div></div>`;
  return h;
}
/* ---- colores: una sección para todo el circuito y otra para lo que esté elegido ---- */
const clavesColor = (n) => n.type === "label" ? ["texto"]
  : esMarco(n) ? ["borde", "relleno"]
  : ["relleno", "borde", "texto"];
function wireInspector(nsel, wsel) {
  const live = (id, fn) => enVivo(id, fn);
  live("n-label", v => nsel.forEach(n => n.label = v));
  live("n-x", v => nsel.forEach(n => n.x = +v));
  live("n-y", v => nsel.forEach(n => n.y = +v));
  const pins = document.getElementById("n-pins");
  if (pins) pins.onchange = () => {
    nsel.forEach(n => {
      const k = +pins.value;
      S.wires = S.wires.filter(w => !(w.to.id === n.id && w.to.pin >= k));
      n.pins = k;
    });
    commit(); render();
  };
  alClic("n-toggle", () => nsel.forEach(n => { if (n.type === "in") n.on = !n.on; }));
  if ($("#n-dup")) $("#n-dup").onclick = duplicar;        // duplicar() ya guarda y redibuja
  alClic("w-alt", () => wsel.forEach(w => w.variant = (w.variant || 0) + 1));
  alClic("w-reset", () => wsel.forEach(rutaAuto));
  document.querySelectorAll(".pin-name").forEach(inp => {
    inp.addEventListener("keydown", ev => ev.stopPropagation());
    inp.addEventListener("input", () => lock(() => { nsel[0].pins[+inp.dataset.pin].n = inp.value; render(); }));
    inp.addEventListener("change", commit);
  });
  const bindTxt = (id, fn) => {
    const e = document.getElementById(id); if (!e) return;
    e.addEventListener("keydown", ev => ev.stopPropagation());
    e.addEventListener("input", () => lock(() => { fn(e.value); render(); }));
    e.addEventListener("change", commit);
  };
  bindTxt("ff-out", v => nsel[0].salida = v);
  bindTxt("ff-outn", v => nsel[0].salidaNeg = v);
  const nin = document.getElementById("ff-nin");
  if (nin) nin.onchange = () => {
    const n = nsel[0], k = +nin.value, viejos = datosDe(n).map(i => n.pins[i]);
    const pins = [];
    for (let i = 0; i < k; i++) pins.push(viejos[i] || { n: String.fromCharCode(88 + i) });
    if (n.conClk !== false) pins.push({ n: "CLK", clk: true });
    S.wires = S.wires.filter(w => !(w.to.id === n.id && w.to.pin >= pins.length));
    n.pins = pins; n.tabla = null; tablaDe(n);
    commit(); render();
  };
  const ri = document.getElementById("rot-izq"), rd = document.getElementById("rot-der");
  if (ri) ri.onclick = () => rotar(-90);
  if (rd) rd.onclick = () => rotar(90);
  const rs = document.getElementById("rot-sel");
  if (rs) rs.onchange = () => {
    const ids = new Set();
    nsel.forEach(n => { if (puedeGirar(n)) { n.rot = +rs.value; ids.add(n.id); } });
    recalcularCables(ids); commit(); render();
  };
  const cm = document.getElementById("clk-modo");
  if (cm) cm.onchange = () => {
    nsel.forEach(n => { n.modo = cm.value; n.corriendo = false; n.on = false; });
    commit(); render();
  };
  const crun = document.getElementById("clk-run");
  if (crun) crun.onclick = () => { nsel[0].corriendo = !nsel[0].corriendo; commit(); render(); };
  const fclk = document.getElementById("ff-clk");
  if (fclk) fclk.onchange = () => {
    const n = nsel[0], quiere = fclk.value === "1";
    if (quiere === (n.conClk !== false)) return;
    S.wires = S.wires.filter(w => w.to.id !== n.id);          // cambian las patas: se sueltan los cables
    n.conClk = quiere;
    const datos = datosDe(n).map(i => n.pins[i]);
    n.pins = quiere ? datos.concat([{ n: "CLK", clk: true }]) : datos;
    n.clkArranque = false;
    commit(); render();
  };
  const bq = document.getElementById("ff-q");
  if (bq) bq.onclick = () => { nsel[0].q = nsel[0].q ? 0 : 1; commit(); render(); };
  document.querySelectorAll("[data-tab]").forEach(td => {
    td.onclick = () => {
      const n = nsel[0], k = +td.dataset.tab, v = n.tabla[k];
      n.tabla[k] = v === 0 ? 1 : v === 1 ? null : 0;      // 0 → 1 → indefinido
      commit(); render();
    };
  });
  document.querySelectorAll("[data-exc]").forEach(td => {
    td.onclick = () => {
      const n = nsel[0], filas = excitacion(n), f = filas[+td.dataset.exc], c = +td.dataset.col;
      const v = f.patron[c];
      f.patron[c] = v === "0" ? "1" : v === "1" ? "X" : "0";
      aplicarExcitacion(n, f, f.patron);
      commit(); render();
    };
  });
  document.querySelectorAll("[data-sw]").forEach(sw => {
    sw.onclick = () => { const n = getNode(sw.dataset.sw); if (n) { n.on = !n.on; commit(); render(); } };
    sw.onkeydown = ev => { if (ev.key === " " || ev.key === "Enter") { ev.preventDefault(); sw.onclick(); } };
  });
  // recuadro: línea, grosor, relleno, en qué capa va, tamaño y letra
  wireRecuadro(nsel);
  live("m-w", v => nsel.forEach(n => { if (+v >= 20) n.w = +v; }));
  live("m-h", v => nsel.forEach(n => { if (+v >= 20) n.h = +v; }));
  live("m-font", v => nsel.forEach(n => n.font = Math.min(40, Math.max(8, +v || 12))));

  if (nsel.length) wireColorPropio("nc-", clavesColor(nsel[0]), nsel);
  if (wsel.length) wireColorPropio("wc-", ["cable"], wsel);
  wireHoja(); wireTema();
}
