/* Servidor estático mínimo para las pruebas: sirve la raíz del repo por HTTP.
   Se usa Node (ya presente en CI) en vez de Python para no depender de nada más. */
const http = require("http"), fs = require("fs"), path = require("path");
const RAIZ = path.resolve(__dirname, "..");
const PUERTO = +process.env.PUERTO || 8780;
const TIPOS = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg",
                ".svg": "image/svg+xml", ".json": "application/json", ".js": "text/javascript" };
http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400); return res.end(); }
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(RAIZ, path.normalize(p));
  if (!f.startsWith(RAIZ + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); return res.end("no encontrado"); }
    res.writeHead(200, { "Content-Type": TIPOS[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  });
}).listen(PUERTO, () => console.log("sirviendo " + RAIZ + " en http://localhost:" + PUERTO));
