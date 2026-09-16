import { REPETIDORES } from '../../config/mapaMina.js'
import { ruido, HORA_MS, DIA_MS } from './fisica.js'

function seedDe(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 1000
  return h
}

/**
 * Los repetidores no están en el contrato de telemetría (solo
 * retransmiten): se les simula únicamente un estado de conexión
 * intermitente, determinista por id+tiempo, para poblar el mapa.
 */
export function getEstadoRepetidores(ahoraMs = Date.now()) {
  return REPETIDORES.map((r) => {
    const seed = seedDe(r.repetidor_id)
    const diaBase = Math.floor(ahoraMs / DIA_MS) * DIA_MS
    const cae = ruido(diaBase, seed) < 1 / 10 // ~1 de cada 10 días
    const horaInicio = 2 + ruido(diaBase, seed + 1) * 20
    const duracionH = 0.3 + ruido(diaBase, seed + 2) * 1.2
    const inicio = diaBase + horaInicio * HORA_MS
    const enCaida = cae && ahoraMs >= inicio && ahoraMs < inicio + duracionH * HORA_MS
    return { ...r, conectado: !enCaida }
  })
}
