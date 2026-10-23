/* ======================= paleta ======================= */
const GRUPOS = [
  { nombre: "Circuitos lógicos", abierto: true, items: [
    ["and", "1"], ["or", "2"], ["not", "3"], ["nand", "4"], ["nor", "5"], ["xor", "6"], ["xnor", "7"],
    ["buf", "B"], ["in", "I"], ["out", "O"], ["label", "L"], ["marco", "M"] ] },
  { nombre: "Sumadores", abierto: false, items: [
    ["hadd", "H"], ["fadd", "S"] ] },
  { nombre: "Biestables · sin clock", abierto: false, items: [
    ["ff:rs-sin", ""], ["ff:jk-sin", ""], ["ff:d-sin", ""], ["ff:t-sin", ""], ["ff:custom-sin", ""] ] },
  { nombre: "Biestables · con clock", abierto: false, items: [
    ["ff:rs", ""], ["ff:jk", ""], ["ff:d", ""], ["ff:t", ""], ["ff:custom", ""], ["clk", "P"] ] }
];
const nombreDe = (t) => t.indexOf(":") > 0
  ? "Biestable " + BIESTABLES[t.split(":")[1].split("-")[0]].nombre : T[t].nombre;
function iconoDe(type) {
  if (type.indexOf("ff") === 0) {                 // antes de tocar T[type]: "ff:jk" no está en T
    const p = type.split(":")[1].split("-"), k = p[0], sinClk = p[1] === "sin";
    const disparo = sinClk ? "" : `<path class="glyph-wire" d="M7 16l4-2.5-4-2.5"/>`;
    return `<path class="glyph-wire" d="M1 7h6M1 16h6M33 7h6M33 16h6"/>` +
      `<rect class="glyph-body" x="7" y="2" width="26" height="19"/>` + disparo +
      `<text x="20" y="9" font-size="8.5" font-family="Arial" text-anchor="middle" dominant-baseline="central" fill="currentColor" stroke="none">${BIESTABLES[k].nombre}</text>`;
  }
  if (SUMADORES[type]) {                            // patas por los cuatro lados, como en la hoja
    const der = type === "fadd" ? "M30 11.5h5" : "";
    return `<path class="glyph-wire" d="M20 4v-3M15 19v3M25 19v3M10 11.5h-5${der}"/>` +
      `<rect class="glyph-body" x="10" y="4" width="20" height="15"/>` +
      `<text x="20" y="11.8" font-size="${type === "fadd" ? 10 : 8.5}" font-family="Arial" text-anchor="middle" dominant-baseline="central" fill="currentColor" stroke="none">${SUMADORES[type].corto}</text>`;
  }
  const w = 26, h = 17, bub = T[type].bubble ? 3.2 : 0, cx = 8 + w / 2, cy = 11.5;
  if (type === "in") return `<rect class="glyph-body" x="4" y="4" width="24" height="15" rx="7.5"/><circle cx="20" cy="11.5" r="4" fill="currentColor"/><path class="glyph-wire" d="M28 11.5h8"/>`;
  if (type === "out") return `<path class="glyph-wire" d="M2 11.5h8"/><circle class="glyph-body" cx="20" cy="11.5" r="9"/>`;
  if (type === "label") return `<path class="glyph-wire" d="M9 6h18M18 6v12"/>`;
  if (type === "marco") return `<rect class="glyph-wire" x="3" y="3" width="32" height="17" stroke-dasharray="4 3"/>`;
  if (type === "clk") return `<path class="glyph-wire" d="M2 16h5v-9h6v9h6v-9h6"/><path class="glyph-wire" d="M31 11.5h5"/>`;
  const extra = (type === "xor" || type === "xnor")
    ? `<path class="glyph-wire" d="M${8 - 3} ${cy - h / 2} Q ${8 - 3 + w * .30} ${cy} ${8 - 3} ${cy + h / 2}"/>` : "";
  const ins = type === "not" || type === "buf" ? [cy] : [cy - 4.5, cy + 4.5];
  const stubs = ins.map(y => `<path class="glyph-wire" d="M1 ${y}h7"/>`).join("") +
    `<path class="glyph-wire" d="M${8 + w + bub * 2} ${cy}h${6 - bub * 2}"/>`;
  // el contorno se dibuja en coordenadas propias y se acomoda con transform:
  // trasladarlo a mano rompía los parámetros del arco de la AND
  const cuerpo = `<g transform="translate(${cx},${cy})"><path class="glyph-body" d="${shapePath(type, w, h)}"/>` +
    (bub ? `<circle class="glyph-body" cx="${w / 2 + bub}" cy="0" r="${bub}"/>` : "") + `</g>`;
  return extra + stubs + cuerpo;
}
(function armarPaleta() {
  const p = $("#palette");
  for (const gr of GRUPOS) {
    const cab = document.createElement("button");
    cab.className = "pgroup" + (gr.abierto ? " abierto" : "");
    cab.innerHTML = `<svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg><span>${gr.nombre}</span>`;
    const caja = document.createElement("div");
    caja.className = "plist";
    caja.style.display = gr.abierto ? "" : "none";
    cab.onclick = () => {
      const ver = caja.style.display === "none";
      caja.style.display = ver ? "" : "none";
      cab.classList.toggle("abierto", ver);
    };
    for (const [type, key] of gr.items) {
      const b = document.createElement("button");
      b.className = "ptool"; b.dataset.add = type;
      b.innerHTML = `<svg viewBox="0 0 40 23">${iconoDe(type)}</svg><span>${nombreDe(type)}</span><kbd>${key}</kbd>`;
      b.onclick = () => setPendiente(pendiente === type ? null : type);
      caja.appendChild(b);
    }
    p.appendChild(cab); p.appendChild(caja);
  }
})();
function setPendiente(t) {
  pendiente = t;
  document.querySelectorAll(".ptool").forEach(b => b.classList.toggle("on", b.dataset.add === t));
  $("#st-hint").textContent = t ? "Hacé clic en la hoja para colocarlo · Esc cancela" : "";
}
