# Datos de producción, planos y diagnóstico

Entrega para ATM10 8.1, basada en Create 6.0.10 y el snapshot distribuido del pack. No se editó la aplicación ni se ejecutó Minecraft.

- `production-processes.json`: siete procesos; cinco AST automáticos en ticks, un modelo de trituración documentado pero desactivado hasta implementar float32 por fases, y un proceso Powah con energía exacta y tiempo no soportado.
- `blueprints.json`: tres montajes mínimos (`starter-workshop`, `brass-line`, `storage-network`). Las piezas AE2 multipart están en `optionalExtensions[].parts` y comparten host con el cable: nunca dibujarlas como bloques sólidos superpuestos.
- `diagnostics.json`: doce síntomas, comprobaciones y soluciones.
- `workshop-data-validation.json`: 1,222 comprobaciones discretas de fórmulas con RPM enteros, coordenadas únicas/dentro del volumen y materiales coherentes. La validación no equivale a prueba dentro del juego.
- `sources/`: código exacto del commit `ac0c444d9828da3453ae8cc65338e8de063286fb`, recetas de los JARs, JSON extraído de tres NBT Ponder y guías/textos de los mods exactos.

## Contratos de calculadora

`formula` devuelve **ticks internos de la máquina**, con RPM positivos enteros dentro del dominio. La tasa se calcula con 20 TPS por defecto, pero no representa el rendimiento completo de cofres/cintas/transporte.

Prensa: ciclo completo desde `runningTicks=0` hasta apagar `running`, incluyendo el tick final. Con `bulkPressing=false` procesa un objeto por operación. Excluye detección/transferencia del siguiente objeto.

Molino: incluye un tick que carga el temporizador y los ticks que lo decrementan; una entrada por ciclo. El código detiene la máquina si se llena alguna salida.

Mixer: **intervalo continuo de la misma receta, cabeza ya abajo**, no duración total del primer lote. El contador requiere un tick de preparación más la cuenta regresiva. No ocultar esta distinción en el UI. El mínimo predeterminado real es **30 RPM** (`CKinetics.mediumSpeed`); 32 RPM es la velocidad práctica de la manivela.

Trituradoras: el tamaño del stack cambia el divisor log2, y al aplicar la receta cambia la velocidad restante. Batch=1 divide por cero en Java y termina limitado a 20. No resolverlo con el AST genérico ni con `processing_time/RPM`. El algoritmo literal se incluye, pero no se declara calculable automáticamente en esta entrega.

Powah: exactamente 10,000 FE por 2 energized steel. No hay FE/t ni segundos oficiales inferidos; una tasa medida por el usuario debe etiquetarse como medida.

SU no son FE ni energía acumulada por objeto: son carga simultánea de la red. Para dos ruedas de trituración se cobran dos impactos de 8 SU/RPM.

## Planos

Los dos planos Create son adaptaciones mínimas originales de geometría Ponder y reglas de conectores verificadas en código. La prensa tiene shaft horizontal; el Mixer transmite como engranaje de eje Y y no admite un shaft directo. La manivela entrega 32 RPM y capacidad 256 SU; prensa requiere 256 y Mixer 128. Son estaciones manuales, no granjas continuas.

La manivela del Mixer mira abajo, queda unida al eje que está inmediatamente encima y requiere dejar accesible su parte inferior. El Basin está dos bloques por debajo del Mixer y directamente sobre el Blaze Burner. Quemador vacío o sin combustible no satisface el calor de latón.

La extensión AE2 requiere FE externo explícito. El Storage Bus mira al controlador, y el Terminal ocupa otra cara del mismo cable. No requiere Drive para exponer cajones ni ME Controller para esta red de dos canales.

## Ámbito y atribución

Los IDs de las recetas proceden del JAR. AlmostUnified puede sustituir el resultado visible por el material preferido del pack: por ejemplo hierro en placas y latón de AllTheOres. La entrega conserva ID fuente y añade tags/equivalentes probables; JEI del servidor es la comprobación final del resultado runtime.

Las fuentes exactas y los límites están junto a cada registro. Create: código MIT; recursos y assets con derechos reservados según su LICENSE. Los NBT extraídos sirven como evidencia local, no deben publicarse como archivos de un nuevo modpack. Los planos JSON son una adaptación mínima original, no redistribución completa de los NBT. AE2 y Functional Storage conservan sus atribuciones y licencias originales. No se descarga ni publica ningún vídeo en esta entrega.
