---
name: uni-tools
description: Arquitectura compartida y flujo de trabajo de las herramientas de uni-tools (diagrama-bloque.html, simulador-logico.html, diagrama-señales.html) y de sus fuentes en src/ (src/comun, src/bloque, src/simulador, src/senales, src/construir.js). Usar siempre que se toque cualquiera de esos archivos o index.html — agregar o cambiar elementos, compuertas, nodos, ramas, opciones del panel lateral, exportación, colores, área de impresión, atajos, gestos táctiles, o el análisis de Mason — y también al depurar algo raro en el lienzo, en el ruteo de flechas o en la exportación a SVG/PNG/JSON.
---

# Trabajar en las herramientas de uni-tools

Las tres herramientas nacieron una de la otra, así que comparten arquitectura casi entera. Conviene
leer cómo resuelve el problema la herramienta vecina antes de inventar algo nuevo: si en el
simulador ya existe un panel de colores que anda, en el diagrama de señales conviene portarlo, no
rediseñarlo.

## Dónde está el código: `src/`, no la raíz

Los HTML de la raíz **se arman** con `node src/construir.js` a partir de `src/` y no se editan a
mano (ver `CLAUDE.md`). Lo que comparten las tres herramientas está una sola vez en `src/comun/`:

| archivo | qué tiene |
|---|---|
| `lienzo.js` | `"use strict"`, `NS`, `$`, `svg`, `viewport`, el arreglo de Firefox, `capturarPuntero()`, `el()`, `esc()`, `toast()` (dura según el largo del mensaje y se cierra con la cruz) |
| `ids.js` | `uid`, `proximoUid`, `sanearIds`, `buscarNodo` |
| `documento.js` | `esObj`, `num`, `limpiarNombre`, `abrirTexto`, `datosDeSVG`, `download`, `descargarPNG`, el esqueleto del SVG exportado (`svgExportado`, `fondoExportado`, `capasSinSeleccion`) y los botones de Archivo y la ventana Abrir |
| `historial.js` | `snapshot`, `commit`, `undo`, `redo` |
| `portapapeles.js` | `borrar`, `tomarSeleccion`, `duplicar`, `copiarSel`, `cortarSel`, `pegarSel` |
| `vista.js` | `drag`, `spaceDown`, `toWorld`, `snapV`, `moverVista`, `encuadrar`, `instalarRueda`, botones de zoom |
| `tactil.js` | dedos, pellizco, `cancelarDrag`, `soltarDedo` |
| `doble-clic.js` | el editor sobre la hoja (`editarEnLaHoja`, `cerrarEditor`) y `detectarDobleClic` |
| `teclado.js` | el `keydown` común (ventana abierta, Ctrl+Z/Y/C/X/V/D/A, Supr, F, ?, flechas) |
| `panel.js` | `lock`, `enVivo`, `alClic`, `opciones` |
| `barra.js` | deshacer/rehacer/borrar/duplicar, grupos plegables, panel lateral, cerrar ventanas con clic afuera |
| `autoguardado.js` | autoguardado, «Inicio» y `arrancar()` |
| `colores.js`, `hoja.js`, `recuadros.js`, `ortogonal.js` | sólo bloques y simulador: paleta y colores, área de impresión, recuadros, cajas/alineación y ruteo ortogonal (`scorePath`, `rutasPorPuntaje`, `pathD`, `puntosDeUnion`) |
| `base.css`, `colores.css`, `hoja.css`, `recuadros.css` y los `*.html` | estilos y pedazos de marcado compartidos |

Cada herramienta (`src/bloque/`, `src/simulador/`, `src/senales/`) tiene su `pagina.html` (marcado y
**el orden** en que se pegan CSS y JS), `estilos.css` (después de `base.css`, así que manda),
`herramienta.js` y sus propios módulos (modelo, geometría/ruteo, dibujo, panel, interacción,
exportar, barra, ejemplos, arranque).

### El contrato con el código común

El código común no sabe cómo se llaman las cosas en cada herramienta: lo lee de `HERRAMIENTA`
(en `herramienta.js`) y de funciones globales que cada una define.

- `HERRAMIENTA`: `nombre`, `titulo`, `clave` (autoguardado), `nodos`/`conexiones`/`selConexiones`
  (los nombres de las colecciones en `S`), `extremos(c)` (los dos ids que une una conexión),
  `fondoPNG()`, `cancelarArrastre(drag)` opcional, y `textos` (las frases que cambian: «diagrama» o
  «circuito», mensajes de abrir/guardar…).
- Funciones que tiene que definir cada una: `render`, `renderInspector`, `docDatos`, `restore`,
  `cargarDoc`, `insertar`, `fit`, `buildExportSVG`, `teclaPropia(k, ev)` (devuelve `true` si usó la
  tecla), `alEscape`, y la constante `NOMBRE_DEF`. Bloques y simulador además `rectOf`, `rutaAuto`,
  `sonHermanas`, `TEMA_DEF`, `NOMBRE_COLOR` y `aplicarTema`.

Agregar algo para las tres (un atajo, un botón de la barra, un paso del historial) va en `comun/`
una sola vez. Si sólo una lo necesita distinto, se resuelve con un dato en `HERRAMIENTA` o una
función propia, no copiando el módulo.

### El molde de cada página

Cada página armada tiene la misma estructura, de arriba hacia abajo: `<style>` con las variables de
color y el dibujo, el `<header>` con los grupos plegables, el `<svg>` con sus capas, el `<aside>` del
panel lateral, las ventanas modales, y un único `<script>` clásico con todo el JavaScript (por eso
los módulos se ven entre sí como globales y el orden de inclusión importa para las `const`/`let`
que se usan al cargar).

### El estado vive en un solo objeto

```js
let S = { ...colecciones..., sel: [], snap: true, grid: 20, zoom: 1, pan: {x,y}, tema, hoja, nombre };
```

Los nombres cambian por herramienta y hay que respetarlos, porque el resto del archivo depende:

| archivo | colecciones | selección | capas SVG |
|---|---|---|---|
| `diagrama-bloque.html` | `S.nodes`, `S.edges` | `S.sel`, `S.selEdges` | `gAtras`, `gEdges`, `gNodes`, `gOverlay` |
| `simulador-logico.html` | `S.nodes`, `S.wires` | `S.sel`, `S.selW` | `gAtras`, `gWires`, `gNodes`, `gOverlay` |
| `diagrama-señales.html` | `S.nodos`, `S.ramas` | `S.sel`, `S.selR` | `gRamas`, `gNodos`, `gOverlay` |

`gAtras` es la capa de los recuadros mandados al fondo; `gOverlay` guarda lo que no se exporta
(pines, banda de selección, área de impresión).

### `render()` redibuja todo, siempre

No hay actualizaciones parciales: se vacían las capas y se vuelve a dibujar desde `S`. Es más lento
en teoría y mucho más simple en la práctica, y para diagramas de esta escala no se nota.

Dos consecuencias que importan:

- **Cualquier referencia al DOM queda muerta después de un `render()`.** Si hace falta el elemento
  de un nodo, hay que volver a buscarlo por `[data-id]`.
- Las funciones de acomodo (`routeAll()`, `acomodarRamas()`, `aplicarTema()`) se llaman al principio
  de `render()`. Lo que se calcula ahí es derivado: se puede recalcular siempre.

### Historial

`snapshot()` serializa el documento y `commit()` lo apila sólo si cambió. La regla: **cambiar el
estado y después llamar a `commit()` y `render()`**; en campos de texto que se escriben en vivo, se
usa `lock()` para no re-renderizar el panel mientras se tipea.

Lo que no esté en `snapshot()` **no sobrevive un deshacer**. Al agregar un campo nuevo al modelo,
revisar los tres lugares: `snapshot()`, `docDatos()` (lo que se guarda) y `cargarDoc()` (lo que se
abre).

### Identificadores

`uid(prefijo)` genera los ids y **saltea los que ya estén en uso**; al abrir un archivo, el contador
arranca del número más alto presente, no de la cantidad de elementos.

Esto no es paranoia: un id repetido hace que `getNode()` devuelva siempre el primero, y entonces el
elemento nuevo termina moviendo, duplicando o borrando al viejo. Es un bug que ya pasó y cuesta
diagnosticar porque parece un problema de interfaz. Si se toca la creación de elementos o la
apertura de archivos, mantener las dos defensas.

## Dónde se engancha cada cosa

Todas las rutas de esta sección son de `src/<herramienta>/` salvo que diga `comun/`.

**Un tipo de elemento nuevo** (compuerta, bloque, nodo): la tabla de tipos (`T` o `DEF`) con su
tamaño y nombre → `makeNode`/`nuevoNodo` para los valores por defecto → una rama en `renderNode` →
un ítem en la paleta y su ícono → el atajo de teclado → una sección en el panel si tiene opciones →
y, si dibuja fuera del molde, `bodyW`/`bodyH`/`rectOf` y los pines.

**Una opción del elemento seleccionado**: se arma el HTML en `renderInspector` y se conecta en
`wireInspector` (`panel.js`). Ahí `enVivo(id, fn)` (`comun/panel.js`) ya resuelve el patrón de
"escribir en vivo, commitear al salir", y `alClic(id, fn)` el de un botón que guarda y redibuja (no
envolver con `alClic` algo que ya hace `commit()`+`render()`, como `duplicar`: en bloques eso dejaba
un paso de deshacer vacío, porque el documento guarda la ruta de las flechas).

**Algo que se guarda con el documento**: `docDatos()`, `cargarDoc()` y `snapshot()`/`restore()`. El documento lleva `version` (`VERSION_DOC` en `comun/documento.js`): al cambiar la forma de guardar hay que subirla y migrar en `cargarDoc()` según la que venga (los archivos viejos no la traen).

**Algo que se exporta**: `buildExportSVG()` (`exportar.js`), que arma sobre `svgExportado()` de
`comun/documento.js`. Ojo con que el simulador inlinea los estilos como
atributos (`inlinarEstilos` + `ESTILO_EXPORT`), mientras que las otras dos mandan un `<style>` con
variables CSS.

## Notación del diagrama de señales

La convención distingue de un vistazo qué es qué, y conviene respetarla:

- **Los nodos van en minúscula** (`a`, `b`, `d`…), porque las **mayúsculas son ganancias**
  (`G1`, `H2`). Quedan afuera del reparto automático la `c`, la `g`, la `h` y la `r`: las dos del
  medio son funciones de transferencia y las otras dos, entrada y salida.
- **El subíndice recién aparece cuando hay que repetir una letra.** Primero se reparten las 22
  peladas y después empiezan `a1`, `b1`, `d1`…

Al dibujar y en el análisis, **un número pegado a una letra baja solo**: se escribe `G1` y se lee
G₁, sin necesidad del guión bajo (que igual sirve para lo que no es número: `H_ent`, `x_{n+1}`).
De eso se encarga `trozosDeTexto()`, que parte el texto en trozos de línea y de subíndice.

Hay dos formas de pintarlo según dónde vaya: `ponerTexto()` arma `<tspan>` para el SVG, y
`conSub()` devuelve HTML con `<sub>` para la ventana de análisis. **`conSub()` no sirve para meter
en un atributo** —ahí va `esc()` pelado—, y esa es justo la línea que separa un uso del otro.

## Colores: las variables mandan

El dibujo toma los colores de variables CSS puestas en el `<svg>` (`--c-relleno`, `--c-borde`,
`--c-texto`, `--c-flecha`/`--c-cable`, `--c-fondo`). Un elemento con color propio redefine la
variable en su propio `<g>` y todo lo que cuelga adentro la hereda. Por eso no hace falta tocar el
código de dibujo para pintar algo distinto.

**La trampa**: una clase CSS le gana a un atributo de presentación. Poner `fill="#0b7a3c"` en un
`<text class="g-label">` no hace nada, porque `.g-label` define `fill`. Para pisar el color de un
elemento suelto va por `style`, que sí le gana a la clase.

## Flechas corridas a mano y tiradores de tamaño (diagrama-bloque)

- `e.manual = { c: [...] }` guarda las líneas del medio de una ruta ortogonal (la y de un tramo
  horizontal, la x de uno vertical). La primera y la última línea salen de los puertos. Vive en la
  flecha, así que el historial, el guardado y el SVG exportado lo arrastran solos. `routeAll()` lo
  aplica con `aplicarManual()` y, si no es válido (puertos que cambiaron la paridad), cae a la ruta
  automática. Todo lo que reacomoda flechas tiene que llamar a `rutaAuto(e)` y no sólo poner
  `variant = 0`, o la ruta manual sobrevive.
- La orientación de un tramo se deduce de la paridad (`tramoHoriz`), nunca de los puntos: un tramo
  de largo cero no tiene orientación.
- Los tiradores de tamaño salen de `renderHandles()` para `esEstirable(n)`; la cuenta está en
  `estirar()`. Los recuadros dejan fijo el lado opuesto; bloques y sumadores crecen desde el centro
  para no desalinear los puertos.

## Trampas conocidas

- **Las imágenes no cargan con `file://`.** El previsualizador sirve las páginas locales como
  snapshot `data:` y las rutas relativas mueren. Hay que levantar un servidor HTTP.
- **El navegador cachea el HTML.** Sumar `?v=N` a la URL al recargar; si no, se depura una versión
  vieja.
- **El evento `dblclick` del navegador no llega nunca** sobre los elementos del lienzo: `render()`
  los reemplaza al apretar, el `click` se descarta y con él el `dblclick`. Las tres herramientas
  detectan el doble clic a mano con `detectarDobleClic` (`comun/doble-clic.js`: `pointerdown` +
  `pointerup` en captura, 400 ms y 6 px) y despachan un `dblclick` sintético (`dobleClicSintetico`),
  o llaman a `editarElemento` en el diagrama de bloques. No volver a depender
  del evento nativo ni agregar un segundo manejador de `dblclick` que enfoque el panel: le robaba
  el foco al editor sobre la hoja y lo cerraba.
- **Copiar/pegar/duplicar comparten una sola ruta** (`comun/portapapeles.js`): `tomarSeleccion()` saca una
  foto (con clones profundos) y `insertar(foto, desp)` (el de cada herramienta) la mete con ids nuevos; Ctrl+C guarda la foto
  en `portapapeles`, Ctrl+V la inserta (cada pegado más corrido) y Ctrl+D hace las dos cosas. Al
  clonar un cable hay que conservar *todo* (`from.pin`, `to.pin`, colores): el duplicar viejo del
  simulador armaba el cable a mano y perdía la pata de salida. Ctrl+X (`cortarSel`) copia, borra y
  deja `pegados = -1` para que el primer pegado vuelva al mismo lugar. Al pegar, el nombre (señales)
  o la letra de una entrada (simulador) se conservan si nadie más los usa, y en señales el tipo
  entrada/salida también; si chocan, nombre libre y nodo normal (así copiar sigue renombrando y
  cortar/pegar no).
- **El lienzo no puede ser seleccionable ni arrastrable por el navegador** (`user-select:none` en
  `svg#canvas`, `dragstart`/`selectstart` cancelados y la selección limpiada al apretar). En Firefox,
  arrastrar sobre el SVG armaba una selección de texto y el siguiente arrastre arrancaba un
  "arrastrar y soltar" nativo que cancelaba los eventos del puntero: Ctrl+clic y la banda de
  selección quedaban trabados hasta hacer clic en otro elemento. En Chromium no se notaba. Cualquier
  gesto nuevo sobre el lienzo hay que probarlo en Firefox también: la suite corre en Chromium y en
  Firefox (`--project=firefox` para uno solo).
- **Capturar el puntero puede fallar y no es motivo para cortar el gesto.** Los `pointerdown` llaman
  a `capturarPuntero(ev)` (`comun/lienzo.js`), que envuelve `svg.setPointerCapture` en `try/catch`:
  con un puntero que ya no está activo (un dedo que se levantó, eventos sintéticos de las pruebas)
  tira, y sin la guarda el gesto entero muere con un error en consola. Usar esa función en cualquier
  gesto nuevo; no llamar a `setPointerCapture` a mano.
- **Atajos con una ventana abierta:** el `keydown` común (`comun/teclado.js`) corta apenas hay un
  `.overlay.show` (sólo Esc la cierra). Sin eso, Ctrl+C no dejaba copiar el texto del análisis o de
  la tabla, y Supr/Ctrl+V/Ctrl+Z tocaban el diagrama de atrás. Una ventana nueva tiene que usar la
  clase `overlay` para quedar cubierta.
- **Todo lo que viene de un archivo se valida antes de usarse en HTML:** ids
  (`/^[A-Za-z0-9_-]+$/`, en `sanearIds`), colores (`colorValido`/`soloColores`) y números (`num`).
  Un campo nuevo que termine adentro de un template `${…}` del panel o del SVG tiene que pasar por
  `depurarNodos`/`cargarDoc` o por `esc()`; si no, un JSON armado puede ejecutar código.
- **Mover la hoja no llama a `render()`**: `moverVista()` sólo cambia la transformación de
  `#viewport`. Si algo dibujado pasara a depender de `S.pan`, hay que redibujarlo ahí también.
  Arrastrar elementos sí re-rutea todo (las rutas dependen unas de otras), y con diagramas muy
  grandes se nota.
- **Ecuaciones de los bloques: exponentes y subíndices sin llaves siguen a LaTeX.** `s^-1` lleva el
  signo arriba (antes se perdía) y, de un nombre, sólo va la primera letra: `\omega_ns` es ω_n·s
  (antes salía ω con subíndice «ns»); para varias letras, `H_{ent}`. La altura de un exponente o
  subíndice cuenta lo que tenga adentro (una fracción en un exponente se salía del bloque).
  `correccion.spec.js` evalúa lo dibujado contra lo escrito: si se toca el tipógrafo, tiene que pasar.
- **Equivalente en bloques del diagrama de señales:** a un sumador entran a lo sumo tres ramas (la
  pata derecha es la salida); si son más, se encadenan sumadores. La salida con varias ramas o con
  un autolazo lleva un sumador antes del rótulo. Antes, la salida recibía varias flechas sin sumar y
  con cinco ramas dos compartían pata y signo. `correccion.spec.js` resuelve el sistema del
  equivalente y lo compara con el grafo.
- **Mason supone que la entrada es una fuente.** Si al nodo de entrada le llegan ramas, la ventana
  lo avisa (el resultado es la transferencia desde una señal inyectada en ese nodo).
- **Encuadrar (F) deja libre el lugar de la paleta flotante** (`encuadrar` en `comun/vista.js`), salvo
  en pantallas angostas: antes la paleta tapaba las entradas de los ejemplos del simulador.
- **El ruteo no pasa por encima del origen ni del destino de la conexión** (`propios` en
  `scorePath`): antes, en el latch SR los cables cruzaban las compuertas. La bifurcación de bloques
  (un punto) queda afuera de esa regla.
- **`simplify` del simulador da la expresión mínima** (menos términos, después menos literales):
  esenciales, golosa como cota y búsqueda exacta con poda, con tope de 150 ms por salida.
- **Autoguardado y botón «Inicio»** (`comun/autoguardado.js`). Cada herramienta guarda `docDatos()` en `localStorage`
  (`uni-tools-autoguardado-bloque|simulador|senales`) 400 ms después de cada `commit()` y siempre en
  `pagehide`/`visibilitychange`; al arrancar, si hay algo guardado, lo carga con `cargarDoc` (la misma
  validación que un archivo) en vez del ejemplo. `autoActivo` evita guardar mientras arranca. «Inicio»
  pregunta antes de salir si hay algo dibujado; si el navegador no deja guardar (`autoOk` en falso),
  el aviso dice que se pierde y `beforeunload` también avisa. La portada marca qué herramienta tiene
  algo guardado. Un campo nuevo del documento tiene que estar en `docDatos()` para sobrevivir.
- **Los archivos usan LF.** Un script de parcheo no tiene que convertir los saltos de línea, o el
  diff sale entero. (Esta nota decía CRLF; no era cierto.) `src/construir.js` rechaza una fuente con
  CRLF.
- **Los cálculos puros se prueban sin navegador** (`tests/unidades/`, `node --test "tests/unidades/*.test.js"`):
  `unidades/cargar.js` los pega en un contexto de Node, como la página. Cargan `senales/modelo.js`+`mason.js`,
  `comun/recuadros.js`+`simulador/tipos.js`+`modelo.js`+`logica.js` y `bloque/ecuaciones.js`: esos
  archivos tienen que seguir sin tocar el DOM al cargarse, o hay que probarlos desde el navegador.
- **Un cambio en `src/` no se ve hasta armar.** Después de editar, `node src/construir.js`; si no,
  se prueba (y se commitea) la página vieja. `tests/specs/fuentes.spec.js` lo detecta.
- **El orden de `pagina.html` importa.** Es un solo `<script>`: una `const` usada al cargar (por
  ejemplo `TEMA_DEF` en `comun/colores.js`, `T`/`BIESTABLES` al armar la paleta del simulador o
  `HERRAMIENTA` en `comun/autoguardado.js`) tiene que estar incluida antes, o tira "Cannot access …
  before initialization".
- **Los archivos que se abren pasan por `cargarDoc`, que depura.** `depurarNodos` y
  `depurarCables`/`depurarFlechas`/`depurarRamas` (según la herramienta) tiran lo que no se puede
  dibujar —nodos que no son objetos, tipos desconocidos, cables a nodos o patas inexistentes— y
  completan números faltantes (`x`, `y`, `w`, `h`, `font`). **No tocan lo que ya es válido.** Si se
  agrega un campo obligatorio a un nodo, completarlo ahí también, o un JSON viejo va a tirar un
  `NaN` en el SVG. Los cables/flechas se depuran *después* de `sanearIds`, porque comparan contra
  los ids definitivos.
- **Un bloque tiene una sola entrada** (diagrama-bloque): `admiteEntrada()` frena la segunda flecha
  al soltarla y avisa con un toast (la previa se ve en color de aviso, `.ghostline.invalido`); al
  abrir un archivo o el autoguardado, `depurarFlechas` descarta las repetidas y `cargarDoc` avisa con
  `flechasDeMas`. Los sumadores, las bifurcaciones y las entradas/salidas siguen recibiendo varias
  flechas. El `restore()` del historial no depura: es una foto fiel de lo que se hizo.
- **Tabla de verdad del simulador:** los nombres de las entradas se pasan a `simplify(minterms, n,
  nombres)`; se escapan con `esc()` antes. No volver a reemplazar letras A, B, C sobre el HTML ya
  armado: pisaba nombres (la salida «S» o una entrada «B» se confundían).
- **La paleta de colores vive en `localStorage`** (`uni-tools-paleta`), no en el documento: sigue al
  navegador, no al archivo.
- **Los SVG exportados llevan el documento adentro**, en `<metadata id="uni-tools-datos">`. Por eso
  se pueden volver a abrir. Al tocar el export, no perder ese bloque.

## Qué tiene cada herramienta

El diagrama de señales es el más nuevo y todavía no tiene varias cosas que ya existen en las otras
dos. Si se pide alguna, el camino corto es portarla:

| | colores | área de impresión | recuadros | paleta | selección múltiple |
|---|---|---|---|---|---|
| diagrama-bloque | sí | sí | sí | sí | sí |
| simulador-logico | sí | sí | sí | sí | no (no tiene grupo Modo) |
| diagrama-señales | no | no | no | no | sí |

Doble clic para editar el texto y los gestos táctiles (un dedo mueve la hoja, un dedo sobre un
elemento lo selecciona, dos dedos hacen zoom) están en las tres.

## Verificar antes de dar algo por hecho

Estas herramientas son todo interfaz: un cambio que "parece bien" en el código puede verse mal o no
hacer nada. Conviene mirarlo de verdad.

1. Armar las páginas (`node src/construir.js`), levantar `python -m http.server 8765` y abrir la
   página con `?v=N`.
2. Revisar que no haya errores de consola.
3. Manejar la herramienta desde el navegador y **medir**, no estimar: posiciones de pines,
   separaciones entre elementos, colores calculados con `getComputedStyle`, el SVG exportado
   renderizado en un `<img>` para confirmar que se ve igual.
4. Para lo que tiene respuesta conocida —la tabla de verdad de un sumador, el Δ de Mason de un lazo
   simple, la proporción de una A4— comparar contra el resultado esperado, no contra la intuición.
5. Chequear que el JS parsea (el comando está en `CLAUDE.md`).
6. Correr `cd tests && npm test` y, si se tocó un cálculo puro, `node --test "tests/unidades/*.test.js"`
   (rápidas, sin navegador). Si se tocó `src/comun/`, la prueba vale para las tres: `comun.spec.js`
   corre lo compartido una vez por herramienta. Un bug nuevo se arregla con su prueba en `tests/specs/`; una
   función nueva con al menos una prueba del camino feliz y una del archivo roto.

Si se levantó un servidor con `.claude/launch.json`, borrar el archivo al terminar: no es parte del
proyecto.
