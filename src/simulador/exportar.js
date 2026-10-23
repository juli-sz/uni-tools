/* ======================= exportar ======================= */
/* Pasa las clases a atributos de presentación: así el SVG se ve igual en cualquier
   visor, aunque no interprete la hoja de estilos. */
/* Los "@clave" se resuelven contra el color que le toca a ese elemento: el propio
   si lo tiene, si no el del circuito. */
const ESTILO_EXPORT = {
  "g-body":  { fill: "@relleno", stroke: "@borde", "stroke-width": 1.7, "stroke-linejoin": "round" },
  "g-stub":  { fill: "none", stroke: "@borde", "stroke-width": 1.5 },
  "g-label": { "font-family": "Arial,Helvetica,sans-serif", fill: "@texto",
               "text-anchor": "middle", "dominant-baseline": "central" },
  "m-shape": { fill: "none", stroke: "@borde", "stroke-linejoin": "round" },
  "m-label": { "font-family": "Arial,Helvetica,sans-serif", fill: "@borde",
               "text-anchor": "start", "dominant-baseline": "central" },
  "wire":    { fill: "none", stroke: "@cable", "stroke-width": 1.8,
               "stroke-linejoin": "round", "stroke-linecap": "round" },
  "dot":     { fill: "@cable", stroke: "none" },
  "led-off": { fill: "#eef1f4", stroke: "@borde", "stroke-width": 1.7 },
  "led-on":  { fill: "@activo", stroke: "@borde", "stroke-width": 1.7 },
  "sw-track":{ fill: "#eef1f4", stroke: "@borde", "stroke-width": 1.7 },
  "sw-knob": { fill: "@relleno", stroke: "@borde", "stroke-width": 1.7 }
};
/* El color propio quedó escrito como variable CSS en el <g> del elemento; en el
   clon del export no hay hoja de estilos, así que la buscamos a mano hacia arriba. */
function varLocal(e, k) {
  for (let p = e; p; p = p.parentElement) {
    const v = p.style && p.style.getPropertyValue("--c-" + k);
    if (v) return v.trim();
  }
  return temaDe(k);
}
const resolver = (e, v) => typeof v === "string" && v[0] === "@" ? varLocal(e, v.slice(1)) : v;
function inlinarEstilos(raiz) {
  raiz.querySelectorAll("*").forEach(e => {
    const cls = (e.getAttribute("class") || "").split(/\s+/).filter(Boolean);
    if (!cls.length) return;
    const at = {};
    for (const c of cls) if (ESTILO_EXPORT[c]) Object.assign(at, ESTILO_EXPORT[c]);
    if (cls.indexOf("hi") >= 0) Object.assign(at, cls.indexOf("dot") >= 0
      ? { fill: "@activo" } : { stroke: "@activo", "stroke-width": 2.2 });
    if (cls.indexOf("on") >= 0) {
      if (cls.indexOf("sw-track") >= 0) at.fill = "#e4f6ec";
      if (cls.indexOf("sw-knob") >= 0) { at.fill = "@activo"; at.stroke = "@borde"; }
    }
    if (cls.indexOf("dashed") >= 0) at["stroke-dasharray"] = "6 4";
    if (cls.indexOf("m-shape") >= 0) {              // relleno del recuadro
      if (cls.indexOf("solido") >= 0) at.fill = "@relleno";
      if (cls.indexOf("suave") >= 0) { at.fill = "@borde"; at["fill-opacity"] = .1; }
    }
    for (const k in at) if (!e.hasAttribute(k)) e.setAttribute(k, resolver(e, at[k]));
    e.removeAttribute("class");
  });
}
function buildExportSVG() {
  // con área de impresión se exporta exactamente ese rectángulo, sin márgenes
  const hj = hojaActiva();
  const b = hj ? cajaHoja(hj) : bboxAll(), m = hj ? 0 : 28;
  const W = hj ? hj.w : Math.max(60, b.r - b.l) + m * 2;
  const H = hj ? hj.h : Math.max(60, b.b - b.t) + m * 2;
  const s = svgExportado(b, m, W, H);
  const st = document.createElementNS(NS, "style");
  // las variables van en la raíz: los estilos sueltos que quedaron con var() las resuelven acá
  st.textContent = `svg{${Object.keys(TEMA_DEF).map(k => `--c-${k}:${temaDe(k)}`).join(";")}}`;
  s.setAttribute("style", Object.keys(TEMA_DEF).map(k => `--c-${k}:${temaDe(k)}`).join(";"));
  s.appendChild(st);
  fondoExportado(s, b, m, W, H, temaDe("fondo"));
  const [ga, gw, gn] = capasSinSeleccion([gAtras, gWires, gNodes]);
  gw.querySelectorAll(".wire-hit").forEach(x => x.remove());
  inlinarEstilos(ga); inlinarEstilos(gw); inlinarEstilos(gn);   // el SVG queda autosuficiente
  s.appendChild(ga); s.appendChild(gw); s.appendChild(gn);
  return { svg: s, W, H };
}
