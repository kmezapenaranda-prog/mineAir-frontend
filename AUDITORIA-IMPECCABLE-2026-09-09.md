# Auditoría Impeccable — MineAIr

Fecha: 9 de septiembre de 2026. Alcance: implementación local de las ocho pantallas, shell, componentes compartidos y adaptadores de datos. Auditoría técnica; no se modificó código fuente.

## Seguimiento: correcciones aplicadas

Tras la autorización del usuario se corrigieron los diez hallazgos en el frontend. El resto del documento conserva la evaluación original; su puntuación no representa una nueva auditoría visual.

- Guardado con captura de errores, liberación del estado ocupado, protección contra doble envío y conservación de los campos ante fallo.
- Cargas periódicas con reintento, aviso de datos anteriores y descarte de respuestas de una selección anterior. Las solicitudes edge tienen límite de 15 segundos.
- Inventario de reportes obtenido de la fuente activa. Las lecturas de registros/repetidores que el adaptador edge todavía no ofrece se identifican como no disponibles; no se sustituyen por datos mock. La procedencia también aparece en el PDF.
- Validación de voladuras en el avance y revisión de todos los pasos antes del envío. Ninguna fila incompleta se descarta silenciosamente.
- Contraste calculado del texto sobre botones de alarma: **7,48:1**, frente a 2,44:1 anterior.
- Selector del mapa etiquetado y colocación por coordenadas accesible mediante teclado.
- Persistencia local distinguida de memoria temporal, con descarga de copia cuando no es posible persistir.
- Una consulta de telemetría por nodo en reportes, reutilizada para sus gases.
- Área táctil mínima en el enlace móvil de marca y filas de voladuras que admiten varias líneas.
- Foco dirigido al nuevo paso, primer error y confirmación; errores asociados a los campos.

Validación final: **32/32 pruebas**, lint y compilación de producción correctos. Se añadieron seis pruebas de regresión para validación, consultas, fallos edge y persistencia. La compilación mantiene el PDF diferido y genera la PWA correctamente.

Límite pendiente: no hay navegador conectado para verificar visualmente viewports, zoom, foco real y lectores de pantalla. La recuperación se comprobó en lógica/adaptadores y revisión de código, no con pruebas completas de interacción. La lectura de acciones y repetidores reales requiere ampliar el contrato del servicio; mientras tanto se muestra la indisponibilidad explícita.

## Veredicto de integridad

**No pasa todavía para operación con datos reales.** La identidad industrial y el sistema de componentes son coherentes y específicos del producto, pero la recuperación de errores y la mezcla de fuentes en reportes no cumplen la promesa de continuidad y trazabilidad. Esto no invalida su uso como demostración explícitamente simulada.

El detector incluido en Impeccable devolvió `[]` al escanear `src`: cero hallazgos automáticos y cero falsos positivos que descartar. Los problemas siguientes se verificaron directamente en la implementación; ese detector no cubre toda la lógica operacional.

## Resumen

| Dimensión | Puntuación | Evidencia principal |
|---|---:|---|
| Accesibilidad | 2/4 | Contraste insuficiente en acciones de alarma y colocación de nodos dependiente del puntero |
| Rendimiento | 3/4 | Rutas divididas; reportes repiten la misma consulta por cada gas |
| Responsive | 3/4 | Shell adaptable y utilidad táctil; enlace móvil de marca sin área mínima |
| Theming | 3/4 | Tokens consistentes; combinación de alarma y texto incompatible con contraste AA |
| Integridad | 2/4 | Reportes mezclan adaptador activo con inventario y registros mock/locales |
| **Total provisional** | **13/20** | **Aceptable; requiere trabajo significativo** |

**10 hallazgos: 0 P0, 6 P1, 4 P2, 0 P3.** La nota es una evaluación técnica provisional, no una certificación de accesibilidad ni una aprobación de seguridad minera. No se auditó la validez normativa de los umbrales.

## Hallazgos

### 1. [P1] Guardar un turno puede quedar bloqueado tras un error

- Ubicación: `src/pages/Registro.jsx:212–235`; `src/data/edge/index.js:18–23`.
- Categoría: integridad.
- Evidencia: `guardar()` activa `guardando`, espera el POST y solo restablece el estado en éxito. El adaptador rechaza errores de red y respuestas HTTP no exitosas. No hay `catch` ni `finally` en el manejador.
- Impacto: el botón permanece en «Guardando…», sin explicación ni reintento; recargar pierde el formulario en memoria. Escenario condicionado al fallo del servicio edge, no reproducido contra un backend conectado.
- Recomendación: capturar el error, liberar el estado en `finally`, conservar el borrador y ofrecer reintento. Si se admite registro offline, distinguir pendiente de sincronización de confirmado por servidor.
- Verificación: rechazar el POST; deben persistir los valores y reaparecer una acción utilizable.
- Comando: `$impeccable harden`.

### 2. [P1] Cargas operacionales no tienen recuperación local de errores

- Ubicación: `src/pages/Mapa.jsx:37–53`, `src/pages/DetalleNodo.jsx:38–65`, `src/pages/Predicciones.jsx:181–196`.
- Categoría: integridad.
- Evidencia: las funciones asíncronas de carga y actualización carecen de `catch`. En un fallo inicial, el estado sigue en `null`/`undefined`; en fallos posteriores, quedan los datos anteriores. El indicador global de conexión no identifica qué consulta falló.
- Impacto: carga indefinida o información congelada sin explicación específica ni recuperación manual. Un error boundary de render no resuelve rechazos de estas promesas.
- Recomendación: estados explícitos de carga/error/dato anterior, reintento y antigüedad basada en el dato; conservar información previa con señalización de vigencia.
- Verificación: rechazar primera carga y actualización posterior en cada pantalla.
- Comando: `$impeccable harden`.

### 3. [P1] Reportes mezclan fuentes al activar edge

- Ubicación: `src/pages/Reportes.jsx:2–8`, `:264`, `:297`; `src/pages/Mapa.jsx:6`.
- Categoría: integridad.
- Evidencia: reportes consulta telemetría mediante la fuente activa, pero enumera `NODOS` mock y obtiene acciones de `data/mock/variablesOperativas.js`. Registro envía el POST a edge cuando esa fuente está activa. El mapa también importa repetidores simulados directamente.
- Impacto: los registros guardados en edge no se recuperan para el informe; el inventario puede no corresponder al real. El indicador global puede decir «En vivo» aunque parte del contenido siga siendo simulado.
- Recomendación: completar el contrato de lectura para inventario, registros y repetidores. Mientras no exista, deshabilitar las secciones no disponibles o identificar su procedencia de manera local y explícita, también en la exportación.
- Verificación: usar inventario y registros edge distintos a los mock y comprobar selección, acciones y procedencia del informe.
- Comando: `$impeccable harden`.

### 4. [P1] Voladuras negativas o incompletas pasan el asistente

- Ubicación: `src/pages/Registro.jsx:181–199`, `:226–228`.
- Categoría: integridad.
- Evidencia: `validarPaso` no valida el paso 3. `min="0"` en un input no impide escribir negativos, y el avance mediante botón no llama a validación nativa. El guardado elimina silenciosamente filas incompletas mediante `filter`.
- Impacto: cantidades negativas pueden enviarse; el resumen cuenta filas que luego se descartan, afectando la trazabilidad.
- Recomendación: validar cada fila antes de avanzar y de guardar; exigir valores finitos y no negativos según el contrato, señalar campos incompletos y no descartarlos silenciosamente.
- Verificación: filas con kg negativos, kg vacío y hora vacía deben bloquear avance con explicación concreta.
- Comando: `$impeccable harden`.

### 5. [P1] Texto de botones críticos con contraste de aproximadamente 2,44:1

- Ubicación: `src/components/alarmas/CentroAlarmas.jsx:139`, `:157`; tokens en `src/index.css`.
- Categoría: accesibilidad / theming.
- Evidencia: `bg-alarma` usa `oklch(72% 0.17 25)` y `text-alarma-foreground` usa `oklch(97% 0.01 25)`. Conversión numérica OKLCH → RGB lineal y luminancia relativa: **2,4415:1**.
- Impacto: «Confirmar recepción» y activación de notificaciones pierden legibilidad precisamente en acciones críticas.
- Estándar: WCAG 1.4.3; el texto `text-sm` requiere 4,5:1, incluso con negrita.
- Recomendación: usar un foreground oscuro específico para fondo de alarma sólido o ajustar el par completo; preservar por separado el color de texto de alarma sobre superficies oscuras.
- Verificación: medir ambos botones en estado normal, hover y foco después del cambio.
- Comando: `$impeccable polish`.

### 6. [P1] Colocar entidades en el mapa requiere puntero y el selector carece de nombre

- Ubicación: `src/pages/Mapa.jsx:94`; `src/components/mapa/PlanoMina.jsx:240–261`.
- Categoría: accesibilidad.
- Evidencia: el selector no tiene `label`, `aria-label` ni `aria-labelledby`. La posición se obtiene de coordenadas del evento de clic sobre el SVG; no existe entrada equivalente de coordenadas ni mecanismo de colocación mediante teclado.
- Impacto: seleccionar un marcador ya existente sí es accesible, pero completar su colocación no lo es para usuarios de teclado.
- Estándar: WCAG 2.1.1 y 4.1.2.
- Recomendación: etiquetar el selector y ofrecer coordenadas editables o cursor desplazable mediante teclado con confirmación explícita.
- Verificación: completar selección y colocación sin ratón ni pantalla táctil.
- Comando: `$impeccable harden`.

### 7. [P2] Éxito de guardado local aunque la persistencia falle

- Ubicación: `src/data/mock/variablesOperativas.js:26–46`; `src/pages/Registro.jsx:255`.
- Categoría: integridad.
- Evidencia: los errores de escritura en localStorage se absorben y el adaptador devuelve `ok: true`; solo permanece una copia en memoria.
- Impacto: la interfaz muestra «Registro guardado», aunque cerrar o recargar puede perderlo. Aplica al modo local/mock.
- Recomendación: devolver el nivel de persistencia obtenido y comunicar «solo en esta sesión» cuando corresponda; permitir recuperar o exportar el registro.
- Verificación: almacenamiento lleno o no disponible no debe producir una confirmación de persistencia durable.
- Comando: `$impeccable harden`.

### 8. [P2] Reportes descarga la misma serie cuatro o cinco veces por nodo

- Ubicación: `src/pages/Reportes.jsx:279–285`.
- Categoría: rendimiento.
- Evidencia: `getTelemetria(node_id, desde, hasta)` está dentro del bucle de gases. Son cinco solicitudes iguales para un nodo fijo y cuatro para un casco; la respuesta ya contiene los gases.
- Impacto: tráfico, parseo y trabajo redundantes, especialmente al consultar 30 días o con conexión débil.
- Recomendación: obtener una serie por nodo y reutilizarla en los análisis de cada gas; limitar concurrencia si el inventario crece.
- Verificación: mismo informe con una solicitud por nodo, independientemente del número de gases.
- Comando: `$impeccable optimize`.

### 9. [P2] El enlace de marca móvil no reserva un objetivo de 44 px

- Ubicación: `src/components/layout/AppShell.jsx:36–38`.
- Categoría: responsive.
- Evidencia: enlace sin padding ni `tap-target` que contiene un SVG `h-6` (24 px con raíz estándar). No se define un mínimo de 44 px.
- Impacto: volver al inicio desde la marca exige precisión adicional con guantes.
- Estándar: requisito propio de PRODUCT.md y DESIGN.md de 44 × 44 px. No se declara automáticamente incumplimiento de WCAG AA 2.5.8, cuyo mínimo y excepciones difieren.
- Recomendación: aplicar área táctil mínima al enlace manteniendo el tamaño visual de la marca.
- Verificación: medir su caja interactiva en teléfono.
- Comando: `$impeccable adapt`.

### 10. [P2] El asistente anuncia pasos pero no dirige el foco al nuevo contenido

- Ubicación: `src/pages/Registro.jsx:87–99`, `:202–210`, `:244–246`.
- Categoría: accesibilidad.
- Evidencia: el avance cambia el contenido anterior al botón enfocado; existe anuncio `aria-live`, pero no gestión del foco hacia el nuevo paso o el primer error. Los campos tampoco declaran `aria-invalid` ni asociación específica con su mensaje de error.
- Impacto: usuarios de teclado deben retroceder para encontrar los campos recién mostrados; la recuperación de errores requiere exploración adicional.
- Recomendación: enfocar el encabezado del paso o el primer campo pertinente, enfocar el primer error y asociar mensaje/campo con IDs y `aria-describedby`.
- Verificación: recorrer los cinco pasos solo con teclado, incluyendo una validación fallida.
- Comando: `$impeccable harden`.

## Patrones y fortalezas

Los problemas sistémicos son el tratamiento desigual de fallos asíncronos y la frontera incompleta entre datos simulados, locales y edge. Conviene corregir esos contratos antes de añadir nuevas pantallas.

Se mantienen buenas prácticas: rutas lazy, PDF bajo demanda y fuera del precache inicial, fuentes de sistema, tokens semánticos, foco global visible, botones con estados ARIA, tablas equivalentes a las gráficas, navegación mobile/desktop y hook reutilizable para foco/Escape en diálogos. El modo mock se identifica globalmente como simulación. Existe reducción de movimiento; no se observó el patrón global de duración 0,01 ms.

Los colores literales del logo, PDF y manifiesto tienen contextos específicos; no se cuentan como infracciones por existir. La ausencia de tema claro tampoco es un defecto: el producto define oscuro por defecto.

## Verificación ejecutada y límites

- `node .agents/skills/impeccable/scripts/detect.mjs src --json`: cero hallazgos.
- `npm.cmd run lint`: correcto.
- `npm.cmd test`: **26/26** correctas. Estas pruebas no cubren todos los flujos de error descritos.
- `npm.cmd run build`: correcto, incluyendo generación de service worker.
- Bundle PDF: 630,97 kB / 186,08 kB gzip, diferido; la advertencia de tamaño no constituye por sí misma un fallo de carga inicial.
- Chunk compartido de gráficas: 353,28 kB / 103,06 kB gzip. Precache: 35 entradas, 1042,32 KiB. No se deducen Core Web Vitals a partir de estos tamaños.
- Cálculo numérico de contraste del par de alarma: 2,4415:1.
- El navegador de la sesión no está disponible: selección devolvió «No browser is available» y descubrimiento `[]`. No se efectuaron capturas, mediciones DOM, pruebas de lector de pantalla, zoom, navegación interactiva ni simulación de fallos de red.
- Pendiente antes de cerrar la auditoría visual: 320/390/768/1440 px, texto ampliado al 200%, teclado y foco en drawers/mapa, contraste renderizado, navegación inferior en PWA y movimiento reducido. Las observaciones responsive son de código, no mediciones de viewport.
- No se editó la interfaz. La compilación regeneró `dist` como artefacto de validación.

## Acciones recomendadas

1. **[P1/P2] `$impeccable harden`**: resolver errores, fuentes, validación, persistencia y accesibilidad del mapa/asistente.
2. **[P2] `$impeccable optimize`**: reutilizar series de reportes por nodo.
3. **[P2] `$impeccable adapt`**: corregir el enlace de marca y verificar todos los viewports y ampliación de texto.
4. **[P1 y cierre] `$impeccable polish`**: corregir el contraste de alarma antes de publicar y verificar consistencia final.

Puedes pedirme ejecutar estas acciones una por una, todas juntas o en el orden que prefieras. Después de las correcciones, repetir `$impeccable audit` para actualizar la puntuación.
