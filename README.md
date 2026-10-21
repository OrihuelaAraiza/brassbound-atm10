# Brassbound · ATM10 8.1

Mesa de trabajo y atlas de fabricación en español para All the Mods 10 8.1, con una ruta inicial para un jugador que empieza con Create. Catálogo estático con perfiles y progreso en línea mediante Sites, ChatGPT y D1. Sin conexión al servidor de Minecraft.

## Uso local

```sh
npm run dev
```

Abrir la URL que imprime Vinext (puerto 5173 por defecto). `public/` conserva los módulos y assets originales; `web/index.html` es la página; `app/api/crew/` y `server/crew-api.mjs` gestionan los perfiles. `dist/` es salida generada. Aplicar primero las migraciones D1 locales según las instrucciones de Sites.

## Funciones

- 8 etapas / 40 objetivos de Create; 12 rutas / 73 objetivos de otros mods.
- Create 6.0.10 + 11 addons de contenido/integración y 3 soportes técnicos documentados.
- Manifiesto: 491 entradas (487 mods, 4 shaders); 485 versiones corroboradas.
- 9,980 recetas normalizadas de JAR exactos y ajustes KubeJS, más 7 recetas de la guía: 9,987 registros.
- 12 mods adicionales con recetas: AE2, Ars Nouveau, All the Ores, Functional Storage, Industrial Foregoing, Mekanism, Mekanism Generators, Mystical Agriculture, Powah, Productive Bees, Sophisticated Backpacks y Sophisticated Storage.
- Interfaz de mesa de trabajo centrada en acciones; sin eslóganes ni notas decorativas.
- Biblioteca de las 491 entradas del manifiesto, con búsqueda, categorías, documentación y mods guardados: 29 guías detalladas, 315 fichas de referencia y 147 componentes de soporte. Todas las fichas están en español.
- 30 demostraciones web de 13 mods: reproducción, pausa, pasos, velocidad, línea de tiempo, materiales y diagnóstico.
- Recetas, fases y fichas de mods enlazan las demostraciones pertinentes.
- Desglose de materiales con zoom y diseño adaptable.
- 4,492 representaciones de objetos referenciadas por el catálogo, obtenidas de modelos y sprites originales. Las representaciones especiales no disponibles se indican explícitamente.
- Recetario, patrones, probabilidades, secuencias, fuentes y JSON original.
- Planos recursivos con selección de recetas y materiales, inventario, excedentes y resultados probabilísticos.
- Calculadora SU para ruedas y máquinas; notas sobre el dimensionado de vapor.
- Materiales, notas, planos guardados, exportación e importación combinada de respaldo JSON.

## Datos y límites

La fuente es el ZIP oficial `All the Mods 10-8.1.zip`, archivo CurseForge 8764211 (2026-08-29), Minecraft 1.21.1, NeoForge 21.1.249. Create procede del JAR 6.0.10 y código con commit ac0c444d9828da3453ae8cc65338e8de063286fb. Las fuentes se enlazan dentro del sitio y de `public/data/`.

El catálogo es estático, no un registro obtenido ejecutando Minecraft. No resuelve todos los cambios de KubeJS, Almost Unified, recetas dinámicas, componentes NBT ni modificaciones particulares del administrador. JEI del servidor es la referencia final. Las rutas son síntesis editorial, no dependencias importadas del libro de quests.

El planificador usa reglas transparentes para elegir recetas básicas. No optimiza recursos/velocidad; detiene ciclos y dependencias ausentes como insumos externos. Reutiliza excedentes deterministas, descuenta el inventario una vez y muestra promedios para recetas aleatorias. No calcula combustible, devolución de recipientes ni el montaje físico de máquinas. Cuando la receta los declara, enumera catalizadores reutilizables y energía; estos valores no representan el consumo total de una fábrica. Las recetas con fluidos, química o componentes sin soporte fiable se consultan como referencia y quedan fuera del cálculo automático. Se pueden elegir recetas intermedias manualmente.

Sin cuenta, el progreso se conserva en localStorage. Con un jugador vinculado, se guarda en D1 y puede recuperarse desde otros dispositivos con la misma cuenta de ChatGPT. Los perfiles son Mayze, Shady, Rafunki, KelThzear, RedBone, Detectov y Bolsita. La primera vinculación asocia cada nombre con una sola cuenta; una cuenta solo puede tener un nombre. Las guías siguen siendo públicas. Los siete perfiles forman un grupo de confianza: los nombres se vinculan por orden de llegada, sin verificación de propiedad de la cuenta de Minecraft.

El grupo ve resúmenes de progreso y las últimas 150 actividades; las notas, materiales y planos completos son privados por cuenta. Marcar o reabrir objetivos genera actividad; también hay entradas libres. No se importan eventos del servidor de Minecraft. Cada escritura valida la identidad y el jugador en servidor, y usa una revisión para rechazar conflictos entre dispositivos. Los cambios pendientes se conservan localmente. Un conflicto permite descargar una copia antes de cargar la versión en línea; además se conserva una copia bajo la clave `:conflict-backup`.

El progreso anterior del navegador puede añadirse a RedBone explícitamente, preservando su clave original. La importación une objetivos/mods, conserva notas, toma el máximo por material y deduplica planos idénticos.

## Verificación

`npm test` ejecuta 25 pruebas del motor y de integración de datos/renderizado en memoria, incluido el renderizado de todas las recetas, todas las fichas de mods y las 30 demostraciones. También prueba reproducción, pausa, salto de paso, limpieza de temporizadores y conservación del progreso. Estas últimas no sustituyen una revisión visual en navegador. La revisión visual se realiza en la página HTTPS publicada; no se utiliza el preview local bloqueado por la política del navegador.

## Recursos

Los iconos de Minecraft y los mods conservan los derechos de sus autores; se usan como referencia de los objetos documentados. Las licencias extraídas están en `public/licenses/`; `public/data/icon-attributions.json` documenta las fuentes y el método de representación. El taller isométrico de la cabecera es SVG original. No se distribuyen los JAR ni el ZIP del modpack.

## Animaciones

Ponder original se ejecuta dentro de Minecraft con estructuras NBT, storyboards Java o PonderJS y renderizadores del juego. Las demostraciones de esta web son esquemas ilustrativos originales; no ejecutan Ponder ni simulan producción. Cada lección enlaza su fuente y las compatibles indican cómo abrir el Ponder nativo. El movimiento está pausado inicialmente y respeta `prefers-reduced-motion`.

El vídeo oficial de Create de 2022 se incrusta en el reproductor del autor al solicitarlo; queda identificado como showcase histórico, no como tutorial de ATM10 8.1. No se descargan ni distribuyen copias del vídeo.

Los objetivos de fichas y lecciones usan el estado del jugador y el respaldo existente. Se conserva el acceso público a las guías y no hay sincronización con Minecraft.


## Taller visual v4

Atlas de objetos en dos columnas, recetas y usos (incluido procesamiento por máquina); tres proyectos con coordenadas y visor WebGL por capas, rotación, selección, controles de reproducción, checklist y notas. Modelos/UV originales exportados del cliente fijado; movimiento web ilustrativo, no ejecución de Minecraft. Cofre auxiliar explícitamente representado por marcador. Three.js 0.170.0 y OrbitControls se sirven localmente; licencia en public/vendor/THREE-LICENSE.txt.

35 guías detalladas de los 491 mods indexados; 30 demostraciones esquemáticas existentes. Mapa editorial de 12 hitos; 12 diagnósticos guiados; modo juego con proyecto, receta fijada, existencias y progreso local. Respaldos schema 1 migran y conservan workspace. Tres vídeos de autores y capítulos verificados donde están disponibles; grabaciones locales con marcadores, sin subir archivos.

Producción: cinco fórmulas verificadas de Create 6.0.10 (press, dos mixing continuos, dos milling). Trituración usa tiempo medido, porque no se implementó el intérprete float32 por fases; Powah tiene coste FE exacto y tiempo medido. Se considera TPS, disponibilidad, SU, lotes y rendimiento medio; no se promete rendimiento real del servidor ni transporte. Fuentes y validación de investigación en public/licenses/workshop.

Verificación: 35 pruebas automatizadas, incluyendo todos los detalles de recetas y nuevas vistas, migración, fórmulas, existencias, materiales y modelos. La vista real se revisa tras publicación HTTPS; el entorno local de preview no estaba permitido. No se ejecutó Minecraft.

## Mahou Tsukai · edición ATM10 8.1

Módulo completo conectado al inicio, navegación principal, biblioteca, atlas y rutas. Incluye 10 capítulos en español, 53 hechizos con catalizadores y diagnóstico, 32 crafteos estándar, 37 objetivos compartidos entre roadmap y guías, presupuestos de materiales y Morgan, y consulta de 458 claves con las 61 diferencias del pack.

Fijado a Mahou Tsukai 1.21.1-v1.36.27 (CurseForge 8212674). Las combinaciones, recetas y configuración se cotejaron con el JAR exacto y el ZIP oficial de ATM10 8.1. Las explicaciones de la wiki actual se distinguen de la evidencia de esta versión. No se ejecutó Minecraft ni se inspeccionó la configuración particular de un servidor. La receta dinámica de William se explica sin incorporarla al cálculo recursivo.

Verificación de esta edición: 48 pruebas automatizadas aprobadas; navegador local con navegación, detalle de hechizos, búsqueda, ambas calculadoras, filtros de configuración y persistencia de un objetivo tras recargar. El objetivo de prueba se restauró al estado inicial. Evidencia en `evidence/verification-mahou.json`.

## Grupo de jugadores · octubre 2026

`npm test`: 54 pruebas, incluidas autorización, aislamiento entre cuentas, revisiones, idempotencia, actividad y migración de progreso anterior. La base de datos local de desarrollo es independiente de producción. `npm run db:generate` genera migraciones de esquema; Sites las aplica durante la publicación. Los nombres se crean al vincularse, sin perfiles de prueba en producción.

Se conserva la identidad del sitio y su audiencia pública. El acceso de desarrollo simulado con Seedy solo existe en loopback; el acceso publicado lo gestiona ChatGPT. La revisión de navegador local cubrió vinculación, entrada en bitácora, objetivo y persistencia al recargar. El acceso real de los amigos requiere que cada uno inicie sesión y elija su propio nombre.
