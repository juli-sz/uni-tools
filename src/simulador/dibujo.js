/* ======================= dibujo de compuertas ======================= */
function shapePath(type, w, h) {
  const l = -w / 2, r = w / 2, t = -h / 2, b = h / 2;
  if (type === "and" || type === "nand")
    return `M ${l} ${t} H ${r - h / 2} A ${h / 2} ${h / 2} 0 0 1 ${r - h / 2} ${b} H ${l} Z`;
  if (type === "or" || type === "nor" || type === "xor" || type === "xnor")
    return `M ${l} ${t} C ${l + w * .55} ${t} ${l + w * .92} ${t * .5} ${r} 0` +
           ` C ${l + w * .92} ${b * .5} ${l + w * .55} ${b} ${l} ${b}` +
           ` Q ${l + w * .30} 0 ${l} ${t} Z`;
  if (type === "not" || type === "buf") return `M ${l} ${t} L ${r} 0 L ${l} ${b} Z`;
  return `M ${l} ${t} H ${r} V ${b} H ${l} Z`;
}
function drawGate(g, n, cls) {
  const w = bodyW(n), h = bodyH(n), k = nIn(n), esOr = /^(or|nor|xor|xnor)$/.test(n.type);
  if (n.type === "xor" || n.type === "xnor")
    el("path", { class: "g-stub", d: `M ${-w / 2 - 6} ${-h / 2} Q ${-w / 2 + w * .30 - 6} 0 ${-w / 2 - 6} ${h / 2}` }, g);
  el("path", { class: cls, d: shapePath(n.type, w, h) }, g);
  if (T[n.type].bubble) el("circle", { class: cls, cx: w / 2 + bubR(n), cy: 0, r: bubR(n) }, g);
  // patitas: en las OR apoyan justo sobre la curva cóncava de atrás
  const desfase = (n.type === "xor" || n.type === "xnor") ? -6 : 0;
  for (let i = 0; i < k; i++) {
    const y = pinLocal(n, i).y;
    const t = (1 - 2 * y / h) / 2;                    // parámetro de la curva a esa altura
    const xEnd = esOr ? -w / 2 + desfase + 0.6 * w * t * (1 - t) : -w / 2;
    el("line", { class: "g-stub", x1: inX(n), y1: y, x2: xEnd, y2: y }, g);
  }
  el("line", { class: "g-stub", x1: w / 2 + bubR(n) * 2, y1: 0, x2: outX(n), y2: 0 }, g);
}
function renderNode(n, destino) {
  const on = valorDe(n.id, 0);
  const g = el("g", { class: "node" + (S.sel.includes(n.id) ? " sel" : ""), "data-id": n.id,
    style: estiloColor(n.color), transform: `translate(${n.x},${n.y})` }, destino || gNodes);
  if (esMarco(n)) {
    dibujarMarco(g, n, false);
  } else if (n.type === "in") {
    const w = T.in.w, h = T.in.h;
    el("rect", { class: "sw-track" + (n.on ? " on" : ""), x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2 }, g);
    el("circle", { class: "sw-knob" + (n.on ? " on" : ""), cx: (n.on ? 1 : -1) * (w / 2 - h / 2), cy: 0, r: h / 2 - 4.5 }, g);
    el("text", { class: "g-label", x: 0, y: -h / 2 - 11, "font-size": 13 }, g).textContent = n.label;
    el("text", { class: "g-label", x: (n.on ? -1 : 1) * 11, y: 0, "font-size": 11,
      style: `fill:${n.on ? "var(--c-activo)" : "var(--c-cable)"}` }, g).textContent = n.on ? "1" : "0";
    el("line", { class: "g-stub", x1: w / 2, y1: 0, x2: outX(n), y2: 0 }, g);
  } else if (n.type === "out") {
    el("circle", { class: on ? "led-on" : "led-off", cx: 0, cy: 0, r: 14 }, g);
    el("text", { class: "g-label", x: 0, y: 0, "font-size": 12,
      style: `fill:${on ? "var(--c-relleno)" : "var(--c-cable)"}` }, g).textContent = on ? "1" : "0";
    el("text", { class: "g-label", x: 0, y: -25, "font-size": 13 }, g).textContent = n.label;
    el("line", { class: "g-stub", x1: -14, y1: 0, x2: inX(n), y2: 0 }, g);
  } else if (n.type === "clk") {
    const w = T.clk.w, h = T.clk.h, tinta = n.on ? "var(--c-activo)" : "var(--c-borde)";
    el("rect", { class: "sw-track" + (n.on ? " on" : ""), x: -w / 2, y: -h / 2, width: w, height: h, rx: 6 }, g);
    if (n.modo === "fijo") {                       // nivel mantenido: escalón que se queda
      el("path", { class: "g-stub", style: `stroke:${tinta}`,
        d: n.on ? `M -17 7 h 7 v -14 h 12` : `M -17 7 h 19` }, g);
      el("text", { class: "g-label", x: 12, y: n.on ? -7 : 7, "font-size": 12, style: `fill:${tinta}` }, g)
        .textContent = n.on ? "1" : "0";
    } else {
      el("path", { class: "g-stub", d: `M -15 6 v -6 h 7 v -8 h 7 v 8 h 7 v 6`, style: `stroke:${tinta}` }, g);
      if (n.modo === "auto") el("path", { class: "g-stub", style: `fill:${tinta};stroke:none`,
        d: n.corriendo ? `M 12 -5 h 3 v 10 h -3 z M 18 -5 h 3 v 10 h -3 z` : `M 13 -6 L 21 0 L 13 6 z` }, g);
    }
    el("text", { class: "g-label", x: 0, y: -h / 2 - 11, "font-size": 13 }, g).textContent = n.label;
    el("text", { class: "g-label", x: 0, y: h / 2 + 11, "font-size": 9.5, fill: "#93a0ae" }, g)
      .textContent = n.modo === "fijo" ? "mantenido" : n.modo === "auto" ? (n.corriendo ? "corriendo" : "automático") : "pulso";
    el("line", { class: "g-stub", x1: w / 2, y1: 0, x2: outX(n), y2: 0 }, g);
  } else if (n.type === "ff") {
    const w = bodyW(n), h = bodyH(n), izq = -w / 2, der = w / 2, arr = -h / 2;
    el("rect", { class: "g-body", x: izq, y: arr, width: w, height: h, rx: 3 }, g);
    // franja de encabezado: tipo, nombre y el estado actual de Q
    el("line", { class: "g-stub", x1: izq, y1: arr + FF_CAB, x2: der, y2: arr + FF_CAB }, g);
    el("text", { class: "g-label", x: izq + 9, y: arr + FF_CAB / 2, "font-size": 11.5,
      "text-anchor": "start" }, g).textContent =
      (BIESTABLES[n.kind] ? BIESTABLES[n.kind].nombre : "FF") + " " + n.label;
    el("circle", { cx: der - 12, cy: arr + FF_CAB / 2, r: 5, "stroke-width": 1.4,
      style: n.q ? "fill:var(--c-activo);stroke:var(--c-borde)" : "fill:#eef1f4;stroke:#c3cbd3" }, g);
    if (n.conClk === false)
      el("text", { class: "g-label", x: 0, y: h / 2 + 11, "font-size": 9.5, fill: "#93a0ae" }, g)
        .textContent = "sin clock";
    // entradas
    for (let i = 0; i < nIn(n); i++) {
      const y = pinPoint(n, i).y - n.y;
      el("line", { class: "g-stub", x1: inX(n), y1: y, x2: izq, y2: y }, g);
      if (n.pins[i].clk) {                              // triángulo de flanco, sin texto
        el("path", { class: "g-stub", d: `M ${izq} ${y - 6} L ${izq + 10} ${y} L ${izq} ${y + 6}` }, g);
      } else {
        el("text", { class: "g-label", x: izq + 10, y, "font-size": 12, "text-anchor": "start" }, g)
          .textContent = n.pins[i].n;
      }
    }
    // salidas: siempre con el nombre del biestable, la negada con su barra
    const nombres = [n.salida + n.label, n.salidaNeg + n.label];
    for (let i = 0; i < 2; i++) {
      const y = pinPoint(n, "o" + i).y - n.y, enc = valorDe(n.id, i);
      el("line", { class: "g-stub", x1: der, y1: y, x2: outX(n), y2: y }, g);
      const t = el("text", { class: "g-label", x: der - 10, y, "font-size": 12,
        style: `text-anchor:end;fill:${enc ? "var(--c-activo)" : "var(--c-texto)"}` }, g);
      t.textContent = nombres[i];
      if (i === 1) {
        let an = nombres[1].length * 6.6;
        try { an = t.getComputedTextLength() || an; } catch (e) {}
        el("line", { class: "g-stub", "stroke-width": 1.1, x1: der - 10 - an, y1: y - 8.5,
          x2: der - 10, y2: y - 8.5, style: `stroke:${enc ? "var(--c-activo)" : "var(--c-texto)"}` }, g);
      }
    }
  } else if (esSum(n)) {
    const w = bodyW(n), h = bodyH(n);
    el("rect", { class: "g-body", x: -w / 2, y: -h / 2, width: w, height: h, rx: 3 }, g);
    el("text", { class: "g-label", x: 0, y: 0, "font-size": 15 }, g).textContent = SUMADORES[n.type].corto;
    if (n.label) el("text", { class: "g-label", x: -w / 2, y: -h / 2 - 12, "font-size": 12,
      style: "text-anchor:start" }, g).textContent = n.label;
    // una patita por lado, con el rótulo apoyado adentro contra su borde
    const claves = Array.from({ length: nIn(n) }, (_, i) => i).concat(["o0", "o1"]);
    for (const clave of claves) {
      const q = sumPata(n, clave), enc = esSalida(clave) && valorDe(n.id, idxSalida(clave));
      el("line", { class: "g-stub", x1: q.base.x, y1: q.base.y, x2: q.punta.x, y2: q.punta.y }, g);
      // el rótulo va en style y no en atributos: la clase .g-label le gana a los atributos
      const alineado = q.dir.x === 0 ? "middle" : q.dir.x < 0 ? "start" : "end";
      el("text", { class: "g-label", x: q.base.x - q.dir.x * 8, y: q.base.y - q.dir.y * 10,
        "font-size": 11, style: `text-anchor:${alineado};fill:${enc ? "var(--c-activo)" : "var(--c-texto)"}` }, g)
        .textContent = q.p.n;
    }
  } else if (n.type === "label") {
    el("text", { class: "g-label", x: 0, y: 0, "font-size": n.font || 14 }, g).textContent = n.label;
    el("rect", { x: -T.label.w / 2, y: -T.label.h / 2, width: T.label.w, height: T.label.h, fill: "transparent" }, g);
  } else {
    const gr = ROT(n) ? el("g", { transform: `rotate(${ROT(n)})` }, g) : g;
    drawGate(gr, n, "g-body");
    if (n.label) {                                   // el nombre no gira con la compuerta
      const R = rectOf(n);
      el("text", { class: "g-label", x: 0, y: R.t - n.y - 10, "font-size": 12 }, g).textContent = n.label;
    }
  }
  if (S.sel.includes(n.id)) {
    const R = rectOf(n);
    el("rect", { class: "sel-box", x: R.l - n.x - 4, y: R.t - n.y - 4, width: R.w + 8, height: R.h + 8 }, g);
  }
}
function renderWire(w) {
  if (!w.pts) return;
  const on = valorDe(w.from.id, idxSalida(w.from.pin || "o"));
  const g = el("g", { "data-wid": w.id, style: estiloColor(w.color) }, gWires);
  el("path", { class: "wire-hit", d: pathD(w.pts, 5) }, g);
  el("path", { class: "wire" + (on ? " hi" : "") + (S.selW.includes(w.id) ? " sel" : ""), d: pathD(w.pts, 5) }, g);
}
function ocupada(id, pin) { return S.wires.some(w => w.to.id === id && w.to.pin === pin); }
function renderPins() {
  const conectando = drag && drag.kind === "connect";
  const ids = new Set(S.sel);
  // los pines aparecen al pasar el mouse por encima, y todos mientras estás cableando
  const list = conectando ? S.nodes : S.nodes.filter(n => ids.has(n.id) || n.id === hoverNode);
  for (const n of list) {
    if (n.type === "label" || esMarco(n)) continue;     // un recuadro no se cablea
    const ponerPin = (p, clave, extra) => {
      el("circle", { class: "pin-hit", cx: p.x, cy: p.y, r: 11, "data-pid": n.id, "data-pin": clave }, gOv);
      el("circle", { class: "pin" + (extra || ""), cx: p.x, cy: p.y, r: 5.5, "data-pid": n.id, "data-pin": clave }, gOv);
    };
    if (n.type !== "in" && n.type !== "clk") for (let i = 0; i < nIn(n); i++)
      ponerPin(pinPoint(n, i), i, ocupada(n.id, i) ? " taken" : "");
    for (let i = 0; i < nOut(n); i++) ponerPin(pinPoint(n, "o" + i), "o" + i, "");
  }
}
let hoverNode = null;
/* Los pines viven por fuera del cuerpo, así que el hover se mide por cercanía:
   si el puntero está sobre la compuerta o sobre sus patitas, los pines siguen visibles. */
function nodoCerca(w, margen) {
  const m = margen === undefined ? 10 : margen;
  let best = null, mejorDist = 1e9;
  for (const n of S.nodes) {
    if (n.type === "label" || esMarco(n)) continue;
    const R = rectOf(n);
    const dx = Math.max(R.l - m - w.x, 0, w.x - (R.r + m));
    const dy = Math.max(R.t - m - w.y, 0, w.y - (R.b + m));
    if (dx > 0 || dy > 0) continue;
    const d = Math.hypot(w.x - n.x, w.y - n.y);
    if (d < mejorDist) { mejorDist = d; best = n.id; }
  }
  return best;
}
function render() {
  correr(); routeAll(); aplicarTema();
  gAtras.textContent = ""; gWires.textContent = ""; gNodes.textContent = ""; gOv.textContent = "";
  moverVista();
  $("#gridbg").style.display = S.showGrid ? "" : "none";
  // los recuadros "atrás" van en su propia capa, debajo de cables y compuertas
  for (const n of S.nodes) if (esMarco(n) && n.atras) renderNode(n, gAtras);
  for (const w of S.wires) renderWire(w);
  for (const d of junctionDots())
    el("circle", { class: "dot" + (valorDe(d.id, d.i) ? " hi" : ""), cx: d.p.x, cy: d.p.y, r: 4 }, gWires);
  for (const n of S.nodes) if (!esMarco(n)) renderNode(n);
  for (const n of S.nodes) if (esMarco(n) && !n.atras) renderNode(n);
  renderHoja();
  renderPins();
  if (drag && drag.kind === "connect" && drag.cur)
    el("path", { class: "ghostline", d: `M ${drag.start.x} ${drag.start.y} L ${drag.cur.x} ${drag.start.y} L ${drag.cur.x} ${drag.cur.y}` }, gOv);
  if (drag && drag.kind === "band") {
    const b = drag.band;
    el("rect", { class: "band", x: Math.min(b.x1, b.x2), y: Math.min(b.y1, b.y2),
      width: Math.abs(b.x2 - b.x1), height: Math.abs(b.y2 - b.y1) }, gOv);
  }
  $("#st-n").textContent = S.nodes.filter(n => n.type !== "label" && !esMarco(n)).length;
  $("#st-e").textContent = S.wires.length;
  $("#st-s").textContent = (S.sel.length + S.selW.length) ? S.sel.length + " · " + S.selW.length + " cables" : "—";
  const sueltas = S.nodes.reduce((a, n) => a + (n.type === "in" || n.type === "label" ? 0 :
    Array.from({ length: nIn(n) }).filter((_, i) => !ocupada(n.id, i)).length), 0);
  $("#st-warn").innerHTML = OSC ? '<span class="warn">el circuito oscila: revisá la realimentación</span>'
    : sueltas ? `<span class="k">entradas sin conectar</span> ${sueltas}` : "";
  $("#zoomlab").textContent = Math.round(S.zoom * 100) + "%";
  $("#b-hoja").value = S.hoja ? S.hoja.preset : "";
  if (document.activeElement !== $("#b-nombre")) $("#b-nombre").value = S.nombre || "";
  $("#b-undo").disabled = !undoStack.length;
  $("#b-redo").disabled = !redoStack.length;
  renderInspector();
}
