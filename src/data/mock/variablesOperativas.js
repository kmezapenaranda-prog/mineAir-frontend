/**
 * Registro de variables operativas capturadas en campo (contrato de datos #3).
 * Persistido en localStorage para que un registro cerrado sin señal
 * sobreviva a un refresh/cierre de la PWA — no hay backend en esta fase.
 */
const STORAGE_KEY = 'mineair.variables_operativas.v1'

function storageDisponible() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

function leerTodo() {
  if (!storageDisponible()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function guardarTodo(registros) {
  if (!storageDisponible()) return false
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(registros))
    return true
  } catch {
    return false
  }
}

let memoria = leerTodo()

export async function postVariablesOperativas(payload) {
  const registro = {
    ...payload,
    registrado_en: new Date().toISOString(),
  }
  memoria = [registro, ...memoria]
  const persistido = guardarTodo(memoria)
  return { ok: true, registro, persistencia: persistido ? 'local' : 'sesion' }
}

export async function listarVariablesOperativas() {
  return memoria
}
