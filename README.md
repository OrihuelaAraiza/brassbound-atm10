# Brassbound · ATM10 8.1

Bitácora personal en español para un jugador que empieza con Create. Sitio estático, sin dependencias de ejecución ni conexión al servidor de Minecraft.

## Uso local

```sh
npm start
```

Abrir http://localhost:4173 . El servidor solo sirve `dist/`.

## Funciones

- 8 etapas / 40 objetivos de Create; 12 rutas / 73 objetivos de otros mods.
- Create 6.0.10 + 11 addons de contenido/integración y 3 soportes técnicos documentados.
- Manifiesto: 491 entradas (487 mods, 4 shaders); 485 versiones corroboradas.
- 3,388 recetas normalizadas de JAR exactos + 9 recetas específicas KubeJS = 3,397 registros.
- Recetario, patrones, probabilidades, secuencias, fuentes y JSON original.
- Planos recursivos con selección de recetas y materiales, inventario, excedentes y resultados probabilísticos.
- Calculadora SU para ruedas y máquinas; notas sobre el dimensionado de vapor.
- Materiales, notas, planos guardados, exportación e importación combinada de respaldo JSON.

## Datos y límites

La fuente es el ZIP oficial `All the Mods 10-8.1.zip`, archivo CurseForge 8764211 (2026-08-29), Minecraft 1.21.1, NeoForge 21.1.249. Create procede del JAR 6.0.10 y código con commit ac0c444d9828da3453ae8cc65338e8de063286fb. Las fuentes se enlazan dentro del sitio y de `dist/data/`.

El catálogo es estático, no un registro obtenido ejecutando Minecraft. No resuelve todos los cambios de KubeJS, Almost Unified, recetas dinámicas, componentes NBT ni modificaciones particulares del administrador. JEI del servidor es la referencia final. Las rutas son síntesis editorial, no dependencias importadas del libro de quests.

El planificador usa reglas transparentes para elegir recetas básicas. No optimiza recursos/velocidad; detiene ciclos y dependencias ausentes como insumos externos. Reutiliza excedentes deterministas, descuenta el inventario una vez y muestra promedios para recetas aleatorias. No calcula combustible, devolución de recipientes, herramientas ni el montaje físico de máquinas. Se pueden elegir recetas intermedias manualmente.

El almacenamiento es localStorage, separado por navegador y origen. No existe sincronización de servidor o nube. La importación une objetivos/mods, conserva notas, toma el máximo por material y deduplica planos idénticos.

## Verificación

`npm test` ejecuta pruebas del motor y de integración de datos/renderizado en memoria. Estas últimas no sustituyen una revisión visual en navegador. El acceso automatizado al preview local fue bloqueado por la política del navegador; no se intentaron vías alternativas para acceder al mismo preview.

## Recursos

Los iconos de Minecraft, Create y addons conservan los derechos de sus autores; se usan como referencia de los objetos documentados. Las licencias extraídas están en `dist/licenses/`. El taller isométrico de la cabecera es SVG original. No se distribuyen los JAR ni el ZIP del modpack.
