# MineAIr — Aplicativo Web (Track C)

> ## ⛔ LEE PRIMERO `MINEAIR-SHARED.md`
>
> El contrato de datos, los umbrales del Decreto 1886, el inventario de nodos, las unidades,
> la regla de tiempo y el manejo de fallas viven **exclusivamente** en `MINEAIR-SHARED.md`.
> **No los redefinas en este archivo.** Si necesitas cambiar algo del contrato, se cambia allá,
> se sube la versión y se copia a los tres repos.
>
> Contrato vigente: **v1.4**

## Contexto

MineAIr es un sistema de monitoreo atmosférico con IA predictiva para minería subterránea de
carbón. Ganó el Pitch Day Regional de **AI4SafeMines 2026** (Consejo Colombiano de Seguridad +
IMII + ISSA Mining) y representa a Colombia en la final del **24 de septiembre de 2026 en
Saskatoon, Canadá**. Equipo: tres estudiantes de Ingeniería de Minas de la UFPS, Cúcuta.

**La diferencia clave frente a un detector comercial:** un detector mide y alerta cuando el
límite ya se superó (reactivo). MineAIr predice la probabilidad de superarlo en 1–24 h
(preventivo) y traduce esa predicción en una recomendación operativa concreta.

Frase guía: *"El sensor mide. La IA piensa, anticipa y recomienda."*

**Principio de diseño no negociable:** la IA es un **coach del minero, no un vigilante**. La
interfaz nunca se presenta como sistema de control de personal. Se muestra qué respira cada
trabajador y qué va a pasar con el aire — no dónde estuvo ni qué hizo.

Responsable: Kevin Meza. Los otros dos tracks (`mineair-firmware`, `mineair-ml`) viven en repos
separados.

**Estado actual:** el hardware fue comprado y está pendiente de entrega; todavía no está
ensamblado, calibrado ni conectado. El aplicativo se construye contra datos simulados y funciona
de forma completamente autónoma. Cuando llegue el hardware, solo cambia la capa de datos.

---

## Dónde encaja este repo

El aplicativo y el servicio ML corren en **la misma máquina**: el computador del ingeniero en
superficie (D1 — el Jetson fue eliminado). La implementación `edge/` de la capa de datos apunta
a **`localhost:8000`**, no a un dispositivo remoto en la red de la mina.

Consecuencias directas para el frontend:

- **La app es un cliente, no la fuente de verdad.** No recalcula alarmas ni predicciones.
- **La alarma local es independiente.** El ESP32 dispara buzzer y LED sin esperar a nadie. La app
  **muestra** `alarma_local` del contrato; no la controla.
- **Los sensores no tienen "alcance" en metros.** Miden el aire que los toca. Un punto fijo mide
  la sección transversal del flujo de ventilación de esa galería. Nada de círculos de cobertura
  en el mapa.
- **El gateway no calcula nada** (D2). Solo agrega y sube.

---

## Estado del hardware (afecta lo que la UI puede afirmar)

| | Contrato §2 | Real hoy |
|---|---|---|
| Nodos con gases | 5 | **2** (`S1` retorno, `S2` bocamina) |
| Nodo barométrico | `SUP1` | lo cubre `S2` |
| Malla multi-salto | sí | **no** — enlace punto a punto |

El **diferencial `S1 − S2`** (retorno − entrada) sí es hardware real. Es la feature que sostiene
el argumento técnico del proyecto, y la UI puede presentarla como medida, no simulada.

Los 9 nodos restantes los levanta el simulador del Track B. La UI los muestra en el mapa
**marcados como simulados**.

---

## Qué construir

### Pantallas

**1. Dashboard principal** — vista general de la mina. Estado consolidado, nodos activos,
alertas vigentes y predicciones abiertas ordenadas por probabilidad. Es la pantalla que el
ingeniero deja abierta.

**2. Mapa de la mina** — plano esquemático con la posición de nodos fijos, cascos, contadores y
repetidores. Semáforo de estado por nodo; clic abre panel lateral con el detalle. Para el
prototipo basta un SVG esquemático con galerías, frentes, retorno de aire y zona sellada. Los
nodos se posicionan sobre coordenadas relativas configurables.

**3. Detalle de nodo** — lecturas actuales de los 5 gases con su umbral, tendencias de 1/6/24 h,
batería, RSSI, saltos en la malla, y predicciones activas de ese punto.

**4. Panel de predicciones** — *la pantalla que diferencia al producto y la que se muestra en el
pitch; es donde más vale invertir pulido.* Cada predicción como tarjeta: probabilidad grande y
legible, gas y horizonte, factores con su peso en barras horizontales, y la recomendación
destacada. Filtros por nodo, gas y nivel. Estado `confianza: "reducida"` visible.

**5. Registro de variables operativas** — formulario del contrato #2. Rápido de llenar en campo
desde el celular, al cierre de turno. Pocos campos por pantalla y valores por defecto. Cuando hay
nodos `contador` activos, `produccion_ton` viene precargada y marcada como `contada`; el
ingeniero puede sobrescribirla, y entonces pasa a `estimada`.

**6. Reportes** — informe para fiscalización de la ANM: mediciones por período, eventos de
excedencia, acciones tomadas. Exportable a PDF.

**7. Configuración** — alta/baja de nodos, umbrales (precargados con Decreto 1886 pero
editables), cortes de nivel de alerta, datos de la mina y los frentes, y
**`capacidad_ton_vagoneta` por frente** (vive aquí, no en el firmware: el tamaño de carro cambia
sin reflashear nada).

### Comportamiento transversal

- **Estado de conexión visible siempre.** El ingeniero necesita saber si ve datos en vivo o el
  último snapshot. Nunca mostrar datos viejos como si fueran actuales.
- **Modo offline real.** Si se cae el servicio local, seguir mostrando lo último con timestamp
  claro.
- **Mobile-first.** El uso principal es el celular en bocamina o en la oficina. Escritorio
  secundario.
- **Legibilidad adversa.** Alto contraste, tipografía grande en los números críticos. Se lee con
  guantes, con polvo y con poca luz.
- **SO₂ y NO₂ se muestran como "no monitoreado"**, jamás como "normal" (el hardware no los cubre).
- **El CO₂ no se muestra como alarma equivalente al CH₄.** El SCD41 tiene rango 400–5000 ppm =
  0.04–0.5 % vol, y el umbral del Decreto 1886 es exactamente 0.5 %. Sirve para alimentar el
  modelo, **no como alarma certificada**. La UI lo debe reflejar (etiqueta o tooltip), no
  presentarlo como si tuviera el mismo respaldo que los otros gases.
- **Distinguir `hardware real` de `simulado` por nodo.** En el prototipo hay 2 nodos físicos
  (`S1`, `S2`) y 9 simulados. Un badge discreto por nodo. Esto es honestidad de producto y a la
  vez blindaje en el pitch: nadie puede acusarte de presentar simulación como hardware.
- **O₂ invertido en toda la UI.** Es el único gas donde la alarma es por debajo. El campo
  `sentido: "min"` del contrato #3 existe justamente para que la UI no tenga que adivinarlo.
- **Alcance predictivo v1:** solo CH₄ y CO generan predicciones. O₂ se mantiene bajo control
  crítico reactivo con lógica invertida; H₂S se monitorea de forma reactiva; CO₂ es contexto
  para el modelo y no alarma certificada. No mostrar predicciones de O₂, H₂S o CO₂.

---

## Stack

- **React + Vite** como PWA (instalable en celular, sin app store)
- **Tailwind** para estilos
- **Recharts** para gráficas de tendencia
- **SVG inline** para el plano de la mina (control total, sin dependencias pesadas)
- Estado en React (no hay backend propio en esta fase)

No usar `localStorage`/`sessionStorage` si se va a previsualizar en artifacts de Claude.ai. En
despliegue propio no hay restricción.

### Capa de datos

Todo acceso a datos pasa por un **único módulo adaptador** (`src/data/`):

```
getNodos()
getTelemetria(nodeId, desde, hasta)
getPredicciones(filtros)
postVariablesOperativas(payload)
getEstadoConexion()
```

Detrás, dos implementaciones intercambiables por variable de entorno:

- `mock/` — datos simulados realistas
- `edge/` — consume la API REST del servicio ML en `localhost:8000`

Esto es lo que permite construir todo hoy y conectar el hardware en septiembre sin reescribir
nada.

### Generación de datos simulados

**La misma física que el generador sintético del Track B — cualquier cambio se coordina con ML.**
Si los dos tracks simulan fenómenos distintos, la demo se contradice a sí misma.

- CH₄ con ciclo diario y picos correlacionados con producción, **desfasados 4 a 8 horas** (es la
  tesis central del proyecto)
- Correlación **negativa** presión barométrica ↔ CH₄
- Pulso de CO y descenso de O₂ tras cada voladura, recuperación gradual según ventilación
- Concentraciones mayores en el retorno de aire que en la vía de entrada
- Ruido de sensor ±3 % del rango
- Ocasionalmente un nodo con `sensor_ok: false` o batería baja, para demostrar el manejo de fallas
- Eventos de `conteo.vagonetas` para alimentar `produccion_origen: "contada"`

**El mock debe emitir exactamente el JSON del contrato #1, validado contra
`contrato/schemas/telemetria.schema.json`.** Si el mock y el hardware no producen la misma forma,
la integración de septiembre se va a la basura.

---

## Fases

**Fase 1 — Fundación.** Estructura, módulo de datos mock, umbrales centralizados, layout y
navegación.

**Fase 2 — Visualización.** Dashboard, mapa, detalle de nodo, gráficas.

**Fase 3 — Predicción.** Panel de predicciones con factores y recomendaciones. Es la pantalla del
pitch.

**Fase 4 — Captura y reportes.** Formulario de variables operativas, reportes ANM.

**Fase 5 — Integración.** Implementación `edge/`, pruebas contra el servicio ML real, modo
offline.

---

## Restricciones

- **No prometer un horizonte de predicción específico en la UI.** El horizonte real se determina
  con el piloto. Los fenómenos barométricos dan ventanas de horas; los desprendimientos súbitos
  son de minutos y los cubre la alarma reactiva local. La interfaz maneja 1/6/12/24 h.
- **No inventar precisión.** No mostrar métricas de exactitud que no se hayan medido. Si hace
  falta el espacio, dejarlo preparado y vacío.
- **Datos faltantes ≠ error.** XGBoost sigue prediciendo con nodos caídos. La UI muestra
  "predicción con confianza reducida", no una pantalla de error.
- **Nunca presentar la predicción como certeza.** Es probabilidad y así debe leerse.
- **Nada de tono de vigilancia.** Ni en textos, ni en iconografía, ni en cómo se presenta la
  ubicación del personal. El encuadre es siempre protección del trabajador.

## Referencias técnicas

- **Pipeline ML:** LASSO → WOA → XGBoost. Song et al. (2023), mina Qianjiaying, MAE 0.17.
- **Correlación barométrica:** Diaz et al. (2021–2023, University of Kentucky), 3 minas activas
  de EE.UU., pasos de 12 h.
- **Comunicaciones:** LoRa 915 MHz sobre Zigbee por alcance subterráneo.
- **Sensores (BOM cerrado):** 2× ESP32 LoRa V3 (ESP32-S3 + SX1262 915 MHz), 2× Winsen ZCE04B
  (CH₄/CO/H₂S/O₂), 1× Sensirion SCD41 (CO₂), 1× BME280 (barométrica). Detalle y limitaciones en
  §3 del compartido.
