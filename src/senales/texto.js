/* ======================= texto con subíndices =======================
   Parte el texto en trozos de línea y trozos de subíndice. El número pegado a una
   letra baja solo —G1 se lee G₁— y el guión bajo sirve para forzarlo: H_ent, o
   H_{lo que sea} si son varios caracteres. */
const LETRA = /[A-Za-zÀ-ÖØ-öø-ÿ]/;
function trozosDeTexto(s) {
  const txt = String(s == null ? "" : s);
  const trozos = [];
  const empujar = (t, sub) => { if (t) trozos.push({ t, sub }); };
  let suelto = "", i = 0;
  while (i < txt.length) {
    const forzado = txt[i] === "_" && /^_(?:\{([^}]*)\}|([A-Za-z0-9À-ÖØ-öø-ÿ]+))/.exec(txt.slice(i));
    if (forzado) {
      empujar(suelto, false); suelto = "";
      empujar(forzado[1] !== undefined ? forzado[1] : forzado[2], true);
      i += forzado[0].length;
      continue;
    }
    if (/\d/.test(txt[i]) && LETRA.test(txt[i - 1] || "")) {
      const nums = /^\d+/.exec(txt.slice(i))[0];
      empujar(suelto, false); suelto = "";
      empujar(nums, true);
      i += nums.length;
      continue;
    }
    suelto += txt[i++];
  }
  empujar(suelto, false);
  return trozos;
}
function ponerTexto(t, s) {
  t.textContent = "";
  let abajo = false;
  for (const p of trozosDeTexto(s)) {
    const attrs = {};
    if (p.sub !== abajo) { attrs.dy = p.sub ? 4 : -4; abajo = p.sub; }
    if (p.sub) attrs["font-size"] = "72%";
    const e = el("tspan", attrs, t);
    e.textContent = p.t;
  }
}
const anchoTexto = (s) => trozosDeTexto(s)
  .reduce((a, p) => a + p.t.length * (p.sub ? 5.2 : 7.2), 0) + 10;
/* Igual que esc(), pero además baja los subíndices. Va en el análisis: si ahí
   se leen "a1" y "G1" en crudo se pierde de vista cuál es nodo y cuál ganancia.
   Devuelve HTML, así que no sirve para meter en un atributo. */
const conSub = (s) => trozosDeTexto(s)
  .map(p => p.sub ? "<sub>" + esc(p.t) + "</sub>" : esc(p.t)).join("");
