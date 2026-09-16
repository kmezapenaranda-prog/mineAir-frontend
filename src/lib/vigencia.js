export const VIGENCIA_MS = 60000

export function lecturaVigente(lectura, ahora = Date.now()) {
  const timestamp = Date.parse(lectura?.timestamp)
  return lectura?.estado?.sensor_ok === true && Number.isFinite(timestamp)
    && timestamp <= ahora && ahora - timestamp <= VIGENCIA_MS
}
