import { NODOS } from './nodos.js'
import { produccionEnHora, presionBarometrica, voladuraReciente, decaimientoPostVoladura, ruido, HORA_MS, PRESION_REFERENCIA_HPA } from './fisica.js'
import { UMBRALES_DEFAULT, CORTES_NIVEL_PREDICCION } from '../../config/umbrales.js'

const PRODUCCION_PROMEDIO = 2.6
// Misma base que fisica.js:presionBarometrica() — la desviación respecto a
// esta referencia es lo que impulsa la probabilidad, y es exactamente el
// número que se muestra en el factor de presión (nunca dos cifras distintas
// para "lo que se ve" y "lo que mueve el modelo").
const HORIZONTES_H = [1, 6, 12, 24]

function clamp(valor, min, max) {
  return Math.max(min, Math.min(max, valor))
}

function textoConSigno(valor, decimales = 0) {
  const signo = valor >= 0 ? '+' : ''
  return `${signo}${valor.toFixed(decimales)}`
}

function indiceGasificacion(nodeId) {
  // Valor mock relativamente estable por nodo (no es una serie de tiempo real).
  let h = 0
  for (let i = 0; i < nodeId.length; i++) h = (h * 31 + nodeId.charCodeAt(i)) % 1000
  return 6.5 + (h % 100) / 100 / 0.3 // ~6.5 - 9.8 m3/ton
}

/**
 * Probabilidad como combinación explícita de los mismos factores que la
 * tarjeta muestra — nunca una lectura simulada aparte (con su propio ruido
 * y línea base por tipo de nodo) de la que la probabilidad se derivaba
 * antes. Esa indirección es lo que producía tarjetas incoherentes: el
 * factor mostraba condiciones leves y la probabilidad salía alta (o al
 * revés), porque el número real venía de una fuente distinta a la que el
 * ingeniero estaba leyendo.
 *
 * Física validada por test en mineair-ml/src/datos/generador.py:
 * - rezago producción -> CH4 de 4-8h (centro 6h)
 * - correlación NEGATIVA presión <-> CH4 (cae la presión, sube el CH4)
 * - retorno de aire > vía de entrada
 * Cada término de acá usa exactamente el mismo dato que se imprime en su
 * factor, así que una tarjeta siempre se puede auditar a ojo.
 */
function generarPrediccionCh4(nodo, horizonteH, ahoraMs) {
  const tObjetivo = ahoraMs + horizonteH * HORA_MS
  const umbral = UMBRALES_DEFAULT.ch4

  const produccionLag = produccionEnHora(tObjetivo - 6 * HORA_MS)
  const pctProduccion = (produccionLag / PRODUCCION_PROMEDIO - 1) * 100

  const presionActual = presionBarometrica(tObjetivo)
  // Positiva = presión por debajo de la referencia (desorción de metano).
  const desviacionPresion = PRESION_REFERENCIA_HPA - presionActual

  const gasificacion = indiceGasificacion(nodo.node_id)

  const contribProduccion = clamp(pctProduccion * 0.006, -0.1, 0.28)
  const contribPresion = clamp(desviacionPresion * 0.06, -0.35, 0.32)
  const contribGasificacion = clamp(((gasificacion - 6.5) / 3.3) * 0.18, 0, 0.18)
  const contribRetorno = nodo.esRetorno ? 0.12 : 0
  // Variedad menor a propósito: nunca puede superar la contribución más
  // chica de los factores físicos, para que jamás invierta el orden.
  const jitter = (ruido(tObjetivo, 42) - 0.5) * 0.04

  const probabilidad =
    Math.round(
      clamp(0.08 + contribProduccion + contribPresion + contribGasificacion + contribRetorno + jitter, 0, 1) * 100,
    ) / 100

  return {
    schema_v: '1.0',
    node_id: nodo.node_id,
    ubicacion: nodo.ubicacion,
    gas: 'ch4',
    horizonte_h: horizonteH,
    probabilidad,
    umbral_normativo: umbral.limite,
    unidad: umbral.unidad,
    sentido: umbral.sentido === 'minimo' ? 'min' : 'max',
    recomienda_evacuar: probabilidad > CORTES_NIVEL_PREDICCION.alarma,
    confianza: nodo.node_id === 'H2' ? 'reducida' : 'normal',
    ...(nodo.node_id === 'H2' ? { nodos_faltantes: ['S3'] } : {}),
    generada_en: new Date(ahoraMs).toISOString(),
    factores: [
      {
        nombre: 'produccion_turno',
        peso: 0.28,
        valor: `${textoConSigno(pctProduccion)}% sobre promedio`,
      },
      {
        nombre: 'presion_barometrica',
        peso: 0.24,
        valor: `${presionActual.toFixed(1)} hPa (${textoConSigno(desviacionPresion, 1)} hPa vs. referencia)`,
      },
      {
        nombre: 'indice_gasificacion',
        peso: 0.18,
        valor: `${gasificacion.toFixed(1)} m³/ton`,
      },
    ],
  }
}

function generarPrediccionCo(nodo, horizonteH, ahoraMs) {
  const tObjetivo = ahoraMs + horizonteH * HORA_MS
  const umbral = UMBRALES_DEFAULT.co
  const tVoladura = voladuraReciente(tObjetivo, nodo.node_id.charCodeAt(1) % 7)
  const efectoVoladura = decaimientoPostVoladura(tObjetivo, tVoladura, 90)
  const ventilacionRelativa = nodo.esRetorno ? 0.22 : 0.08
  const produccion = produccionEnHora(tObjetivo)
  const contribVoladura = efectoVoladura * 0.58
  const contribProduccion = clamp((produccion / PRODUCCION_PROMEDIO - 1) * 0.12, -0.05, 0.16)
  const probabilidad = Math.round(clamp(0.06 + contribVoladura + contribProduccion + ventilacionRelativa + (ruido(tObjetivo, 84) - 0.5) * 0.03, 0, 1) * 100) / 100
  const minutosVoladura = tVoladura ? Math.max(0, Math.round((tObjetivo - tVoladura) / 60000)) : null
  return {
    schema_v: '1.0', node_id: nodo.node_id, ubicacion: nodo.ubicacion, gas: 'co', horizonte_h: horizonteH,
    probabilidad, umbral_normativo: umbral.limite, unidad: umbral.unidad, sentido: 'max',
    recomienda_evacuar: probabilidad > CORTES_NIVEL_PREDICCION.alarma,
    confianza: nodo.node_id === 'H2' ? 'reducida' : 'normal',
    ...(nodo.node_id === 'H2' ? { nodos_faltantes: ['S3'] } : {}),
    generada_en: new Date(ahoraMs).toISOString(),
    factores: [
      { nombre: 'voladura_reciente', peso: 0.34, valor: minutosVoladura == null ? 'Sin voladura reciente' : `Hace ${minutosVoladura} min` },
      {
        nombre: 'posicion_circuito_ventilacion',
        peso: 0.25,
        valor: nodo.esRetorno ? 'Aire de retorno' : 'Aire de entrada',
      },
      { nombre: 'produccion_turno', peso: 0.18, valor: `${produccion.toFixed(1)} ton/h` },
    ],
  }
}

/** Genera todas las predicciones abiertas "ahora" para los nodos con sensores de gas. */
export function generarPredicciones(ahoraMs = Date.now()) {
  const nodosConGas = NODOS.filter((n) => (n.node_type === 'fijo' || n.node_type === 'casco') && n.activo !== false)
  const predicciones = []
  for (const nodo of nodosConGas) {
    for (const horizonte of HORIZONTES_H) {
      predicciones.push(generarPrediccionCh4(nodo, horizonte, ahoraMs))
      predicciones.push(generarPrediccionCo(nodo, horizonte, ahoraMs))
    }
  }
  return predicciones.sort((a, b) => b.probabilidad - a.probabilidad)
}
