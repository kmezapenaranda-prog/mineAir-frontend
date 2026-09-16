import { NODOS, NODOS_POR_ID } from './nodos.js'
import {
  produccionEnHora,
  presionBarometrica,
  tendenciaPresion12h,
  voladuraReciente,
  decaimientoPostVoladura,
  vagonetasEnVentana,
  ruido,
  ruidoCentrado,
  HORA_MS,
  DIA_MS,
  PRESION_REFERENCIA_HPA,
} from './fisica.js'
import { getDatosMina } from '../../config/mina.js'

const GASES_NULOS = Object.freeze({ ch4_pct: null, co_ppm: null, h2s_ppm: null, o2_pct: null, co2_pct: null })
const AMBIENTE_NULO = Object.freeze({ temp_c: null, humedad_pct: null, presion_hpa: null })
// Ventana de conteo para el snapshot "actual" de un nodo contador (getNodos):
// una ventana de 15s (la cadencia real del contrato) cae casi siempre en 0
// vagonetas y no dice nada útil como lectura en vivo; 1h da una cifra legible.
const VENTANA_CONTEO_SNAPSHOT_MS = HORA_MS

const PRODUCCION_PROMEDIO = 2.6 // ton/h equivalente, usado para normalizar el efecto
const LAG_PRODUCCION_MS = 6 * HORA_MS // rezago central del rango 4-8h de la tesis del proyecto

/** Añade ruido de sensor realista: máx(piso absoluto, 3% de la lectura). */
function conRuido(valor, pisoAbsoluto, timestampMs, seed) {
  const amplitud = Math.max(pisoAbsoluto, Math.abs(valor) * 0.03)
  return valor + amplitud * ruidoCentrado(timestampMs, seed)
}

function seedDeNodo(nodeId) {
  let h = 0
  for (let i = 0; i < nodeId.length; i++) h = (h * 31 + nodeId.charCodeAt(i)) % 1000
  return h
}

/**
 * Ventana de falla diaria determinista por nodo: ~1 de cada 6 días el nodo
 * cae en un bloque de 15-40 min (sensor_ok: false). Permite demostrar el
 * manejo de fallas sin que sea puramente aleatorio entre renders.
 */
function enVentanaDeFalla(nodeId, timestampMs, seed) {
  const diaBase = Math.floor(timestampMs / DIA_MS) * DIA_MS
  const probabilidadDia = ruido(diaBase, seed + 500)
  if (probabilidadDia > 1 / 6) return false
  const horaInicio = 4 + ruido(diaBase, seed + 501) * 18 // entre 4am y 10pm
  const duracionMin = 15 + ruido(diaBase, seed + 502) * 25
  const inicio = diaBase + horaInicio * HORA_MS
  const fin = inicio + duracionMin * 60 * 1000
  return timestampMs >= inicio && timestampMs < fin
}

function bateriaPct(nodeId, timestampMs, seed) {
  // Cascos: ciclo de carga diario (se recargan en el relevo de turno).
  // Puntos fijos, superficie y contadores: alimentación de línea o batería
  // de respaldo de bajo consumo, casi siempre llena.
  const nodo = NODOS_POR_ID[nodeId]
  if (nodo.node_type === 'fijo' || nodo.node_type === 'superficie' || nodo.node_type === 'contador') {
    return Math.round(96 + ruidoCentrado(timestampMs, seed + 10) * 3)
  }
  const faseDia = (timestampMs % DIA_MS) / DIA_MS // 0 = medianoche
  const nivel = 100 - faseDia * 65 // se descarga a lo largo del día, recarga a medianoche
  return Math.round(Math.max(12, nivel + ruidoCentrado(timestampMs, seed + 10) * 4))
}

function rssiDbm(nodeId, seed, timestampMs) {
  const nodo = NODOS_POR_ID[nodeId]
  // Nodos más lejanos de la bocamina (mayor distancia a superficie) -> peor señal.
  const distanciaAprox = Math.hypot(nodo.x - 3, nodo.y - 50)
  const base = -55 - distanciaAprox * 0.55
  return Math.round(base + ruidoCentrado(timestampMs, seed + 20) * 4)
}

/**
 * Genera una lectura de telemetría completa para un nodo en un instante dado.
 * Determinista en función de (nodeId, timestampMs, ventanaConteoMs): mismo
 * input, mismo output.
 *
 * `ventanaConteoMs` solo aplica a nodos "contador" (contrato #4, propuesto):
 * es el ancho de la ventana que termina en `timestampMs` sobre la que se
 * cuentan vagonetas. Quien llama decide su significado — ver
 * VENTANA_CONTEO_SNAPSHOT_MS (snapshot legible) vs. el paso de generarSerie
 * (reconstrucción exacta de un rango, sin doble conteo ni huecos).
 */
export function generarLectura(nodeId, timestampMs, ventanaConteoMs = VENTANA_CONTEO_SNAPSHOT_MS) {
  const nodo = NODOS_POR_ID[nodeId]
  if (!nodo) throw new Error(`Nodo desconocido: ${nodeId}`)
  const seed = seedDeNodo(nodeId)
  const fallo = enVentanaDeFalla(nodeId, timestampMs, seed)
  const seq = Math.floor(timestampMs / 15000) % 65536
  const camposContrato = {
    schema_v: '1.0',
    seq,
    t_ms: Math.floor(timestampMs % 4294967296),
  }

  if (nodo.node_type === 'contador') {
    const capacidad = getDatosMina().capacidad_ton_vagoneta
    return {
      ...camposContrato,
      node_id: nodo.node_id,
      node_type: nodo.node_type,
      ubicacion: nodo.ubicacion,
      frente: nodo.frente,
      timestamp: new Date(timestampMs).toISOString(),
      gases: { ...GASES_NULOS },
      ambiente: { ...AMBIENTE_NULO },
      conteo: { vagonetas: fallo ? 0 : vagonetasEnVentana(timestampMs, ventanaConteoMs, capacidad, seed + 30) },
      alarma_local: null,
      estado: {
        bateria_pct: bateriaPct(nodeId, timestampMs, seed),
        rssi_dbm: rssiDbm(nodeId, seed, timestampMs),
        sensor_ok: !fallo,
      },
    }
  }

  const presion = presionBarometrica(timestampMs)
  const tendencia = tendenciaPresion12h(timestampMs)
  const produccionLag = produccionEnHora(timestampMs - LAG_PRODUCCION_MS)
  const efectoProduccion = 0.11 * (produccionLag / PRODUCCION_PROMEDIO - 1)
  const efectoPresion = -0.035 * (presion - PRESION_REFERENCIA_HPA) - 0.015 * tendencia

  const esRetorno = nodo.esRetorno
  const factorRetorno = esRetorno ? 1.8 : 1

  const tVoladura = voladuraReciente(timestampMs, seed % 7)
  const decaimiento = decaimientoPostVoladura(timestampMs, tVoladura)

  let gases = { ch4_pct: null, co_ppm: null, h2s_ppm: null, o2_pct: null, co2_pct: null }
  let ambiente

  if (nodo.node_type === 'superficie') {
    ambiente = {
      temp_c: Math.round(conRuido(24 + 6 * Math.sin((timestampMs / DIA_MS) * 2 * Math.PI), 0.2, timestampMs, seed + 1) * 10) / 10,
      humedad_pct: Math.round(conRuido(65, 1.5, timestampMs, seed + 2)),
      presion_hpa: Math.round(conRuido(presion, 0.15, timestampMs, seed + 3) * 10) / 10,
    }
  } else {
    const baseCh4 = (esRetorno ? 0.25 : 0.08) * factorRetorno
    const ch4 = Math.max(
      0,
      conRuido(
        baseCh4 + (efectoProduccion + efectoPresion) * factorRetorno + decaimiento * 0.03,
        0.01,
        timestampMs,
        seed + 4,
      ),
    )

    const baseO2 = esRetorno ? 20.4 : 20.8
    const deficitVoladura = (esRetorno ? 2.2 : 1.3) * decaimiento
    const o2 = Math.min(
      20.9,
      conRuido(baseO2 - deficitVoladura, 0.05, timestampMs, seed + 5),
    )

    const baseCo = esRetorno ? 4 : 2.5
    const co = Math.max(
      0,
      conRuido(baseCo + (esRetorno ? 140 : 90) * decaimiento, 1, timestampMs, seed + 6),
    )

    const h2s = Math.max(0, conRuido(0.3 + decaimiento * 1.5, 0.15, timestampMs, seed + 7))

    gases = {
      ch4_pct: Math.round(ch4 * 1000) / 1000,
      co_ppm: Math.round(co),
      h2s_ppm: Math.round(h2s * 10) / 10,
      o2_pct: Math.round(o2 * 100) / 100,
      co2_pct:
        nodo.node_type === 'fijo'
          ? Math.round(
              Math.max(0, conRuido((esRetorno ? 0.12 : 0.06) + decaimiento * 0.05, 0.01, timestampMs, seed + 8)) *
                1000,
            ) / 1000
          : null,
    }

    ambiente = {
      temp_c: Math.round(conRuido(27 + 1.5 * Math.sin((timestampMs / DIA_MS) * 2 * Math.PI), 0.2, timestampMs, seed + 9) * 10) / 10,
      humedad_pct: Math.round(conRuido(80, 1.5, timestampMs, seed + 11)),
      presion_hpa: Math.round(conRuido(presion, 0.15, timestampMs, seed + 12) * 10) / 10,
    }
  }

  return {
    ...camposContrato,
    node_id: nodo.node_id,
    node_type: nodo.node_type,
    ubicacion: nodo.ubicacion,
    timestamp: new Date(timestampMs).toISOString(),
    gases: nodo.node_type === 'superficie' ? { ch4_pct: null, co_ppm: null, h2s_ppm: null, o2_pct: null, co2_pct: null } : gases,
    ambiente,
    conteo: null,
    alarma_local: nodo.node_type === 'fijo' || nodo.node_type === 'casco'
      ? { activa: false, gases: [] }
      : null,
    estado: {
      bateria_pct: bateriaPct(nodeId, timestampMs, seed),
      rssi_dbm: rssiDbm(nodeId, seed, timestampMs),
      sensor_ok: !fallo,
    },
  }
}

/** Última lectura disponible "ahora" para un nodo. */
export function ultimaLectura(nodeId, ahoraMs = Date.now()) {
  return generarLectura(nodeId, ahoraMs, VENTANA_CONTEO_SNAPSHOT_MS)
}

/**
 * Serie de tiempo entre `desde` y `hasta` (Date o timestamp ms). El paso se
 * ajusta automáticamente al rango para mantener las gráficas legibles.
 */
export function generarSerie(nodeId, desde, hasta) {
  const desdeMs = desde instanceof Date ? desde.getTime() : desde
  const hastaMs = hasta instanceof Date ? hasta.getTime() : hasta
  const rangoMs = hastaMs - desdeMs

  let pasoMs
  if (rangoMs <= HORA_MS) pasoMs = 60 * 1000 // 1 min
  else if (rangoMs <= 6 * HORA_MS) pasoMs = 5 * 60 * 1000 // 5 min
  else pasoMs = 15 * 60 * 1000 // 15 min

  // Para nodos "contador" cada punto reporta las vagonetas de exactamente
  // este paso (ventanaConteoMs = pasoMs): sumar `conteo.vagonetas` de todos
  // los puntos de la serie reconstruye el total exacto del rango completo,
  // sin importar la resolución con la que se haya consultado.
  const puntos = []
  for (let t = desdeMs; t <= hastaMs; t += pasoMs) {
    puntos.push(generarLectura(nodeId, t, pasoMs))
  }
  return puntos
}

export { NODOS }
