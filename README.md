# Empi-Emporium
Empi Emporium es donde se reune todo lo que hace Empi :3

Por ahora, aquí está la página para descargar **Empi Launcher** y ver las novedades de cada versión.

Sitio: https://empity001.github.io/Empi-Emporium/

## Cómo se mantiene sola

La página no tiene que editarse cuando sale una versión nueva del launcher.

- **El botón de descarga y las novedades** salen de los releases de [Empity001/EmpiLauncher](https://github.com/Empity001/EmpiLauncher/releases). Al abrir la página se le pregunta a GitHub cuál es el último release publicado, así que un release subido hace un minuto ya está aquí. El botón apunta al instalador (`Empi-Launcher-setup-<versión>.exe`) de ese release; las novedades son el texto del release.
- **Si GitHub no responde** desde el navegador del visitante (límite de 60 consultas por hora y dirección, o sin red), la página usa `data/releases.json`, una copia que renueva sola la acción `.github/workflows/sync-releases.yml` cada tres horas, y avisa de que es una copia. Si tampoco hay copia, el botón lleva a la página de releases de GitHub, que siempre funciona.
- **Nada se publica de más**: solo cuentan los releases publicados (ni borradores ni versiones de prueba).

Para renovar la copia a mano: pestaña *Actions* > *Copiar los releases del launcher* > *Run workflow*, o `node scripts/sync-releases.mjs`.

## Qué hay en el repositorio

```
index.html            la página
css/style.css         el diseño (Empi Proof Bench: negro, papel, puntos de media tinta, un solo acento rosa)
js/field.js           el fondo de puntos (adaptado de Empi Publisher); el botón de arriba a la derecha lo detiene
js/site.js            botón de descarga, novedades, lista de versiones
js/notes.js           convierte las notas de un release (Markdown sencillo) en HTML seguro
data/releases.json    copia de los releases, por si GitHub no responde
scripts/              sync-releases.mjs, lo que usa la acción para guardar esa copia
art/  img/  fonts/    el arte del launcher, capturas reales del launcher y las tipografías (Doto y Geist Mono, con sus licencias)
```

Sin dependencias ni paso de compilación: son archivos estáticos, y GitHub Pages los sirve tal cual.

## Probarlo en tu PC

Con cualquier servidor de archivos estáticos, por ejemplo:

```bash
npx serve .
```


## Notas de las notas

El primer título del release (`# Empi Launcher 3.5.3: te avisa de...`) se usa como frase resumen (sin el número, que ya se ve al lado), los `##` como apartados y los `-` como lista. El número de versión que se muestra es siempre el de la etiqueta del release.
