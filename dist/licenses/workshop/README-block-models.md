# Modelos originales para el visor de Brassbound

Exportación estática del cliente exacto de ATM10 8.1. No se ha creado geometría sustituta. No son capturas ni una ejecución de Minecraft/Ponder. Exportador: `export_models.py`, sin dependencias adicionales; usa `zipfile/json` de Python.

## Archivos para integrar

- `block-models.json`: modelos, parciales, modelos de inventario, metadatos de texturas y procedencia.
- `model-textures/textures/`: copiar este árbol **dentro de `brassbound/dist/`**. Las rutas JSON ya empiezan por `textures/`.
- `validation-block-models.json`: recuentos y omisiones explícitas.
- El Site debe conservar las atribuciones existentes. No publicar los JAR de investigación.

## Contrato de geometría

`models` es un objeto por ID. Ejemplos: `create:mechanical_press`, `partial:create/press_head`, `inventory:create:mechanical_press`. `available:false` significa que no hay modelo resuelto; se debe mostrar icono o marcador esquemático explícito.

Cada entrada disponible contiene `elements` (cuboids Minecraft), `quads` (caras OBJ originales), `sourcePaths`, `sourceJars` y `modelRef`. La herencia y variables `#texture` están resueltas. Se conserva `rotation` de cada elemento y `rotation`, `tintindex`, `cullface` y `neoforge_data` de las caras. Se añaden UV automáticas cuando el JSON las omite conforme a las reglas Minecraft. Las caras ausentes no se dibujan.

- Un bloque = 16 unidades, X este, Y arriba, Z sur.
- **No limitar los elementos a 0..16.** Los originales salen de ese rango (manivela, cog, pole de prensa). Conservar esos extremos es necesario para mantener su forma.
- UV cuboid = 0..16. Dividir por 16, independiente del tamaño real de PNG.
- Quads OBJ = `vertices` en unidades de modelo y `uv` normalizado 0..1. `flip_v` ya se aplicó. Cada cara puede tener 3, 4 o más vértices; triangular por abanico para el renderer.
- Rotación de elemento se aplica alrededor de `rotation.origin`, con `rescale` si existe. La orientación de bloque se aplica alrededor de [8,8,8].
- Los PNG son píxeles originales; usar filtro nearest, transparencia/cutout. `textures[path].mcmeta` conserva animación original, si existe. Los PNG animados no se han recortado: un renderer sin atlas-animation debe seleccionar la primera trama, no estirar la tira completa sobre una cara.
- `blockstate` conserva estados/rotaciones originales. Las partes AE2 miran al norte; un cable contiene partes sobre sus caras y no debe dibujarlas como cubos separados.
- Los modelos `inventory:*` son los originales del inventario (display transform no aplicado). Sus proporciones/posiciones pueden diferir del modelo colocado. No sustituir el modelo de bloque por el de inventario dentro de un plano.

## Composición móvil de Create

Los modelos de bloque son el cuerpo fijo. Los modelos móviles están separados para evitar la doble geometría. `components` relaciona cada máquina con esos parciales. Fuentes Java exactas descargadas en `sources/`:

- Prensa: cuerpo + shaft horizontal según el eje del bloque + `partial:create/press_head`. El cabezal se traslada hacia -Y. Geometría de pole original sube por el cuerpo; no hay que truncarla. `MechanicalPressRenderer.java`.
- Mixer: cuerpo + shaftless cog con rotación Y + pole trasladado -Y + head con traslación -Y/rotación Y. `MechanicalMixerRenderer.java`.
- Manivela: cuerpo original orientado por blockstate + handle con `CachedBuffers.partialFacing(handle, state, facing.getOpposite())`; el handle original sin transformar mira al norte. No aplicar ciegamente la misma matriz a cuerpo y handle, pues sus orientaciones nativas difieren. `HandCrankBlockEntity.java` y `HandCrankRenderer.java`.
- Quemador: jaula OBJ + cabeza blaze activa cuboid; rods_large y rods_small con offsets base +2 y -3 unidades Y, según `BlazeBurnerRenderer.java`. La llama OBJ está disponible, pero el juego la dibuja bajo condiciones específicas y aplica desplazamiento de UV; no mostrarla como una simulación exacta si no se reproduce ese estado. La animación de demostración web puede ser ilustrativa y debe seguir identificada como tal.

## Versiones y procedencia

- Minecraft Java 1.21.1: `research-create/jars/minecraft-1.21.1.jar`; assets Mojang/Microsoft, sujetos a Minecraft Usage Guidelines. No afirmar que son assets propios.
- Create 6.0.10: `research-create/jars/create-1.21.1-6.0.10.jar`; CF file 7963363, SHA1 `0e97e49837bed766e6f28a4c95b04885d6acc353`. Código correlacionado con commit `ac0c444d9828da3453ae8cc65338e8de063286fb`. Consultar licencia/aviso conservado en `brassbound/dist/licenses/icon-rendering/create-1.21.1-6.0.10.jar__LICENSE.md_create-1.21.1`.
- Functional Storage 1.21.1-1.5.8: `research-expanded/jars/functionalstorage-1.21.1-1.5.8.jar`; CF file 8459097; declaración MIT.
- Applied Energistics 2 19.2.17: `research-expanded/jars/appliedenergistics2-19.2.17.jar`; CF file 7027323; conservar NOTICE y consultar licencias específicas del proyecto.

El JSON incluye las atribuciones ya verificadas por la extracción de iconos, SHA1 de los cuatro JAR, y SHA256 de cada PNG, junto con ruta original dentro del JAR. Las rutas fuente de cada modelo incluyen todos sus ancestros resueltos.

## Omisión real

`minecraft:chest` utiliza `minecraft:builtin/entity`, cuya geometría la genera Java y no existe como cuboids JSON en el cliente. Se marca `available:false`. No se ha inventado un cofre cúbico. Mesa de crafteo y placa de presión de roble oscuro sí tienen geometría exacta disponible.
