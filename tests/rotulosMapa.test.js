import test from 'node:test'
import assert from 'node:assert/strict'
import { distribuirRotulos } from '../src/lib/rotulosMapa.js'

const chocan = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y

test('separa rótulos amontonados y evita los nodos sin salir del plano', () => {
  const originales = Array.from({ length: 12 }, (_, i) => ({ id: `tbr-${i}`, x: 60 + i * 0.4, y: 20 + i * 0.7, width: 9, height: 3.5 }))
  const obstaculos = [{ x: 65, y: 20, width: 9, height: 9 }]
  const salida = distribuirRotulos(originales, obstaculos)
  assert.equal(salida.length, originales.length)
  assert.ok(salida.some((r) => Math.hypot(r.dx, r.dy) > 1.5))
  salida.forEach((r, i) => {
    assert.ok(r.caja)
    assert.ok(r.caja.x >= 1 && r.caja.y >= 1)
    assert.ok(r.caja.x + r.caja.width <= 99 && r.caja.y + r.caja.height <= 99)
    assert.ok(!obstaculos.some((o) => chocan(r.caja, o)))
    assert.ok(!salida.slice(i + 1).some((otro) => chocan(r.caja, otro.caja)))
  })
  assert.deepEqual(distribuirRotulos(originales, obstaculos), salida)
  assert.equal(originales[0].dx, undefined)
})

test('conserva la posición de un texto aislado y admite capas sin rótulos', () => {
  const [r] = distribuirRotulos([{ id: 'aislado', x: 40, y: 40, width: 10, height: 3 }])
  assert.equal(r.dx, 0)
  assert.equal(r.dy, 0)
  assert.deepEqual(distribuirRotulos([]), [])
})
