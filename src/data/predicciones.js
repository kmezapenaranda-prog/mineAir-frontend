import { clasificarPrediccion } from '../config/umbrales.js'
import { recomendacionNormativa } from '../config/recomendaciones.js'

/** Añade los campos de presentación sin modificar el contrato recibido del ML. */
export function presentarPrediccion(prediccion) {
  const nivelServidor = prediccion.nivel
  const nivel = nivelServidor === 'atencion' ? 'precaucion' : nivelServidor === 'evacuar' ? 'alarma' : nivelServidor ?? clasificarPrediccion(prediccion.probabilidad)
  const esConjunta = prediccion.gas === 'riesgo_conjunto' || prediccion.objetivo === 'ch4_6h_o_co_1h'
  return {
    ...prediccion,
    nivel,
    recomendacion: esConjunta ? (prediccion.recomendacion ?? 'Verificar las mediciones en sitio y aplicar el protocolo de seguridad.') : recomendacionNormativa({
      gas: prediccion.gas,
      nivel,
      ubicacion: prediccion.ubicacion ?? prediccion.node_id,
      umbral: prediccion.umbral_normativo,
    }),
  }
}

export function filtrarPredicciones(predicciones, filtros = {}) {
  return predicciones.filter((p) => {
    if (filtros.nodeId && p.node_id !== filtros.nodeId) return false
    if (filtros.gas && p.gas !== filtros.gas) return false
    if (filtros.nivel && p.nivel !== filtros.nivel) return false
    return true
  })
}
