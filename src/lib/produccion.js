import { getTelemetria } from '../data/index.js'
import { getDatosMina } from '../config/mina.js'
import { inicioTurnoActual } from './turnos.js'
import { contarParaRegistro } from './produccionRegistro.js'

export function produccionDelRegistro(nodos, seleccion) {
  return contarParaRegistro(nodos, seleccion, getDatosMina().capacidad_ton_vagoneta, getTelemetria)
}

/** Nodos "contador" activos (contrato #4, propuesto — ver CLAUDE.md). */
export function nodosContador(nodos) {
  return nodos.filter((n) => n.node_type === 'contador' && n.activo !== false)
}

/**
 * Producción REAL en el rango [desde, hasta]: suma de vagonetas contadas por
 * cada nodo contador, no una estimación ni un promedio. `getTelemetria`
 * reconstruye exactamente el total del rango sin importar la resolución con
 * la que el mock (o el edge real) haya muestreado la serie — ver el
 * comentario en data/mock/telemetria.js:generarSerie.
 */
export async function produccionContadaEnRango(nodos, desde, hasta) {
  const capacidad = getDatosMina().capacidad_ton_vagoneta
  const contadores = nodosContador(nodos)
  const porFrente = new Map()
  let totalVagonetas = 0

  await Promise.all(
    contadores.map(async (nodo) => {
      const serie = await getTelemetria(nodo.node_id, desde, hasta)
      const vagonetas = serie.reduce((acc, p) => acc + (p.conteo?.vagonetas ?? 0), 0)
      totalVagonetas += vagonetas
      const frente = nodo.frente ?? nodo.node_id
      porFrente.set(frente, (porFrente.get(frente) ?? 0) + vagonetas)
    }),
  )

  return {
    vagonetas: totalVagonetas,
    toneladas: Math.round(totalVagonetas * capacidad * 100) / 100,
    capacidad,
    sinContadores: contadores.length === 0,
    porFrente: [...porFrente.entries()].map(([frente, vagonetas]) => ({
      frente,
      vagonetas,
      toneladas: Math.round(vagonetas * capacidad * 100) / 100,
    })),
  }
}

/** Atajo: producción real contada desde que empezó el turno que está corriendo ahora. */
export async function produccionTurnoActual(nodos) {
  const ahora = new Date()
  const desde = inicioTurnoActual(ahora)
  return produccionContadaEnRango(nodos, desde, ahora)
}
