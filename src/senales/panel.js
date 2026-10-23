/* ======================= panel derecho ======================= */
function renderInspector() {
  if (inspLock) return;
  const box = $("#insp");
  const nsel = S.sel.map(getNodo).filter(Boolean);
  const rsel = S.selR.map(getRama).filter(Boolean);
  let h = "";

  if (rsel.length) {
    const r = rsel[0];
    h += `<div class="sec"><h3>Rama (${rsel.length})</h3>
      <div class="row"><label>Transmitancia</label><div class="fill">
        <input type="text" id="r-g" value="${esc(r.g)}" placeholder="G_1, -H, 1/s, 2.5"></div></div>
      <div class="row"><label>Curvatura</label><div class="fill">
        <input type="number" id="r-curva" step="6" value="${Math.round(r.curva)}"></div></div>
      <div class="hint" style="margin:-2px 0 8px">${r.curvaFija
        ? "Curvatura a mano. <b>Acomodar sola</b> la devuelve al reparto automático."
        : "Se acomoda sola: 0 es línea recta y los arcos se separan para no encimarse."}</div>
      <div class="row"><label>Va de</label><div class="fill">
        <select id="r-de">${opcionesNodo(r.de)}</select></div></div>
      <div class="row"><label>Hasta</label><div class="fill">
        <select id="r-a">${opcionesNodo(r.a)}</select></div></div>
      <div class="iconbar" style="margin-top:10px">
        <button class="btn" id="r-invertir">Invertir sentido</button>
        <button class="btn" id="r-espejo">Arquear al otro lado</button>
        <button class="btn" id="r-auto">Acomodar sola</button></div>
      <div class="hint" style="margin-top:8px">La transmitancia multiplica a la variable del nodo del
        que sale. Con <b>_</b> escribís subíndices: <b>G_1</b> se dibuja G₁.</div></div>`;
  }

  if (nsel.length) {
    const n = nsel[0];
    h += `<div class="sec"><h3>Nodo (${nsel.length})</h3>
      <div class="row"><label>Nombre</label><div class="fill">
        <input type="text" id="n-nombre" value="${esc(n.nombre)}" placeholder="a, b, R, C"></div></div>
      <div class="row"><label>Papel</label><div class="fill"><select id="n-tipo">
        <option value="normal"${n.tipo === "normal" ? " selected" : ""}>Nodo interno</option>
        <option value="entrada"${n.tipo === "entrada" ? " selected" : ""}>Entrada del sistema</option>
        <option value="salida"${n.tipo === "salida" ? " selected" : ""}>Salida del sistema</option>
      </select></div></div>
      <div class="row"><label>Posición</label><div class="fill grid2">
        <input type="number" id="n-x" step="${S.grid}" value="${Math.round(n.x)}">
        <input type="number" id="n-y" step="${S.grid}" value="${Math.round(n.y)}"></div></div>
      <div class="iconbar" style="margin-top:10px">
        <button class="btn" id="n-auto">Autolazo</button></div>
      <div class="row" style="margin-top:8px"><div class="fill">
        <button class="btn" id="n-dup" style="width:100%;display:flex;align-items:center;justify-content:space-between" title="Duplicar selección (Ctrl+D)"><span style="display:flex;align-items:center;gap:6px"><svg viewBox="0 0 24 24" style="width:14px;height:14px"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/></svg>Duplicar</span><kbd>Ctrl+D</kbd></button>
      </div></div>
      <div class="hint" style="margin-top:8px">Los nodos van en minúscula —las mayúsculas son las
        ganancias— y el subíndice recién aparece cuando hay que repetir una letra. Sólo puede haber
        una entrada y una salida: al marcar una, la anterior vuelve a ser nodo interno.</div></div>`;
  }

  h += resumenMason();
  if (!nsel.length && !rsel.length)
    h += `<div class="empty">Nada seleccionado.<br>Elegí un nodo o una rama para editarlo.<br><br>
      <span style="font-size:11px">En modo Conectar, arrastrá de un nodo a otro.</span></div>`;
  box.innerHTML = h;
  wireInspector(nsel, rsel);
}
const opcionesNodo = (v) => S.nodos.map(n =>
  `<option value="${n.id}"${n.id === v ? " selected" : ""}>${esc(n.nombre)}</option>`).join("");

function resumenMason() {
  const A = analizar();
  if (!S.nodos.length) return "";
  const filas = [
    ["Trayectorias", A.P.length],
    ["Lazos", A.L.length],
    ["Disjuntos de a dos", (A.det.combos[2] || []).length]
  ];
  return `<div class="sec"><h3>Mason</h3>` +
    filas.map(f => `<div class="row"><label>${f[0]}</label><div class="fill"
      style="font-family:var(--mono);font-size:12px">${f[1]}</div></div>`).join("") +
    `<div class="iconbar" style="margin-top:10px">
      <button class="btn on" id="b-mason2" style="width:100%">Ver el análisis completo</button></div>
    <div class="hint" style="margin-top:8px">${A.entrada && A.salida
      ? "Ecuaciones, cofactores y función de transferencia."
      : "Marcá un nodo como entrada y otro como salida para que se pueda calcular."}</div></div>`;
}
function wireInspector(nsel, rsel) {
  const live = (id, fn) => enVivo(id, fn, true);
  live("r-g", v => rsel.forEach(r => r.g = v));
  live("r-curva", v => rsel.forEach(r => { r.curva = +v || 0; r.curvaFija = true; }));
  live("n-nombre", v => nsel.forEach(n => n.nombre = v));
  live("n-x", v => nsel.forEach(n => n.x = +v));
  live("n-y", v => nsel.forEach(n => n.y = +v));

  const tipo = document.getElementById("n-tipo");
  if (tipo) tipo.onchange = () => {
    const v = tipo.value;
    if (v !== "normal") S.nodos.forEach(n => { if (n.tipo === v) n.tipo = "normal"; });
    nsel.forEach(n => n.tipo = v);
    commit(); render();
  };
  const de = document.getElementById("r-de"), a = document.getElementById("r-a");
  if (de) de.onchange = () => { rsel.forEach(r => r.de = de.value); commit(); render(); };
  if (a) a.onchange = () => { rsel.forEach(r => r.a = a.value); commit(); render(); };

  alClic("r-invertir", () => rsel.forEach(r => { const t = r.de; r.de = r.a; r.a = t; r.curva = -r.curva; }));
  alClic("r-espejo", () => rsel.forEach(r => { r.curva = -r.curva || -ARCO_BASE; r.curvaFija = true; }));
  alClic("r-auto", () => rsel.forEach(r => delete r.curvaFija));
  alClic("n-auto", () => nsel.forEach(n => S.ramas.push(nuevaRama(n.id, n.id))));
  if ($("#n-dup")) $("#n-dup").onclick = duplicar;
  const m = document.getElementById("b-mason2");
  if (m) m.onclick = mostrarMason;
}
