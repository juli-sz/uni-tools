/* ======================= ejemplo (Ejercicio N° 9) ======================= */
function loadExample() {
  S.nodes = []; S.edges = []; S.sel = []; S.selEdges = []; uidc = 1;
  const N = {};
  const add = (key, type, x, y, extra) => { const n = makeNode(type, x, y, extra); N[key] = n.id; S.nodes.push(n); return n; };
  const link = (a, ap, b, bp) => S.edges.push({ id: uid("e"), from: { id: N[a], port: ap }, to: { id: N[b], port: bp }, variant: 0 });

  add("R", "io", 60, 300, { label: "R(s)" });
  add("s1", "sum", 180, 300, { signs: { l: "+", t: "", r: "", b: MINUS } });
  add("G1", "block", 300, 300, { label: "G1" });
  add("s2", "sum", 420, 300, { signs: { l: "+", t: "", r: "", b: MINUS } });
  add("s3", "sum", 540, 300, { signs: { l: "+", t: "", r: "", b: MINUS } });
  add("br1", "node", 620, 300);
  add("G4", "block", 720, 200, { label: "G4" });
  add("G2", "block", 720, 300, { label: "G2" });
  add("s4", "sum", 860, 300, { signs: { l: "+", t: "+", r: "", b: MINUS } });
  add("G3", "block", 980, 300, { label: "G3" });
  add("br2", "node", 1080, 300);
  add("C", "io", 1160, 300, { label: "C(s)" });
  add("H3", "block", 960, 400, { label: "H3" });
  add("H4", "block", 840, 480, { label: "H4" });
  add("H2", "block", 700, 400, { label: "H2" });
  add("H1", "block", 560, 560, { label: "H1" });

  link("R", "r", "s1", "l");
  link("s1", "r", "G1", "l");
  link("G1", "r", "s2", "l");
  link("s2", "r", "s3", "l");
  link("s3", "r", "br1", "l");
  link("br1", "r", "G2", "l");
  link("br1", "t", "G4", "l");
  link("G2", "r", "s4", "l");
  link("G4", "r", "s4", "t");
  link("s4", "r", "G3", "l");
  link("G3", "r", "br2", "l");
  link("br2", "r", "C", "l");
  link("br2", "b", "H3", "r");
  link("H3", "l", "s4", "b");
  link("br2", "b", "H4", "r");
  link("H4", "l", "s3", "b");
  link("G2", "b", "H2", "r");
  link("H2", "l", "s2", "b");
  link("br2", "b", "H1", "r");
  link("H1", "l", "s1", "b");

  commit(); fit(); render();
}
