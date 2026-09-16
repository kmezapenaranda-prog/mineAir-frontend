import { NODOS } from './nodos.js'
import { ultimaLectura, generarSerie } from './telemetria.js'
import { generarPredicciones } from './predicciones.js'
import { presentarPrediccion, filtrarPredicciones } from '../predicciones.js'
import { postVariablesOperativas as guardarVariables } from './variablesOperativas.js'
import { listarVariablesOperativas } from './variablesOperativas.js'
import { getEstadoRepetidores } from './repetidores.js'

async function getNodos() {
  const ahoraMs = Date.now()
  // Un nodo dado de baja en Configuración sale de toda vista en vivo
  // (Dashboard, Mapa, Predicciones) sin perder su metadata ni su historial.
  return NODOS.filter((n) => n.activo !== false).map((n) => ({ ...n, ultima_lectura: ultimaLectura(n.node_id, ahoraMs) }))
}

async function getTelemetria(nodeId, desde, hasta) {
  return generarSerie(nodeId, desde, hasta)
}

async function getPredicciones(filtros = {}) {
  return filtrarPredicciones(generarPredicciones().map(presentarPrediccion), filtros)
}

async function postVariablesOperativas(payload) {
  return guardarVariables(payload)
}

async function getEstadoConexion() {
  // En modo mock no hay nodo de borde real: se reporta siempre "en vivo"
  // con la marca de tiempo de la última generación.
  return {
    online: true,
    origen: 'mock',
    ultima_sync: new Date().toISOString(),
  }
}

export const mockDataSource = {
  listarVariablesOperativas,
  getRepetidores: async () => getEstadoRepetidores(),
  getNodos,
  getTelemetria,
  getPredicciones,
  getRiesgoConjunto: async () => [],
  postVariablesOperativas,
  getEstadoConexion,
}
