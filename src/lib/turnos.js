/**
 * Cortes de turno únicos para toda la app: mañana 06-14, tarde 14-22, noche
 * 22-06. Antes vivían duplicados en Registro.jsx, Reportes.jsx y
 * lib/analitica.js — cualquier cambio a los cortes tenía que hacerse en
 * los tres sitios a la vez sin que nada lo garantizara.
 */
export const HORA_MS = 60 * 60 * 1000
export const DIA_MS = 24 * HORA_MS

export const TURNOS = [
  { id: 'manana', etiqueta: 'Mañana', valorRegistro: 'mañana' },
  { id: 'tarde', etiqueta: 'Tarde', valorRegistro: 'tarde' },
  { id: 'noche', etiqueta: 'Noche', valorRegistro: 'noche' },
]

/** Id de turno ('manana'/'tarde'/'noche') para un instante dado. */
export function turnoDe(timestampMs) {
  const h = new Date(timestampMs).getHours()
  if (h >= 6 && h < 14) return 'manana'
  if (h >= 14 && h < 22) return 'tarde'
  return 'noche'
}

/** Inicio (Date) del turno que está corriendo en `ahora`. */
export function inicioTurnoActual(ahora = new Date()) {
  const h = ahora.getHours()
  const inicioHora = h >= 6 && h < 14 ? 6 : h >= 14 && h < 22 ? 14 : 22
  const base = new Date(ahora)
  if (h < 6) base.setDate(base.getDate() - 1)
  base.setHours(inicioHora, 0, 0, 0)
  return base
}
