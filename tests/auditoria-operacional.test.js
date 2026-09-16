import test from 'node:test'
import assert from 'node:assert/strict'
import { detectarAlarmasCriticas, reconciliarAlarmas } from '../src/lib/alarmas.js'
import { nivelDeNodo, peorNivel } from '../src/lib/nivelNodo.js'
import { lecturaVigente } from '../src/lib/vigencia.js'
import { contarParaRegistro, rangoTurnoRegistro } from '../src/lib/produccionRegistro.js'

const ahora = Date.parse('2026-09-12T15:00:00Z')
function nodo(valor = 1.2, fecha = ahora) {
  return { node_id: 'S1', node_type: 'fijo', ultima_lectura: {
    timestamp: new Date(fecha).toISOString(), estado: { sensor_ok: true },
    gases: { ch4_pct: valor, o2_pct: 20.9 },
  } }
}

test('la alarma sobrevive a fallo, ausencia, dato nulo y lectura vencida; se despeja al recuperar una lectura segura', () => {
  const critico = nodo()
  const previo = reconciliarAlarmas(detectarAlarmasCriticas([critico]), {}, ahora, [critico])
  const averiado = nodo(0.1, ahora + 1000)
  averiado.ultima_lectura.estado.sensor_ok = false
  for (const nodos of [[averiado], [], [nodo(null, ahora + 1000)], [nodo(0.1, ahora - 90000)]]) {
    const estado = reconciliarAlarmas(detectarAlarmasCriticas(nodos), previo, ahora + 1000, nodos)
    assert.equal(estado['S1:ch4'].pendienteVerificacion, true)
  }
  const seguro = nodo(0.1, ahora + 2000)
  assert.deepEqual(reconciliarAlarmas([], previo, ahora + 2000, [seguro]), {})
})

test('la vigencia rechaza fechas vencidas, futuras e inválidas y un sensor averiado', () => {
  for (const fecha of [ahora - 60001, ahora + 1]) {
    assert.equal(nivelDeNodo(nodo(0.1, fecha), ahora), 'no_monitoreado')
  }
  assert.equal(nivelDeNodo(nodo(0.1, ahora - 60000), ahora), 'normal')
  assert.equal(lecturaVigente({ timestamp: 'inválida', estado: { sensor_ok: true } }, ahora), false)
  assert.equal(lecturaVigente(null, ahora), false)
  assert.equal(peorNivel([]), 'no_monitoreado')
  assert.equal(peorNivel(['no_monitoreado']), 'no_monitoreado')
})

test('la producción consulta exclusivamente el frente y turno histórico seleccionados', async () => {
  const nodos = ['A', 'B'].map((frente) => ({ node_id: frente, frente, node_type: 'contador' }))
  const consultas = []
  const consultar = async (id, desde, hasta) => {
    consultas.push({ id, desde, hasta })
    return [{ conteo: { vagonetas: id === 'A' ? 2 : 9 } }]
  }
  const resultado = await contarParaRegistro(nodos, { fecha: '2026-09-10', turno: 'tarde', frente: 'B' }, 1.2, consultar, new Date(ahora))
  assert.equal(resultado.toneladas, 10.8)
  assert.equal(consultas.length, 1)
  assert.equal(consultas[0].id, 'B')
  assert.equal(consultas[0].desde.getDate(), 10)
  assert.equal(consultas[0].desde.getHours(), 14)
  assert.equal(consultas[0].hasta.getHours(), 22)
})

test('el turno nocturno cruza medianoche y un turno abierto termina en el instante actual', () => {
  const actual = new Date('2026-09-12T03:00:00')
  const { desde, hasta } = rangoTurnoRegistro('2026-09-11', 'noche', actual)
  assert.equal(desde.getDate(), 11)
  assert.equal(desde.getHours(), 22)
  assert.equal(hasta.getTime(), actual.getTime())
  assert.throws(() => rangoTurnoRegistro('2026-09-13', 'manana', actual))
})

test('un contador sin lecturas o con dato inválido no confirma cero toneladas', async () => {
  const nodos = [{ node_id: 'A', frente: 'A', node_type: 'contador' }]
  for (const serie of [[], [{ conteo: null }]]) {
    await assert.rejects(contarParaRegistro(nodos, { fecha: '2026-09-10', turno: 'tarde', frente: 'A' }, 1.2, async () => serie, new Date(ahora)))
  }
})
