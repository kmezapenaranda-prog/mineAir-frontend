import { useCargaPeriodica } from '../lib/useCargaPeriodica.js'
import ErrorCarga from '../components/ErrorCarga.jsx'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getNodos, getPredicciones } from '../data/index.js'
import { UMBRALES_DEFAULT, NIVEL, SENTIDO } from '../config/umbrales.js'
import NivelBadge from '../components/NivelBadge.jsx'
import Drawer from '../components/Drawer.jsx'

const NOMBRES_FACTOR = {
  posicion_circuito_ventilacion: 'Posición en el circuito de ventilación',
  voladura_reciente: 'Tiempo desde la última voladura',
  produccion_turno: 'Producción del turno',
  presion_barometrica: 'Presión barométrica',
  indice_gasificacion: 'Índice de gasificación',
  produccion_ton_h: 'Producción horaria',
  produccion_media_6h: 'Producción media de 6 h',
  presion_hpa: 'Presión barométrica',
  presion_delta_6h: 'Cambio de presión en 6 h',
  presion_delta_12h: 'Cambio de presión en 12 h',
  ventilacion_pct: 'Ventilación disponible',
  pulso_voladura: 'Efecto de voladura',
  hora_sin: 'Ciclo horario (seno)',
  hora_cos: 'Ciclo horario (coseno)',
}

function nombreFactor(nombre) {
  const gasLag = /^(ch4_pct|co_ppm|h2s_ppm|o2_pct|co2_pct)_lag_(\d+)h$/.exec(nombre)
  if (gasLag) {
    const etiquetas = { ch4_pct: 'CH₄', co_ppm: 'CO', h2s_ppm: 'H₂S', o2_pct: 'O₂', co2_pct: 'CO₂' }
    return `${etiquetas[gasLag[1]]} hace ${gasLag[2]} h`
  }
  const produccionLag = /^produccion_ton_h_lag_(\d+)h$/.exec(nombre)
  if (produccionLag) return `Producción hace ${produccionLag[1]} h`
  return NOMBRES_FACTOR[nombre] ?? nombre.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase())
}

// Nunca "el CH4 va a superar": la predicción es una probabilidad, no un hecho.
function fraseProbabilidad(p) {
  if (p.gas === 'riesgo_conjunto' || p.objetivo === 'ch4_6h_o_co_1h') return 'riesgo conjunto: CH₄ en 6 h o CO en 1 h'
  const umbral = UMBRALES_DEFAULT[p.gas]
  const etiqueta = umbral?.etiqueta ?? p.gas.toUpperCase()
  const verbo = umbral?.sentido === SENTIDO.MINIMO ? 'caer por debajo de' : 'superar'
  const sufijo = p.unidad === 'pct' ? '%' : ' ppm'
  return `probabilidad de ${verbo} ${p.umbral_normativo}${sufijo} ${etiqueta} en ${p.horizonte_h} h`
}

const NIVEL_CHIPS = [
  { valor: null, etiqueta: 'Abiertas' },
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: NIVEL.ALARMA, etiqueta: 'Alarma' },
  { valor: NIVEL.PRECAUCION, etiqueta: 'Precaución' },
  { valor: NIVEL.NORMAL, etiqueta: 'Normal' },
]
function coincideNivel(p, filtro) {
  if (filtro === null) return p.nivel !== NIVEL.NORMAL
  if (filtro === 'todas') return true
  return p.nivel === filtro
}

function Chip({ activo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`tap-target shrink-0 rounded-full px-3 text-xs font-medium transition-[color,background-color,transform] duration-150 ease-out active:scale-95 ${
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

function BarraFactor({ factor }) {
  return (
    <div className="text-xs">
      <div className="mb-0.5 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-muted-foreground">{nombreFactor(factor.nombre)}</span>
        <span className="shrink-0 text-muted-foreground">{factor.valor}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(factor.peso * 100, 100)}%` }} />
      </div>
    </div>
  )
}

function TarjetaPrediccion({ p, confianzaReducida }) {
  const pct = Math.round(p.probabilidad * 100)
  const colorPct =
    p.nivel === NIVEL.ALARMA ? 'text-alarma' : p.nivel === NIVEL.PRECAUCION ? 'text-precaucion' : 'text-foreground'

  return (
    <li className="panel panel-interactive min-w-0 overflow-hidden p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-3">
          <span className={`num-critico shrink-0 text-4xl ${colorPct}`}>{pct}%</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{fraseProbabilidad(p)}</p>
            <p className="text-xs text-muted-foreground">
              {p.ubicacion} · {p.node_id}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <NivelBadge nivel={p.nivel} />
          {confianzaReducida && (
            <span title={`Nodos faltantes: ${p.nodos_faltantes?.join(', ') || 'no informados'}`} className="rounded-full bg-precaucion/10 px-2 py-0.5 text-xs font-medium text-precaucion">
              Confianza reducida
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-border/60 pt-4"><p className="eyebrow mb-3">Por qué puede ocurrir</p><div className="flex flex-col gap-3">
        {[...p.factores].sort((a, b) => b.peso - a.peso).map((f) => (
          <BarraFactor key={f.nombre} factor={f} />
        ))}
      </div></div>

      <div className="mt-4 rounded-xl border border-primary/20 bg-primary/8 p-4"><p className="eyebrow text-primary">Acción recomendada</p><p className="mt-2 text-sm font-medium leading-6 break-words text-foreground">{p.recomendacion}</p></div>
    </li>
  )
}

function EstadoVacioActivas() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-normal/30 bg-normal/10 p-8 text-center">
      <NivelBadge nivel={NIVEL.NORMAL} />
      <p className="text-lg font-semibold text-foreground">Sin predicciones activas</p>
      <p className="max-w-md text-sm text-muted-foreground">
        Todos los frentes operan dentro de los umbrales normativos. La ausencia de alertas también es información.
      </p>
    </div>
  )
}

function EstadoVacioFiltro({ onLimpiar }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-8 text-center">
      <p className="font-semibold text-foreground">Ninguna predicción coincide con estos filtros</p>
      <button
        type="button"
        onClick={onLimpiar}
        className="tap-target text-sm font-medium text-primary transition-transform duration-120 ease-out active:scale-95"
      >
        Limpiar filtros
      </button>
    </div>
  )
}

async function cargarPredicciones() {
  const [predicciones, nodos] = await Promise.all([getPredicciones(), getNodos()])
  return { predicciones, nodos }
}

export default function Predicciones() {
  const [searchParams, setSearchParams] = useSearchParams()
  const carga = useCargaPeriodica(cargarPredicciones)
  const predicciones = carga.datos?.predicciones
  const nodos = carga.datos?.nodos
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)

  const nodoFiltro = searchParams.get('nodo')
  const gasFiltro = searchParams.get('gas')
  const horizonteFiltro = searchParams.get('horizonte')
  const nivelParam = searchParams.get('nivel')
  const nivelFiltro = nivelParam === null ? null : nivelParam === 'todas' ? 'todas' : nivelParam

  function actualizarFiltro(clave, valor) {
    const siguiente = new URLSearchParams(searchParams)
    if (valor === null || valor === undefined) siguiente.delete(clave)
    else siguiente.set(clave, valor)
    setSearchParams(siguiente, { replace: true })
  }

  function limpiarFiltros() {
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const nodosPorId = useMemo(() => Object.fromEntries((nodos ?? []).map((n) => [n.node_id, n])), [nodos])

  const opcionesNodo = useMemo(() => {
    if (!predicciones) return []
    const vistos = new Map()
    for (const p of predicciones) if (!vistos.has(p.node_id)) vistos.set(p.node_id, p.ubicacion)
    return [
      { valor: null, etiqueta: 'Todos' },
      ...Array.from(vistos, ([valor, ubicacion]) => ({ valor, etiqueta: ubicacion })),
    ]
  }, [predicciones])

  const opcionesGas = useMemo(() => {
    if (!predicciones) return []
    const vistos = new Set(predicciones.map((p) => p.gas))
    return [
      { valor: null, etiqueta: 'Todos' },
      ...Array.from(vistos, (gas) => ({ valor: gas, etiqueta: UMBRALES_DEFAULT[gas]?.etiqueta ?? gas.toUpperCase() })),
    ]
  }, [predicciones])

  const opcionesHorizonte = useMemo(() => {
    if (!predicciones) return []
    const disponibles = [...new Set(predicciones.map((p) => p.horizonte_h))].sort((a, b) => a - b)
    return [
      { valor: null, etiqueta: 'Todos' },
      ...disponibles.map((h) => ({ valor: String(h), etiqueta: `${h} h` })),
    ]
  }, [predicciones])

  if (!predicciones || !nodos) {
    return carga.error ? <ErrorCarga {...carga} onReintentar={carga.reintentar} /> : <p role="status" className="text-sm text-muted-foreground">Cargando predicciones…</p>
  }

  const hayActivasEnTotal = predicciones.some((p) => p.nivel !== NIVEL.NORMAL)

  const filtradas = predicciones
    .filter((p) => (nodoFiltro ? p.node_id === nodoFiltro : true))
    .filter((p) => (gasFiltro ? p.gas === gasFiltro : true))
    .filter((p) => (horizonteFiltro ? String(p.horizonte_h) === horizonteFiltro : true))
    .filter((p) => coincideNivel(p, nivelFiltro))
    .sort((a, b) => b.probabilidad - a.probabilidad)

  const sinFiltrosPersonalizados = !nodoFiltro && !gasFiltro && !horizonteFiltro && nivelFiltro === null
  const hayFiltrosActivos = Boolean(nodoFiltro) || Boolean(gasFiltro) || Boolean(horizonteFiltro) || nivelFiltro !== null

  // Función, no un nodo JSX fijo: el mismo grupo de filtros se monta dos
  // veces (inline en desktop y dentro del Drawer en móvil) y cada
  // <GrupoChips> necesita un id único por instancia para su aria-labelledby
  // — reusar el mismo id en las dos duplicaría ids en el DOM.
  function renderFiltros(idPrefix) {
    return (
      <div className="flex flex-col gap-4">
        <GrupoChips
          id={`${idPrefix}-nodo`}
          titulo="Nodo"
          opciones={opcionesNodo}
          valorActivo={nodoFiltro}
          onCambiar={(v) => actualizarFiltro('nodo', v)}
        />
        <GrupoChips
          id={`${idPrefix}-gas`}
          titulo="Gas"
          opciones={opcionesGas}
          valorActivo={gasFiltro}
          onCambiar={(v) => actualizarFiltro('gas', v)}
        />
        <GrupoChips
          id={`${idPrefix}-nivel`}
          titulo="Nivel"
          opciones={NIVEL_CHIPS}
          valorActivo={nivelFiltro}
          onCambiar={(v) => actualizarFiltro('nivel', v)}
        />
        <GrupoChips id={`${idPrefix}-horizonte`} titulo="Horizonte" opciones={opcionesHorizonte} valorActivo={horizonteFiltro} onCambiar={(v) => actualizarFiltro('horizonte', v)} />
      </div>
    )
  }

  return (
    <div className="animate-enter flex flex-col gap-5">
      <ErrorCarga {...carga} hayDatos onReintentar={carga.reintentar} />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl">Inteligencia predictiva</h1>
        <button
          type="button"
          onClick={() => setFiltrosAbiertos(true)}
          className="tap-target relative rounded-full bg-surface-raised px-3 text-sm font-medium text-foreground transition-transform duration-120 ease-out active:scale-95 md:hidden"
        >
          Filtros
          {hayFiltrosActivos && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />}
        </button>
      </div>

      <div className="hidden flex-wrap gap-6 rounded-xl border border-border bg-surface p-4 md:flex">
        {renderFiltros('desktop')}
      </div>

      <Drawer abierto={filtrosAbiertos} onCerrar={() => setFiltrosAbiertos(false)} titulo="Filtros de predicciones">
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

      {filtradas.length === 0 ? (
        sinFiltrosPersonalizados && !hayActivasEnTotal ? (
          <EstadoVacioActivas />
        ) : (
          <EstadoVacioFiltro onLimpiar={limpiarFiltros} />
        )
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtradas.map((p) => (
            <TarjetaPrediccion
              key={`${p.node_id}-${p.gas}-${p.horizonte_h}`}
              p={p}
              confianzaReducida={p.confianza === 'reducida' || Boolean(nodosPorId[p.node_id] && !nodosPorId[p.node_id].ultima_lectura.estado.sensor_ok)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
