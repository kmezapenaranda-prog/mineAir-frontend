const ENTIDADES_SOPORTADAS = new Set(['LINE', 'LWPOLYLINE', 'POLYLINE', 'ARC', 'CIRCLE', 'TEXT', 'MTEXT', 'INSERT'])

export function categorizarCapaDxf(nombre = '') {
  const capa = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (/aire limpio|fresh|intake|entrada/.test(capa)) return 'entrada'
  if (/aire viciado|return|retorno/.test(capa)) return 'retorno'
  if (/ducto|duct/.test(capa)) return 'ducto'
  if (/ventilador|\bfan\b/.test(capa)) return 'ventilador'
  if (/\baforo\b|survey/.test(capa)) return 'aforo'
  if (/tabique|cortina|puerta|door/.test(capa)) return 'control_ventilacion'
  if (/extintor|botiquin|punto de encuentro|evacuacion|emergencia/.test(capa)) return 'seguridad'
  if (/labores antiguas|zona explotada/.test(capa)) return 'labor_antigua'
  if (/preparacion|desarrollo|desarollo|labores en roca|inclinado|incliando|galeria|frente/.test(capa)) return 'galeria'
  if (/electrobomba|desague|manguera|electricidad|infraestructura|malacate|carrilera/.test(capa)) return 'infraestructura'
  if (/poste|superficie|carretera|quebrada|cano/.test(capa)) return 'superficie'
  if (/topograf|coordenada|abscisa|puntos poligono/.test(capa)) return 'topografia'
  if (/rotulo|texto plano|cajetin|title|diagrama unifilar|predio|poligono blas|mapa sardinata/.test(capa)) return 'ignorar'
  if (capa === '0') return 'ignorar'
  return 'referencia'
}

function paresDxf(texto) {
  const lineas = texto.replace(/\r/g, '').split('\n')
  const pares = []
  for (let i = 0; i + 1 < lineas.length; i += 2) {
    const codigo = Number(lineas[i].trim())
    if (Number.isFinite(codigo)) pares.push({ codigo, valor: lineas[i + 1].trim() })
  }
  return pares
}

const CODIFICACIONES_DXF = {
  ANSI_1250: 'windows-1250', ANSI_1251: 'windows-1251', ANSI_1252: 'windows-1252',
  ANSI_1253: 'windows-1253', ANSI_1254: 'windows-1254', ANSI_1255: 'windows-1255',
  ANSI_1256: 'windows-1256', ANSI_1257: 'windows-1257', ANSI_1258: 'windows-1258',
  UTF8: 'utf-8', 'UTF-8': 'utf-8',
}

export function decodificarDxf(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  const cabecera = new TextDecoder('windows-1252').decode(bytes.subarray(0, Math.min(bytes.length, 16384)))
  const declarada = cabecera.match(/\$DWGCODEPAGE\s*[\r\n]+\s*3\s*[\r\n]+\s*([^\r\n]+)/i)?.[1]?.trim().toUpperCase()
  let codificacion = CODIFICACIONES_DXF[declarada] ?? 'utf-8'
  if (codificacion !== 'utf-8') {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      codificacion = 'utf-8'
    } catch { /* La declaración ANSI sí coincide con los bytes. */ }
  }
  try {
    return { texto: new TextDecoder(codificacion).decode(bytes), codificacion, declarada: declarada ?? null }
  } catch {
    return { texto: new TextDecoder('utf-8').decode(bytes), codificacion: 'utf-8', declarada: declarada ?? null }
  }
}

function extraerLimitesCabecera(pares) {
  const coordenada = (nombre) => {
    const inicio = pares.findIndex((par) => par.codigo === 9 && par.valor === nombre)
    if (inicio < 0) return null
    const segmento = []
    for (let i = inicio + 1; i < pares.length && pares[i].codigo !== 9 && pares[i].valor !== 'ENDSEC'; i++) segmento.push(pares[i])
    const x = Number(segmento.find((par) => par.codigo === 10)?.valor)
    const y = Number(segmento.find((par) => par.codigo === 20)?.valor)
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null
  }
  const minimo = coordenada('$EXTMIN'), maximo = coordenada('$EXTMAX')
  return minimo && maximo && maximo.x > minimo.x && maximo.y > minimo.y
    ? { min_x: minimo.x, min_y: minimo.y, max_x: maximo.x, max_y: maximo.y }
    : null
}

function valor(entidad, codigo, defecto = null) {
  const par = entidad.find((p) => p.codigo === codigo)
  return par ? par.valor : defecto
}

function numeros(entidad, codigo) {
  return entidad.filter((p) => p.codigo === codigo).map((p) => Number(p.valor))
}

function punto(x, y) { return { x: Number(x), y: Number(y) } }

function puntosArco(cx, cy, radio, inicio, fin) {
  let amplitud = fin - inicio
  if (amplitud <= 0) amplitud += 360
  const pasos = Math.max(8, Math.ceil(amplitud / 12))
  return Array.from({ length: pasos + 1 }, (_, i) => {
    const angulo = (inicio + amplitud * (i / pasos)) * Math.PI / 180
    return punto(cx + Math.cos(angulo) * radio, cy + Math.sin(angulo) * radio)
  })
}

function convertirEntidad(tipo, datos) {
  const capa = valor(datos, 8, '0') || '0'
  if (tipo === 'LINE') return { tipo: 'polilinea', capa, puntos: [punto(valor(datos, 10), valor(datos, 20)), punto(valor(datos, 11), valor(datos, 21))], cerrada: false }
  if (tipo === 'LWPOLYLINE') {
    const xs = numeros(datos, 10), ys = numeros(datos, 20)
    return { tipo: 'polilinea', capa, puntos: xs.map((x, i) => punto(x, ys[i])), cerrada: (Number(valor(datos, 70, 0)) & 1) === 1 }
  }
  if (tipo === 'ARC') return { tipo: 'polilinea', capa, puntos: puntosArco(Number(valor(datos, 10)), Number(valor(datos, 20)), Number(valor(datos, 40)), Number(valor(datos, 50)), Number(valor(datos, 51))), cerrada: false }
  if (tipo === 'CIRCLE') return { tipo: 'polilinea', capa, puntos: puntosArco(Number(valor(datos, 10)), Number(valor(datos, 20)), Number(valor(datos, 40)), 0, 360), cerrada: true }
  if (tipo === 'TEXT' || tipo === 'MTEXT') return { tipo: 'texto', capa, posicion: punto(valor(datos, 10), valor(datos, 20)), texto: valor(datos, tipo === 'MTEXT' ? 1 : 1, '') }
  if (tipo === 'INSERT') return { tipo: 'simbolo', capa, posicion: punto(valor(datos, 10), valor(datos, 20)), bloque: valor(datos, 2, 'SIMBOLO'), rotacion: Number(valor(datos, 50, 0)) }
  return null
}

export function parsearDxf(texto) {
  const pares = paresDxf(texto)
  const limitesCabecera = extraerLimitesCabecera(pares)
  const entidades = []
  const omitidas = {}
  let enEntidades = false
  let actual = null
  let polyline = null

  function cerrar() {
    if (!actual) return
    const { tipo, datos } = actual
    if (tipo === 'POLYLINE') {
      polyline = { tipo: 'polilinea', capa: valor(datos, 8, '0'), puntos: [], cerrada: (Number(valor(datos, 70, 0)) & 1) === 1 }
    } else if (tipo === 'VERTEX' && polyline) {
      polyline.puntos.push(punto(valor(datos, 10), valor(datos, 20)))
    } else if (tipo === 'SEQEND' && polyline) {
      if (polyline.puntos.length > 1) entidades.push(polyline)
      polyline = null
    } else if (ENTIDADES_SOPORTADAS.has(tipo)) {
      const convertida = convertirEntidad(tipo, datos)
      if (convertida && (convertida.tipo !== 'polilinea' || convertida.puntos.length > 1)) entidades.push(convertida)
    } else if (tipo && !['SECTION', 'ENDSEC', 'EOF'].includes(tipo)) omitidas[tipo] = (omitidas[tipo] ?? 0) + 1
  }

  for (let i = 0; i < pares.length; i++) {
    const par = pares[i]
    if (par.codigo === 0 && par.valor === 'SECTION' && pares[i + 1]?.codigo === 2 && pares[i + 1]?.valor === 'ENTITIES') enEntidades = true
    if (!enEntidades) continue
    if (par.codigo === 0 && par.valor === 'ENDSEC') { cerrar(); break }
    if (par.codigo === 0) { cerrar(); actual = { tipo: par.valor, datos: [] } }
    else if (actual) actual.datos.push(par)
  }
  if (!entidades.length) throw new Error('El DXF no contiene entidades 2D compatibles en la sección ENTITIES.')
  const capas = [...new Set(entidades.map((e) => e.capa))].sort((a, b) => a.localeCompare(b))
  return { entidades, capas, omitidas, limitesCabecera }
}

export function crearMapaMineair(resultado, asignaciones, metadatos = {}) {
  const porCapa = resultado.entidades.filter((e) => asignaciones[e.capa] !== 'ignorar')
  const puntosEntidad = (e) => e.tipo === 'polilinea' ? e.puntos : [e.posicion]
  const limites = resultado.limitesCabecera
  const tolerancia = limites ? Math.max(limites.max_x - limites.min_x, limites.max_y - limites.min_y) * 0.005 : 0
  const filtradas = porCapa.filter((e) => !limites || puntosEntidad(e).every((p) =>
    p.x >= limites.min_x - tolerancia && p.x <= limites.max_x + tolerancia &&
    p.y >= limites.min_y - tolerancia && p.y <= limites.max_y + tolerancia))
  const aplicarExtension = Boolean(limites && filtradas.length)
  const visibles = aplicarExtension ? filtradas : porCapa
  const puntos = visibles.flatMap((e) => e.tipo === 'polilinea' ? e.puntos : [e.posicion])
  const minX = puntos.length ? Math.min(...puntos.map((p) => p.x)) : (limites?.min_x ?? 0)
  const maxX = puntos.length ? Math.max(...puntos.map((p) => p.x)) : (limites?.max_x ?? 1)
  const minY = puntos.length ? Math.min(...puntos.map((p) => p.y)) : (limites?.min_y ?? 0)
  const maxY = puntos.length ? Math.max(...puntos.map((p) => p.y)) : (limites?.max_y ?? 1)
  const ancho = Math.max(maxX - minX, 1), alto = Math.max(maxY - minY, 1)
  const margen = 4, escala = Math.min((100 - margen * 2) / ancho, (100 - margen * 2) / alto)
  const offsetX = (100 - ancho * escala) / 2, offsetY = (100 - alto * escala) / 2
  const normalizar = (p) => ({ x: +(offsetX + (p.x - minX) * escala).toFixed(4), y: +(100 - offsetY - (p.y - minY) * escala).toFixed(4) })
  return {
    schema_v: '1.0', tipo: 'mapa-mineair', id: metadatos.id ?? `mapa-${Date.now()}`,
    nombre: metadatos.nombre ?? 'Plano importado', origen: { formato: 'dxf', archivo: metadatos.archivo ?? null, importado_en: new Date().toISOString(), unidades: metadatos.unidades ?? 'sin_especificar' },
    limites_origen: { min_x: minX, min_y: minY, max_x: maxX, max_y: maxY }, viewBox: [0, 0, 100, 100],
    diagnostico_importacion: { entidades_origen: resultado.entidades.length, entidades_fuera_extension: aplicarExtension ? porCapa.length - filtradas.length : 0, extension_cabecera_aplicada: aplicarExtension },
    elementos: visibles.map((e, i) => e.tipo === 'texto'
      ? { id: `e${i}`, tipo: 'texto', categoria: asignaciones[e.capa] ?? 'referencia', capa_origen: e.capa, posicion: normalizar(e.posicion), texto: e.texto }
      : e.tipo === 'simbolo'
        ? { id: `e${i}`, tipo: 'simbolo', categoria: asignaciones[e.capa] ?? 'referencia', capa_origen: e.capa, posicion: normalizar(e.posicion), bloque: e.bloque, rotacion: e.rotacion }
        : { id: `e${i}`, tipo: 'polilinea', categoria: asignaciones[e.capa] ?? 'referencia', capa_origen: e.capa, puntos: e.puntos.map(normalizar), cerrada: e.cerrada }),
    nodos: {}, repetidores: {},
  }
}
