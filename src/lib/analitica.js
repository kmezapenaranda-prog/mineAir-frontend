import { getTelemetria } from '../data/index.js'
import { UMBRALES_DEFAULT, clasificarLectura, NIVEL } from '../config/umbrales.js'
import { nivelDeNodo } from './nivelNodo.js'
import { HORA_MS, DIA_MS, TURNOS, turnoDe } from './turnos.js'

export const NIVELES_DONUT = [NIVEL.NORMAL, NIVEL.PRECAUCION, NIVEL.ALARMA, NIVEL.NO_MONITOREADO]

const ETIQUETA_NIVEL = {
  [NIVEL.NORMAL]: 'Normal',
  [NIVEL.PRECAUCION]: 'Precaución',
  [NIVEL.ALARMA]: 'Alarma',
  [NIVEL.NO_MONITOREADO]: 'No monitoreado',
}

export function etiquetaNivel(nivel) {
  return ETIQUETA_NIVEL[nivel] ?? nivel
}

/**
 * Distribución de nodos por su semáforo agregado. Usa exactamente la misma
 * categorización que la lista "Estado de nodos" del dashboard (falla de
 * sensor -> "no monitoreado", igual que su badge) para que el donut nunca
 * cuente algo distinto de lo que la lista de abajo ya muestra.
 */
export function distribucionEstadoNodos(nodos) {
  const conteo = Object.fromEntries(NIVELES_DONUT.map((n) => [n, 0]))
  for (const nodo of nodos) {
    const falla = !nodo.ultima_lectura?.estado?.sensor_ok
    const nivel = falla ? NIVEL.NO_MONITOREADO : nivelDeNodo(nodo)
    conteo[nivel] = (conteo[nivel] ?? 0) + 1
  }
  return NIVELES_DONUT.map((nivel) => ({ nivel, etiqueta: etiquetaNivel(nivel), cantidad: conteo[nivel] })).filter(
    (d) => d.cantidad > 0,
  )
}

/** Distribución de predicciones abiertas por nivel (todos los horizontes/gases). */
export function distribucionPredicciones(predicciones) {
  const conteo = { [NIVEL.NORMAL]: 0, [NIVEL.PRECAUCION]: 0, [NIVEL.ALARMA]: 0 }
  for (const p of predicciones) conteo[p.nivel] = (conteo[p.nivel] ?? 0) + 1
  return [NIVEL.NORMAL, NIVEL.PRECAUCION, NIVEL.ALARMA]
    .map((nivel) => ({ nivel, etiqueta: etiquetaNivel(nivel), cantidad: conteo[nivel] }))
    .filter((d) => d.cantidad > 0)
}

/**
 * Pico y promedio de CH4 por turno sobre los últimos `dias` días, agregando
 * todos los nodos de gas activos. Es la traducción de "picos por período" a
 * la unidad temporal que la mina realmente usa: el turno (mañana/tarde/noche,
 * el mismo campo del Registro de variables operativas) — un trimestre
 * calendario no tiene sentido para un piloto de meses.
 */
export async function picosPorTurno(nodos, { dias = 4 } = {}) {
  const ahoraMs = Date.now()
  const desdeMs = ahoraMs - dias * DIA_MS
  const nodosGas = nodos.filter((n) => (n.node_type === 'fijo' || n.node_type === 'casco') && n.activo !== false)

  const valoresPorTurno = { manana: [], tarde: [], noche: [] }
  const alarmasPorTurno = { manana: 0, tarde: 0, noche: 0 }

  await Promise.all(
    nodosGas.map(async (nodo) => {
      const serie = await getTelemetria(nodo.node_id, desdeMs, ahoraMs)
      for (const lectura of serie) {
        const valor = lectura.gases?.ch4_pct
        if (valor == null) continue
        const turno = turnoDe(new Date(lectura.timestamp).getTime())
        valoresPorTurno[turno].push(valor)
        if (clasificarLectura('ch4', valor) === NIVEL.ALARMA) alarmasPorTurno[turno] += 1
      }
    }),
  )

  const umbral = UMBRALES_DEFAULT.ch4.limite
  return TURNOS.map((t) => {
    const valores = valoresPorTurno[t.id]
    const promedio = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0
    const pico = valores.length ? Math.max(...valores) : 0
    return {
      turno: t.etiqueta,
      promedio: Math.round(promedio * 1000) / 1000,
      pico: Math.round(pico * 1000) / 1000,
      alarmas: alarmasPorTurno[t.id],
      umbral,
    }
  })
}

const PASO_CORRELACION_MS = 15 * 60 * 1000

/**
 * Serie combinada presión barométrica (nodo de superficie) vs. CH4 promedio
 * (nodos de gas activos), agrupada en un grid de tiempo propio: las series
 * de origen pueden no compartir timestamps exactos (el mock sí los alinea,
 * pero un edge real vía el puente serial no lo garantiza), así que se
 * bucketiza en vez de asumir que los índices calzan entre nodos.
 */
export async function tendenciaPresionCh4(nodos, { horas = 24 } = {}) {
  const ahoraMs = Date.now()
  const desdeMs = ahoraMs - horas * HORA_MS
  const nodoSuperficie = nodos.find((n) => n.node_type === 'superficie' && n.activo !== false)
  const nodosGas = nodos.filter((n) => (n.node_type === 'fijo' || n.node_type === 'casco') && n.activo !== false)

  const buckets = new Map()
  function empujar(timestampMs, campo, valor) {
    if (valor == null) return
    const clave = Math.floor(timestampMs / PASO_CORRELACION_MS) * PASO_CORRELACION_MS
    const b = buckets.get(clave) ?? { presiones: [], ch4s: [] }
    b[campo].push(valor)
    buckets.set(clave, b)
  }

  const tareas = []
  if (nodoSuperficie) {
    tareas.push(
      getTelemetria(nodoSuperficie.node_id, desdeMs, ahoraMs).then((serie) => {
        for (const l of serie) empujar(new Date(l.timestamp).getTime(), 'presiones', l.ambiente?.presion_hpa)
      }),
    )
  }
  for (const nodo of nodosGas) {
    tareas.push(
      getTelemetria(nodo.node_id, desdeMs, ahoraMs).then((serie) => {
        for (const l of serie) empujar(new Date(l.timestamp).getTime(), 'ch4s', l.gases?.ch4_pct)
      }),
    )
  }
  await Promise.all(tareas)

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([ts, b]) => ({
      ts,
      hora: new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      presion_hpa: b.presiones.length
        ? Math.round((b.presiones.reduce((a, c) => a + c, 0) / b.presiones.length) * 10) / 10
        : null,
      ch4_pct: b.ch4s.length ? Math.round((b.ch4s.reduce((a, c) => a + c, 0) / b.ch4s.length) * 1000) / 1000 : null,
    }))
}
