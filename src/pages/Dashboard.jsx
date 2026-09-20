import { lecturaVigente } from '../lib/vigencia.js'
import { useCargaPeriodica } from '../lib/useCargaPeriodica.js'
import ErrorCarga from '../components/ErrorCarga.jsx'
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { getNodos, getPredicciones, getTelemetria } from '../data/index.js'
import { UMBRALES_DEFAULT, NIVEL, clasificarLectura, proximidadAlarma } from '../config/umbrales.js'
import { nivelDeNodo, peorNivel } from '../lib/nivelNodo.js'
import { distribucionEstadoNodos, picosPorTurno } from '../lib/analitica.js'
import NivelBadge from '../components/NivelBadge.jsx'
import DiferencialCh4 from '../components/dashboard/DiferencialCh4.jsx'
import DonutNiveles from '../components/dashboard/DonutNiveles.jsx'
import PicosPorTurno from '../components/dashboard/PicosPorTurno.jsx'
import AnimatedNumber from '../components/dashboard/AnimatedNumber.jsx'
import { IconoAtmosfera, IconoRiesgo, IconoRed, IconoAlarma } from '../components/layout/iconos.jsx'

const GASES = [
  ['ch4', 'ch4_pct'], ['co', 'co_ppm'], ['h2s', 'h2s_ppm'], ['o2', 'o2_pct'], ['co2', 'co2_pct'],
]

const TONOS_KPI = {
  [NIVEL.NORMAL]: { badge: 'bg-normal/15 text-normal', valor: 'text-normal' },
  [NIVEL.PRECAUCION]: { badge: 'bg-precaucion/15 text-precaucion', valor: 'text-precaucion' },
  [NIVEL.ALARMA]: { badge: 'bg-alarma/15 text-alarma', valor: 'text-alarma' },
  [NIVEL.NO_MONITOREADO]: { badge: 'bg-sin-monitorear/20 text-muted-foreground', valor: 'text-foreground' },
  neutro: { badge: 'bg-primary/15 text-primary', valor: 'text-foreground' },
}

function formatoValor(valor, unidad) {
  if (valor == null) return '—'
  return `${Number(valor).toFixed(unidad === 'ppm' ? 1 : 2)} ${unidad === 'pct' ? '%' : 'ppm'}`
}

function Kpi({ etiqueta, valor, detalle, nivel, icono: Icono, destacado = false, retraso = 0 }) {
  const tono = TONOS_KPI[nivel] ?? TONOS_KPI.neutro
  return <article
    className={`panel panel-interactive min-w-0 animate-enter p-4 ${destacado ? 'relative overflow-hidden' : ''}`}
    style={{ animationDelay: `${retraso}ms` }}
  >
    {destacado ? <div className="brand-gradient absolute inset-x-0 top-0 h-1" /> : null}
    <div className="flex items-center justify-between">
      <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tono.badge}`}>
        <Icono width={18} height={18} />
      </span>
      {nivel === NIVEL.ALARMA ? <span className="h-2 w-2 animate-pulse rounded-full bg-alarma" aria-hidden="true" /> : null}
    </div>
    <p className={`num-critico mt-3 truncate text-3xl ${tono.valor}`}>{valor}</p>
    <p className="eyebrow mt-2">{etiqueta}</p>
    <p className="mt-1 text-xs leading-5 text-muted-foreground">{detalle}</p>
  </article>
}

function PrediccionPrioritaria({ prediccion }) {
  if (!prediccion) return <section className="panel p-5"><p className="text-muted-foreground">Sin predicciones disponibles.</p></section>
  const conjunta = prediccion.gas === 'riesgo_conjunto' || prediccion.objetivo === 'ch4_6h_o_co_1h'
  const gas = UMBRALES_DEFAULT[prediccion.gas]
  return <section className="panel relative overflow-hidden p-5">
    <div className="brand-gradient absolute inset-x-0 top-0 h-1" />
    <p className="eyebrow">Predicción prioritaria</p>
    <div className="mt-4 flex items-end justify-between gap-3">
      <div>
        <strong className="num-critico text-6xl tracking-tight">
          <AnimatedNumber value={Math.round(prediccion.probabilidad * 100)} suffix="%" />
        </strong>
        <p className="mt-1 text-sm text-muted-foreground">Probabilidad de excedencia</p>
      </div>
      <NivelBadge nivel={prediccion.nivel} />
    </div>
    <div className="mt-5 border-y border-border/70 py-4">
      <p className="text-lg font-bold">{conjunta ? 'Riesgo conjunto' : gas?.etiqueta} <span className="font-normal text-muted-foreground">· {prediccion.ubicacion}</span></p>
      <p className="mt-1 text-sm text-muted-foreground">{conjunta ? 'CH₄ en 6 h o CO en 1 h' : <>Horizonte: <b className="text-foreground">{prediccion.horizonte_h} h</b></>} · posibilidad, no certeza</p>
      {prediccion.confianza === 'reducida' ? <p title={`Nodos faltantes: ${prediccion.nodos_faltantes?.join(', ') || 'no informados'}`} className="mt-3 inline-flex rounded-full bg-precaucion/10 px-2.5 py-1 text-xs font-semibold text-precaucion">Confianza reducida</p> : null}
    </div>
    <div className="mt-4"><p className="eyebrow">Acción recomendada</p><p className="mt-2 text-sm leading-6 text-foreground">{prediccion.recomendacion}</p></div>
    <Link to={`/predicciones?nodo=${prediccion.node_id}`} className="brand-gradient mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-bold text-slate-950 transition hover:brightness-110 active:scale-[.98]">Ver análisis predictivo</Link>
  </section>
}

function EstadoGases({ lectura, nodo }) {
  const presion = lecturaVigente(lectura) ? lectura.ambiente?.presion_hpa : null
  return <section className="panel p-4 md:p-5">
    <div className="mb-4"><p className="eyebrow">Estado atmosférico</p><h2 className="mt-1 text-lg font-bold">Lecturas en retorno · {nodo?.ubicacion ?? 'sin dispositivo activo'}</h2></div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {GASES.map(([gas, campo], i) => {
        const umbral = UMBRALES_DEFAULT[gas]
        const valor = lecturaVigente(lectura) ? lectura.gases[campo] : null
        const nivel = lecturaVigente(lectura) ? clasificarLectura(gas, valor) : NIVEL.NO_MONITOREADO
        const proximidad = proximidadAlarma(gas, valor)
        return <article
          key={gas}
          className="animate-enter rounded-xl border border-border/60 bg-background/35 p-3"
          style={{ animationDelay: `${i * 45}ms` }}
        >
          <div className="flex items-center justify-between gap-1">
            <b>{umbral.etiqueta}</b>
            <span className={`h-2 w-2 rounded-full ${nivel === NIVEL.ALARMA ? 'animate-pulse bg-alarma' : nivel === NIVEL.PRECAUCION ? 'bg-precaucion' : nivel === NIVEL.NORMAL ? 'bg-normal' : 'bg-sin-monitorear'}`} />
          </div>
          <p className="num-critico mt-3 text-lg">{formatoValor(valor, umbral.unidad)}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-raised">
            <div
              className={`h-full rounded-full transition-[width] duration-700 ease-out ${nivel === NIVEL.ALARMA ? 'bg-alarma' : nivel === NIVEL.PRECAUCION ? 'bg-precaucion' : 'bg-normal'}`}
              style={{ width: `${Math.min((proximidad ?? 0) * 100, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">{valor == null ? 'No disponible' : nivel === NIVEL.NO_MONITOREADO ? 'No monitoreado' : nivel}</p>
          {gas === 'co2' ? <p title="Sensor SCD41: útil para el modelo, no equivale a una alarma minera certificada." className="mt-1 text-[9px] leading-3 text-muted-foreground">Dato predictivo · no certificado</p> : null}
        </article>
      })}
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      <article className="rounded-xl border border-border/60 bg-background/35 p-3">
        <b>Presión barométrica</b>
        <p className="num-critico mt-3 text-lg">{presion == null ? '—' : `${Number(presion).toFixed(1)} hPa`}</p>
        <p className="mt-2 text-[10px] text-muted-foreground">Lectura real del sensor BME280</p>
      </article>
    </div>
  </section>
}

export default function Dashboard() {
  const [rango, setRango] = useState(6)
  const cargaNodos = useCargaPeriodica(getNodos)
  const cargaPredicciones = useCargaPeriodica(getPredicciones)
  const cargarSeries = useCallback(async () => {
    const hasta = Date.now(), desde = hasta - rango * 3600000
    const nodosActivos = (await getNodos()).filter((n) => ['fijo', 'casco'].includes(n.node_type))
    const retornoNodo = nodosActivos.find((n) => n.esRetorno) ?? nodosActivos[0]
    const entradaNodo = nodosActivos.find((n) => n.node_id !== retornoNodo?.node_id && !n.esRetorno) ?? nodosActivos.find((n) => n.node_id !== retornoNodo?.node_id)
    const [retorno, entrada] = await Promise.all([
      retornoNodo ? getTelemetria(retornoNodo.node_id, desde, hasta) : Promise.resolve([]),
      entradaNodo ? getTelemetria(entradaNodo.node_id, desde, hasta) : Promise.resolve([]),
    ])
    return { retorno, entrada, retornoNodo, entradaNodo }
  }, [rango])
  const cargaSeries = useCargaPeriodica(cargarSeries)
  const cargarPicos = useCallback(async () => picosPorTurno(await getNodos()), [])
  const cargaPicos = useCargaPeriodica(cargarPicos, 5 * 60000)
  const nodos = cargaNodos.datos
  const predicciones = cargaPredicciones.datos ?? []
  const series = cargaSeries.datos ?? { retorno: [], entrada: [], retornoNodo: null, entradaNodo: null }
  const picos = cargaPicos.datos
  const error = cargaNodos.error
  if (!nodos) return cargaNodos.error
    ? <ErrorCarga {...cargaNodos} onReintentar={cargaNodos.reintentar} />
    : <p role="status" className="text-sm text-muted-foreground">Cargando telemetría…</p>
  const gas = nodos.filter((n) => ['fijo', 'casco'].includes(n.node_type))
  const niveles = gas.map((nodo) => nivelDeNodo(nodo))
  const global = peorNivel(niveles)
  const prioridad = predicciones.reduce((max, p) => !max || p.probabilidad > max.probabilidad ? p : max, null)
  const sinComunicacion = nodos.filter((n) => !lecturaVigente(n.ultima_lectura))
  const alarmasLocales = nodos.filter((n) => n.ultima_lectura?.alarma_local?.activa).length
  const nodoRetorno = gas.find((n) => n.esRetorno) ?? gas[0]
  const lecturaRetorno = nodoRetorno?.ultima_lectura
  const conectados = nodos.length - sinComunicacion.length

  return <div className="flex flex-col gap-4 animate-enter">
    <header className="flex flex-wrap items-end justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">MineAIr</h1>
      <p className="text-xs text-muted-foreground">{error ? 'Mostrando último estado disponible' : 'Actualización automática · 20 s'}</p>
    </header>
    <ErrorCarga {...cargaNodos} hayDatos onReintentar={cargaNodos.reintentar} />
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi
        etiqueta="Estado atmosférico"
        valor={global === NIVEL.ALARMA ? 'Alarma' : global === NIVEL.PRECAUCION ? 'Precaución' : global === NIVEL.NO_MONITOREADO ? 'Sin monitoreo' : 'Estable'}
        detalle={niveles.includes(NIVEL.NO_MONITOREADO) ? "Cobertura incompleta: hay nodos sin monitoreo vigente" : "Resumen consolidado de gases"}
        nivel={global}
        icono={IconoAtmosfera}
        retraso={0}
      />
      <Kpi
        etiqueta="Riesgo predictivo máximo"
        valor={prioridad ? <AnimatedNumber value={Math.round(prioridad.probabilidad * 100)} suffix="%" /> : "Sin datos"}
        detalle={`${UMBRALES_DEFAULT[prioridad?.gas]?.etiqueta ?? '—'} · ${prioridad?.ubicacion ?? 'Sin datos'} · ${prioridad?.horizonte_h ?? '—'} h`}
        nivel={prioridad?.nivel}
        icono={IconoRiesgo}
        destacado
        retraso={60}
      />
      <Kpi
        etiqueta="Nodos"
        valor={<><AnimatedNumber value={conectados} /> / {nodos.length}</>}
        detalle={sinComunicacion.length ? (sinComunicacion.length + ' sin comunicación') : 'Solo dispositivos activos'}
        nivel={sinComunicacion.length ? NIVEL.PRECAUCION : NIVEL.NORMAL}
        icono={IconoRed}
        retraso={120}
      />
      <Kpi
        etiqueta="Alarmas locales"
        valor={<AnimatedNumber value={alarmasLocales} />}
        detalle="Reportadas por el ESP32 · solo visualización"
        nivel={alarmasLocales ? NIVEL.ALARMA : NIVEL.NORMAL}
        icono={IconoAlarma}
        retraso={180}
      />
    </section>
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.7fr)]">
      <div className="min-w-0 space-y-3">
        <ErrorCarga {...cargaSeries} hayDatos={Boolean(cargaSeries.datos)} onReintentar={cargaSeries.reintentar} />
        <DiferencialCh4 {...series} rango={rango} onRango={setRango} />
        <p className="text-xs text-muted-foreground">Serie actualizada: {cargaSeries.recibidoEn ? new Date(cargaSeries.recibidoEn).toLocaleTimeString('es-CO') : 'pendiente'}</p>
      </div>
      <div className="min-w-0 space-y-3">
        <ErrorCarga {...cargaPredicciones} hayDatos={Boolean(cargaPredicciones.datos)} onReintentar={cargaPredicciones.reintentar} />
        <PrediccionPrioritaria prediccion={prioridad} />
      </div>
    </div>
    <section className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
      <DonutNiveles titulo="Distribución de nodos por estado" datos={distribucionEstadoNodos(nodos)} />
      <div className="min-w-0 space-y-3">
        <ErrorCarga {...cargaPicos} hayDatos={Boolean(picos)} onReintentar={cargaPicos.reintentar} />
        {picos ? <PicosPorTurno datos={picos} /> : !cargaPicos.error ? <p role="status">Cargando picos por turno…</p> : null}
        <p className="text-xs text-muted-foreground">Picos actualizados: {cargaPicos.recibidoEn ? new Date(cargaPicos.recibidoEn).toLocaleTimeString('es-CO') : 'pendiente'}</p>
      </div>
    </section>
    <EstadoGases lectura={lecturaRetorno} nodo={nodoRetorno} />
  </div>
}
