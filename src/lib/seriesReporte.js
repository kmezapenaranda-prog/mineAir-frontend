/** Una petición por nodo; cada respuesta ya contiene todos sus gases. */
export async function analizarNodos(nodos, gasesPorTipo, desde, hasta, getTelemetria, analizarSerie) {
  const resultados = await Promise.all(nodos.map(async (nodo) => {
    const puntos = await getTelemetria(nodo.node_id, desde, hasta)
    return (gasesPorTipo[nodo.node_type] ?? []).map((gas) => analizarSerie(nodo, gas, puntos))
  }))
  return resultados.flat().filter(Boolean)
}
