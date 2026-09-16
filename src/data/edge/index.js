/**
 * Adaptador contra la API REST del "nodo de borde" — ya no un dispositivo
 * embebido en bocamina (Jetson Nano, diseño anterior), sino el servicio
 * que corre en el computador del ingeniero en superficie, donde vive el
 * modelo de IA. Esa máquina es la misma donde corre este aplicativo, así
 * que por defecto se asume localhost — ajustar VITE_EDGE_API_URL al puerto
 * real una vez el track de ML defina su servicio.
 * Implementación mínima acorde al contrato de datos — se valida y ajusta
 * en Fase 5 contra hardware real. Mismo shape que src/data/mock/index.js
 * para que src/data/index.js pueda intercambiarlos sin tocar el resto de
 * la app.
 */
import { presentarPrediccion, filtrarPredicciones } from '../predicciones.js'

const BASE_URL = import.meta.env?.VITE_EDGE_API_URL ?? 'http://localhost:8000/api'

async function solicitar(path, opciones) {
  const respuesta = await fetch(`${BASE_URL}${path}`, { ...opciones, signal: AbortSignal.timeout(15000) })
  if (!respuesta.ok) {
    throw new Error(`Edge API ${path} respondió ${respuesta.status}`)
  }
  return respuesta.json()
}

async function getNodos() {
  return solicitar('/nodos')
}

async function getTelemetria(nodeId, desde, hasta) {
  const params = new URLSearchParams({
    desde: desde instanceof Date ? desde.toISOString() : new Date(desde).toISOString(),
    hasta: hasta instanceof Date ? hasta.toISOString() : new Date(hasta).toISOString(),
  })
  return solicitar(`/telemetria/${encodeURIComponent(nodeId)}?${params.toString()}`)
}

async function getPredicciones(filtros = {}) {
  const { nivel, ...filtrosServicio } = filtros
  const conjuntas = await solicitar('/riesgo-conjunto')
  const predicciones = conjuntas.map((p) => ({
    ...p,
    gas: 'riesgo_conjunto',
    horizonte_h: 6,
    umbral_normativo: p.umbral_clasificacion,
    unidad: 'pct',
    sentido: 'max',
    recomendacion: p.recomienda_evacuar
      ? 'Verificar inmediatamente las mediciones en sitio y aplicar el protocolo de seguridad.'
      : 'Mantener el monitoreo y verificar la medición si cambia el nivel de alerta.',
  })).map((p) => ({ ...p, nivel: p.nivel === 'atencion' ? 'precaucion' : p.nivel === 'evacuar' ? 'alarma' : p.nivel }))
  return filtrarPredicciones(predicciones.map(presentarPrediccion), { ...filtrosServicio, nivel })
}

async function getRiesgoConjunto() {
  return solicitar('/riesgo-conjunto')
}

async function postVariablesOperativas(payload) {
  return solicitar('/variables-operativas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

async function getEstadoConexion() {
  try {
    const estado = await solicitar('/estado')
    const ultimaSync = Date.parse(estado.ultima_sync)
    const reciente = Number.isFinite(ultimaSync) && Date.now() - ultimaSync <= 60000 && ultimaSync <= Date.now()
    return { ...estado, online: estado.online !== false && reciente, origen: 'edge' }
  } catch {
    return { online: false, origen: 'edge', ultima_sync: null }
  }
}

export const edgeDataSource = {
  // El contrato actual no ofrece estas lecturas. null significa no disponible,
  // nunca una lista vacía que pudiera interpretarse como ausencia confirmada.
  listarVariablesOperativas: async () => null,
  getRepetidores: async () => null,
  getNodos,
  getTelemetria,
  getPredicciones,
  getRiesgoConjunto,
  postVariablesOperativas,
  getEstadoConexion,
}
