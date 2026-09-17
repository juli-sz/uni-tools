---
name: uni-tools
description: Arquitectura compartida y flujo de trabajo de las herramientas de uni-tools (diagrama-bloque.html, simulador-logico.html, diagrama-señales.html). Usar siempre que se toque cualquiera de esos archivos o index.html — agregar o cambiar elementos, compuertas, nodos, ramas, opciones del panel lateral, exportación, colores, área de impresión, atajos, gestos táctiles, o el análisis de Mason — y también al depurar algo raro en el lienzo, en el ruteo de flechas o en la exportación a SVG/PNG/JSON.
---

# Trabajar en las herramientas de uni-tools

Las tres herramientas nacieron una de la otra, así que comparten arquitectura casi entera. Conviene
leer cómo resuelve el problema la herramienta vecina antes de inventar algo nuevo: si en el
simulador ya existe un panel de colores que anda, en el diagrama de señales conviene portarlo, no
rediseñarlo.

## El molde que comparten

Cada archivo tiene la misma estructura, de arriba hacia abajo: `<style>` con las variables de color
y el dibujo, el `<header>` con los grupos plegables, el `<svg>` con sus capas, el `<aside>` del
panel lateral, las ventanas modales, y un `<script>` con todo el JavaScript.

Dentro del script el orden también se repite: modelo → geometría → dibujo → interacción → historial
→ exportar/abrir → barra → arranque.

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

**Un tipo de elemento nuevo** (compuerta, bloque, nodo): la tabla de tipos (`T` o `DEF`) con su
tamaño y nombre → `makeNode`/`nuevoNodo` para los valores por defecto → una rama en `renderNode` →
un ítem en la paleta y su ícono → el atajo de teclado → una sección en el panel si tiene opciones →
y, si dibuja fuera del molde, `bodyW`/`bodyH`/`rectOf` y los pines.

**Una opción del elemento seleccionado**: se arma el HTML en `renderInspector` y se conecta en
`wireInspector`. Ahí `live(id, fn)` ya resuelve el patrón de "escribir en vivo, commitear al salir".

**Algo que se guarda con el documento**: `docDatos()`, `cargarDoc()` y `snapshot()`/`restore()`.

**Algo que se exporta**: `buildExportSVG()`. Ojo con que el simulador inlinea los estilos como
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

## Trampas conocidas

- **Las imágenes no cargan con `file://`.** El previsualizador sirve las páginas locales como
  snapshot `data:` y las rutas relativas mueren. Hay que levantar un servidor HTTP.
- **El navegador cachea el HTML.** Sumar `?v=N` a la URL al recargar; si no, se depura una versión
  vieja.
- **Los archivos están en CRLF.** Un script de parcheo tiene que normalizar y devolver el final de
  línea original, o el diff sale entero.
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

1. Levantar `python -m http.server 8765` y abrir la página con `?v=N`.
2. Revisar que no haya errores de consola.
3. Manejar la herramienta desde el navegador y **medir**, no estimar: posiciones de pines,
   separaciones entre elementos, colores calculados con `getComputedStyle`, el SVG exportado
   renderizado en un `<img>` para confirmar que se ve igual.
4. Para lo que tiene respuesta conocida —la tabla de verdad de un sumador, el Δ de Mason de un lazo
   simple, la proporción de una A4— comparar contra el resultado esperado, no contra la intuición.
5. Chequear que el JS parsea (el comando está en `CLAUDE.md`).

Si se levantó un servidor con `.claude/launch.json`, borrar el archivo al terminar: no es parte del
proyecto.
