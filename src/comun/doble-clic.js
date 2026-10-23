/* ======================= editar con doble clic =======================
   Un input de verdad apoyado sobre el elemento: el mismo campo del panel, pero sin
   tener que ir hasta el panel. */
let editorAbierto = null;
function cerrarEditor(guardar) {
  if (!editorAbierto) return;
  const { input, aplicar } = editorAbierto;
  editorAbierto = null;                        // primero, para que el blur no vuelva a entrar
  if (guardar) aplicar(input.value);
  input.remove();
  if (guardar) commit();
  render();
}
/* (xMundo, yMundo) es el centro del campo en coordenadas de la hoja; ancho, en px de pantalla */
function editarEnLaHoja(xMundo, yMundo, valor, ancho, aplicar) {
  cerrarEditor(false);
  const input = document.createElement("input");
  input.type = "text"; input.className = "editor-hoja"; input.value = valor == null ? "" : valor;
  input.style.left = (S.pan.x + xMundo * S.zoom) + "px";
  input.style.top = (S.pan.y + yMundo * S.zoom) + "px";
  input.style.width = ancho + "px";
  $("#stage").appendChild(input);
  editorAbierto = { input, aplicar };
  input.focus(); input.select();
  input.addEventListener("keydown", ev => {
    ev.stopPropagation();
    if (ev.key === "Enter") { ev.preventDefault(); cerrarEditor(true); }
    else if (ev.key === "Escape") { ev.preventDefault(); cerrarEditor(false); }
  });
  input.addEventListener("blur", () => cerrarEditor(true));
}
/* El doble clic no se puede esperar del navegador: al apretar, el elemento se redibuja y
   el navegador descarta el "click" (el elemento del pointerdown ya no existe cuando llega
   el pointerup), así que "dblclick" nunca se dispara. Se detecta a mano: dos pulsaciones
   seguidas (400 ms), cerca (6 px) y sobre lo mismo. No volver a depender del evento nativo
   ni agregar otro manejador de dblclick que enfoque el panel: le roba el foco al editor.

   tocado(ev) dice sobre qué se apretó: un objeto con un id (las dos pulsaciones tienen que
   coincidir en él) o null si ahí no hay nada que editar. alDobleClic recibe lo que devolvió
   en la segunda pulsación, después de que termine el soltado normal. */
const MS_DOBLE_CLIC = 400, PX_DOBLE_CLIC = 6;
function detectarDobleClic(tocado, alDobleClic) {
  let ultimaPulsacion = null, dobleClic = null;
  svg.addEventListener("pointerdown", ev => {
    if (ev.button !== 0 || (ev.pointerType === "touch" && !ev.isPrimary)) return;
    const t = tocado(ev), u = ultimaPulsacion;
    dobleClic = null;
    if (t && u && u.id === t.id && ev.timeStamp - u.t < MS_DOBLE_CLIC
        && Math.hypot(ev.clientX - u.x, ev.clientY - u.y) < PX_DOBLE_CLIC) {
      dobleClic = t;
      ultimaPulsacion = null;
    } else ultimaPulsacion = t ? { id: t.id, t: ev.timeStamp, x: ev.clientX, y: ev.clientY } : null;
  }, true);
  svg.addEventListener("pointerup", () => {
    if (!dobleClic) return;
    const t = dobleClic;
    dobleClic = null;
    setTimeout(() => alDobleClic(t), 0);
  }, true);
}
/* Para las herramientas que atienden el doble clic con un manejador de "dblclick": se le
   manda uno sintético a lo que haya en ese punto de la hoja. */
const enLaHoja = (ev) => ({ id: "hoja", x: ev.clientX, y: ev.clientY });
function dobleClicSintetico({ x, y }) {
  if (editorAbierto) return;
  const blanco = document.elementFromPoint(x, y);
  if (blanco && svg.contains(blanco))
    blanco.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true, clientX: x, clientY: y, detail: 2 }));
}
