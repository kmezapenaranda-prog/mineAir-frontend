/**
 * Señales físicas compartidas de la simulación. Todo determinista a partir
 * del timestamp (no de Math.random() puro) para que las gráficas de
 * tendencia sean reproducibles entre llamadas y coherentes entre nodos.
 *
 * Tesis central del proyecto: el metano responde a producción con un
 * rezago de 4 a 8 horas, y a la presión barométrica de forma inversa.
 */

const HORA_MS = 60 * 60 * 1000
const DIA_MS = 24 * HORA_MS
export const PRESION_REFERENCIA_HPA = 1013.2

// Ruido pseudoaleatorio determinista (hash simple) — mismo timestamp+seed
// siempre produce el mismo ruido, sin depender de estado global.
function ruido(timestampMs, seed) {
  const x = Math.sin(timestampMs * 0.0000013 + seed * 999.17) * 43758.5453
  return x - Math.floor(x) // [0, 1)
}

/** Ruido centrado en 0, amplitud ±1. */
function ruidoCentrado(timestampMs, seed) {
  return ruido(timestampMs, seed) * 2 - 1
}

/**
 * Producción instantánea (ton/h equivalente) según hora del día.
 * Turnos: mañana 06-14, tarde 14-22, noche 22-06, con arranque/cierre
 * suaves y la noche produciendo menos (dotación reducida).
 */
export function produccionEnHora(timestampMs) {
  const fecha = new Date(timestampMs)
  const h = fecha.getHours() + fecha.getMinutes() / 60
  const base =
    2.2 + // noche
    1.6 * Math.max(0, Math.sin(((h - 6) / 16) * Math.PI)) // pico ~14h, valle madrugada
  const variacion = 1 + 0.08 * ruidoCentrado(timestampMs, 1)
  return Math.max(0, base * variacion)
}

/**
 * Presión barométrica (hPa) — variación lenta tipo paso frontal, con
 * caídas ocasionales de varios hPa sostenidas por 6-12h (lo que dispara
 * la desorción de metano en zonas selladas).
 */
export function presionBarometrica(timestampMs) {
  const cicloLargo = Math.sin((timestampMs / (DIA_MS * 3.3)) * 2 * Math.PI) * 3.5
  const cicloCorto = Math.sin((timestampMs / (DIA_MS * 0.9)) * 2 * Math.PI) * 1.2
  const deriva = ruidoCentrado(Math.floor(timestampMs / (HORA_MS * 6)) * HORA_MS * 6, 2) * 1.5
  return PRESION_REFERENCIA_HPA + cicloLargo + cicloCorto + deriva
}

/** Tendencia de presión en hPa/12h (para mostrar en factores de predicción). */
export function tendenciaPresion12h(timestampMs) {
  return presionBarometrica(timestampMs) - presionBarometrica(timestampMs - 12 * HORA_MS)
}

/** Horarios de voladura por turno (hora:minuto local, heurística de campo). */
const VOLADURAS_HORA = [6.25, 14.25, 22.25] // 06:15, 14:15, 22:15

/**
 * Devuelve la voladura más reciente relevante para `timestampMs` en el
 * frente dado, o null si no hubo ninguna en las últimas 6h.
 */
export function voladuraReciente(timestampMs, frenteSeed) {
  let masReciente = null
  for (let dias = 0; dias <= 1; dias++) {
    for (const horaVoladura of VOLADURAS_HORA) {
      const diaBase = new Date(timestampMs)
      diaBase.setHours(0, 0, 0, 0)
      const t = diaBase.getTime() - dias * DIA_MS + horaVoladura * HORA_MS
      if (t <= timestampMs && timestampMs - t <= 6 * HORA_MS) {
        // pequeño jitter por frente para que no todos exploten exactamente igual
        const jitter = (ruido(t, frenteSeed) - 0.5) * 6 * 60 * 1000
        const tAjustado = t + jitter
        if (tAjustado <= timestampMs && (!masReciente || tAjustado > masReciente)) {
          masReciente = tAjustado
        }
      }
    }
  }
  return masReciente
}

/** Factor de decaimiento exponencial post-voladura (1 = pico, ->0 con el tiempo). */
export function decaimientoPostVoladura(timestampMs, tVoladura, constanteMinutos = 35) {
  if (tVoladura == null) return 0
  const minutosTranscurridos = (timestampMs - tVoladura) / 60000
  if (minutosTranscurridos < 0) return 0
  return Math.exp(-minutosTranscurridos / constanteMinutos)
}

/**
 * Vagonetas contadas en una ventana de `ventanaMs` que termina en `timestampMs`,
 * derivadas de la misma curva de producción que ya usa el resto del mock
 * (contrato #4, propuesto: el contador es un evento real, no un promedio).
 * Redondeo estocástico determinista (no truncar ni redondear al entero más
 * cercano): sobre muchas ventanas converge al valor esperado sin sesgo,
 * igual que tendría un conteo real de eventos discretos.
 */
export function vagonetasEnVentana(timestampMs, ventanaMs, capacidadTon, seed) {
  if (!(capacidadTon > 0)) return 0
  const tasaTonH = produccionEnHora(timestampMs - ventanaMs / 2) // punto medio de la ventana
  const esperado = (tasaTonH / capacidadTon) * (ventanaMs / HORA_MS)
  const base = Math.floor(esperado)
  const frac = esperado - base
  const extra = ruido(timestampMs, seed) < frac ? 1 : 0
  return base + extra
}

export { ruido, ruidoCentrado, HORA_MS, DIA_MS }
