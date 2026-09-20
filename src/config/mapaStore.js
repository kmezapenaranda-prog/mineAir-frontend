import { GALERIAS, ZONA_SELLADA_NORTE, ETIQUETAS_PLANO, POSICIONES_NODOS, POSICIONES_REPETIDORES } from './mapaMina.js'

const STORAGE_KEY = 'mineair.mapa_activo.v1'
const MAPA_API = import.meta.env?.VITE_EDGE_API_URL ?? 'http://localhost:8000/api'
let ultimaPublicacion = Promise.resolve()

function mapaDefecto() {
  return {
    schema_v: '1.0', tipo: 'mapa-mineair', id: 'esquematico-demo', nombre: 'Plano esquemático de demostración', origen: { formato: 'interno', archivo: null }, viewBox: [0, 0, 100, 100],
    elementos: [
      ...GALERIAS.map((g) => ({ id: g.id, tipo: 'path', categoria: g.tipo === 'retorno' ? 'retorno' : 'entrada', d: g.d })),
      { id: 'sellada-norte', tipo: 'rectangulo', categoria: 'sellada', ...ZONA_SELLADA_NORTE },
      ...ETIQUETAS_PLANO.map((e, i) => ({ id: `texto-${i}`, tipo: 'texto', categoria: 'etiqueta', posicion: { x: e.x, y: e.y }, texto: e.texto, ancla: e.ancla })),
    ], nodos: { ...POSICIONES_NODOS }, repetidores: { ...POSICIONES_REPETIDORES },
  }
}

export function getMapaActivo() {
  try { const raw = window.localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : mapaDefecto() } catch { return mapaDefecto() }
}
async function publicarMapa(mapa) {
  try {
    const respuesta = await fetch(`${MAPA_API}/mapa`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapa),
      signal: AbortSignal.timeout(15000),
    })
    if (!respuesta.ok) throw new Error(`No se pudo sincronizar el mapa (${respuesta.status})`)
  } catch {
    // La copia local permite seguir trabajando sin red; se reintenta al guardar.
  }
}
export function guardarMapaActivo(mapa) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mapa))
  window.dispatchEvent(new Event('mineair:mapa-actualizado'))
  ultimaPublicacion = publicarMapa(mapa)
  return mapa
}
export async function sincronizarMapaActivo() {
  await ultimaPublicacion
  try {
    const respuesta = await fetch(`${MAPA_API}/mapa`, { signal: AbortSignal.timeout(15000) })
    if (!respuesta.ok) return getMapaActivo()
    const datos = await respuesta.json()
    if (datos.disponible && datos.mapa) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(datos.mapa))
      window.dispatchEvent(new Event('mineair:mapa-actualizado'))
      return datos.mapa
    }
  } catch {
    // Sin API disponible, conservar la copia local.
  }
  return getMapaActivo()
}
export function restaurarMapaDemo() { const mapa = mapaDefecto(); guardarMapaActivo(mapa); return mapa }
export function posicionarNodo(nodeId, posicion) { const mapa = getMapaActivo(); mapa.nodos = { ...mapa.nodos, [nodeId]: posicion }; return guardarMapaActivo(mapa) }
export function posicionarRepetidor(repetidorId, posicion) { const mapa = getMapaActivo(); mapa.repetidores = { ...mapa.repetidores, [repetidorId]: posicion }; return guardarMapaActivo(mapa) }
/** Vacía las posiciones ubicadas de un plano, para practicar el flujo de "colocar nodos/repetidores" desde cero. */
export function vaciarUbicaciones() { const mapa = getMapaActivo(); mapa.nodos = {}; mapa.repetidores = {}; return guardarMapaActivo(mapa) }
