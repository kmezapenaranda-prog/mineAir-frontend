# Auditoría técnica de MineAIr — 12 de septiembre de 2026

## Dictamen

La interfaz conserva un sistema visual coherente y específico del producto, pero **no supera la revisión de integridad operacional**: hay caminos donde desaparecen alarmas sin una lectura que confirme normalización y donde datos no vigentes se presentan como normales.

Se identificaron **6 hallazgos: 5 P1 y 1 P2**. No se modificó código de la aplicación. La auditoría considera el estado actual del directorio, incluidos los cambios locales anteriores.

## Alcance y verificaciones

- Lectura de adaptadores de datos, alarmas, dashboard, registro, configuración PWA, rutas, estilos y componentes representativos.
- `npm.cmd test`: 32 pruebas aprobadas.
- `npm.cmd run lint`: aprobado.
- `npm.cmd run build`: aprobado, incluida generación del service worker. Aviso por el chunk PDF de 630,97 kB; ya está separado y excluido del precache inicial, por lo que no se considera un defecto por sí solo.
- Detector estático de Impeccable sobre `src/`: cero hallazgos; resultado en `auditoria-detector-2026-09-12.json`. Su resultado no valida comportamiento ni conformidad WCAG.
- Reproducción directa con Node de la eliminación de alarmas al fallar el sensor y clasificación de una lectura antigua.
- No se realizaron pruebas visuales en navegador, mediciones de contraste, navegación con lector de pantalla ni integración con hardware/API real. Tampoco se verificaron vulnerabilidades de dependencias o cumplimiento normativo. No se afirma cobertura completa de seguridad o accesibilidad.

## Valoración orientativa del código

| Dimensión | Puntuación | Evidencia y límites |
|---|---:|---|
| Accesibilidad | 3/4 | Etiquetas, foco y semántica presentes en componentes revisados; falta validación interactiva y contraste. |
| Rendimiento | 3/4 | Rutas diferidas y PDF separado; precache de 1051,66 KiB, sin medición de carga real. |
| Adaptación de pantalla | 3/4 | Breakpoints, contenedores y objetivos táctiles explícitos; falta comprobar zoom y viewports. |
| Tema | 3/4 | Tokens compartidos y estilo documentado; persisten valores específicos fuera de tokens. |
| Integridad de implementación | 1/4 | Fallos en alarmas, vigencia y correspondencia de datos operativos. |
| **Total provisional** | **13/20** | **Aceptable en estructura; requiere correcciones funcionales significativas.** |

Las puntuaciones visuales son una estimación por inspección estática, no una certificación.

## Hallazgos

### 1. [P1] Un fallo de sensor elimina una alarma activa

**Ubicación:** `src/lib/alarmas.js:12`, `src/lib/alarmas.js:42`; consumo en `src/components/alarmas/CentroAlarmas.jsx:61`.

**Categoría:** integridad operacional.

`detectarAlarmasCriticas` devuelve una lista vacía cuando `sensor_ok` es falso. `reconciliarAlarmas` reconstruye el estado exclusivamente con las alarmas detectadas. Una respuesta HTTP correcta con sensor averiado elimina por tanto la alarma anterior, aunque no exista una lectura segura que confirme el despeje. El manejo de errores de red del componente no cubre este caso.

**Reproducción ejecutada:** crear S1 con CH4 de 2 %, reconciliar; cambiar únicamente `sensor_ok` a falso y reconciliar de nuevo. Resultado: `previas: ['S1:ch4']`, `trasFalloSensor: []`.

**Corrección:** conservar la alarma como pendiente de verificar cuando falte una lectura válida o el nodo desaparezca de la respuesta; despejar únicamente con una medición válida, vigente y normalizada. Añadir cobertura del ciclo alarma → sensor averiado → recuperación. Comando sugerido: `$impeccable harden`.

### 2. [P1] Datos vencidos o ausencia de monitoreo pueden aparecer como estado estable

**Ubicación:** `src/lib/nivelNodo.js:21`, `src/pages/Dashboard.jsx:81`, `src/pages/Dashboard.jsx:182`.

**Categoría:** integridad operacional.

El semáforo comprueba `sensor_ok`, pero no la antigüedad de la lectura. La lista de nodos sin comunicación sí usa 60 segundos, pero ese resultado no invalida el resumen de gases. Además, el KPI convierte cualquier nivel distinto de alarma o precaución en «Estable», incluido `no_monitoreado`.

**Reproducción ejecutada:** una lectura de `2020-01-01T00:00:00Z`, con sensor válido, CH4 0,1 % y O2 20,9 %, devuelve `normal`. Por inspección, todos los sensores inválidos producen `no_monitoreado`, que el KPI rotula «Estable».

**Impacto:** el estado atmosférico puede comunicar normalidad sin mediciones vigentes que la sustenten.

**Corrección:** centralizar la vigencia por nodo y aplicarla en mapa, dashboard y detalle; representar explícitamente «Sin monitoreo» y cobertura parcial. Mantener separada la conservación de una alarma previa del semáforo de datos actuales. Comando sugerido: `$impeccable harden`.

### 3. [P1] Las gráficas dejan de actualizarse mientras el dashboard anuncia actualización automática

**Ubicación:** `src/pages/Dashboard.jsx:128`, `src/pages/Dashboard.jsx:149`.

**Categoría:** integridad de datos mostrados.

La serie diferencial se solicita únicamente al montar o cambiar `rango`. El efecto de picos instala un intervalo de cinco minutos, pero depende de `estado`, que cambia cada 20 segundos. Ese cambio limpia el intervalo; la bandera `picosCargadosRef` impide volver a instalarlo. Si la primera carga de picos falla, tampoco hay recuperación posterior mediante ese efecto.

**Reproducción por flujo de efectos:** abrir dashboard, mantener el rango y esperar al segundo sondeo de nodos. Se ejecuta la limpieza del intervalo de picos y la siguiente ejecución retorna por la bandera. Las series pueden permanecer congeladas indefinidamente aunque cambien los KPI.

**Corrección:** separar el ciclo de actualización de gráficas de la identidad del objeto `estado`, conservar un temporizador estable, recalcular el intervalo temporal en cada carga y mostrar última actualización/error por gráfica. Verificar con reloj controlado que hay nuevas cargas después de cinco minutos. Comando sugerido: `$impeccable harden`.

### 4. [P1] Un error en la primera carga del dashboard queda oculto tras los esqueletos

**Ubicación:** `src/pages/Dashboard.jsx:119`, `src/pages/Dashboard.jsx:163`.

**Categoría:** recuperación de errores.

La carga usa `Promise.all` para nodos y predicciones. Si cualquiera falla, se actualiza `error` sin establecer `estado`. El retorno temprano `if (!estado)` muestra únicamente esqueletos y nunca permite ver el error. Un fallo persistente de predicciones impide mostrar incluso nodos disponibles.

**Reproducción:** cargar la página con `/predicciones` respondiendo error, aunque `/nodos` funcione. La pantalla permanece en apariencia de carga mientras continúe el fallo.

**Corrección:** distinguir carga inicial de error, ofrecer reintento visible y permitir mostrar telemetría cuando solo falle el módulo predictivo. Comando sugerido: `$impeccable harden`.

### 5. [P1] El registro puede asignar a otro frente o turno la producción del turno actual

**Ubicación:** `src/pages/Registro.jsx:155`, `src/pages/Registro.jsx:391`, `src/pages/Registro.jsx:407`; `src/lib/produccion.js:18`.

**Categoría:** integridad de registros operativos.

La producción automática se calcula una sola vez para el turno actual y suma todos los contadores activos. El formulario permite elegir fecha, turno y frente; «usar» la producción copia el total agregado sin filtrar esos valores. Aunque el resultado contiene `porFrente`, el botón usa `produccionContada.toneladas`.

**Reproducción por flujo de datos:** seleccionar una fecha/turno anterior o un frente específico y usar la producción contada. Se envía el total del turno actual y de todos los frentes bajo los identificadores seleccionados.

**Corrección:** consultar el rango seleccionado y filtrar por frente; mientras no se soporte esa combinación, deshabilitar la copia con explicación. Comprobar dos frentes con producciones distintas y un turno histórico. Comando sugerido: `$impeccable harden`.

### 6. [P2] El dashboard etiqueta como simulados también los datos del adaptador real

**Ubicación:** `src/pages/Dashboard.jsx:200`; fuente disponible en `src/data/index.js`.

**Categoría:** claridad de procedencia.

El detalle del KPI de nodos contiene de forma incondicional «Datos simulados · S1/S2 con hardware comprado, pendiente de entrega». Con `VITE_DATA_SOURCE=edge`, ese texto permanece aunque el indicador global corresponda a la API real.

**Impacto:** dos partes de la interfaz comunican procedencias incompatibles y dificultan interpretar qué se está supervisando.

**Corrección:** derivar el texto de `origenDatos` y, cuando exista, de metadatos explícitos sobre simulación del servicio. Comando sugerido: `$impeccable clarify`.

## Patrones y puntos positivos

Los fallos se concentran en la separación entre dato disponible, dato vigente y estado operativo confirmado. Las pruebas existentes cubren utilidades y contratos, pero no estos ciclos completos de fallo y recuperación ni las dependencias temporales de los efectos.

Conviene preservar la identificación global del modo simulado, los errores HTTP propagados por el adaptador, la conservación de alarmas ante errores de red, la validación del registro, las rutas diferidas y la separación del motor PDF. Los tokens visuales, los controles etiquetados y las alternativas accesibles ya verificadas por pruebas son una base útil.

## Orden recomendado

1. `$impeccable harden`: corregir conservación de alarmas y vigencia de lecturas (1–2).
2. `$impeccable harden`: corregir correspondencia del registro y actualización/errores del dashboard (5, 3–4).
3. `$impeccable clarify`: unificar procedencia de datos (6).
4. `$impeccable audit`: repetir pruebas y añadir revisión en navegador de conexión intermitente, teclado, contraste, zoom y tamaños móviles.
5. `$impeccable polish`: ajustar detalles visuales después de resolver los fallos funcionales.

Puedes solicitar estas acciones individualmente, juntas o en el orden que prefieras. Repetir la auditoría después de las correcciones permitirá actualizar la valoración con evidencia adicional.
