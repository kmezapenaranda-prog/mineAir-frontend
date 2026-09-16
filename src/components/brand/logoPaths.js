/**
 * Datos vectoriales del isotipo MineAIr (casco + red neuronal + lámpara +
 * ondas de aire), en un viewBox cuadrado de 200x200 con ~20% de margen de
 * seguridad (contenido dentro de 40..160 en ambos ejes) — así el mismo
 * isotipo sirve tal cual como ícono maskable de PWA sin recortes.
 *
 * Fuente única: la usan tanto el componente React (LogoMineAIr.jsx, colores
 * vía var(--color-...) del theme) como el script de generación de PNGs
 * (scripts/generar-iconos.mjs, colores en hex literal para el rasterizador).
 */

export const VIEWBOX = '0 0 200 200'

// Casco: cúpula + ala lateral + pico frontal donde monta la lámpara.
export const CASCO_D =
  'M40,102 C40,92 44,84 55,80 C58,55 76,42 100,42 C124,42 142,55 145,80 ' +
  'C156,84 160,92 160,102 C148,108 132,110 118,108 C110,113 105,116 100,116 ' +
  'C95,116 90,113 82,108 C68,110 52,108 40,102 Z'

// Nervadura central (relieve): sobrepuesta en blanco a baja opacidad.
export const NERVADURA = { x: 93, y: 44, width: 14, height: 64, rx: 7 }

// Soporte de la lámpara frontal.
export const SOPORTE_LAMPARA = { x: 86, y: 98, width: 28, height: 16, rx: 4 }

// Lámpara frontal (círculo con gradiente radial) + brillo.
export const LAMPARA = { cx: 100, cy: 110, r: 15 }
export const BRILLO_LAMPARA = { cx: 95, cy: 104, rx: 4, ry: 3 }

// Red neuronal: nodos y conexiones sobre la sien izquierda del casco,
// espejados sobre la sien derecha (x' = 200 - x).
const NODOS_IZQ = [
  [60, 58],
  [78, 50],
  [85, 68],
  [58, 78],
  [70, 90],
  [54, 92],
]
const LINEAS_IZQ = [
  [60, 58, 78, 50],
  [78, 50, 85, 68],
  [60, 58, 58, 78],
  [58, 78, 70, 90],
  [70, 90, 54, 92],
  [85, 68, 70, 90],
]

export const NODOS = [...NODOS_IZQ, ...NODOS_IZQ.map(([x, y]) => [200 - x, y])]
export const LINEAS = [
  ...LINEAS_IZQ,
  ...LINEAS_IZQ.map(([x1, y1, x2, y2]) => [200 - x1, y1, 200 - x2, y2]),
]

// Ondas de aire: mismo patrón de doble onda del favicon original, escalado.
export const ONDAS = [
  { d: 'M40,128 c22,-14 38,-14 60,0 s38,14 60,0', opacity: 1 },
  { d: 'M40,140 c22,-11 38,-11 60,0 s38,11 60,0', opacity: 0.7 },
  { d: 'M40,152 c22,-9 38,-9 60,0 s38,9 60,0', opacity: 0.45 },
]
