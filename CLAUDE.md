# uni-tools

Herramientas de escritorio-en-el-navegador para la cursada: se dibujan diagramas de control y
circuitos lógicos, se simulan y se exportan. Publicado con GitHub Pages desde `main`
(https://gez-schegtel.github.io/uni-tools/).

## Las cuatro páginas

| archivo | qué es |
|---|---|
| `index.html` | portada con el logo y los tres accesos |
| `diagrama-bloque.html` | diagramas de bloques: bloques con ecuaciones, sumadores, flechas ruteadas solas |
| `simulador-logico.html` | circuitos lógicos: compuertas, biestables, sumadores, simulación en vivo y tabla de verdad |
| `diagrama-señales.html` | flujo de señales: nodos, transmitancias y análisis por la regla de Mason |

## La regla que manda sobre todo lo demás

**Cada herramienta que se publica es un único archivo HTML autocontenido**: el CSS, el JavaScript y
los íconos SVG viven adentro. Sin `npm`, sin dependencias, sin frameworks, sin CDN. Se abre con
doble clic y funciona, también sin internet.

Esto no es casualidad ni provisorio: es lo que hace que la herramienta se pueda mandar por mail,
abrir en la compu de la facultad o guardar en un pendrive. Cualquier propuesta que rompa esto
—un `<script src>` externo, una librería, un bundler con dependencias— hay que conversarla antes, no
darla por supuesta.

Las únicas dependencias externas son las tres imágenes del logo, y sólo para mostrarse.

## Las fuentes viven en `src/` y las páginas se arman

Para no repetir código entre las tres herramientas (acordado con el dueño en octubre de 2026), los
HTML de la raíz **se arman** a partir de `src/` con `node src/construir.js`: Node pelado, sin npm ni
dependencias. El script pega los pedazos en un solo HTML; no transforma ni minifica nada.

| carpeta | qué tiene |
|---|---|
| `src/comun/` | lo compartido: `base.css`, pedazos de HTML (barra, ventana Abrir) y los módulos de JS (historial, ids, copiar/pegar, teclado, zoom, gestos táctiles, doble clic, abrir/exportar, autoguardado, panel; y para bloques y simulador también colores, área de impresión, recuadros y ruteo ortogonal) |
| `src/bloque/`, `src/simulador/`, `src/senales/` | lo propio de cada una: `pagina.html` (la plantilla, que dice qué se incluye y en qué orden), `estilos.css`, `herramienta.js` (lo que el código común necesita saber de ella) y sus módulos |

- **Nunca se editan a mano los HTML de la raíz**: se edita `src/` y se corre `node src/construir.js`.
  Las páginas armadas se commitean junto con sus fuentes (Pages publica la raíz tal cual).
- `node src/construir.js --comprobar` falla si alguna página no coincide con sus fuentes; lo corren
  el workflow y `tests/specs/fuentes.spec.js`.
- Todo el JS de una página termina en un único `<script>` clásico, así que los módulos comparten el
  ámbito global como antes: importa el **orden** de inclusión en `pagina.html` para las
  `const`/`let` que se usan al cargar.

## Cómo se trabaja

- **Los cambios van a la rama `features`.** `main` es lo que se publica en GitHub Pages y sólo se
  toca cuando el dueño ya comprobó que `features` anda bien (pull request o merge suyo).
- **Se puede commitear, pero nunca pushear.** Hacer commits está permitido (en `features`, con mensajes
  claros y las páginas armadas junto con sus fuentes); `git push`, en cualquiera de sus formas y a
  cualquier rama, no: lo hace el dueño. Al terminar, avisar qué commits quedaron listos para pushear.
- El código y los comentarios están **en español**, igual que la interfaz. Los nombres de variables
  y funciones también (`nodos`, `ramas`, `acomodarRamas`, `esMarco`).
- Los cambios se hacen en `src/` y después `node src/construir.js` (ver arriba).
- Los archivos usan fin de línea LF. Si un script parchea y el diff sale entero, casi seguro
  convirtió los saltos de línea: hay que respetarlos.
- **No se rompe lo que anda.** Todo cambio se verifica con la suite de pruebas (ver abajo) antes de
  darlo por terminado; un arreglo de un bug trae su prueba.

## Para probar cambios

Las páginas necesitan servirse por HTTP: con `file://` las rutas relativas del logo no resuelven.

```bash
python -m http.server 8765
```

Y al recargar conviene agregar `?v=2` a la URL, porque el navegador cachea el HTML y es fácil pasar
media hora depurando una versión vieja.

Antes de dar algo por terminado, armar las páginas (`node src/construir.js`), correr las pruebas
(sección siguiente) y chequear que el JS parsea (el workflow de Actions hace lo mismo con las tres
páginas):

```bash
node -e "const s=require('fs').readFileSync('diagrama-bloque.html','utf8');new (require('vm').Script)(s.match(/<script>\r?\n([\s\S]*?)<\/script>/)[1]);console.log('OK')"
```

## Pruebas automáticas

Viven en `tests/` (Playwright, Node ≥ 18) y se corren con:

```bash
cd tests
npm install                       # una sola vez
npx playwright install chromium firefox   # una sola vez (o usar CHROMIUM_PATH=/ruta/a/chromium)
npm test
```

La suite corre en **Chromium y Firefox**. Además de los comportamientos, `tests/specs/correccion.spec.js`
verifica la exactitud de los resultados (Mason, simplificación, tablas de verdad, biestables y
ecuaciones) contra referencias independientes: si se toca un cálculo, tiene que seguir pasando.
`tests/servidor.js` levanta solo el servidor estático; no hace falta abrir nada a mano. En GitHub
corren solas con `.github/workflows/tests.yml` en cada push a `main` o `features` y en cada pull
request. Detalle de qué cubre cada spec y cómo agregar pruebas: `tests/README.md`.

Los cálculos puros (Mason, la lógica del simulador y el analizador de ecuaciones de los bloques) también tienen pruebas unitarias que corren sin navegador ni dependencias: `node --test "tests/unidades/*.test.js"` (Node ≥ 20). Cargan esos archivos de `src/` en un contexto de Node, así que no pueden empezar a tocar el DOM al cargarse.

**Esto no rompe la regla de arriba:** `npm` existe únicamente dentro de `tests/`, es sólo para
desarrollo, y las herramientas siguen siendo HTML sueltos sin dependencias. La raíz del repo no
tiene `package.json` (`src/construir.js` es Node sin paquetes).

## Más detalle

Para tocar el código de cualquiera de las tres herramientas está la skill **uni-tools**
(`.claude/skills/uni-tools/SKILL.md`): tiene la arquitectura compartida, dónde se engancha cada tipo
de cambio y las trampas conocidas.
