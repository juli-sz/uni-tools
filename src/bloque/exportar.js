/* ======================= exportar ======================= */
function buildExportSVG() {
  // con área de impresión se exporta exactamente ese rectángulo, sin márgenes
  const hj = hojaActiva();
  const b = hj ? cajaHoja(hj) : bboxAll(), m = hj ? 0 : 30;
  const W = hj ? hj.w : Math.max(60, b.r - b.l) + m * 2;
  const H = hj ? hj.h : Math.max(60, b.b - b.t) + m * 2;
  const s = svgExportado(b, m, W, H);
  // una punta de flecha por cada color que se esté usando, igual que en la hoja
  const colores = Array.from(new Set(S.edges.map(e => colorEfectivo(e, "flecha"))));
  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML = colores.map(c =>
    `<marker id="${idMarcador(c)}" viewBox="0 0 10 10" refX="9.2" refY="5" markerWidth="7" markerHeight="7"
      orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0.5 1.2 L9.5 5 L0.5 8.8 z" fill="${c}"/></marker>`).join("");
  s.appendChild(defs);
  const style = document.createElementNS(NS, "style");
  style.textContent = `svg{${Object.keys(TEMA_DEF).map(k => `--c-${k}:${temaDe(k)}`).join(";")}}
    .n-shape{fill:var(--c-relleno);stroke:var(--c-borde);stroke-width:1.6}
    .n-label,.n-sign,.e-label{font-family:Arial,Helvetica,sans-serif;fill:var(--c-texto);text-anchor:middle;dominant-baseline:central}
    .n-math{font-family:Arial,Helvetica,sans-serif;fill:var(--c-texto);text-anchor:start;dominant-baseline:central}
    .n-bar{stroke:var(--c-texto);stroke-width:1.4;fill:none}
    .n-paren{stroke:var(--c-texto);stroke-width:1.25;fill:none;stroke-linecap:round}
    .n-cross{stroke:var(--c-borde);stroke-width:1.4;fill:none}
    .m-shape{fill:none;stroke:var(--c-borde);stroke-linejoin:round}
    .m-shape.solido{fill:var(--c-relleno)}
    .m-shape.suave{fill:var(--c-borde);fill-opacity:.1}
    .m-label{font-family:Arial,Helvetica,sans-serif;fill:var(--c-borde);text-anchor:start;dominant-baseline:central}
    .n-dot{fill:var(--c-flecha)}
    .edge{stroke:var(--c-flecha);stroke-width:1.6;fill:none;stroke-linejoin:round;stroke-linecap:round}
    .edge.dashed{stroke-dasharray:6 4}.e-label-bg{fill:var(--c-fondo)}`;
  s.appendChild(style);
  fondoExportado(s, b, m, W, H, temaDe("fondo"));
  const [ga, ge, gn] = capasSinSeleccion([gAtras, gEdges, gNodes]);
  ge.querySelectorAll(".edge-hit").forEach(x => x.remove());
  ga.querySelectorAll(".m-hit").forEach(x => x.remove());
  gn.querySelectorAll(".m-hit").forEach(x => x.remove());
  s.appendChild(ga); s.appendChild(ge); s.appendChild(gn);
  return { svg: s, W, H };
}
