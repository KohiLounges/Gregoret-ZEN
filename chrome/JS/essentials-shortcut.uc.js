// Essentials como accesos directos: al hacer clic se abre una pestaña normal
// con la dirección del Essential (en vez de activar la pestaña fija).
// Clic con la rueda o con Ctrl/Shift/Alt sigue funcionando como siempre en Zen.
(function () {
  if (window.__hzEssentialsLoaded) return;
  window.__hzEssentialsLoaded = true;

  const essentialFromEvent = (e) => {
    const t = e.composedTarget || e.originalTarget || e.target;
    const tab = t?.closest?.(".tabbrowser-tab");
    if (!tab || !tab.hasAttribute("zen-essential")) return null;
    // no tocar el botón de cerrar/reset ni el de audio
    if (t.closest?.(".tab-close-button, .tab-reset-button, .tab-audio-button, .tab-reset-pin-button")) return null;
    return tab;
  };

  const essentialUrl = (tab) =>
    tab._zenPinnedInitialState?.entry?.url ||
    tab.linkedBrowser?.currentURI?.spec ||
    null;

  const plain = (e) => e.button === 0 && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey;

  // Firefox selecciona la pestaña en mousedown: lo cortamos antes
  window.addEventListener(
    "mousedown",
    (e) => {
      if (!plain(e) || !essentialFromEvent(e)) return;
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );

  window.addEventListener(
    "click",
    (e) => {
      if (!plain(e)) return;
      const tab = essentialFromEvent(e);
      if (!tab) return;
      e.preventDefault();
      e.stopPropagation();
      const url = essentialUrl(tab);
      if (!url || url === "about:blank") {
        gBrowser.selectedTab = tab; // sin dirección conocida: comportamiento normal
        return;
      }
      // Si ya hay una pestaña normal abierta de ese sitio, ir a esa en vez de crear otra
      const host = (u) => { try { return Services.io.newURI(u).host; } catch { return null; } };
      const wanted = host(url);
      const existing = gBrowser.tabs.find(
        (t) =>
          !t.hasAttribute("zen-essential") &&
          !t.closing &&
          t.linkedBrowser?.currentURI &&
          (t.linkedBrowser.currentURI.spec === url ||
            (wanted && host(t.linkedBrowser.currentURI.spec) === wanted))
      );
      if (existing) {
        gBrowser.selectedTab = existing;
        return;
      }
      const newTab = gBrowser.addTrustedTab(url, {
        index: gBrowser.tabs.length,
        inBackground: false,
      });
      gBrowser.selectedTab = newTab;
    },
    true
  );
})();
