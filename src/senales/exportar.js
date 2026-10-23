/* ======================= exportar =======================
   El SVG lleva un <style> propio con los colores fijos: no depende de la página. */
function buildExportSVG() {
  const b = bboxAll(), m = 30;
  const W = Math.max(60, b.r - b.l) + m * 2, H = Math.max(60, b.b - b.t) + m * 2;
  const s = svgExportado(b, m, W, H);
  const st = document.createElementNS(NS, "style");
  st.textContent = `svg{--c-nodo:#101418;--c-rama:#101418;--c-texto:#101418;--c-fondo:#fff}
    .n-dot{fill:#101418}.n-io{fill:#fff;stroke:#101418;stroke-width:2}
    .n-name{font-family:Arial,Helvetica,sans-serif;fill:#101418;text-anchor:middle;dominant-baseline:central;font-size:13px}
    .n-rol{font-family:monospace;fill:#93a0ae;text-anchor:middle;dominant-baseline:central;font-size:8.5px}
    .r-linea{fill:none;stroke:#101418;stroke-width:1.6;stroke-linecap:round}
    .r-punta{fill:#101418}.io-stub{stroke:#101418;stroke-width:1.6;fill:none}
    .r-lab{font-family:Arial,Helvetica,sans-serif;fill:#101418;text-anchor:middle;dominant-baseline:central;font-size:13px}
    .r-lab-bg{fill:#fff}`;
  s.appendChild(st);
  fondoExportado(s, b, m, W, H, "#fff");
  const [gr, gn] = capasSinSeleccion([gRamas, gNodos]);
  gr.querySelectorAll(".r-hit").forEach(x => x.remove());
  gn.querySelectorAll(".n-hit").forEach(x => x.remove());
  s.appendChild(gr); s.appendChild(gn);
  return { svg: s, W, H };
}
