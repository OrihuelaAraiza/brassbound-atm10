# Contenido Brassbound — taller v4

Entrega congelada de investigación y contenido, 21 octubre 2026. Solo se modificó este directorio. No se modificó ni publicó la web.

- `projects.json`: array de 3 proyectos, 21 pasos con identificador estable y prueba de éxito. IDs: `starter-workshop`, `brass-line`, `storage-network`. Las dos primeras instalaciones empiezan manualmente con manivela o giro externo. AE2 es una ampliación del almacén físico.
- `guide-enrichments.json`: objeto por modId con requisitos, primera automatización, errores frecuentes, mejoras y fuentes para las 29 guías existentes. Arrays de requisitos/errores/mejoras son cadenas. `firstAutomation` contiene título y `steps` de cadenas.
- `extra-guides.json`: array de 6 fichas completas que reemplazan las referencias anteriores de Pipez, Modular Routers, Super Factory Manager, LaserIO, Flux Networks y Refined Storage. Añaden 30 pasos. Conservan iconos y fuentes del archivo exacto del mod en ATM10 8.1.
- `media.json`: 3 vídeos reales publicados por sus autores, con embed de YouTube, idioma y alcance explícito. El tutorial de AE2 incluye 4 fragmentos definidos por capítulos de la descripción original. Los otros se ofrecen completos sin inventar timecodes. Duración desconocida = null.
- `video-oembed-evidence.json`: respuestas públicas originales de YouTube que verifican título, autor, URL e inserción. No contiene vídeo descargado.
- `validation.json`: conteos, comprobaciones estructurales, límites y huellas SHA-256.

## Integración

Fusionar los enriquecimientos sobre sus fichas actuales sin borrar campos base. Reemplazar por ID las seis nuevas guías. Los proyectos usan `requires` con objetos `{label,kind,itemId?,count?,note?}`, `steps` con `{id,title,text,success,items}`, y listas de checks/expansions. `itemId` se refiere a equipo terminado: no representa una lista expandida de materias primas.

No marcar como completadas automáticamente las pruebas ni ampliar los requisitos recomendados a obligatorios. Los enlaces de vídeos no certifican la versión exacta del pack. Los montajes descritos se basan en recetas/Ponder/documentación de autores, pero no se ejecutaron dentro de Minecraft en esta tarea.

## Fuentes y decisiones

Las fuentes por ficha conservan las URLs de CurseForge del autor y del archivo incluido en ATM10 8.1. Los detalles mecánicos de Create y sus tres addons reutilizan los datos exactos y escenas Ponder ya extraídos en `research-create` y `research-companion`; las instrucciones nuevas de Pipez, SFM, Modular Routers y LaserIO se contrastaron con las descripciones primarias del autor guardadas en `research-companion/metadata`. Las instrucciones de energía/almacenamiento son procedimientos de prueba, sin recetas numéricas inventadas.

Vídeos: Kindle Bubble Dump, Create 6.0 Brass Age Factory (`z2lzcrtKzl4`); Debitor, Functional Storage (`BJP5KMTTb0w`, título alemán original); ChosenArchitect, AE2 (`ay0Js2TkI1E`, publicado 2024-03-02). Los capítulos AE2 usados son 04:50–05:30, 07:40–10:07, 24:13–33:29 y 54:56–56:58. La duración total no se infiere del último capítulo. No se encontró una grabación cuya página acreditara ATM10 8.1 exacto durante esta investigación acotada.
