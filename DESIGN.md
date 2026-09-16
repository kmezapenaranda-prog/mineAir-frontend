---
name: MineAIr
description: Faro de seguridad para monitoreo atmosférico minero
colors:
  background-deep: "oklch(14% 0.022 215)"
  surface: "oklch(18.5% 0.025 213)"
  surface-raised: "oklch(23.5% 0.028 211)"
  foreground: "oklch(96% 0.012 92)"
  foreground-muted: "oklch(73% 0.025 205)"
  border: "oklch(33% 0.032 207)"
  shadow: "rgb(0 0 0 / 0.25)"
  primary-amber: "oklch(79% 0.155 78)"
  normal: "oklch(72% 0.17 155)"
  caution: "oklch(78% 0.16 80)"
  alarm: "oklch(72% 0.17 25)"
  offline: "oklch(70% 0.18 55)"
  chart-return-start: "#0f8b8d"
  chart-return-end: "#f0b44d"
  chart-entry: "#75c4c3"
  map-entry: "#2563eb"
  map-return: "#ef4444"
  map-duct: "#f97316"
typography:
  display:
    fontFamily: "Bahnschrift, DIN Alternate, Arial Narrow, Aptos, sans-serif"
    fontWeight: 700
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Aptos, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
  label:
    fontFamily: "Bahnschrift, DIN Alternate, Arial Narrow, Aptos, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.105em"
  navigation-micro:
    fontFamily: "Bahnschrift, DIN Alternate, Arial Narrow, Aptos, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
  chart-micro:
    fontFamily: "Aptos, Segoe UI, Roboto, sans-serif"
    fontSize: "0.5625rem"
    fontWeight: 400
rounded:
  control: "0.5rem"
  panel: "0.875rem"
  shell: "1.75rem"
  pill: "9999px"
spacing:
  compact: "0.5rem"
  control: "0.75rem"
  panel: "1rem"
  section: "1.25rem"
components:
  button-primary:
    backgroundColor: "{colors.primary-amber}"
    textColor: "{colors.background-deep}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1.25rem"
    height: "2.75rem"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
    padding: "1rem"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.75rem"
    height: "2.75rem"
---

# Design System: MineAIr

## Overview

**Creative North Star: "Faro de seguridad"**

MineAIr se comporta como instrumentación industrial que guía decisiones bajo presión: técnico, preciso y legible antes que ornamental. El fondo profundo representa el entorno subterráneo; la información crítica emerge mediante luz, contraste y capas claramente diferenciadas.

Las superficies son estratificadas y los controles se sienten táctiles y robustos. La profundidad organiza, nunca decora. Los estados operacionales conservan significados estables y no compiten con el color de marca.

**Key Characteristics:**

- Oscuro por defecto y preparado para poca luz.
- Jerarquía basada en capas, contraste y densidad controlada.
- Controles grandes, físicos y confiables.
- Números críticos inequívocos y tabulares.
- Movimiento breve que explica estado sin distraer.

## Colors

La paleta combina un fondo azul petróleo casi negro con ámbar de orientación y colores semánticos saturados para estados operacionales.

### Primary

- **Ámbar de baliza:** acción primaria, foco y orientación. Su significado es interactivo, no precautorio.

### Secondary

- **Verde respirable:** estado normal confirmado.
- **Amarillo de precaución:** condición que exige atención sin constituir alarma.
- **Rojo de alarma:** riesgo crítico y errores que requieren intervención.

### Tertiary

- **Series analíticas:** verde petróleo, ámbar mineral y aguamarina distinguen retorno, gradiente y entrada sin apropiarse de los colores de estado.
- **Semántica cartográfica:** azul para entrada, rojo cartográfico para retorno y naranja para ducto. Describen infraestructura, no severidad.

### Neutral

- **Galería profunda:** fondo continuo de la aplicación.
- **Acero estratificado:** paneles base y superficies elevadas.
- **Tiza cálida:** texto principal de máxima legibilidad.
- **Niebla mineral:** texto secundario y metadatos.

**The Stable Signal Rule.** Un color operacional conserva siempre el mismo significado; marca, decoración y estado nunca intercambian roles.

**The Beacon Rule.** El ámbar primario se reserva para foco, acciones principales y orientación. Su rareza le da autoridad.

## Typography

**Display Font:** Bahnschrift con fallbacks industriales.
**Body Font:** Aptos con fallbacks de sistema.

**Character:** La tipografía de display es condensada, técnica y firme; el cuerpo permanece neutral para lectura sostenida.

### Hierarchy

- **Headline** (700, 1.25–1.875rem): títulos de pantalla y estado general.
- **Title** (700, 1–1.125rem): módulos y agrupaciones operativas.
- **Body** (400, 0.875–1rem): instrucciones, explicaciones y valores secundarios.
- **Label** (700, 0.6875rem, tracking 0.105em, mayúsculas): categorías y eyebrows.
- **Navigation micro** (500, 0.625rem): rótulos breves de la navegación móvil.
- **Chart micro** (400, 0.5625rem): anotaciones auxiliares dentro de gráficas compactas; nunca para instrucciones o acciones.
- **Critical number** (650, tabular, tracking -0.025em): gases, probabilidades y producción.

**The Instrument Readout Rule.** Todo número que pueda cambiar una decisión usa cifras tabulares, unidad visible y jerarquía suficiente para leerse a distancia.

## Layout

La aplicación es mobile-first. En teléfono usa navegación inferior fija y una sola columna; desde 768 px convierte la navegación en sidebar y habilita rejillas de dos o más columnas. El shell limita su ancho a 1600 px y deja que cada componente resuelva su propio overflow sin ocultarlo en la raíz.

El ritmo principal progresa desde 8 px para relaciones internas hasta 20–28 px para separar regiones. Los objetivos táctiles nunca bajan de 44 × 44 px. Tablas extensas contienen su propio desplazamiento horizontal.

## Elevation & Depth

La profundidad es estratificada y ambiental. Los paneles combinan borde mineral tenue, cambio tonal y sombra oscura difusa; las superficies elevadas son visiblemente más claras. Hover puede elevar un panel interactivo 2 px, pero el modo de movimiento reducido elimina ese desplazamiento.

### Shadow Vocabulary

- **Panel ambiental** (`0 14px 38px rgb(0 8 12 / 0.22)`): separación suave entre instrumentación y fondo.
- **Panel activo** (`0 22px 55px rgb(0 0 0 / 0.25)`): respuesta puntual al hover.

**The Layer Before Shadow Rule.** Primero cambia el tono de la superficie; la sombra sólo refuerza una capa que ya es comprensible.

## Shapes

Los controles emplean esquinas firmes de 8–12 px; los paneles usan 14 px y el shell puede alcanzar 28 px en escritorio. Pills y estados compactos usan forma circular completa. Los bordes son finos y funcionales, nunca ornamentales.

## Components

### Buttons

- **Shape:** rectángulo táctil robusto, mínimo 44 px de alto.
- **Primary:** ámbar de baliza con texto oscuro y peso alto.
- **Hover / Focus:** cambio tonal moderado y anillo de foco ámbar de 2 px.
- **Secondary:** superficie oscura con borde mineral y texto claro.

### Chips

- **Style:** pills compactas pero con área táctil completa.
- **State:** seleccionado en ámbar; inactivo en superficie elevada con texto secundario.

### Cards / Containers

- **Corner Style:** panel suavemente redondeado (14 px).
- **Background:** acero estratificado con gradiente tonal discreto.
- **Shadow Strategy:** profundidad ambiental; elevación adicional sólo al interactuar.
- **Internal Padding:** 16–20 px.

### Inputs / Fields

- **Style:** fondo de superficie, borde mineral, altura mínima de 44 px y etiqueta persistente.
- **Focus:** borde y anillo ámbar visibles.
- **Error / Disabled:** error rojo con explicación textual; disabled conserva legibilidad y reduce énfasis.

### Navigation

La navegación inferior distribuye destinos con igualdad táctil; el sidebar prioriza lectura horizontal. El destino activo usa fondo ámbar tenue y texto ámbar, nunca sólo un icono o cambio imperceptible.

### Alarm Banner

La alarma ocupa una banda persistente, usa rojo semántico, anuncia cambios críticos y ofrece una acción explícita de confirmación. No debe desaparecer por un fallo de red.

## Do's and Don'ts

### Do:

- **Do** mantener visibles unidad, vigencia, procedencia y estado del sensor.
- **Do** usar capas tonales para jerarquía y color saturado para decisiones.
- **Do** conservar objetivos táctiles de al menos 44 × 44 px.
- **Do** ofrecer una alternativa sin desplazamiento cuando se reduzca movimiento.

### Don't:

- **Don't** presentar telemetría cacheada como si estuviera en vivo.
- **Don't** usar ámbar de marca para significar precaución.
- **Don't** depender únicamente del color para comunicar nivel o selección.
- **Don't** introducir superficies claras o estilos genéricos de dashboard que rompan la metáfora de instrumentación subterránea.
