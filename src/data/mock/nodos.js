import { POSICIONES_NODOS } from '../../config/mapaMina.js'

/**
 * Registro de nodos del prototipo. Las coordenadas viven en
 * src/config/mapaMina.js (única fuente de verdad para el plano) — aquí
 * solo se describen los metadatos propios del contrato de telemetría.
 */
const NODOS_BASE = [
  {
    node_id: 'S1',
    node_type: 'fijo',
    ubicacion: 'Retorno frente A',
    esRetorno: true,
  },
  {
    node_id: 'S2',
    node_type: 'fijo',
    ubicacion: 'Vía principal de entrada',
    esRetorno: false,
  },
  {
    node_id: 'S3',
    node_type: 'fijo',
    ubicacion: 'Retorno frente B',
    esRetorno: true,
  },
  {
    node_id: 'H1',
    node_type: 'casco',
    ubicacion: 'Minero — Frente A',
    esRetorno: false,
  },
  {
    node_id: 'H2',
    node_type: 'casco',
    ubicacion: 'Minero — Frente B',
    esRetorno: false,
  },
  {
    node_id: 'SUP1',
    node_type: 'superficie',
    ubicacion: 'Estación de superficie (bocamina)',
    esRetorno: false,
  },
  // Contadores de vagonetas (contrato #4, propuesto) — ver CLAUDE.md.
  // No reportan gases: dato real de producción por conteo, no estimado.
  {
    node_id: 'C1',
    node_type: 'contador',
    ubicacion: 'Conteo de vagonetas — Frente A',
    frente: 'A',
    esRetorno: false,
  },
  {
    node_id: 'C2',
    node_type: 'contador',
    ubicacion: 'Conteo de vagonetas — Frente B',
    frente: 'B',
    esRetorno: false,
  },
].map((n) => ({ origen_datos: 'simulado', hardware_estado: ['S1', 'S2'].includes(n.node_id) ? 'comprado_pendiente_entrega' : 'planificado', ...n, ...POSICIONES_NODOS[n.node_id], activo: true }))

/**
 * Alta/baja de nodos (Fase 4 — Configuración): `activo` marca si el nodo
 * sigue desplegado y monitoreado. Es una propiedad de configuración, no del
 * contrato de telemetría — se muta in-place sobre los mismos objetos de
 * NODOS_BASE (igual que UMBRALES_DEFAULT en config/umbrales.js) para que
 * cualquier módulo que ya tenga una referencia (NODOS, NODOS_POR_ID) vea el
 * cambio sin recargar. getNodos()/generarPredicciones() filtran por este
 * campo: dar de baja un nodo lo retira del monitoreo en vivo sin borrar su
 * metadata ni su historial.
 */
const STORAGE_KEY = 'mineair.config_nodos_activos.v1'

function storageDisponible() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

function cargarInactivos() {
  if (!storageDisponible()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function guardarInactivos() {
  if (!storageDisponible()) return
  try {
    const inactivos = NODOS_BASE.filter((n) => !n.activo).map((n) => n.node_id)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inactivos))
  } catch {
    // Sesión sin persistencia entre recargas — el cambio sigue activo en memoria.
  }
}

for (const nodeId of cargarInactivos()) {
  const nodo = NODOS_BASE.find((n) => n.node_id === nodeId)
  if (nodo) nodo.activo = false
}

export const NODOS = NODOS_BASE

export const NODOS_POR_ID = Object.fromEntries(NODOS.map((n) => [n.node_id, n]))

/** Da de alta o de baja un nodo. Persiste de inmediato. */
export function actualizarActivoNodo(nodeId, activo) {
  const nodo = NODOS_POR_ID[nodeId]
  if (!nodo) return
  nodo.activo = activo
  guardarInactivos()
}
