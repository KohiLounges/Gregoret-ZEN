// Cargador minimo de scripts: ejecuta <perfil>\chrome\JS\*.uc.js en cada ventana de Zen.
try {
  const Svc = globalThis.Services ||
    ChromeUtils.importESModule("resource://gre/modules/Services.sys.mjs").Services;

  const loadScripts = (win) => {
    try {
      if (win.location.href !== "chrome://browser/content/browser.xhtml") return;
      const dir = Svc.dirsvc.get("UChrm", Components.interfaces.nsIFile);
      dir.append("JS");
      if (!dir.exists() || !dir.isDirectory()) return;
      const files = [];
      const entries = dir.directoryEntries;
      while (entries.hasMoreElements()) {
        const f = entries.nextFile;
        if (f.isFile() && f.leafName.endsWith(".uc.js")) files.push(f);
      }
      files.sort((a, b) => a.leafName.localeCompare(b.leafName));
      // file:// no está permitido para scripts de la interfaz: lo exponemos como resource://
      const res = Svc.io.getProtocolHandler("resource")
        .QueryInterface(Components.interfaces.nsIResProtocolHandler);
      if (!res.hasSubstitution("hzjs")) res.setSubstitution("hzjs", Svc.io.newFileURI(dir));
      for (const f of files) {
        try {
          const url = "resource://hzjs/" + encodeURIComponent(f.leafName) + "?" + f.lastModifiedTime;
          Svc.scriptloader.loadSubScript(url, win);
        } catch (e) {
          Components.utils.reportError(e);
        }
      }
    } catch (e) {
      Components.utils.reportError(e);
    }
  };

  Svc.obs.addObserver((subject) => loadScripts(subject), "browser-delayed-startup-finished");
} catch (e) {
  Components.utils.reportError(e);
}
