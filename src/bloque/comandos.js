/* ======================= comandos ======================= */
function splitEdge(e) {
  if (!e.pts || e.pts.length < 2) return;
  const segs = segsOf(e.pts);
  const len = (sg) => Math.hypot(sg[1].x - sg[0].x, sg[1].y - sg[0].y);
  const total = segs.reduce((a, sg) => a + len(sg), 0);
  // punto medio real del recorrido de la flecha
  let acc = 0, best = segs[0], mid = null;
  for (const sg of segs) {
    const L = len(sg);
    if (acc + L >= total / 2 && L >= 24) {
      const k = (total / 2 - acc) / L;
      best = sg; mid = { x: sg[0].x + (sg[1].x - sg[0].x) * k, y: sg[0].y + (sg[1].y - sg[0].y) * k };
      break;
    }
    acc += L;
  }
  if (!mid) {                                  // recorrido muy quebrado: uso el tramo más largo
    best = segs.reduce((a, b) => len(b) > len(a) ? b : a, segs[0]);
    mid = { x: (best[0].x + best[1].x) / 2, y: (best[0].y + best[1].y) / 2 };
  }
  const horiz = Math.abs(best[0].y - best[1].y) < .5;
  const nn = makeNode("node", snapV(mid.x), snapV(mid.y));
  if (horiz) nn.y = Math.round(mid.y); else nn.x = Math.round(mid.x);   // queda justo sobre la línea
  S.nodes.push(nn);
  const goingPos = horiz ? best[1].x > best[0].x : best[1].y > best[0].y;
  const inPort = horiz ? (goingPos ? "l" : "r") : (goingPos ? "t" : "b");
  const outPort = { l: "r", r: "l", t: "b", b: "t" }[inPort];
  S.edges.push({ id: uid("e"), from: { id: nn.id, port: outPort }, to: e.to, variant: 0,
    label: e.label, dashed: e.dashed, arrow: e.arrow, width: e.width });
  e.to = { id: nn.id, port: inPort };
  e.label = ""; rutaAuto(e);
  S.sel = [nn.id]; S.selEdges = [];
}
function fit() {
  const H = hojaActiva();                       // con área definida, encuadrar es ver la hoja entera
  if (!S.nodes.length && !H) { S.zoom = 1; S.pan = { x: 60, y: 40 }; render(); return; }
  encuadrar(H ? cajaHoja(H) : bboxAll(), 60, 2);
}
