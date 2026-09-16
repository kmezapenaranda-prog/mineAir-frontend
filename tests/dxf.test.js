import test from 'node:test'
import assert from 'node:assert/strict'
import { parsearDxf, crearMapaMineair, decodificarDxf, categorizarCapaDxf } from '../src/lib/dxf.js'

const DXF_MINIMO = `0
SECTION
2
ENTITIES
0
LINE
8
AIRE_LIMPIO
10
1000
20
2000
11
1100
21
2000
0
LWPOLYLINE
8
RETORNO
70
0
10
1100
20
2000
10
1200
20
2100
0
INSERT
8
VENTILADORES
2
VENTILADOR_PRINCIPAL
10
1150
20
2050
0
ENDSEC
0
EOF`

test('importa geometría 2D, capas y símbolos INSERT de un DXF', () => {
  const resultado = parsearDxf(DXF_MINIMO)
  assert.deepEqual(resultado.capas, ['AIRE_LIMPIO', 'RETORNO', 'VENTILADORES'])
  assert.equal(resultado.entidades.length, 3)
  assert.equal(resultado.entidades[2].bloque, 'VENTILADOR_PRINCIPAL')
})

test('normaliza el DXF sin perder límites y semántica de ventilación', () => {
  const resultado = parsearDxf(DXF_MINIMO)
  const mapa = crearMapaMineair(resultado, { AIRE_LIMPIO: 'entrada', RETORNO: 'retorno', VENTILADORES: 'ventilador' }, { nombre: 'Mina prueba', unidades: 'm' })
  assert.equal(mapa.schema_v, '1.0')
  assert.equal(mapa.limites_origen.min_x, 1000)
  assert.equal(mapa.elementos.find((e) => e.tipo === 'simbolo').categoria, 'ventilador')
  assert.ok(mapa.elementos.flatMap((e) => e.puntos ?? [e.posicion]).every((p) => p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100))
})

test('decodifica texto de DXF declarado como Windows-1252', () => {
  const inicio = new TextEncoder().encode('0\nSECTION\n2\nHEADER\n9\n$DWGCODEPAGE\n3\nANSI_1252\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n0\nTEXT\n8\nROTULO\n10\n1\n20\n2\n1\nPreparaci')
  const final = new TextEncoder().encode('n\n0\nENDSEC\n0\nEOF')
  const bytes = new Uint8Array([...inicio, 0xf3, ...final])
  const resultado = decodificarDxf(bytes)
  assert.equal(resultado.codificacion, 'windows-1252')
  assert.match(resultado.texto, /Preparación/)
})

test('prioriza UTF-8 válido cuando la cabecera ANSI del DXF es incorrecta', () => {
  const bytes = new TextEncoder().encode('0\nSECTION\n2\nHEADER\n9\n$DWGCODEPAGE\n3\nANSI_1252\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n0\nTEXT\n8\nROTULO\n10\n1\n20\n2\n1\nPreparación\n0\nENDSEC\n0\nEOF')
  const resultado = decodificarDxf(bytes)
  assert.equal(resultado.codificacion, 'utf-8')
  assert.match(resultado.texto, /Preparación/)
})

test('usa la extensión de cabecera para excluir geometría auxiliar distante', () => {
  const dxf = `0\nSECTION\n2\nHEADER\n9\n$EXTMIN\n10\n100\n20\n200\n9\n$EXTMAX\n10\n200\n20\n300\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n0\nLINE\n8\nMINA\n10\n110\n20\n210\n11\n190\n21\n290\n0\nLINE\n8\nAUXILIAR\n10\n-5000\n20\n-5000\n11\n-4000\n21\n-4000\n0\nENDSEC\n0\nEOF`
  const resultado = parsearDxf(dxf)
  const mapa = crearMapaMineair(resultado, { MINA: 'galeria', AUXILIAR: 'referencia' })
  assert.deepEqual(resultado.limitesCabecera, { min_x: 100, min_y: 200, max_x: 200, max_y: 300 })
  assert.equal(mapa.elementos.length, 1)
  assert.equal(mapa.diagnostico_importacion.entidades_fuera_extension, 1)
  assert.equal(mapa.limites_origen.min_x, 110)
})

test('clasifica las capas reales por función operacional', () => {
  assert.equal(categorizarCapaDxf('1. labores de preparación'), 'galeria')
  assert.equal(categorizarCapaDxf('Labores antiguas'), 'labor_antigua')
  assert.equal(categorizarCapaDxf('3. Ducto aire'), 'ducto')
  assert.equal(categorizarCapaDxf('3. Tabique bloque'), 'control_ventilacion')
  assert.equal(categorizarCapaDxf('5. Punto de encuentro'), 'seguridad')
  assert.equal(categorizarCapaDxf('1. Texto topografia subterranea'), 'topografia')
  assert.equal(categorizarCapaDxf('Texto rotulo'), 'ignorar')
})
