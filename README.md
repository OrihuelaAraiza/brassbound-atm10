# Brassbound · ATM10 8.1

Mesa de trabajo y atlas de fabricación en español para All the Mods 10 8.1, con una ruta inicial para un jugador que empieza con Create. Sitio estático, sin dependencias de ejecución ni conexión al servidor de Minecraft.

## Uso local

```sh
npm start
```

Abrir http://localhost:4173 . El servidor solo sirve `dist/`.

## Funciones

- 8 etapas / 40 objetivos de Create; 12 rutas / 73 objetivos de otros mods.
- Create 6.0.10 + 11 addons de contenido/integración y 3 soportes técnicos documentados.
- Manifiesto: 491 entradas (487 mods, 4 shaders); 485 versiones corroboradas.
- 9,980 recetas normalizadas de JAR exactos y ajustes KubeJS, más 7 recetas de la guía: 9,987 registros.
- 12 mods adicionales con recetas: AE2, Ars Nouveau, All the Ores, Functional Storage, Industrial Foregoing, Mekanism, Mekanism Generators, Mystical Agriculture, Powah, Productive Bees, Sophisticated Backpacks y Sophisticated Storage.
- Interfaz de mesa de madera, hojas de plano, archivo por disciplinas y notas de taller; zoom de los planos y diseño adaptable.
- 4,492 representaciones de objetos referenciadas por el catálogo, obtenidas de modelos y sprites originales. Las representaciones especiales no disponibles se indican explícitamente.
- Recetario, patrones, probabilidades, secuencias, fuentes y JSON original.
- Planos recursivos con selección de recetas y materiales, inventario, excedentes y resultados probabilísticos.
- Calculadora SU para ruedas y máquinas; notas sobre el dimensionado de vapor.
- Materiales, notas, planos guardados, exportación e importación combinada de respaldo JSON.

## Datos y límites

La fuente es el ZIP oficial `All the Mods 10-8.1.zip`, archivo CurseForge 8764211 (2026-08-29), Minecraft 1.21.1, NeoForge 21.1.249. Create procede del JAR 6.0.10 y código con commit ac0c444d9828da3453ae8cc65338e8de063286fb. Las fuentes se enlazan dentro del sitio y de `dist/data/`.

El catálogo es estático, no un registro obtenido ejecutando Minecraft. No resuelve todos los cambios de KubeJS, Almost Unified, recetas dinámicas, componentes NBT ni modificaciones particulares del administrador. JEI del servidor es la referencia final. Las rutas son síntesis editorial, no dependencias importadas del libro de quests.

El planificador usa reglas transparentes para elegir recetas básicas. No optimiza recursos/velocidad; detiene ciclos y dependencias ausentes como insumos externos. Reutiliza excedentes deterministas, descuenta el inventario una vez y muestra promedios para recetas aleatorias. No calcula combustible, devolución de recipientes ni el montaje físico de máquinas. Cuando la receta los declara, enumera catalizadores reutilizables y energía; estos valores no representan el consumo total de una fábrica. Las recetas con fluidos, química o componentes sin soporte fiable se consultan como referencia y quedan fuera del cálculo automático. Se pueden elegir recetas intermedias manualmente.

El almacenamiento es localStorage, separado por navegador y origen. No existe sincronización de servidor o nube. La importación une objetivos/mods, conserva notas, toma el máximo por material y deduplica planos idénticos.

## Verificación

`npm test` ejecuta 19 pruebas del motor y de integración de datos/renderizado en memoria, incluido el renderizado de todas las recetas. Estas últimas no sustituyen una revisión visual en navegador. La revisión visual se realiza en la página HTTPS publicada; no se utiliza el preview local bloqueado por la política del navegador.

## Recursos

Los iconos de Minecraft y los mods conservan los derechos de sus autores; se usan como referencia de los objetos documentados. Las licencias extraídas están en `dist/licenses/`; `dist/data/icon-attributions.json` documenta las fuentes y el método de representación. El taller isométrico de la cabecera es SVG original. No se distribuyen los JAR ni el ZIP del modpack.
