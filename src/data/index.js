import { mockDataSource } from './mock/index.js'
import { edgeDataSource } from './edge/index.js'

// VITE_DATA_SOURCE=edge para apuntar al nodo de borde real; por defecto,
// mock (no existe hardware todavía — ver CLAUDE.md, Fase 5).
const fuente = import.meta.env.VITE_DATA_SOURCE === 'edge' ? edgeDataSource : mockDataSource

export const origenDatos = import.meta.env.VITE_DATA_SOURCE === 'edge' ? 'edge' : 'mock'
export const { getNodos, getTelemetria, getPredicciones, getRiesgoConjunto, postVariablesOperativas, getEstadoConexion, listarVariablesOperativas, getRepetidores } = fuente
