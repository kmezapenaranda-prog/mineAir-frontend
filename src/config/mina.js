/**
 * Datos de la mina y sus frentes — editable desde Configuración.
 * Los frentes son la fuente de verdad que consume Registro.jsx para el
 * chip de "frente" del formulario de variables operativas (contrato #3):
 * cambiar los frentes acá los propaga automáticamente al formulario.
 */
const STORAGE_KEY = 'mineair.config_mina.v1'

const DATOS_MINA_DEFECTO = Object.freeze({
  nombre: 'Mina San Judas',
  municipio: 'Cúcuta, Norte de Santander',
  frentes: [
    { id: 'A', nombre: 'Frente A', manto: 'Manto 3' },
    { id: 'B', nombre: 'Frente B', manto: 'Manto 2' },
  ],
  // Equivalencia vagonetas -> toneladas para los nodos "contador" (contrato
  // #4, propuesto en CLAUDE.md). Vive acá y no en el firmware: el tamaño de
  // carro puede cambiar sin reflashear el nodo.
  capacidad_ton_vagoneta: 1.2,
})

function storageDisponible() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

function clonarDefecto() {
  return { ...DATOS_MINA_DEFECTO, frentes: DATOS_MINA_DEFECTO.frentes.map((f) => ({ ...f })) }
}

function leer() {
  if (!storageDisponible()) return clonarDefecto()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return clonarDefecto()
    const guardado = JSON.parse(raw)
    return {
      nombre: guardado.nombre ?? DATOS_MINA_DEFECTO.nombre,
      municipio: guardado.municipio ?? DATOS_MINA_DEFECTO.municipio,
      frentes: Array.isArray(guardado.frentes) && guardado.frentes.length > 0 ? guardado.frentes : clonarDefecto().frentes,
      capacidad_ton_vagoneta:
        Number(guardado.capacidad_ton_vagoneta) > 0
          ? Number(guardado.capacidad_ton_vagoneta)
          : DATOS_MINA_DEFECTO.capacidad_ton_vagoneta,
    }
  } catch {
    return clonarDefecto()
  }
}

function escribir(datos) {
  if (!storageDisponible()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(datos))
  } catch {
    // Sesión sin persistencia entre recargas — el registro en curso sigue funcionando.
  }
}

let datosMina = leer()

export function getDatosMina() {
  return datosMina
}

export function guardarDatosMina(parciales) {
  datosMina = { ...datosMina, ...parciales }
  escribir(datosMina)
  return datosMina
}

export function agregarFrente(nombre, manto) {
  const id = nombre.trim().slice(0, 40)
  if (!id || datosMina.frentes.some((f) => f.id.toLowerCase() === id.toLowerCase())) return datosMina
  datosMina = { ...datosMina, frentes: [...datosMina.frentes, { id, nombre: id, manto: manto?.trim() || '—' }] }
  escribir(datosMina)
  return datosMina
}

export function eliminarFrente(id) {
  if (datosMina.frentes.length <= 1) return datosMina // siempre debe quedar al menos un frente seleccionable
  datosMina = { ...datosMina, frentes: datosMina.frentes.filter((f) => f.id !== id) }
  escribir(datosMina)
  return datosMina
}

export function restaurarDatosMina() {
  datosMina = clonarDefecto()
  escribir(datosMina)
  return datosMina
}
