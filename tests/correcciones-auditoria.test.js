import test from 'node:test'
import assert from 'node:assert/strict'
import { validarRegistro } from '../src/lib/validarRegistro.js'
import { analizarNodos } from '../src/lib/seriesReporte.js'
import { edgeDataSource } from '../src/data/edge/index.js'

const form = {
  fecha: '2026-09-09', manto: 'A', produccion_ton: '0',
  indice_gasificacion_m3_ton: '0', caudal_m3_s: '0', registrado_por: 'Operador',
  voladuras: [{ hora: '23:59', cantidad_kg: '0' }],
}

test('el registro acepta ceros y exige voladuras completas con hora y cantidad válidas', () => {
  for (let paso = 0; paso < 5; paso++) assert.deepEqual(validarRegistro(form, paso), {})
  for (const cantidad_kg of ['', ' ', '-1', 'Infinity', 'NaN', null]) {
    const errores = validarRegistro({ ...form, voladuras: [{ hora: '12:00', cantidad_kg }] }, 3)
    assert.ok(errores['voladura-kg-0'], `Debe rechazar ${cantidad_kg}`)
  }
  for (const hora of ['', '24:00', '12:60', '1:00']) {
    assert.ok(validarRegistro({ ...form, voladuras: [{ hora, cantidad_kg: '2' }] }, 3)['voladura-hora-0'])
  }
  assert.deepEqual(validarRegistro({ ...form, voladuras: [] }, 3), {})
})

test('los campos numéricos rechazan infinitos y negativos antes de guardar', () => {
  for (const valor of ['Infinity', '-0.1', '', ' ']) {
    assert.ok(validarRegistro({ ...form, produccion_ton: valor }, 1).produccion)
    assert.ok(validarRegistro({ ...form, indice_gasificacion_m3_ton: valor }, 1).gasificacion)
    assert.ok(validarRegistro({ ...form, caudal_m3_s: valor }, 2).caudal)
  }
})

test('reportes reutiliza una respuesta por nodo para todos sus gases', async () => {
  const nodos = [{ node_id: 'REAL-1', node_type: 'fijo' }, { node_id: 'REAL-2', node_type: 'casco' }]
  const consultas = []
  const serie = [{ gases: { ch4_pct: 0.5, co_ppm: 4 } }]
  const resultados = await analizarNodos(nodos, { fijo: ['ch4', 'co'], casco: ['co'] }, 1, 2,
    async (...args) => { consultas.push(args); return serie },
    (nodo, gas, puntos) => { assert.equal(puntos, serie); return `${nodo.node_id}:${gas}` })
  assert.deepEqual(consultas, [['REAL-1', 1, 2], ['REAL-2', 1, 2]])
  assert.deepEqual(resultados, ['REAL-1:ch4', 'REAL-1:co', 'REAL-2:co'])
})

test('reportes propaga errores de red en lugar de fabricar un informe vacío', async () => {
  await assert.rejects(analizarNodos([{ node_id: 'REAL-1' }], {}, 1, 2,
    async () => { throw new Error('Sin conexión') }, () => null), /Sin conexión/)
})

test('edge propaga fallos HTTP y de red y distingue funciones no disponibles', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_url, opciones) => {
    assert.ok(opciones.signal instanceof AbortSignal)
    return { ok: false, status: 503 }
  })
  await assert.rejects(edgeDataSource.getNodos(), /503/)
  await assert.rejects(edgeDataSource.postVariablesOperativas(form), /503/)
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(edgeDataSource.getNodos(), /Failed to fetch/)
  assert.deepEqual(await edgeDataSource.getEstadoConexion(), { online: false, origen: 'edge', ultima_sync: null })
  assert.equal(await edgeDataSource.listarVariablesOperativas(), null)
  assert.equal(await edgeDataSource.getRepetidores(), null)
})

test('el guardado local informa si sobrevivirá a una recarga y conserva la copia temporal', async () => {
  const previo = globalThis.window
  let persistido
  globalThis.window = { localStorage: { getItem: () => null, setItem: (_clave, valor) => { persistido = valor } } }
  try {
    const { postVariablesOperativas, listarVariablesOperativas } = await import('../src/data/mock/variablesOperativas.js')
    const durable = await postVariablesOperativas({ fecha: '2026-09-09', registrado_por: 'Operador' })
    assert.equal(durable.persistencia, 'local')
    assert.equal(JSON.parse(persistido)[0].registrado_por, 'Operador')
    globalThis.window.localStorage.setItem = () => { throw new Error('QuotaExceededError') }
    const temporal = await postVariablesOperativas({ fecha: '2026-09-10', registrado_por: 'Otro' })
    assert.equal(temporal.persistencia, 'sesion')
    assert.equal((await listarVariablesOperativas())[0], temporal.registro)
    delete globalThis.window
    assert.equal((await postVariablesOperativas({ fecha: '2026-09-11' })).persistencia, 'sesion')
  } finally {
    if (previo === undefined) delete globalThis.window
    else globalThis.window = previo
  }
})
