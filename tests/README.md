# Pruebas de uni-tools

Suite automática con [Playwright Test](https://playwright.dev/docs/intro). Abre las páginas reales en
Chromium y en Firefox, las maneja como un usuario (teclas, clicks, arrastres) y consulta el estado interno (`S`,
`truthTable()`, `analizar()`…) para comprobar resultados.

## Por qué hay un `package.json` acá y no en la raíz

Las herramientas son HTML autocontenidos, sin build ni dependencias (regla de `CLAUDE.md`). Para no
tocar eso, **todo lo de npm vive sólo en `tests/`**: es herramienta de desarrollo, no se despliega ni
cambia cómo se usa el sitio. (`static.yml` publica la raíz entera, así que `tests/` viaja a Pages,
pero `node_modules/` no se versiona —ver `.gitignore`— y nada del sitio lo referencia.)

## Correrlas

```bash
cd tests
npm install                        # una vez
npx playwright install chromium firefox   # una vez (en Linux limpio: --with-deps)
npm test                           # toda la suite
npm run test:unidades              # sólo los cálculos puros (rápido, sin navegador ni dependencias)
npx playwright test bloque         # sólo un archivo (por nombre)
npx playwright test -g "Mason"     # sólo lo que mencione "Mason"
npm run test:ui                    # modo interactivo
```

Si ya tenés un Chromium instalado: `CHROMIUM_PATH=/ruta/a/chromium npm test` (Firefox se instala aparte con `npx playwright install firefox`).
Puerto del servidor de prueba: `PUERTO=9000 npm test` (por defecto 8780).

## Qué cubre cada archivo (`specs/`)

| archivo | qué comprueba |
|---|---|
| `humo.spec.js` | las 4 páginas abren sin errores de consola, sin pedidos externos, sin `<script src>` ni CSS externo; los enlaces de la portada andan |
| `archivos-danados.spec.js` | JSON/SVG roto, truncado o de otra herramienta: nunca deja la herramienta inutilizable; se descarta lo inválido y se conserva lo válido; colores cortos (`#123`) y colores inválidos |
| `bloque.spec.js` | herramientas y modos excluyentes (V/X/C vs B/S/N/E/T/M), seleccionar/mover/redimensionar recuadros, tiradores de tramo de flechas, doble clic para editar el contenido, copiar/pegar, mover la hoja (rueda, botón del medio, espacio, Ctrl+clic), deshacer, ida y vuelta por JSON y por SVG, el área de impresión (la exportación sale recortada a la hoja), que las puntas de flecha no acumulen marcadores viejos, que las ecuaciones de los bloques conserven el signo de `s^-1`, tomen una sola letra de subíndice sin llaves (`\omega_ns`) y entren en el bloque aunque lleven una fracción en el exponente, y que un bloque no acepte una segunda entrada (avisa y no la crea, y al abrir un archivo con entradas de más se queda con una sola; los sumadores siguen juntando varias) |
| `simulador.spec.js` | tablas de verdad de todas las compuertas, semisumador y sumador completo, ejemplos sin oscilación, nombres de entradas en las expresiones, escape de HTML en etiquetas, biestables, simplificación mínima, el área de impresión y que ningún cable pase por encima de su propia compuerta |
| `lienzo.spec.js` | el lienzo sigue respondiendo tras copiar/pegar/mover/deseleccionar; no es seleccionable ni arrastrable por el navegador |
| `cortar.spec.js` | Ctrl+X en las tres herramientas: borra, el primer pegado vuelve al mismo lugar, conserva nombres, se deshace |
| `inicio.spec.js` | botón Inicio, aviso antes de salir, autoguardado (recuperar al volver o recargar, archivo roto, una copia por herramienta) y aviso en la portada |
| `ventanas.spec.js` | con una ventana abierta Ctrl+C copia su texto y los atajos no tocan el diagrama de atrás; Esc la cierra |
| `comun.spec.js` | lo compartido de `src/comun/`, una vez por herramienta: Ctrl+D sin selección avisa y no toca nada, el aviso se queda el tiempo suficiente para leerlo y se cierra con la cruz, duplicar es un solo paso de deshacer, `?` abre la ayuda, Shift/Ctrl + rueda, nombres de archivo válidos, al encuadrar la paleta no tapa nada, ventana Abrir, el PNG descargado (firma y tamaño al triple), la versión del documento (en el JSON y adentro del SVG) y los gestos táctiles (un dedo mueve la hoja, dos hacen zoom) |
| `correccion.spec.js` | exactitud contra referencias independientes (lo esperado no sale del código de la app): Mason contra resolver el sistema lineal de grafos al azar (transferencia, ecuaciones, lazos, trayectorias y el equivalente en bloques), simplificación equivalente y mínima, circuitos al azar (tabla y expresión mostradas), biestables contra el modelo de libro y ecuaciones de bloques (lo dibujado vale lo escrito y entra en el bloque) |
| `fuentes.spec.js` | las páginas de la raíz coinciden con lo que arma `src/construir.js` y no quedan restos del armado (directivas, `{{parámetros}}`, CRLF, `<script src>`) |
| `senales.spec.js` | regla de Mason (lazos que se tocan / no se tocan, varias trayectorias, valor numérico), el equivalente en bloques tiene la misma transferencia que el grafo (con varias ramas a la salida, autolazo y cinco ramas entrando a un nodo), flechas de la vista previa que llegan desde afuera del puerto, términos negativos que se restan, aviso cuando a la entrada le llegan ramas, y que el JSON generado se abre en `diagrama-bloque`; deshacer/rehacer, copiar/pegar y duplicar |

`lienzo.spec.js` repite, en las tres herramientas, el flujo copiar → pegar → mover → deseleccionar → Ctrl+clic / banda, y comprueba que el navegador no pueda seleccionar ni arrastrar el lienzo (causa de un bloqueo que sólo se veía en Firefox). Desde 2026-10 la suite entera corre también en Firefox (`--project=firefox`).

`ayudas.js` tiene las utilidades comunes (`abrir`, `aPantalla`, `arrastrar`, `abrirTexto`).
Cada test que usa `abrir()` falla además si la página tiró algún error de consola.

La suite corre en **Chromium y en Firefox** (los dos proyectos de `playwright.config.js`; `npx playwright test --project=firefox` corre uno solo). `CHROMIUM_PATH` sólo vale para Chromium.

Las pruebas corren contra las páginas **armadas** de la raíz: después de tocar `src/`, correr
`node src/construir.js` antes de `npm test` (si no, `fuentes.spec.js` lo avisa).

## Pruebas unitarias de los cálculos puros (`unidades/`)

Mason, la lógica del simulador (compuertas, `simplify`, tablas de verdad) y el analizador de
ecuaciones de los bloques son código puro: no tocan el DOM. `unidades/` los prueba **sin navegador**
y en menos de un segundo (necesita Node ≥ 20; el CI usa 22):

```bash
node --test "unidades/*.test.js"        # desde tests/
node --test "tests/unidades/*.test.js"  # desde la raíz del repo
```

`unidades/cargar.js` pega los fragmentos de `src/` en un contexto de Node igual que lo hace la
página (mismo scope global, mismo orden de inclusión) y los tests llaman a las funciones reales.
Fijan los mismos resultados que `correccion.spec.js` verifica en el navegador, sin el costo de
levantar Chromium o Firefox. Si alguno de esos archivos empezara a tocar el DOM al cargarse, estas
pruebas fallan: es la señal de que dejó de ser puro y hay que probarlo desde `specs/`.

## Agregar una prueba

1. Elegir el spec de la herramienta (o crear `specs/<algo>.spec.js`).
2. Abrir con `abrir(page, "archivo.html")`.
3. Armar el estado con `page.evaluate` (`cargarEjemplo`, `abrirTexto` con un JSON chico) y comprobar
   contra un resultado **conocido de antemano** (la tabla de un sumador, el Δ de Mason a mano), no
   contra lo que el programa devuelve hoy.
4. Un bug arreglado → una prueba que falle sin el arreglo.

## En GitHub Actions

`.github/workflows/tests.yml` corre en push a `main` y `features`, en pull requests y a mano
(*Actions → Pruebas → Run workflow*). Pasos: verifica que las páginas estén al día con `src/`
(`node src/construir.js --comprobar`), que el JS de cada página parsea, corre las unidades
(`node --test`, sin navegador), instala
dependencias (`npm ci`, usa `package-lock.json`), instala Chromium y Firefox y corre la suite en los dos. Si algo falla,
sube el reporte y las trazas como artefacto (`reporte-playwright`, 14 días). **No despliega**: eso
sigue siendo `static.yml`, que publica al pushear a `main`.

Para impedir que se mezcle a `main` algo que no pasa: *Settings → Branches → Branch protection rule*
sobre `main` → *Require status checks to pass* → elegir «pruebas».
