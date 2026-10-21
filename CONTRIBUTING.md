# Contribuir a Brassbound

Puedes ampliar las guías de tus mods, corregir recetas y mejorar la web. El catálogo actual documenta ATM10 8.1, Minecraft 1.21.1 y NeoForge 21.1.249; identifica claramente cualquier contenido para otra versión o un mod añadido a tu servidor.

## Enviar cambios

1. Pulsa **Fork** en GitHub y clona tu copia. Sigue los pasos de instalación del [README](README.md).
2. Crea una rama: `git switch -c mods/nombre-del-mod`.
3. Modifica los archivos, comprueba el resultado en el navegador y ejecuta `npm test` y `npm run build`.
4. Revisa `git diff`, añade los archivos que cambiaste y crea un commit. Por ejemplo: `git add public/data/mod-atlas.json public/data/progress-catalog.json` y `git commit -m "Amplía la guía de Waystones"`.
5. Sube tu rama con `git push -u origin mods/nombre-del-mod` y abre un pull request hacia `OrihuelaAraiza/brassbound-atm10`, rama `main`.

Describe el mod y su versión, las fuentes consultadas, qué comprobaste y cualquier límite. Para cambios visuales, incluye una captura. Si tienes acceso de colaborador puedes crear la rama en este repositorio; sigue usando un pull request para revisar el cambio con el grupo.

## Dónde editar

| Contenido | Archivos |
| --- | --- |
| Biblioteca de mods: ficha, primeros pasos, consejos y fuentes | `public/data/mod-atlas.json` |
| Inventario del pack y procedencia de cada versión | `public/data/mods.json` |
| Mods con recetas normalizadas y su cobertura | `public/data/mods-catalog.json` |
| Recetas, ingredientes alternativos y traducciones | `public/data/recipes.json`, `tags.json`, `translations.json` |
| Iconos y atribuciones | `public/data/icons.json`, `icon-attributions.json`, `public/textures/`, `public/licenses/` |
| Rutas entre mods y objetivos de Create | `public/data/pack-guide.json`, `public/guide.js` |
| Demostraciones esquemáticas | `public/data/animation-scenes.json`, `animation-evidence.json` |
| Montajes y tutoriales de objetos | `public/data/workshop.json`, `public/tutorial-engine.js`, `public/tutorial-player.js` |
| Tutoriales 3D (Ponder) leídos de la API de Cretania | `public/data/ponder-index.json` (generado), `public/ponder-player.js`, `public/ponder-format.js`, `public/ponder.css` |
| Catálogo de objetivos reconocido por el servidor | `public/data/progress-catalog.json` |
| Interfaz y navegación | `web/index.html`, `public/app.js`, módulos y estilos en `public/` |
| Perfiles, progreso compartido y esquema de datos | `server/crew-api.mjs`, `public/crew-model.js`, `app/api/crew/`, `db/`, `drizzle/` |

## Ampliar la guía de un mod

Busca primero su `id` en `public/data/mod-atlas.json`: ya hay fichas para las 491 entradas del manifiesto. La mayoría de las contribuciones pueden ampliar una ficha existente.

Conserva `id` y `version`, y edita `summary`, `firstSteps`, `tips`, `related` y `sources`. Cada paso tiene `title`, `text` y, opcionalmente, `items` con identificadores como `create:shaft`. Usa `detailLevel: "guide"` cuando haya una guía detallada; `"reference"` para una ficha breve y `"support"` para componentes de soporte.

Para un mod nuevo, copia la estructura de una ficha comparable, asigna un `id` único, indica la versión y añade fuentes HTTPS. Las categorías disponibles están en `atlasCategories` de `public/companion.js`. No añadas el mod a `mods.json` como si perteneciera al manifiesto oficial de ATM10 8.1 si es una adición particular del servidor: explica esa diferencia en la ficha y en el pull request.

Si agregaste objetivos o primeros pasos, regenera el catálogo de progreso desde la raíz:

```sh
node scripts/progress-catalog.mjs
```

Incluye el JSON generado en el commit. Los primeros pasos de las fichas usan su posición como parte del identificador de progreso: agrega al final y evita reordenar pasos existentes. Mantén estables los identificadores de rutas, lecciones y proyectos para preservar el progreso guardado.

## Agregar recetas y recursos

Usa una receta del mismo tipo como referencia. `recipes.json` conserva `id`, `type`, `ingredients`, `output`, `outputs`, `source`, `raw`, `certainty` y `warnings`. Los identificadores son del tipo `mod:objeto`; los tags se resuelven en `tags.json`. Conserva cantidades, probabilidades y condiciones del archivo original y cita la versión exacta y la ruta de origen.

Actualiza `mods-catalog.json` cuando amplíes la cobertura de recetas de un mod y los recuentos correspondientes de `release-data.json`. No marques como calculable una receta que el motor no interpreta: consulta `public/engine.js` y las pruebas existentes. Agrega una prueba si introduces un tipo de receta o comportamiento nuevo; no cambies expectativas solo para ocultar un fallo.

Las traducciones usan los diccionarios `es_es` y `en_us`. `icons.json` relaciona identificadores de objetos con rutas relativas a `public/`. Mantén las licencias y atribuciones de cada recurso; no subas JAR, ZIP del modpack, credenciales, partidas ni respaldos personales de progreso. Los assets de Minecraft y de los mods conservan las condiciones de sus autores.

Los scripts Python `integrate*` y `redesign.py` son herramientas históricas de preparación: algunos dependen de carpetas `research-*` externas y pueden regenerar archivos completos. No forman parte de la instalación ni del build. Para contribuir con los datos ya publicados, edita los archivos de `public/` directamente.

## Comprobar y publicar

Ejecuta `npm test` y `npm run build`. En el navegador, abre la ficha modificada, prueba la búsqueda, las recetas y el guardado de objetivos que hayas tocado. La base de desarrollo vive en `.wrangler/` y está excluida de Git.

La integración en GitHub y la publicación en Sites son pasos distintos. GitHub Actions comprueba pruebas y compilación; la persona que administra el sitio publica la versión aceptada en Sites. El repositorio no contiene acceso a la base de producción ni instala mods en Minecraft.
