# Gregoret-ZEN

Mi [Zen Browser](https://zen-browser.app) armado para que se sienta como **Brave**, pero con la estética y las funciones de Zen.

Zen está pensado para usarse con las pestañas en una barra lateral vertical. Yo quería lo de siempre: **pestañas arriba, en una fila**, la barra de direcciones abajo y todo a mano. No hay ningún mod que haga eso, así que lo armé con CSS (`userChrome.css`) y unos scripts chicos.

## Qué cambia

**Diseño**
- Pestañas horizontales arriba, en una sola fila, con separadores finos entre cada una (como Brave). La pestaña activa se resalta y los títulos largos se desvanecen en vez de cortarse.
- Botones de minimizar / maximizar / cerrar arriba a la derecha, en la fila de pestañas.
- Barra de direcciones **siempre centrada**: crece todo lo posible y deja el mismo espacio de cada lado.
- **Essentials** de Zen como fichas chiquitas en la barra de la URL, a la derecha.
- Barra de marcadores compacta, estilo Brave.
- La página llega a los bordes (sin el marco que deja Zen).
- Desplegable de la URL, paneles (descargas, menú `...`, etc.) y tooltips con el **color del tema de Zen**.

**Música y video**
- Los controles de lo que está sonando quedan en la barra de la URL, a la izquierda: anterior, play/pausa, siguiente, silenciar y la línea de progreso.
- **Volumen estilo YouTube**: al pasar el mouse por el parlante se despliega la barrita (también funciona con la rueda).
- Se ocultan cuando estás en la pestaña que está sonando (como hace Zen).

**Comportamiento**
- Arrastrar pestañas para reordenarlas funciona en horizontal.
- **Essentials como accesos directos**: si la pestaña de ese sitio ya está abierta te lleva ahí; si no, abre una pestaña normal.
- **Library** se cierra al hacer clic afuera.
- Clic con la rueda en la barra de pestañas solo cierra pestañas (no abre pestañas nuevas por accidente).
- Pestañas nuevas al final, y al cerrar una vas a la de al lado.
- Barra de direcciones normal (no flotante), sin la animación de descarga de Zen, herramientas de desarrollador a la derecha.
- **Web apps** (Taskbar Tabs de Firefox) activadas: cualquier sitio puede ir a la barra de tareas como app, como las PWA de Brave.

## Instalación

Requisitos: Windows y Zen Browser instalado (abrilo al menos una vez).

```powershell
git clone https://github.com/KohiLounges/Gregoret-ZEN.git
cd Gregoret-ZEN
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

El instalador:
1. Busca tu perfil de Zen y cierra Zen si está abierto.
2. Copia `userChrome.css` y los scripts a `<perfil>\chrome\`. Si ya tenías una carpeta `chrome`, la guarda como `chrome-backup-<fecha>`.
3. Agrega las preferencias de `user.js` a tu perfil, sin borrar las tuyas.
4. Copia el cargador de scripts a la carpeta de instalación de Zen. **Windows te va a pedir permiso de administrador** para esto.

Después abrí Zen y listo.

### Instalación a mano

1. En Zen, abrí `about:support` → "Profile Folder" → **Open Folder**.
2. Copiá la carpeta `chrome/` de este repo dentro de esa carpeta de perfil, y agregá el contenido de `user.js` al `user.js` del perfil (crealo si no existe).
3. Copiá `install-dir/config.js` a `C:\Program Files\Zen Browser\` y `install-dir/defaults/pref/autoconfig.js` a `C:\Program Files\Zen Browser\defaults\pref\`.
4. Reiniciá Zen.

## Cómo funciona

| Archivo | Qué hace |
|---|---|
| `chrome/userChrome.css` | Todo el diseño: layout horizontal, colores del tema, tamaños. |
| `chrome/JS/horizontal-tabs.uc.js` | Pone la tira de pestañas de Zen en modo horizontal, arregla el arrastre, el clic del medio, cierra Library al hacer clic afuera. |
| `chrome/JS/url-center.uc.js` | Calcula el espacio de cada lado para que la barra de direcciones quede centrada. |
| `chrome/JS/media-volume.uc.js` | Barrita de volumen y que la tarjeta de música no te cambie de pestaña. |
| `chrome/JS/essentials-shortcut.uc.js` | Essentials como accesos directos. |
| `install-dir/config.js` | Cargador mínimo de scripts: ejecuta los `*.uc.js` de `<perfil>\chrome\JS\` en cada ventana. |
| `user.js` | Preferencias de Zen/Firefox (barra no flotante, pestañas nuevas al final, etc.). |

**¿Por qué hacen falta scripts y no alcanza con CSS?** Zen arma la lista de pestañas como columna y Firefox fuerza esa dirección desde una hoja interna que el CSS no puede pisar. Si se fuerza a fila solo con CSS, las pestañas entran en un bucle de tamaño y titilan. El script cambia la orientación de verdad, y eso además hace que arrastrar pestañas funcione en horizontal.

## Notas

- Probado en **Zen 1.24.3b** en Windows 11. Zen cambia seguido su interfaz, así que una actualización puede romper algo. Si pasa, abrí un issue.
- Una actualización de Zen puede borrar `config.js` de la carpeta de instalación. Si las pestañas empiezan a titilar después de actualizar, corré `install.ps1` de nuevo.
- Para desinstalar: borrá `<perfil>\chrome\userChrome.css`, `<perfil>\chrome\JS\` y `config.js` + `defaults\pref\autoconfig.js` de la carpeta de Zen, y reiniciá.
