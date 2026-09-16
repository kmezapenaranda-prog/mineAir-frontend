import { lecturaVigente } from '../lib/vigencia.js'
import { useCargaPeriodica } from '../lib/useCargaPeriodica.js'
import ErrorCarga from '../components/ErrorCarga.jsx'
import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getNodos, getTelemetria } from '../data/index.js'
import { UMBRALES_DEFAULT, clasificarLectura, NIVEL } from '../config/umbrales.js'
import NivelBadge from '../components/NivelBadge.jsx'
import BarraProximidad from '../components/nodo/BarraProximidad.jsx'
import GraficaTendencia from '../components/nodo/GraficaTendencia.jsx'
import EstadoDispositivo from '../components/nodo/EstadoDispositivo.jsx'
import ErrorBoundary from '../components/ErrorBoundary.jsx'

const GASES_TARJETA = ['o2', 'ch4', 'co2', 'co', 'h2s', 'so2', 'no2']

const GASES_GRAFICA = [
  { gas: 'ch4', dataKey: 'ch4' },
  { gas: 'o2', dataKey: 'o2' },
  { gas: 'co2', dataKey: 'co2', soloFijo: true },
  { gas: 'co', dataKey: 'co' },
  { gas: 'h2s', dataKey: 'h2s' },
]

const VENTANAS = [
  { horas: 1, etiqueta: '1 h' },
  { horas: 6, etiqueta: '6 h' },
  { horas: 24, etiqueta: '24 h' },
]

function horaLocal(ms) {
  return new Date(ms).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function DetalleNodo() {
  const { id } = useParams()
  const [ventanaHoras, setVentanaHoras] = useState(6)

  // Separado del fetch de la serie a propósito: el nodo (tarjetas de gas,
  // batería, badges) no depende de la ventana de tiempo elegida para las
  // gráficas. Antes ambos vivían en un solo `cargar()` atado a
  // [id, ventanaHoras] — useCargaPeriodica trata cualquier cambio de esa
  // función como una fuente nueva y vacía `datos`, así que tocar 1h/6h/24h
  // volaba toda la página de vuelta a "Cargando nodo…" en vez de solo
  // refrescar las gráficas.
  const cargarNodo = useCallback(async () => {
    const todos = await getNodos()
    return todos.find((n) => n.node_id === id) ?? null
  }, [id])
  const cargaNodo = useCargaPeriodica(cargarNodo)
  const nodo = cargaNodo.datos
  const actualizadoEn = cargaNodo.recibidoEn

  const cargarSerie = useCallback(async () => {
    const hasta = Date.now()
    const desde = hasta - ventanaHoras * 60 * 60 * 1000
    const puntos = await getTelemetria(id, desde, hasta)
    return puntos.map((p) => ({
      hora: new Date(p.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      ch4: p.gases.ch4_pct, o2: p.gases.o2_pct, co2: p.gases.co2_pct,
      co: p.gases.co_ppm, h2s: p.gases.h2s_ppm,
    }))
  }, [id, ventanaHoras])
  const cargaSerie = useCargaPeriodica(cargarSerie)

  // Retiene la última serie que sí cargó mientras llega la del rango nuevo,
  // para que cambiar de 1h a 24h atenúe las gráficas existentes en vez de
  // colapsarlas a una línea de "Cargando…" y volver a expandirlas — el
  // salto de layout era la otra mitad de lo que se sentía "raro". Se
  // descarta apenas cambia de nodo (`id`): mostrar la serie de un nodo
  // distinto, aunque sea atenuada, sería mostrar el dato equivocado.
  const [serieAnimada, setSerieAnimada] = useState(null)
  useEffect(() => {
    if (cargaSerie.datos) setSerieAnimada({ id, datos: cargaSerie.datos })
  }, [cargaSerie.datos, id])
  const serie = serieAnimada?.id === id ? serieAnimada.datos : null
  const actualizandoSerie = cargaSerie.cargando && serie != null

  if (nodo === null && cargaNodo.cargando) {
    return <p role="status" className="text-sm text-muted-foreground">Cargando nodo…</p>
  }

  if (nodo === null && cargaNodo.error) {
    return <ErrorCarga {...cargaNodo} onReintentar={cargaNodo.reintentar} />
  }

  if (nodo === null) {
    return (
      <div className="flex flex-col gap-3">
        <Link to="/" className="text-sm text-primary">
          ← Volver al panel
        </Link>
        <p className="text-sm text-muted-foreground">Nodo no encontrado.</p>
      </div>
    )
  }

  const { ambiente, estado, conteo } = nodo.ultima_lectura
  const vigente = lecturaVigente(nodo.ultima_lectura)
  const gases = vigente ? nodo.ultima_lectura.gases : {}
  const esGas = nodo.node_type === 'fijo' || nodo.node_type === 'casco'
  const esContador = nodo.node_type === 'contador'

  return (
    <div className="animate-enter flex flex-col gap-5">
      {!vigente && <p role="status" className="text-sm text-precaucion">Sin lectura vigente: gases sin monitoreo confirmado.</p>}
      <ErrorCarga {...cargaNodo} hayDatos onReintentar={cargaNodo.reintentar} />
      <div className="flex flex-col gap-1">
        <Link to="/" className="text-sm text-primary">
          ← Volver al panel
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">{nodo.ubicacion}</h1>
            <p className="text-xs text-muted-foreground">
              {nodo.node_id} · {nodo.node_type}
              {!estado.sensor_ok && <span className="ml-2 font-semibold text-alarma">Sensor en falla</span>}
            </p>
          </div>
          <EstadoDispositivo bateria_pct={estado.bateria_pct} rssi_dbm={estado.rssi_dbm} />
        </div>
        <p className="text-xs text-muted-foreground">Actualizado {actualizadoEn ? horaLocal(actualizadoEn) : '—'}</p>
      </div>

      {esGas && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {GASES_TARJETA.map((gas) => {
            const umbral = UMBRALES_DEFAULT[gas]
            const campo = umbral.unidad === 'pct' ? `${gas}_pct` : `${gas}_ppm`
            const valor = gases[campo]
            const sinEquipo = nodo.node_type === 'casco' && gas === 'co2'
            const nivel = clasificarLectura(gas, valor)

            return (
              <div key={gas} className="min-w-0 rounded-xl border border-border bg-surface p-3">
                <p className="text-xs text-muted-foreground">{umbral.etiqueta}</p>

                {sinEquipo ? (
                  <>
                    <p className="num-critico text-2xl text-muted-foreground">—</p>
                    <p className="mb-1.5 text-xs text-muted-foreground">Casco sin sensor MH-410D</p>
                    <NivelBadge nivel={NIVEL.NO_MONITOREADO} />
                  </>
                ) : (
                  <>
                    <p className="num-critico text-2xl">
                      {valor == null ? '—' : valor}
                      {valor != null && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          {umbral.unidad === 'pct' ? '%' : 'ppm'}
                        </span>
                      )}
                    </p>
                    <p className="mb-1.5 text-xs text-muted-foreground">
                      {umbral.monitoreado
                        ? `límite ${umbral.sentido === 'minimo' ? '≥' : '≤'} ${umbral.limite}`
                        : umbral.nota}
                    </p>
                    {umbral.monitoreado && (
                      <div className="mb-1.5">
                        <BarraProximidad gas={gas} valor={valor} />
                      </div>
                    )}
                    <NivelBadge nivel={nivel} />
                  </>
                )}
              </div>
            )
          })}
        </section>
      )}

      {esContador ? (
        <section className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs text-muted-foreground">Vagonetas — última hora</p>
          <p className="num-critico text-3xl text-foreground">{conteo?.vagonetas ?? 0}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Conteo real de producción del frente {nodo.frente} — no reporta gases ni ambiente. Ver el registro de
            producción por turno en el Panel de la mina y en Registro de variables operativas.
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xs text-muted-foreground">
            Temp {ambiente.temp_c}°C · Humedad {ambiente.humedad_pct}% · Presión {ambiente.presion_hpa} hPa
          </p>
        </section>
      )}

      {esGas && (
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Tendencias</h2>
              {actualizandoSerie && (
                <span role="status" className="text-xs text-muted-foreground">
                  Actualizando…
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {VENTANAS.map((v) => (
                <button
                  key={v.horas}
                  type="button"
                  onClick={() => setVentanaHoras(v.horas)}
                  aria-pressed={ventanaHoras === v.horas}
                  className={`tap-target rounded-full px-3 text-xs font-medium transition-[color,background-color,transform] duration-150 ease-out active:scale-95 ${
                    ventanaHoras === v.horas
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface-raised text-muted-foreground'
                  }`}
                >
                  {v.etiqueta}
                </button>
              ))}
            </div>
          </div>

          {cargaSerie.error && !serie && (
            <p role="alert" className="mb-2 text-sm text-alarma">No fue posible cargar las series de este rango.</p>
          )}

          {serie ? (
            <div
              aria-busy={actualizandoSerie}
              className={`grid grid-cols-1 gap-3 transition-opacity duration-200 ease-out md:grid-cols-2 ${actualizandoSerie ? 'opacity-50' : 'opacity-100'}`}
            >
              {GASES_GRAFICA.filter((g) => !g.soloFijo || nodo.node_type === 'fijo').map((g) => (
                <ErrorBoundary key={g.gas} etiqueta={`la gráfica de ${UMBRALES_DEFAULT[g.gas].etiqueta}`}>
                  <GraficaTendencia
                    datos={serie}
                    dataKey={g.dataKey}
                    etiqueta={UMBRALES_DEFAULT[g.gas].etiqueta}
                    umbral={UMBRALES_DEFAULT[g.gas]}
                  />
                </ErrorBoundary>
              ))}
            </div>
          ) : !cargaSerie.error ? (
            <p className="text-sm text-muted-foreground">Cargando series…</p>
          ) : null}
        </section>
      )}
    </div>
  )
}
