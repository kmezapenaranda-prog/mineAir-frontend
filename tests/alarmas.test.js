import test from 'node:test'
import assert from 'node:assert/strict'
import { confirmarAlarma, detectarAlarmasCriticas, ESCALAMIENTO_MS, reconciliarAlarmas } from '../src/lib/alarmas.js'

function nodoConCh4(valor, timestamp = '2026-08-13T14:00:00.000Z') {
  return {
    node_id: 'S1',
    node_type: 'fijo',
    ubicacion: 'Retorno frente A',
    ultima_lectura: {
      timestamp,
      gases: { ch4_pct: valor, co_ppm: 0, h2s_ppm: 0, o2_pct: 20.9, co2_pct: 0.04 },
      estado: { sensor_ok: true },
    },
  }
}

test('crea una alarma crítica al superar el umbral y la despeja al normalizarse', () => {
  const alarmas = detectarAlarmasCriticas([nodoConCh4(1.2)])
  assert.equal(alarmas.length, 1)
  assert.equal(alarmas[0].id, 'S1:ch4')
  assert.equal(alarmas[0].limite, 1)
  assert.deepEqual(detectarAlarmasCriticas([nodoConCh4(0.4)]), [])
})

test('escala una alarma sin confirmar y conserva la confirmación', () => {
  const inicio = Date.parse('2026-08-13T14:00:00.000Z')
  const detectadas = detectarAlarmasCriticas([nodoConCh4(1.2)])
  const inicial = reconciliarAlarmas(detectadas, {}, inicio)
  const escalada = reconciliarAlarmas(detectadas, inicial, inicio + ESCALAMIENTO_MS)
  assert.equal(escalada['S1:ch4'].escalada, true)

  const confirmada = confirmarAlarma(escalada, 'S1:ch4', inicio + ESCALAMIENTO_MS + 1)
  const siguiente = reconciliarAlarmas(detectadas, confirmada, inicio + ESCALAMIENTO_MS * 2)
  assert.ok(siguiente['S1:ch4'].confirmadaEn)
  assert.equal(siguiente['S1:ch4'].escalada, false)
})
