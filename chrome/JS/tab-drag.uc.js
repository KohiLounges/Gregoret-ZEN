// Arrastrar pestañas en la fila de arriba, como en Brave:
//  - la pestaña sigue al mouse y las demás se corren con animación para hacerle lugar
//  - al soltar queda en ese lugar (sin "cancelarse")
//  - si la tirás hacia abajo, fuera de la barra, se separa en una ventana nueva
//  - Esc cancela
// Reemplaza el arrastre de Zen (pensado para la barra vertical) solo en las
// pestañas normales de la fila; Essentials y carpetas siguen con el de Zen.
(function () {
  if (window.__hzDragLoaded) return;
  window.__hzDragLoaded = true;

  const THRESHOLD = 5;   // px antes de empezar a arrastrar (para no romper el clic)
  const DETACH_Y = 80;   // px hacia abajo para separar en ventana nueva
  const ANIM = "transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)";

  // al agarrar el TEXTO del título, el evento viene de un nodo de texto (sin .closest)
  const asElement = (n) => (n && n.nodeType === 3 ? n.parentElement : n);
  const normalTab = (t) => {
    t = asElement(t);
    const tab = t?.closest?.("#navigator-toolbox .tabbrowser-tab");
    if (!tab || tab.pinned || tab.hasAttribute("zen-essential")) return null;
    if (!tab.parentElement?.classList?.contains("zen-workspace-normal-tabs-section")) return null;
    return tab;
  };
  const onButton = (t) =>
    asElement(t)?.closest?.(".tab-close-button, .tab-audio-button, .tab-reset-button, .tab-icon-overlay");

  let st = null; // estado del arrastre

  const visibleSiblings = (tab) =>
    [...tab.parentElement.children].filter(
      (el) => el.classList?.contains("tabbrowser-tab") && !el.hidden && el.getBoundingClientRect().width > 0
    );

  const begin = () => {
    const tabs = visibleSiblings(st.tab);
    st.tabs = tabs;
    st.rects = tabs.map((t) => t.getBoundingClientRect());
    st.from = tabs.indexOf(st.tab);
    const r = st.rects[st.from];
    const next = st.rects[st.from + 1] || st.rects[st.from - 1];
    st.step = next ? Math.abs(next.left - r.left) : r.width + 4; // ancho + separación
    st.minDx = st.rects[0].left - r.left;
    st.maxDx = st.rects[st.rects.length - 1].right - r.right;
    st.to = st.from;
    st.started = true;
    for (const t of tabs) t.style.transition = t === st.tab ? "none" : ANIM;
    st.tab.setAttribute("hz-dragging", "true");
    document.documentElement.setAttribute("hz-tab-dragging", "true");
  };

  const layout = (dx, detaching) => {
    const clamped = Math.min(Math.max(dx, st.minDx), st.maxDx);
    st.tab.style.transform = `translate(${clamped}px, ${detaching ? 10 : 0}px)`;
    st.tab.style.opacity = detaching ? "0.85" : "";
    const r = st.rects[st.from];
    // Como en Chromium/Brave: la vecina se corre apenas el BORDE de la pestaña
    // arrastrada cruza la mitad de la vecina (alcanza con mover media pestaña).
    const left = r.left + clamped;
    const right = r.right + clamped;
    let to = st.from;
    st.tabs.forEach((t, i) => {
      if (i === st.from) return;
      const c = st.rects[i].left + st.rects[i].width / 2;
      if (i > st.from && right > c) to++;
      if (i < st.from && left < c) to--;
    });
    st.to = to;
    st.tabs.forEach((t, i) => {
      if (i === st.from) return;
      let shift = 0;
      if (st.from < to && i > st.from && i <= to) shift = -st.step;
      if (to < st.from && i >= to && i < st.from) shift = st.step;
      t.style.transform = shift ? `translateX(${shift}px)` : "";
    });
  };

  const cleanup = () => {
    if (!st) return;
    const { tabs, tab } = st;
    if (tabs) {
      for (const t of tabs) {
        t.style.transition = "none";
        t.style.transform = "";
        t.style.opacity = "";
      }
      requestAnimationFrame(() => requestAnimationFrame(() => {
        for (const t of tabs) t.style.transition = "";
      }));
    }
    tab?.removeAttribute("hz-dragging");
    document.documentElement.removeAttribute("hz-tab-dragging");
    try { st.pointerId != null && tab.releasePointerCapture(st.pointerId); } catch (e) {}
    st = null;
  };

  window.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.ctrlKey || e.shiftKey || e.metaKey || e.altKey) return;
    const t = e.composedTarget || e.originalTarget || e.target;
    if (onButton(t)) return;
    const tab = normalTab(t);
    if (!tab) return;
    st = { tab, x0: e.clientX, y0: e.clientY, started: false, pointerId: e.pointerId };
    window.getSelection?.()?.removeAllRanges();
  }, true);

  window.addEventListener("pointermove", (e) => {
    if (!st) return;
    const dx = e.clientX - st.x0, dy = e.clientY - st.y0;
    if (!st.started) {
      if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
      begin();
      try { st.tab.setPointerCapture(e.pointerId); } catch (err) {}
    }
    st.detach = dy > DETACH_Y;
    layout(dx, st.detach);
    e.preventDefault();
  }, true);

  window.addEventListener("pointerup", (e) => {
    if (!st) return;
    if (!st.started) { st = null; return; }
    e.preventDefault();
    e.stopPropagation();
    const { tab, tabs, from, to, detach } = st;
    cleanup();
    // que el clic que sigue al soltar no haga nada raro
    window.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); }, { capture: true, once: true });
    if (detach) {
      if (gBrowser.visibleTabs.length > 1) gBrowser.replaceTabWithWindow(tab);
      return;
    }
    if (to === from) return;
    const others = tabs.filter((t) => t !== tab);
    if (to >= others.length) gBrowser.moveTabAfter(tab, others[others.length - 1]);
    else gBrowser.moveTabBefore(tab, others[to]);
  }, true);

  window.addEventListener("pointercancel", cleanup, true);
  window.addEventListener("keydown", (e) => { if (st?.started && e.key === "Escape") cleanup(); }, true);

  // Desactivar el arrastre nativo de Zen en estas pestañas (es el que se "cancelaba")
  window.addEventListener("dragstart", (e) => {
    const t = e.composedTarget || e.originalTarget || e.target;
    if (normalTab(t)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
})();
