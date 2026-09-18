import { edgeDataSource } from './edge/index.js'

// La aplicación consume siempre el backend desplegado. Los datos simulados quedan únicamente en src/data/mock para pruebas históricas.
const fuente = edgeDataSource

export const origenDatos = 'edge'
export const { getNodos, getTelemetria, getPredicciones, getRiesgoConjunto, postVariablesOperativas, getEstadoConexion, listarVariablesOperativas, getRepetidores } = fuente
