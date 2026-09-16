import { GALERIAS, ZONA_SELLADA_NORTE, ETIQUETAS_PLANO, POSICIONES_NODOS, POSICIONES_REPETIDORES } from './mapaMina.js'

const STORAGE_KEY = 'mineair.mapa_activo.v1'

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
export function guardarMapaActivo(mapa) { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mapa)); window.dispatchEvent(new Event('mineair:mapa-actualizado')); return mapa }
export function restaurarMapaDemo() { const mapa = mapaDefecto(); guardarMapaActivo(mapa); return mapa }
export function posicionarNodo(nodeId, posicion) { const mapa = getMapaActivo(); mapa.nodos = { ...mapa.nodos, [nodeId]: posicion }; return guardarMapaActivo(mapa) }
export function posicionarRepetidor(repetidorId, posicion) { const mapa = getMapaActivo(); mapa.repetidores = { ...mapa.repetidores, [repetidorId]: posicion }; return guardarMapaActivo(mapa) }
/** Vacía las posiciones ubicadas de un plano, para practicar el flujo de "colocar nodos/repetidores" desde cero. */
export function vaciarUbicaciones() { const mapa = getMapaActivo(); mapa.nodos = {}; mapa.repetidores = {}; return guardarMapaActivo(mapa) }
