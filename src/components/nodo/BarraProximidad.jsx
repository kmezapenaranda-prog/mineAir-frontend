import { clasificarLectura, proximidadAlarma, NIVEL } from '../../config/umbrales.js'

const COLOR_NIVEL = {
  [NIVEL.NORMAL]: 'var(--color-normal)',
  [NIVEL.PRECAUCION]: 'var(--color-precaucion)',
  [NIVEL.ALARMA]: 'var(--color-alarma)',
}

/**
 * Barra de cercanía al umbral, 0 (seguro) → 100% (en el límite). La
 * inversión de O2 (peligro hacia abajo) ya viene resuelta desde
 * proximidadAlarma() — este componente es igual para los 7 gases.
 *
 * Sin transición a propósito: es dato de seguridad. El ancho debe reflejar
 * la lectura real en el instante en que llega, no una versión suavizada con
 * ~150ms de retardo — igual que NivelBadge y los marcadores del mapa.
 */
export default function BarraProximidad({ gas, valor }) {
  const proximidad = proximidadAlarma(gas, valor)
  if (proximidad == null) return null

  const nivel = clasificarLectura(gas, valor)
  const anchoPct = Math.min(proximidad, 1) * 100

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-background" aria-hidden="true">
      <div
        className="h-full rounded-full"
        style={{ width: `${anchoPct}%`, background: COLOR_NIVEL[nivel] ?? COLOR_NIVEL[NIVEL.NORMAL] }}
      />
    </div>
  )
}
