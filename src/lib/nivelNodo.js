import { clasificarLectura, NIVEL } from '../config/umbrales.js'
import { lecturaVigente } from './vigencia.js'

export const GASES_SEMAFORO = ['o2', 'ch4', 'co2', 'co', 'h2s']

/** Peor nivel entre una lista — define el semáforo agregado de un nodo. */
export function peorNivel(niveles) {
  if (niveles.includes(NIVEL.ALARMA)) return NIVEL.ALARMA
  if (niveles.includes(NIVEL.PRECAUCION)) return NIVEL.PRECAUCION
  if (niveles.length === 0 || niveles.every((n) => n === NIVEL.NO_MONITOREADO)) return NIVEL.NO_MONITOREADO
  return NIVEL.NORMAL
}

/** Nivel de cada gas monitoreable para una lectura de telemetría. */
export function nivelesDeNodo(lectura) {
  return GASES_SEMAFORO.map((gas) =>
    clasificarLectura(gas, lectura.gases[`${gas}_pct`] ?? lectura.gases[`${gas}_ppm`]),
  )
}

/** Semáforo agregado de un nodo (superficie y contador no tienen gases -> no_monitoreado). */
export function nivelDeNodo(nodo, ahora = Date.now()) {
  if (nodo.node_type === 'superficie' || nodo.node_type === 'contador') return NIVEL.NO_MONITOREADO
  if (!lecturaVigente(nodo.ultima_lectura, ahora)) return NIVEL.NO_MONITOREADO
  return peorNivel(nivelesDeNodo(nodo.ultima_lectura))
}
