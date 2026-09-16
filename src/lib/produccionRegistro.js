/** La fecha de un turno nocturno corresponde al día en que empieza (22:00). */
export function rangoTurnoRegistro(fecha, turno, ahora = new Date()) {
  const hora = { manana: 6, tarde: 14, noche: 22 }[turno]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || hora == null) throw new Error('Turno inválido')
  const desde = new Date(`${fecha}T${String(hora).padStart(2, '0')}:00:00`)
  if (!Number.isFinite(desde.getTime()) || desde > ahora) throw new Error('El turno aún no ha comenzado')
  const fin = new Date(desde)
  fin.setHours(fin.getHours() + 8)
  return { desde, hasta: new Date(Math.min(fin.getTime(), ahora.getTime())) }
}

export async function contarParaRegistro(nodos, seleccion, capacidad, consultar, ahora = new Date()) {
  const { desde, hasta } = rangoTurnoRegistro(seleccion.fecha, seleccion.turno, ahora)
  const contadores = nodos.filter((n) => n.node_type === 'contador' && n.activo !== false && n.frente === seleccion.frente)
  const series = await Promise.all(contadores.map((n) => consultar(n.node_id, desde, hasta)))
  // Una respuesta vacía no confirma una producción de cero.
  if (series.some((serie) => serie.length === 0)) throw new Error('Sin lecturas del contador para este turno')
  let vagonetas = 0
  for (const serie of series) for (const lectura of serie) {
    const valor = lectura.conteo?.vagonetas
    if (!Number.isFinite(valor) || valor < 0) throw new Error('Conteo no disponible')
    vagonetas += valor
  }
  return { vagonetas, toneladas: Math.round(vagonetas * capacidad * 100) / 100, sinContadores: contadores.length === 0 }
}
