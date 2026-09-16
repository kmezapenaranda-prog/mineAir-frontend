import { clasificarLectura, NIVEL, UMBRALES_DEFAULT } from '../config/umbrales.js'
import { lecturaVigente } from './vigencia.js'

const STORAGE_KEY = 'mineair.alarmas.v1'
export const ESCALAMIENTO_MS = 2 * 60 * 1000

function valorGas(lectura, gas, unidad) {
  return lectura?.gases?.[`${gas}_${unidad}`] ?? null
}

export function detectarAlarmasCriticas(nodos, ahora = Date.now()) {
  return nodos.flatMap((nodo) => {
    if (!nodo.ultima_lectura?.estado?.sensor_ok) return []
    return Object.entries(UMBRALES_DEFAULT).flatMap(([gas, umbral]) => {
      if (!umbral.monitoreado) return []
      const valor = valorGas(nodo.ultima_lectura, gas, umbral.unidad)
      if (clasificarLectura(gas, valor) !== NIVEL.ALARMA) return []
      return [{
        id: `${nodo.node_id}:${gas}`,
        nodeId: nodo.node_id,
        ubicacion: nodo.ubicacion,
        gas,
        etiqueta: umbral.etiqueta,
        valor,
        unidad: umbral.unidad === 'pct' ? '%' : 'ppm',
        limite: umbral.limite,
        sentido: umbral.sentido,
        detectadaEn: nodo.ultima_lectura.timestamp ?? new Date(ahora).toISOString(),
      }]
    })
  })
}

export function cargarEstadoAlarmas() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function reconciliarAlarmas(detectadas, previo, ahora = Date.now(), nodos = []) {
  const porNodo = new Map(nodos.map((nodo) => [nodo.node_id, nodo]))
  const pendientes = Object.values(previo).filter((alarma) => {
    if (detectadas.some((actual) => actual.id === alarma.id)) return false
    const lectura = porNodo.get(alarma.nodeId)?.ultima_lectura
    const umbral = UMBRALES_DEFAULT[alarma.gas]
    const valor = valorGas(lectura, alarma.gas, umbral.unidad)
    const nivel = clasificarLectura(alarma.gas, valor)
    return !lecturaVigente(lectura, ahora) || !Number.isFinite(valor)
      || Date.parse(lectura.timestamp) <= Date.parse(alarma.detectadaEn)
      || (nivel !== NIVEL.NORMAL && nivel !== NIVEL.PRECAUCION)
  }).map((alarma) => ({ ...alarma, pendienteVerificacion: true }))
  return Object.fromEntries([...detectadas, ...pendientes].map((alarma) => {
    const anterior = previo[alarma.id]
    return [alarma.id, {
      ...alarma,
      pendienteVerificacion: alarma.pendienteVerificacion || !lecturaVigente(porNodo.get(alarma.nodeId)?.ultima_lectura, ahora),
      detectadaEn: anterior?.detectadaEn ?? alarma.detectadaEn,
      confirmadaEn: anterior?.confirmadaEn ?? null,
      notificada: anterior?.notificada ?? false,
      escaladaNotificada: anterior?.escaladaNotificada ?? false,
      escalada: !anterior?.confirmadaEn && ahora - new Date(anterior?.detectadaEn ?? alarma.detectadaEn).getTime() >= ESCALAMIENTO_MS,
    }]
  }))
}

export function guardarEstadoAlarmas(estado) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado))
  } catch {
    // La alarma sigue visible durante la sesión aunque no haya almacenamiento.
  }
}

export function confirmarAlarma(estado, id, ahora = Date.now()) {
  if (!estado[id]) return estado
  return { ...estado, [id]: { ...estado[id], confirmadaEn: new Date(ahora).toISOString(), escalada: false } }
}

export function descripcionAlarma(alarma) {
  const comparacion = alarma.sentido === 'minimo' ? 'por debajo' : 'por encima'
  return `${alarma.valor} ${alarma.unidad} en ${alarma.ubicacion} · límite ${alarma.limite} ${alarma.unidad} (${comparacion})`
}
