import { useMemo, useState } from 'react'
import { getNodos, getTelemetria, listarVariablesOperativas, origenDatos } from '../data/index.js'
import { useCargaPeriodica } from '../lib/useCargaPeriodica.js'
import { analizarNodos } from '../lib/seriesReporte.js'
import ErrorCarga from '../components/ErrorCarga.jsx'
import { UMBRALES_DEFAULT, clasificarLectura, NIVEL, SENTIDO } from '../config/umbrales.js'
import { getDatosMina } from '../config/mina.js'
import Drawer from '../components/Drawer.jsx'

const HORA_MS = 60 * 60 * 1000
const DIA_MS = 24 * HORA_MS

const GASES_POR_TIPO = {
  fijo: ['o2', 'ch4', 'co2', 'co', 'h2s'],
  casco: ['o2', 'ch4', 'co', 'h2s'],
}

const RANGOS_RAPIDOS = [
  { valor: 'turno', etiqueta: 'Turno actual' },
  { valor: '7d', etiqueta: 'Últimos 7 días' },
  { valor: '30d', etiqueta: 'Últimos 30 días' },
  { valor: 'personalizado', etiqueta: 'Personalizado' },
]

function fechaISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function inicioTurnoActual(ahora) {
  const h = ahora.getHours()
  const inicioHora = h >= 6 && h < 14 ? 6 : h >= 14 && h < 22 ? 14 : h >= 22 ? 22 : 22
  const base = new Date(ahora)
  if (h < 6) base.setDate(base.getDate() - 1)
  base.setHours(inicioHora, 0, 0, 0)
  return base
}

function calcularRango(rangoRapido, desdeInput, hastaInput) {
  const ahora = new Date()
  if (rangoRapido === 'turno') return { desde: inicioTurnoActual(ahora), hasta: ahora }
  if (rangoRapido === '7d') return { desde: new Date(ahora.getTime() - 7 * DIA_MS), hasta: ahora }
  if (rangoRapido === '30d') return { desde: new Date(ahora.getTime() - 30 * DIA_MS), hasta: ahora }
  const desde = desdeInput ? new Date(`${desdeInput}T00:00:00`) : new Date(ahora.getTime() - 7 * DIA_MS)
  const hasta = hastaInput ? new Date(`${hastaInput}T23:59:59`) : ahora
  return { desde, hasta: hasta > ahora ? ahora : hasta }
}

function formatoFechaHora(ms) {
  return new Date(ms).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatoFecha(d) {
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function campoGas(gas) {
  return UMBRALES_DEFAULT[gas].unidad === 'pct' ? `${gas}_pct` : `${gas}_ppm`
}

// Dos incursiones en alarma separadas por menos de esto se reportan como un
// solo evento. El ruido de sensor (±3% de la lectura, ver fisica.js) hace
// que una lectura oscile alrededor del umbral varias veces durante una
// misma incursión real (ej. la recuperación de O2 tras una voladura) —
// sin fusionar, un solo incidente se fragmentaba en media docena de
// "eventos" de segundos de duración, inflando el informe con ruido en vez
// de incidentes reales.
const BRECHA_FUSION_MS = 30 * 60 * 1000

/** Resumen min/prom/max por nodo+gas, y eventos de excedencia (rachas continuas en alarma, fusionadas). */
function analizarSerie(nodo, gas, puntos) {
  const campo = campoGas(gas)
  const valores = []
  const eventos = []
  let eventoAbierto = null

  for (const p of puntos) {
    const valor = p.gases[campo]
    if (valor == null) continue
    valores.push(valor)
    const nivel = clasificarLectura(gas, valor)
    const ts = new Date(p.timestamp).getTime()

    if (nivel === NIVEL.ALARMA) {
      const ultimo = eventos[eventos.length - 1]
      if (eventoAbierto) {
        eventoAbierto.fin = ts
        const sentido = UMBRALES_DEFAULT[gas].sentido
        const peorQue = sentido === SENTIDO.MINIMO ? valor < eventoAbierto.pico : valor > eventoAbierto.pico
        if (peorQue) eventoAbierto.pico = valor
      } else if (ultimo && ts - ultimo.fin <= BRECHA_FUSION_MS) {
        eventoAbierto = ultimo
        eventoAbierto.fin = ts
        const sentido = UMBRALES_DEFAULT[gas].sentido
        const peorQue = sentido === SENTIDO.MINIMO ? valor < eventoAbierto.pico : valor > eventoAbierto.pico
        if (peorQue) eventoAbierto.pico = valor
      } else {
        eventoAbierto = { inicio: ts, fin: ts, pico: valor }
        eventos.push(eventoAbierto)
      }
    } else {
      eventoAbierto = null
    }
  }

  if (valores.length === 0) return null

  return {
    resumen: {
      node_id: nodo.node_id,
      ubicacion: nodo.ubicacion,
      gas,
      etiqueta: UMBRALES_DEFAULT[gas].etiqueta,
      unidad: UMBRALES_DEFAULT[gas].unidad,
      min: Math.min(...valores),
      prom: valores.reduce((a, b) => a + b, 0) / valores.length,
      max: Math.max(...valores),
    },
    eventos: eventos.map((e) => ({
      node_id: nodo.node_id,
      ubicacion: nodo.ubicacion,
      gas,
      etiqueta: UMBRALES_DEFAULT[gas].etiqueta,
      unidad: UMBRALES_DEFAULT[gas].unidad,
      ...e,
    })),
  }
}

function Chip({ activo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`tap-target shrink-0 rounded-full px-3 text-sm font-medium transition-[color,background-color,transform] duration-150 ease-out active:scale-95 ${
        activo ? 'bg-primary text-primary-foreground' : 'bg-surface-raised text-muted-foreground'
      }`}
    >
      {children}
    </button>
  )
}

function GrupoChips({ id, titulo, opciones, valorActivo, onCambiar }) {
  const idRotulo = `${id}-rotulo`
  return (
    <div>
      <p id={idRotulo} className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </p>
      <div role="group" aria-labelledby={idRotulo} className="flex flex-wrap gap-2">
        {opciones.map((o) => (
          <Chip key={String(o.valor)} activo={valorActivo === o.valor} onClick={() => onCambiar(o.valor)}>
            {o.etiqueta}
          </Chip>
        ))}
      </div>
    </div>
  )
}

async function generarPdf(informe, datosMina) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const doc = new jsPDF()
  const { desde, hasta, resumen, eventos, acciones } = informe

  doc.setFontSize(16)
  doc.text('Informe de fiscalización — MineAIr', 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(90)
  doc.text(`${datosMina.nombre} · ${datosMina.municipio}`, 14, 25)
  doc.text(`Período: ${formatoFecha(desde)} — ${formatoFecha(hasta)}`, 14, 30)
  doc.text(informe.origen === 'mock' ? 'Fuente: simulacion. Registros locales de este dispositivo.' : 'Fuente: servicio edge. Acciones operativas no disponibles.', 14, 35)
  doc.setTextColor(0)

  let y = 44

  doc.setFontSize(12)
  doc.text('Registro de mediciones por período', 14, y)
  autoTable(doc, {
    startY: y + 3,
    head: [['Nodo', 'Ubicación', 'Gas', 'Mín', 'Prom', 'Máx', 'Unidad']],
    body: resumen.map((r) => [
      r.node_id,
      r.ubicacion,
      r.etiqueta,
      r.min.toFixed(2),
      r.prom.toFixed(2),
      r.max.toFixed(2),
      r.unidad === 'pct' ? '%' : 'ppm',
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [21, 62, 66] },
    margin: { left: 14, right: 14 },
  })
  y = (doc.lastAutoTable?.finalY ?? y) + 10

  doc.setFontSize(12)
  doc.text('Eventos de excedencia', 14, y)
  if (eventos.length === 0) {
    doc.setFontSize(9)
    doc.setTextColor(90)
    doc.text('Sin eventos de excedencia registrados en el período.', 14, y + 6)
    doc.setTextColor(0)
    y += 12
  } else {
    autoTable(doc, {
      startY: y + 3,
      head: [['Nodo', 'Ubicación', 'Gas', 'Inicio', 'Fin', 'Valor pico']],
      body: eventos.map((e) => [
        e.node_id,
        e.ubicacion,
        e.etiqueta,
        formatoFechaHora(e.inicio),
        formatoFechaHora(e.fin),
        `${e.pico.toFixed(2)} ${e.unidad === 'pct' ? '%' : 'ppm'}`,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [178, 68, 44] },
      margin: { left: 14, right: 14 },
    })
    y = (doc.lastAutoTable?.finalY ?? y) + 10
  }

  doc.setFontSize(12)
  doc.text('Acciones tomadas', 14, y)
  if (acciones === null || acciones.length === 0) {
    doc.setFontSize(9)
    doc.setTextColor(90)
    doc.text(acciones === null ? 'Consulta de registros no disponible en el servicio conectado.' : 'Sin registros locales de variables operativas en el período.', 14, y + 6)
    doc.setTextColor(0)
  } else {
    autoTable(doc, {
      startY: y + 3,
      head: [['Fecha', 'Turno', 'Frente', 'Registrado por', 'Observaciones']],
      body: acciones.map((a) => [a.fecha, a.turno, a.frente, a.registrado_por, a.observaciones || '—']),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [21, 62, 66] },
      margin: { left: 14, right: 14 },
    })
  }

  doc.save(`informe-anm_${fechaISO(desde)}_${fechaISO(hasta)}.pdf`)
}

export default function Reportes() {
  const datosMina = getDatosMina()
  const carga = useCargaPeriodica(getNodos)
  const [rangoRapido, setRangoRapido] = useState('7d')
  const [desdeInput, setDesdeInput] = useState('')
  const [hastaInput, setHastaInput] = useState('')
  const [nodoFiltro, setNodoFiltro] = useState(null)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [error, setError] = useState(null)
  const [informe, setInforme] = useState(null)

  const nodosGas = useMemo(
    () => (carga.datos ?? []).filter((n) => (n.node_type === 'fijo' || n.node_type === 'casco') && n.activo !== false),
    [carga.datos],
  )
  const opcionesNodo = useMemo(
    () => [{ valor: null, etiqueta: 'Todos' }, ...nodosGas.map((n) => ({ valor: n.node_id, etiqueta: n.ubicacion }))],
    [nodosGas],
  )

  async function generarInforme() {
    if (generando || !carga.datos || carga.error) return
    setGenerando(true)
    setError(null)
    try {
      const { desde, hasta } = calcularRango(rangoRapido, desdeInput, hastaInput)
      const nodosObjetivo = nodoFiltro ? nodosGas.filter((n) => n.node_id === nodoFiltro) : nodosGas
      if (nodosObjetivo.length === 0) throw new Error('Sin nodos disponibles')

      const validos = await analizarNodos(nodosObjetivo, GASES_POR_TIPO, desde, hasta, getTelemetria, analizarSerie)
      const resumen = validos.map((r) => r.resumen)
      const eventos = validos.flatMap((r) => r.eventos).sort((a, b) => b.inicio - a.inicio)

      // Los registros de variables operativas son por turno/frente, no por
      // nodo (no hay mapeo 1:1 entre un node_id y un frente en el contrato),
      // así que el filtro de nodo no aplica acá — el período sí.
      const desdeStr = fechaISO(desde)
      const hastaStr = fechaISO(hasta)
      const registros = await listarVariablesOperativas()
      const acciones = registros === null ? null : registros.filter((r) => r.fecha >= desdeStr && r.fecha <= hastaStr)

      setInforme({ desde, hasta, resumen, eventos, acciones, origen: origenDatos })
    } catch {
      setError('No fue posible generar el informe. Verifica la conexión e inténtalo de nuevo.')
    } finally {
      setGenerando(false)
    }
  }

  async function descargarPdf() {
    setExportando(true)
    setError(null)
    try {
      await generarPdf(informe, datosMina)
    } catch {
      setError('No fue posible crear el PDF. Inténtalo de nuevo.')
    } finally {
      setExportando(false)
    }
  }

  function renderFiltros(idPrefix) {
    return (
      <div className="flex flex-col gap-4">
        <GrupoChips
          id={`${idPrefix}-rango`}
          titulo="Período"
          opciones={RANGOS_RAPIDOS}
          valorActivo={rangoRapido}
          onCambiar={setRangoRapido}
        />
        {rangoRapido === 'personalizado' && (
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs text-muted-foreground">Desde</span>
              <input
                type="date"
                value={desdeInput}
                onChange={(e) => setDesdeInput(e.target.value)}
                className="h-11 rounded-lg border border-border bg-surface px-2 text-sm text-foreground"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs text-muted-foreground">Hasta</span>
              <input
                type="date"
                value={hastaInput}
                onChange={(e) => setHastaInput(e.target.value)}
                className="h-11 rounded-lg border border-border bg-surface px-2 text-sm text-foreground"
              />
            </label>
          </div>
        )}
        <GrupoChips
          id={`${idPrefix}-nodo`}
          titulo="Nodo"
          opciones={opcionesNodo}
          valorActivo={nodoFiltro}
          onCambiar={setNodoFiltro}
        />
      </div>
    )
  }

  return (
    <div className="animate-enter flex flex-col gap-5">
      <ErrorCarga {...carga} hayDatos={Boolean(carga.datos)} onReintentar={carga.reintentar} />
      <p className="text-sm text-muted-foreground">{origenDatos === 'mock' ? 'Telemetría simulada y registros locales de este dispositivo.' : 'Telemetría del servicio conectado. La consulta de acciones operativas todavía no está disponible.'}</p>
      {!carga.datos && !carga.error && <p role="status" className="text-sm text-muted-foreground">Cargando inventario de nodos…</p>}
      {carga.datos && nodosGas.length === 0 && <p role="status" className="text-sm text-muted-foreground">No hay nodos de gases disponibles en el inventario consultado.</p>}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Reportes</h1>
          <p className="text-sm text-muted-foreground">Informe para fiscalización de la ANM.</p>
        </div>
        <button
          type="button"
          onClick={() => setFiltrosAbiertos(true)}
          className="tap-target relative rounded-full bg-surface-raised px-3 text-sm font-medium text-foreground transition-transform duration-120 ease-out active:scale-95 md:hidden"
        >
          Filtros
        </button>
      </div>

      <div className="hidden flex-wrap gap-6 rounded-xl border border-border bg-surface p-4 md:flex">
        {renderFiltros('desktop')}
      </div>

      <Drawer abierto={filtrosAbiertos} onCerrar={() => setFiltrosAbiertos(false)} titulo="Filtros de reporte">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-bold text-foreground">Filtros</p>
          <button
            type="button"
            onClick={() => setFiltrosAbiertos(false)}
            aria-label="Cerrar filtros"
            className="tap-target rounded-full bg-surface text-sm text-muted-foreground transition-transform duration-120 ease-out hover:text-foreground active:scale-95"
          >
            ✕
          </button>
        </div>
        {renderFiltros('mobile')}
      </Drawer>

      <button
        type="button"
        onClick={generarInforme}
        disabled={generando || !carga.datos || Boolean(carga.error) || nodosGas.length === 0}
        className="tap-target self-start rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform duration-120 ease-out active:scale-95 disabled:opacity-60"
      >
        {generando ? 'Generando…' : 'Generar informe'}
      </button>

      {error ? <p role="alert" className="rounded-xl border border-alarma/40 bg-alarma/10 p-3 text-sm text-alarma">{error}</p> : null}

      {informe && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="font-semibold text-foreground">
                {datosMina.nombre} · {datosMina.municipio}
              </p>
              <p className="text-sm text-muted-foreground">
                Período: {formatoFecha(informe.desde)} — {formatoFecha(informe.hasta)}
              </p>
            </div>
            <button
              type="button"
              onClick={descargarPdf}
              disabled={exportando}
              className="tap-target rounded-lg border border-primary px-4 text-sm font-semibold text-primary transition-transform duration-120 ease-out active:scale-95 disabled:cursor-wait disabled:opacity-60"
            >
              {exportando ? 'Creando PDF…' : 'Descargar PDF'}
            </button>
          </div>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Registro de mediciones por período
            </h2>
            {informe.resumen.length === 0 ? (
              <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
                Sin datos monitoreados en este período/filtro.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2">Nodo</th>
                      <th className="px-3 py-2">Gas</th>
                      <th className="px-3 py-2">Mín</th>
                      <th className="px-3 py-2">Prom</th>
                      <th className="px-3 py-2">Máx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {informe.resumen.map((r) => (
                      <tr key={`${r.node_id}-${r.gas}`} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-foreground">
                          {r.ubicacion} <span className="text-muted-foreground">· {r.node_id}</span>
                        </td>
                        <td className="px-3 py-2 text-foreground">{r.etiqueta}</td>
                        <td className="num-critico px-3 py-2">
                          {r.min.toFixed(2)} {r.unidad === 'pct' ? '%' : 'ppm'}
                        </td>
                        <td className="num-critico px-3 py-2">
                          {r.prom.toFixed(2)} {r.unidad === 'pct' ? '%' : 'ppm'}
                        </td>
                        <td className="num-critico px-3 py-2">
                          {r.max.toFixed(2)} {r.unidad === 'pct' ? '%' : 'ppm'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Eventos de excedencia
              </h2>
              {informe.eventos.length > 0 && (
                <span className="text-xs text-muted-foreground">{informe.eventos.length} en el período</span>
              )}
            </div>
            {informe.eventos.length === 0 ? (
              <div className="rounded-xl border border-normal/30 bg-normal/10 p-4 text-sm text-normal">
                Sin eventos de excedencia en el período — buena señal.
              </div>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto overflow-x-auto rounded-xl border border-alarma/30">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2">Nodo</th>
                      <th className="px-3 py-2">Gas</th>
                      <th className="px-3 py-2">Inicio</th>
                      <th className="px-3 py-2">Fin</th>
                      <th className="px-3 py-2">Pico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {informe.eventos.map((e, i) => (
                      <tr key={i} className="border-b border-border bg-alarma/10 last:border-0">
                        <td className="px-3 py-1.5 text-foreground">
                          {e.ubicacion} <span className="text-muted-foreground">· {e.node_id}</span>
                        </td>
                        <td className="px-3 py-1.5 text-foreground">{e.etiqueta}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">
                          {formatoFechaHora(e.inicio)}
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">
                          {formatoFechaHora(e.fin)}
                        </td>
                        <td className="num-critico px-3 py-1.5 text-alarma">
                          {e.pico.toFixed(2)} {e.unidad === 'pct' ? '%' : 'ppm'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Acciones tomadas
            </h2>
            {informe.acciones === null || informe.acciones.length === 0 ? (
              <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground">
                {informe.acciones === null ? 'La consulta de registros no está disponible en el servicio conectado. Este informe no incluye acciones operativas.' : 'Sin registros locales de variables operativas en este período.'}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {informe.acciones.map((a, i) => (
                  <li key={i} className="rounded-xl border border-border bg-surface p-3 text-sm">
                    <p className="text-foreground">
                      <strong>{a.fecha}</strong> · {a.turno} · Frente {a.frente} · {a.registrado_por}
                    </p>
                    <p className="text-muted-foreground">{a.observaciones || 'Sin observaciones.'}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
