import { NIVEL } from '../config/umbrales.js'

const ESTILOS = {
  [NIVEL.NORMAL]: 'bg-normal/15 text-normal',
  [NIVEL.PRECAUCION]: 'bg-precaucion/15 text-precaucion',
  [NIVEL.ALARMA]: 'bg-alarma/15 text-alarma',
  [NIVEL.NO_MONITOREADO]: 'bg-sin-monitorear/20 text-muted-foreground',
}

const ETIQUETAS = {
  [NIVEL.NORMAL]: 'Normal',
  [NIVEL.PRECAUCION]: 'Precaución',
  [NIVEL.ALARMA]: 'Alarma',
  [NIVEL.NO_MONITOREADO]: 'No monitoreado',
}

/** Semáforo de estado reutilizado en dashboard, mapa, detalle de nodo y predicciones. */
export default function NivelBadge({ nivel, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${ESTILOS[nivel] ?? ESTILOS[NIVEL.NO_MONITOREADO]} ${className}`}
    >
      {ETIQUETAS[nivel] ?? 'Desconocido'}
    </span>
  )
}
