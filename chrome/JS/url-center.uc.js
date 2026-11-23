// Barra de direcciones centrada: crece todo lo posible, pero deja el MISMO espacio
// a cada lado (el que haga falta para no tapar los botones del lado más ocupado).
(function () {
  if (window.__hzUrlCenterLoaded) return;
  window.__hzUrlCenterLoaded = true;

  const GAP = 12; // separación mínima con los botones
  const root = document.documentElement;
  const navBar = document.getElementById("nav-bar");
  if (!navBar) return;

  const visibleRight = (el) => {
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    if (!r.width || getComputedStyle(el).display === "none") return 0;
    return r.right;
  };

  const update = () => {
    const vw = window.innerWidth;
    // hueco para los Essentials según cuántos haya (se dibujan encima de la barra)
    const essC = document.querySelector("#zen-essentials .zen-essentials-container");
    if (essC) {
      const n = essC.querySelectorAll(".tabbrowser-tab").length;
      const slot = n ? n * 38 + (n - 1) * 4 + 16 : 0;
      root.style.setProperty("--hz-nav-slot", slot + "px");
    }
    // lado izquierdo: atrás/adelante/recargar y, si se ven, los controles de música
    const leftEnd = Math.max(
      visibleRight(document.getElementById("stop-reload-button")),
      visibleRight(document.getElementById("forward-button")),
      visibleRight(document.getElementById("zen-media-controls-toolbar"))
    );
    // lado derecho: el primer botón a la derecha de la barra y los Essentials
    let rightStart = vw;
    const rightItems = [
      document.getElementById("downloads-button"),
      ...document.querySelectorAll("#nav-bar-customization-target > :not(#urlbar-container)"),
      document.querySelector("#zen-essentials .zen-essentials-container"),
      document.getElementById("PanelUI-button"),
    ];
    for (const el of rightItems) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || getComputedStyle(el).display === "none") continue;
      if (r.left > vw / 2) rightStart = Math.min(rightStart, r.left);
    }
    const side = Math.max(leftEnd, vw - rightStart) + GAP;
    root.style.setProperty("--hz-url-side", Math.round(side) + "px");
  };

  let raf = 0;
  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; update(); });
  };

  new ResizeObserver(schedule).observe(navBar);
  const media = document.getElementById("zen-media-controls-toolbar");
  if (media) {
    new MutationObserver(schedule).observe(media, { attributes: true, subtree: true, attributeFilter: ["hidden", "style", "class"] });
  }
  const ess = document.getElementById("zen-essentials");
  if (ess) new MutationObserver(schedule).observe(ess, { childList: true, subtree: true });
  window.addEventListener("resize", schedule);
  gBrowser.tabContainer.addEventListener("TabSelect", () => setTimeout(schedule, 60));
  setTimeout(update, 300);
  update();
})();
