import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { generarLectura } from '../src/data/mock/telemetria.js'
import { generarPredicciones } from '../src/data/mock/predicciones.js'
import { presentarPrediccion, filtrarPredicciones } from '../src/data/predicciones.js'
import { clasificarLectura, NIVEL } from '../src/config/umbrales.js'
import { nivelDeNodo } from '../src/lib/nivelNodo.js'

async function validador(archivo) {
  const schema = JSON.parse(await readFile(new URL(`../${archivo}`, import.meta.url), 'utf8'))
  const ajv = new Ajv2020({ strict: false, allErrors: true })
  addFormats(ajv)
  return ajv.compile(schema)
}

test('la telemetría mock cumple el schema para cada tipo de nodo', async () => {
  const validar = await validador('telemetria.schema.json')
  for (const nodeId of ['S1', 'S2', 'S3', 'H1', 'H2', 'SUP1', 'C1', 'C2']) {
    const dato = generarLectura(nodeId, Date.UTC(2026, 8, 3, 14, 30, 15))
    assert.equal(validar(dato), true, `${nodeId}: ${JSON.stringify(validar.errors)}`)
  }
})

test('las predicciones mock cumplen el schema y ordenan factores', async () => {
  const validar = await validador('prediccion.schema.json')
  for (const prediccion of generarPredicciones(Date.UTC(2026, 8, 3, 14, 30, 15))) {
    assert.equal(validar(prediccion), true, JSON.stringify(validar.errors))
    assert.equal(prediccion.recomienda_evacuar, prediccion.probabilidad > 0.6)
    for (let i = 1; i < prediccion.factores.length; i++) {
      assert.ok(prediccion.factores[i - 1].peso >= prediccion.factores[i].peso)
    }
  }
})

test('adapta el contrato ML a tarjetas y filtros sin alterar la respuesta original', () => {
  const originales = generarPredicciones(Date.UTC(2026, 8, 3, 14, 30, 15))
  const presentadas = originales.map(presentarPrediccion)
  for (let i = 0; i < originales.length; i++) {
    assert.equal(Object.hasOwn(originales[i], 'nivel'), false)
    assert.equal(Object.hasOwn(originales[i], 'recomendacion'), false)
    assert.equal(presentadas[i].recomienda_evacuar, originales[i].recomienda_evacuar)
    assert.equal(typeof presentadas[i].recomendacion, 'string')
  }
  const muestra = presentadas[0]
  const filtradas = filtrarPredicciones(presentadas, { nodeId: muestra.node_id, gas: muestra.gas, nivel: muestra.nivel })
  assert.ok(filtradas.length > 0)
  assert.ok(filtradas.every((p) => p.node_id === muestra.node_id && p.gas === muestra.gas && p.nivel === muestra.nivel))
  const sinUbicacion = presentarPrediccion({ ...originales[0], ubicacion: null })
  assert.ok(sinUbicacion.recomendacion.includes(sinUbicacion.node_id))
})

test('O2 es invertido y null nunca se interpreta como cero', () => {
  assert.equal(clasificarLectura('o2', 19.4), NIVEL.ALARMA)
  assert.equal(clasificarLectura('o2', 20.9), NIVEL.NORMAL)
  assert.equal(clasificarLectura('o2', 23.6), NIVEL.ALARMA)
  assert.equal(clasificarLectura('ch4', null), NIVEL.NO_MONITOREADO)
  assert.equal(clasificarLectura('ch4', 0), NIVEL.NORMAL)
})

test('usa los límites vigentes de los artículos 38 y 39', async () => {
  const { UMBRALES_DEFAULT } = await import('../src/config/umbrales.js')
  assert.equal(UMBRALES_DEFAULT.o2.limite, 19.5)
  assert.equal(UMBRALES_DEFAULT.o2.limite_superior, 23.5)
  assert.equal(UMBRALES_DEFAULT.co.limite, 25)
  assert.equal(UMBRALES_DEFAULT.h2s.limite, 1)
  assert.equal(UMBRALES_DEFAULT.h2s.limite_stel, 5)
})

test('las recomendaciones predictivas son trazables y no evacúan por probabilidad', () => {
  const predicciones = generarPredicciones(Date.UTC(2026, 8, 3, 14, 30, 15)).map(presentarPrediccion)
  assert.ok(predicciones.every((p) => p.recomendacion.includes('Decreto 1886 de 2015')))
  assert.ok(predicciones.every((p) => !p.recomendacion.includes('30%')))
  assert.ok(predicciones.filter((p) => p.nivel === NIVEL.ALARMA).every((p) => p.recomendacion.includes('medición real') || p.recomendacion.includes('evaluación de exposición')))
})

test('sensor_ok false invalida el semáforo agregado', () => {
  const lectura = generarLectura('S1', Date.UTC(2026, 8, 3, 14, 30, 15))
  lectura.estado.sensor_ok = false
  assert.equal(nivelDeNodo({ node_type: 'fijo', ultima_lectura: lectura }), NIVEL.NO_MONITOREADO)
})

test('todos los datos son simulados; S1/S2 tienen hardware comprado pendiente de entrega', async () => {
  const { NODOS } = await import('../src/data/mock/nodos.js')
  assert.ok(NODOS.every((n) => n.origen_datos === 'simulado'))
  assert.equal(NODOS.find((n) => n.node_id === 'S1').hardware_estado, 'comprado_pendiente_entrega')
  assert.equal(NODOS.find((n) => n.node_id === 'S2').hardware_estado, 'comprado_pendiente_entrega')
})

test('la predicción v1 solo emite CH4 y CO; O2 queda bajo control reactivo', () => {
  const predicciones = generarPredicciones(Date.UTC(2026, 8, 3, 14, 30, 15))
  assert.deepEqual([...new Set(predicciones.map((p) => p.gas))].sort(), ['ch4', 'co'])
  assert.ok(predicciones.every((p) => p.sentido === 'max'))
  assert.equal(clasificarLectura('o2', 19.4), NIVEL.ALARMA)
})

test('el factor de CO describe ubicación y no afirma medir la ventilación', () => {
  const co = generarPredicciones(Date.UTC(2026, 8, 3, 14, 30, 15)).find((p) => p.gas === 'co')
  const factor = co.factores.find((f) => f.nombre === 'posicion_circuito_ventilacion')
  assert.ok(factor)
  assert.ok(['Aire de retorno', 'Aire de entrada'].includes(factor.valor))
  assert.equal(co.factores.some((f) => f.nombre === 'ventilacion_retorno'), false)
})

test('el adaptador edge usa las rutas documentadas por el servicio ML', async () => {
  const codigo = await readFile(new URL('../src/data/edge/index.js', import.meta.url), 'utf8')
  assert.match(codigo, /\/telemetria\/\$\{encodeURIComponent\(nodeId\)\}/)
  assert.match(codigo, /solicitar\('\/estado'\)/)
  assert.doesNotMatch(codigo, /estado-conexion/)
})

test('la fuente mock se identifica como simulación y nunca como datos en vivo', async () => {
  const codigo = await readFile(new URL('../src/components/layout/EstadoConexion.jsx', import.meta.url), 'utf8')
  assert.match(codigo, /estado\?\.origen === 'mock'/)
  assert.match(codigo, /'Simulación'/)
  assert.match(codigo, /Datos simulados para demostración/)
})
