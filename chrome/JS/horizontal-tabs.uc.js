// Zen con pestañas arriba:
//  1) pone la tira de pestañas en modo horizontal (así arrastrar/reordenar usa el eje X)
//  2) cierra Library al hacer clic fuera de él
(function () {
  if (window.__hzTabsLoaded) return;
  window.__hzTabsLoaded = true;

  // ---------- 1) modo horizontal ----------
  const setH = (el) => {
    if (el && el.getAttribute("orient") !== "horizontal") el.setAttribute("orient", "horizontal");
  };
  const applyHorizontal = () => {
    const tc = gBrowser.tabContainer;
    setH(tc);
    setH(tc.arrowScrollbox);
    document.querySelectorAll("zen-workspace .workspace-arrowscrollbox").forEach(setH);
    // sin la barrita de desplazamiento arriba de las pestañas (la rueda sigue andando)
    const boxes = [tc.arrowScrollbox, ...document.querySelectorAll("zen-workspace .workspace-arrowscrollbox")];
    for (const b of boxes) {
      const sb = b?.shadowRoot?.querySelector('[part~="scrollbox"]');
      if (sb && sb.style.scrollbarWidth !== "none") sb.style.scrollbarWidth = "none";
    }
  };
  applyHorizontal();
  // Zen puede volver a ponerlas en vertical (al crear Spaces, etc.): lo corregimos
  const tabs = document.getElementById("tabbrowser-tabs");
  new MutationObserver(applyHorizontal).observe(tabs, {
    attributes: true,
    attributeFilter: ["orient"],
    subtree: true,
    childList: true,
  });

  // ---------- 1a) arrastrar pestañas en horizontal ----------
  try {
    const dnd = gBrowser.tabContainer.tabDragAndDrop;
    if (dnd) {
      // antes/después según la posición HORIZONTAL del mouse (Zen usa la vertical)
      dnd._dropsBefore = function (event, rect) {
        const threshold =
          Services.prefs.getIntPref("browser.tabs.dragDrop.moveOverThresholdPercent", 50) / 100;
        return (event.clientX - rect.left) / rect.width <= threshold;
      };
      // sin "soltar en el medio = pantalla dividida" (en una fila se activaba siempre)
      dnd._handle_tabDragOverToSplit = function () {
        try { this._clearDragOverSplit(); } catch (e) {}
      };
      Object.defineProperty(dnd, "_splitDropReady", { get: () => false, configurable: true });
    }
  } catch (e) {
    console.error("horizontal-tabs dnd patch", e);
  }

  // ---------- 1a-bis) feedback al arrastrar ----------
  // Línea vertical que marca dónde va a caer la pestaña, y la imagen arrastrada
  // pegada al cursor (Zen la ubica pensando en la barra vertical y queda abajo).
  const TAB_TYPE = "application/x-moz-tabbrowser-tab";
  const indicator = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
  indicator.id = "hz-drop-indicator";
  indicator.style.cssText =
    "position:fixed;width:3px;border-radius:3px;pointer-events:none;z-index:1000;display:none;" +
    "background:color-mix(in srgb, var(--zen-primary-color) 70%, white);" +
    "box-shadow:0 0 6px color-mix(in srgb, var(--zen-primary-color) 60%, transparent);" +
    "transition:left 0.08s ease;";
  document.documentElement.appendChild(indicator);
  const hideIndicator = () => (indicator.style.display = "none");

  window.addEventListener(
    "dragover",
    (e) => {
      if (!e.dataTransfer?.types?.includes(TAB_TYPE)) return;
      const t = (e.composedTarget || e.originalTarget || e.target);
      const tab = t?.closest?.("#navigator-toolbox .tabbrowser-tab:not([zen-essential])");
      if (!tab) return hideIndicator();
      const r = tab.getBoundingClientRect();
      const before = (e.clientX - r.left) / r.width <= 0.5;
      indicator.style.left = Math.round(before ? r.left - 3 : r.right) + "px";
      indicator.style.top = Math.round(r.top + 5) + "px";
      indicator.style.height = Math.round(r.height - 10) + "px";
      indicator.style.display = "block";
    },
    true
  );
  for (const ev of ["drop", "dragend"]) window.addEventListener(ev, hideIndicator, true);
  window.addEventListener("dragleave", (e) => { if (!e.relatedTarget) hideIndicator(); }, true);

  // imagen arrastrada: que el cursor quede en el mismo punto de la pestaña donde la agarraste
  window.addEventListener("dragstart", (e) => {
    const t = (e.composedTarget || e.originalTarget || e.target);
    const tab = t?.closest?.("#navigator-toolbox .tabbrowser-tab:not([zen-essential])");
    const args = gBrowser.tabContainer.tabDragAndDrop?.originalDragImageArgs;
    if (!tab || !args || !e.dataTransfer?.updateDragImage) return;
    const r = tab.getBoundingClientRect();
    const x = Math.max(0, Math.round(e.clientX - r.left));
    const y = Math.max(0, Math.round(e.clientY - r.top));
    gBrowser.tabContainer.tabDragAndDrop.originalDragImageArgs = [args[0], x, y];
    try { e.dataTransfer.updateDragImage(args[0], x, y); } catch (err) {}
  });

  // ---------- 1b) rueda del mouse (clic del medio) ----------
  // Cerrar una pestaña con la rueda hace que las demás se corran; si el clic cae
  // en el espacio vacío de la barra o en el "+", Firefox abre pestañas nuevas.
  // En la barra de pestañas, el clic del medio solo cierra pestañas.
  const stripMiddle = (e) => {
    if (e.button !== 1) return;
    const t = e.composedTarget || e.originalTarget || e.target;
    if (!t?.closest?.("#tabbrowser-tabs, #TabsToolbar")) return;
    if (t.closest(".tabbrowser-tab")) return; // sobre una pestaña: se cierra normal
    e.preventDefault();
    e.stopPropagation();
  };
  for (const ev of ["mousedown", "mouseup", "click", "auxclick"]) {
    window.addEventListener(ev, stripMiddle, true);
  }

  // ---------- 2) cerrar Library al hacer clic afuera ----------
  const lib = () => document.querySelector("zen-library");
  const isOpen = () => !!lib()?.hasAttribute("open");
  const closeLibrary = () => document.getElementById("zen-library-button")?.click();
  const inside = (t) =>
    !t ||
    lib()?.contains(t) ||
    t.closest?.("#zen-library-button, menupopup, panel, #zen-library-download-list");

  window.addEventListener(
    "mousedown",
    (e) => {
      if (!isOpen()) return;
      const t = e.composedTarget || e.originalTarget || e.target;
      if (inside(t)) return;
      closeLibrary();
    },
    true
  );
  // Capa invisible sobre el resto de la ventana mientras Library está abierto:
  // los clics dentro de la página web no llegan a la interfaz, así que esta capa
  // los atrapa y cierra Library (como un menú desplegable).
  const catcher = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
  catcher.id = "hz-library-catcher";
  catcher.style.cssText =
    "position:fixed;inset:0;z-index:29;background:transparent;display:none;";
  // va en el mismo contenedor que Library, justo debajo de él (así Library queda encima)
  const placeCatcher = () => {
    const l = lib();
    const parent = l?.parentNode || document.getElementById("browser");
    if (parent && catcher.parentNode !== parent) parent.insertBefore(catcher, l || null);
  };
  placeCatcher();
  // el cierre lo hace el listener de "mousedown" de la ventana; la capa solo evita
  // que ese clic llegue a la página
  catcher.addEventListener("mousedown", (e) => {
    e.preventDefault();
  });
  const syncCatcher = () => {
    placeCatcher();
    catcher.style.display = isOpen() ? "block" : "none";
  };
  const libEl = lib();
  if (libEl) {
    new MutationObserver(syncCatcher).observe(libEl, { attributes: true, attributeFilter: ["open"] });
  } else {
    // zen-library puede crearse después: esperar a que aparezca
    new MutationObserver((_, obs) => {
      const l = lib();
      if (!l) return;
      obs.disconnect();
      new MutationObserver(syncCatcher).observe(l, { attributes: true, attributeFilter: ["open"] });
      syncCatcher();
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  syncCatcher();

  // clic dentro de la página web: el foco pasa al <browser>
  window.addEventListener(
    "focusin",
    (e) => {
      if (isOpen() && e.target?.localName === "browser") closeLibrary();
    },
    true
  );
})();
