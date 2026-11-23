// Controles de música/video en la barra de la URL:
//  - marca <html hz-media> cuando se ven, para que la barra de la URL les haga lugar
//  - agrega una barrita de volumen a cada tarjeta
(function () {
  if (window.__hzMediaLoaded) return;
  window.__hzMediaLoaded = true;

  const toolbar = document.getElementById("zen-media-controls-toolbar");
  if (!toolbar) return;

  // ---------- no cambiar de pestaña al tocar la tarjeta ----------
  // Zen salta a la pestaña del audio si hacés clic en la tarjeta fuera de un botón
  // (incluida la barrita de volumen). Lo cortamos: solo responden los controles.
  toolbar.addEventListener(
    "mousedown",
    (e) => {
      const t = e.composedTarget || e.originalTarget || e.target;
      if (t?.closest?.("toolbarbutton, .zen-media-progress-hbox")) return;
      e.stopPropagation();
    },
    true
  );

  // ---------- visible / no visible ----------
  const syncVisible = () => {
    const visible = [...toolbar.querySelectorAll(".zen-media-card")].some(
      (c) => getComputedStyle(c).display !== "none" && c.getBoundingClientRect().width > 0
    );
    document.documentElement.toggleAttribute("hz-media", visible);
  };

  // ---------- volumen ----------
  // pestaña a la que pertenece la tarjeta: la que está sonando, o la última con audio
  const mediaTab = () =>
    gBrowser.tabs.find((t) => t.hasAttribute("soundplaying")) ||
    gBrowser.tabs.find((t) => t.hasAttribute("muted")) ||
    gBrowser.tabs.find((t) => t.linkedBrowser?.currentURI?.spec?.includes("youtube.com/watch"));

  const setVolume = (tab, v) => {
    const mm = tab?.linkedBrowser?.messageManager;
    if (!mm) return;
    tab._hzVolume = v;
    const code = `(function(){for (const m of content.document.querySelectorAll("video,audio")) { m.volume = ${v}; if (${v} > 0 && m.muted) m.muted = false; }})();`;
    mm.loadFrameScript("data:application/javascript," + encodeURIComponent(code), false);
  };

  const addSlider = (card) => {
    if (card.querySelector(".hz-volume")) return;
    const hbox = card.querySelector(".zen-media-controls-hbox");
    if (!hbox) return;
    const input = document.createElementNS("http://www.w3.org/1999/xhtml", "input");
    input.type = "range";
    input.min = "0";
    input.max = "1";
    input.step = "0.02";
    input.className = "hz-volume zen-media-progress-bar"; // mismo estilo que la barra de progreso de Zen
    input.title = "Volumen";
    const tab = mediaTab();
    input.value = String(tab?._hzVolume ?? 1);
    input.addEventListener("input", () => setVolume(mediaTab(), Number(input.value)));
    // rueda del mouse sobre la barrita: sube/baja
    input.addEventListener("wheel", (e) => {
      e.preventDefault();
      const v = Math.min(1, Math.max(0, Number(input.value) + (e.deltaY < 0 ? 0.05 : -0.05)));
      input.value = String(v);
      setVolume(mediaTab(), v);
    });
    const mute = hbox.querySelector(".zen-media-mute-button");
    (mute?.nextSibling ? hbox.insertBefore(input, mute.nextSibling) : hbox.appendChild(input));
  };

  const refresh = () => {
    toolbar.querySelectorAll(".zen-media-card").forEach(addSlider);
    syncVisible();
  };

  new MutationObserver(refresh).observe(toolbar, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["hidden", "class", "style"],
  });
  gBrowser.tabContainer.addEventListener("TabSelect", () => setTimeout(syncVisible, 50));
  refresh();
})();
