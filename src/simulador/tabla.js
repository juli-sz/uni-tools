/* ======================= tabla de verdad ======================= */
function mostrarTabla() {
  const tt = truthTable();
  const body = $("#tt-body"), sub = $("#tt-sub");
  $("#ov-truth").classList.add("show");
  if (!tt) { sub.textContent = ""; body.innerHTML = `<div class="hint">Necesitás al menos un interruptor de entrada y una salida.</div>`; return; }
  if (tt.demasiadas) { sub.textContent = ""; body.innerHTML = `<div class="hint">${tt.demasiadas} entradas dan ${1 << tt.demasiadas} filas: demasiado para mostrar.</div>`; return; }
  const nombres = tt.ins.map(n => n.label);
  const actual = tt.ins.reduce((a, n, i) => a | ((n.on ? 1 : 0) << (tt.ins.length - 1 - i)), 0);
  sub.textContent = `${tt.ins.length} entradas · ${tt.outs.length} ${tt.outs.length === 1 ? "salida" : "salidas"} · la fila resaltada es el estado actual del circuito`;
  let h = "";
  tt.outs.forEach((o, i) => {
    const mts = tt.rows.filter(r => r.out[i]).map(r => r.m);
    // las etiquetas se escapan acá: el apóstrofo que sigue es el de negación, no el de la etiqueta
    const expr = simplify(mts, tt.ins.length, nombres.map(esc)).replace(/'/g, "&#8242;");
    h += `<div class="expr"><b>${esc(o.label)}</b> = ${expr || "0"} &nbsp;&nbsp;<span style="color:#93a0ae">Σm(${mts.join(",") || "—"})</span></div>`;
  });
  h += `<table style="margin-top:12px"><thead><tr>` +
    nombres.map(n => `<th>${esc(n)}</th>`).join("") +
    tt.outs.map((o, i) => `<th class="${i === 0 ? "sep" : ""}">${esc(o.label)}</th>`).join("") +
    `</tr></thead><tbody>` +
    tt.rows.map(r => `<tr class="${r.m === actual ? "now" : ""}">` +
      r.in.map(v => `<td class="${v ? "v1" : ""}">${v}</td>`).join("") +
      r.out.map((v, i) => `<td class="${v ? "v1" : ""} ${i === 0 ? "sep" : ""}">${r.osc ? "?" : v}</td>`).join("") +
      `</tr>`).join("") + `</tbody></table>`;
  body.innerHTML = h;
}
