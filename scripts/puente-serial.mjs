// Puente temporal Fase 5: lee la telemetría que el gateway Heltec LoRa V3
// imprime por USB/serial (una línea JSON por paquete, ya en la forma del
// contrato de CLAUDE.md) y la sirve por HTTP con la misma forma que
// src/data/edge/index.js espera del "nodo de borde".
//
// Arquitectura actual (sin Jetson Nano): el gateway de bocamina sube por
// cable a la superficie, donde el computador del ingeniero corre el
// modelo y sirve la API real. Si ese cable resulta ser serial/USB (a
// confirmar con el track de firmware), este mismo puente podría dejar de
// ser un stand-in de desarrollo y convertirse en la pieza real que
// alimenta al servicio del modelo en esa máquina — no solo en un mock
// temporal. Nada en src/ cambia para usarlo: es el mismo contrato, solo
// cambia qué proceso lo sirve.
//
// Uso:
//   PUENTE_PUERTO=COM5 node scripts/puente-serial.mjs
// y en .env.local:
//   VITE_DATA_SOURCE=edge
//   VITE_EDGE_API_URL=http://localhost:4000/api
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'

const PUERTO_SERIAL = process.env.PUENTE_PUERTO
if (!PUERTO_SERIAL) {
  console.error('[puente] Indica el puerto USB con $env:PUENTE_PUERTO="COM5" antes de ejecutar npm run puente.')
  console.table(await SerialPort.list())
  process.exit(1)
}
const BAUD = Number(process.env.PUENTE_BAUD ?? 115200)
const PUERTO_HTTP = Number(process.env.PUENTE_HTTP_PORT ?? 4000)
// Tope de historial en memoria por nodo — este puente no persiste a disco,
// así que el historial de tendencia (1/6/24h en DetalleNodo) solo cubre lo
// recibido desde que el puente arrancó.
const HISTORIAL_MAX_POR_NODO = 8000

const ultimaLecturaPorNodo = new Map()
const historialPorNodo = new Map()
let ultimaRecepcion = null
const ajv = new Ajv2020({ strict: false, allErrors: true })
addFormats(ajv)
const validarTelemetria = ajv.compile(JSON.parse(await readFile(new URL('../telemetria.schema.json', import.meta.url), 'utf8')))

function registrar(lectura) {
  if (!lectura || typeof lectura !== 'object' || Array.isArray(lectura)) {
    console.warn('[puente] Se esperaba un objeto de telemetría.')
    return
  }
  // Conexión USB directa: el computador actúa como receptor y aporta UTC
  // cuando el nodo solo dispone de millis(). Conserva el timestamp del gateway.
  lectura = { ...lectura, timestamp: lectura.timestamp ?? new Date().toISOString() }
  if (!validarTelemetria(lectura)) {
    console.warn('[puente] Paquete incompatible con telemetria.schema.json:', ajv.errorsText(validarTelemetria.errors))
    return
  }
  ultimaLecturaPorNodo.set(lectura.node_id, lectura)
  ultimaRecepcion = new Date().toISOString()
  const historial = historialPorNodo.get(lectura.node_id) ?? []
  historial.push(lectura)
  if (historial.length > HISTORIAL_MAX_POR_NODO) historial.shift()
  historialPorNodo.set(lectura.node_id, historial)
}

const puerto = new SerialPort({ path: PUERTO_SERIAL, baudRate: BAUD })
const parser = puerto.pipe(new ReadlineParser({ delimiter: '\n' }))

puerto.on('open', () => console.log(`[puente] Puerto serial ${PUERTO_SERIAL} abierto a ${BAUD} baud`))
puerto.on('error', (err) => console.error('[puente] Error de puerto serial:', err.message))

parser.on('data', (linea) => {
  const texto = linea.trim()
  if (!texto) return
  try {
    registrar(JSON.parse(texto))
  } catch {
    console.warn('[puente] Línea no es JSON válido, se ignora:', texto)
  }
})

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function enviarJson(res, status, cuerpo) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS })
  res.end(JSON.stringify(cuerpo))
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO_HTTP}`)

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS)
    return res.end()
  }

  if (req.method === 'GET' && url.pathname === '/api/nodos') {
    const nodos = [...ultimaLecturaPorNodo.entries()].map(([node_id, ultima_lectura]) => ({
      node_id,
      // node_type/ubicacion deberían venir en el propio paquete (contrato
      // de telemetría); si el firmware aún no los incluye, cae a valores
      // de relleno para no romper la vista mientras se ajusta el firmware.
      node_type: ultima_lectura.node_type ?? 'fijo',
      ubicacion: ultima_lectura.ubicacion ?? node_id,
      activo: true,
      origen_datos: 'real',
      ultima_lectura,
    }))
    return enviarJson(res, 200, nodos)
  }

  if (req.method === 'GET' && (url.pathname === '/api/telemetria' || url.pathname.startsWith('/api/telemetria/'))) {
    let nodeId
    try {
      nodeId = url.pathname === '/api/telemetria' ? url.searchParams.get('node_id') : decodeURIComponent(url.pathname.slice('/api/telemetria/'.length))
    } catch {
      return enviarJson(res, 400, { error: 'Identificador de nodo inválido' })
    }
    if (!nodeId) return enviarJson(res, 400, { error: 'Falta el identificador de nodo' })
    const desde = url.searchParams.has('desde') ? Date.parse(url.searchParams.get('desde')) : -Infinity
    const hasta = url.searchParams.has('hasta') ? Date.parse(url.searchParams.get('hasta')) : Infinity
    if (Number.isNaN(desde) || Number.isNaN(hasta) || desde > hasta) {
      return enviarJson(res, 400, { error: 'Rango de fechas inválido' })
    }
    const historial = historialPorNodo.get(nodeId) ?? []
    const filtrado = historial.filter((l) => {
      const t = new Date(l.timestamp)
      return t >= desde && t <= hasta
    })
    return enviarJson(res, 200, filtrado)
  }

  if (req.method === 'GET' && url.pathname === '/api/predicciones') {
    // Sin Jetson Nano / modelo ML conectado todavía: no hay de dónde sacar
    // una predicción real. Se devuelve vacío a propósito — Predicciones.jsx
    // debe mostrar "sin predicciones abiertas", no un error. Cuando el
    // track de ML entregue su servicio, este endpoint se reemplaza ahí,
    // nunca inventando probabilidades acá en el puente.
    return enviarJson(res, 200, [])
  }

  if (req.method === 'POST' && url.pathname === '/api/variables-operativas') {
    let cuerpo = ''
    req.on('data', (chunk) => (cuerpo += chunk))
    req.on('end', () => {
      try {
        const payload = JSON.parse(cuerpo)
        console.log('[puente] Variables operativas recibidas:', payload)
        // TODO Fase 5: cuando exista el Jetson, esto se reenvía al proceso
        // que alimenta al modelo. Por ahora solo se confirma la recepción.
        enviarJson(res, 200, payload)
      } catch {
        enviarJson(res, 400, { error: 'JSON inválido' })
      }
    })
    return
  }

  if (req.method === 'GET' && ['/api/estado', '/api/estado-conexion'].includes(url.pathname)) {
    return enviarJson(res, 200, {
      online: puerto.isOpen && ultimaRecepcion !== null && Date.now() - Date.parse(ultimaRecepcion) <= 60000,
      origen: 'puente-serial',
      ultima_sync: ultimaRecepcion,
    })
  }

  enviarJson(res, 404, { error: 'No encontrado' })
})

server.listen(PUERTO_HTTP, '127.0.0.1', () => {
  console.log(`[puente] Escuchando en http://localhost:${PUERTO_HTTP}/api`)
  console.log('[puente] Endpoints: /api/nodos /api/telemetria/:nodeId /api/predicciones /api/variables-operativas /api/estado')
})
