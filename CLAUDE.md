# uni-tools

Herramientas de escritorio-en-el-navegador para la cursada: se dibujan diagramas de control y
circuitos lógicos, se simulan y se exportan. Publicado con GitHub Pages desde `main`
(https://juli-sz.github.io/uni-tools/).

## Las cuatro páginas

| archivo | qué es |
|---|---|
| `index.html` | portada con el logo y los tres accesos |
| `diagrama-bloque.html` | diagramas de bloques: bloques con ecuaciones, sumadores, flechas ruteadas solas |
| `simulador-logico.html` | circuitos lógicos: compuertas, biestables, sumadores, simulación en vivo y tabla de verdad |
| `diagrama-señales.html` | flujo de señales: nodos, transmitancias y análisis por la regla de Mason |

## La regla que manda sobre todo lo demás

**Cada herramienta es un único archivo HTML autocontenido**: el CSS, el JavaScript y los íconos SVG
viven adentro. Sin build, sin `npm`, sin dependencias, sin frameworks, sin CDN. Se abre con doble
clic y funciona, también sin internet.

Esto no es casualidad ni provisorio: es lo que hace que la herramienta se pueda mandar por mail,
abrir en la compu de la facultad o guardar en un pendrive. Cualquier propuesta que rompa esto
—separar el JS, agregar una librería, meter un bundler— hay que conversarla antes, no darla por
supuesta.

Las únicas dependencias externas son las tres imágenes del logo, y sólo para mostrarse.

## Cómo se trabaja

- **Todo va a `main`.** No crear ramas ni pull requests.
- Commitear y pushear **sólo cuando se pide**.
- El código y los comentarios están **en español**, igual que la interfaz. Los nombres de variables
  y funciones también (`nodos`, `ramas`, `acomodarRamas`, `esMarco`).
- Los archivos están en CRLF: si se parchea con scripts, hay que respetarlo.

## Para probar cambios

Las páginas necesitan servirse por HTTP: con `file://` las rutas relativas del logo no resuelven.

```bash
python -m http.server 8765
```

Y al recargar conviene agregar `?v=2` a la URL, porque el navegador cachea el HTML y es fácil pasar
media hora depurando una versión vieja.

Antes de dar algo por terminado, chequear que el JS parsea:

```bash
node -e "const s=require('fs').readFileSync('diagrama-bloque.html','utf8');new (require('vm').Script)(s.match(/<script>\r?\n([\s\S]*?)<\/script>/)[1]);console.log('OK')"
```

## Más detalle

Para tocar el código de cualquiera de las tres herramientas está la skill **uni-tools**
(`.claude/skills/uni-tools/SKILL.md`): tiene la arquitectura compartida, dónde se engancha cada tipo
de cambio y las trampas conocidas.
