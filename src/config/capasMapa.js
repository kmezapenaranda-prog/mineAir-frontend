export const CAPAS_MAPA = [
  { id: 'inclinado_1', etiqueta: 'Inclinado 1', patron: /\b(?:inclinado|incliando)\s*(?:n(?:o|umero)?\s*)?0?1\b/ },
  { id: 'inclinado_2', etiqueta: 'Inclinado 2', patron: /\b(?:inclinado|incliando)\s*(?:n(?:o|umero)?\s*)?0?2\b/ },
  { id: 'preparacion', etiqueta: 'Labores de preparación', patron: /\bpreparacion\b/ },
  { id: 'desarrollo', etiqueta: 'Labores de desarrollo', patron: /\b(?:desarrollo|desarollo)\b/ },
  { id: 'labor_antigua', etiqueta: 'Labores antiguas', patron: /\blabores? antiguas?\b/ },
  { id: 'machones_proteccion', etiqueta: 'Machones de protección', patron: /\bmachones?\s+(?:de\s+)?proteccion\b/ },
  { id: 'labores_roca', etiqueta: 'Labores en roca', patron: /\blabores?\s+(?:en\s+)?roca\b/ },
  { id: 'carrilera', etiqueta: 'Carrilera', patron: /\bcarrilera\b/ },
]

/** Conserva la distinción entre capas DXF que se importaron como «galería». */
export function capaDeElemento(elemento) {
  const nombre = (elemento.capa_origen ?? '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim()
  return CAPAS_MAPA.find((capa) => capa.patron.test(nombre))?.id
    ?? CAPAS_MAPA.find((capa) => capa.id === elemento.categoria)?.id
    ?? null
}
