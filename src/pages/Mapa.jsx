import { useEffect, useState } from 'react'
import { getNodos, getRepetidores, origenDatos } from '../data/index.js'
import { useCargaPeriodica } from '../lib/useCargaPeriodica.js'
import ErrorCarga from '../components/ErrorCarga.jsx'
import { nivelDeNodo } from '../lib/nivelNodo.js'
import { NIVEL } from '../config/umbrales.js'
import PlanoMina from '../components/mapa/PlanoMina.jsx'
import PanelNodo from '../components/mapa/PanelNodo.jsx'
import { getMapaActivo, posicionarNodo, posicionarRepetidor, sincronizarMapaActivo } from '../config/mapaStore.js'
import { useSearchParams } from 'react-router-dom'
import { CAPAS_MAPA } from '../config/capasMapa.js'

const LEYENDA_NIVELES = [
  { nivel: NIVEL.NORMAL, etiqueta: 'Normal', color: 'var(--color-normal)' },
  { nivel: NIVEL.PRECAUCION, etiqueta: 'Precaución', color: 'var(--color-precaucion)' },
  { nivel: NIVEL.ALARMA, etiqueta: 'Alarma', color: 'var(--color-alarma)' },
  { nivel: NIVEL.NO_MONITOREADO, etiqueta: 'Sin datos / falla', color: 'var(--color-sin-monitorear)' },
]

function horaLocal(ms) {
  return new Date(ms).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

async function cargarMapa() {
  const [nodos, repetidores] = await Promise.all([getNodos(), getRepetidores()])
  return { nodos, repetidores }
}

export default function Mapa() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [mapa, setMapa] = useState(getMapaActivo)
  const [aColocar, setAColocar] = useState(null) // { tipo: 'nodo' | 'repetidor', id }
  const [coordenadas, setCoordenadas] = useState({ x: '50', y: '50' })
  const [mensajePosicion, setMensajePosicion] = useState('')
  const carga = useCargaPeriodica(cargarMapa)
  const nodos = carga.datos?.nodos
  const repetidores = carga.datos?.repetidores ?? []
  const actualizadoEn = carga.recibidoEn
  const [seleccionado, setSeleccionado] = useState(null)
  const [capasVisibles, setCapasVisibles] = useState(() => CAPAS_MAPA.map((capa) => capa.id))
  const [etiquetasVisibles, setEtiquetasVisibles] = useState(false)

  useEffect(() => {
    let activo = true
    void sincronizarMapaActivo().then((remoto) => {
      if (activo && remoto) setMapa(remoto)
    })
    return () => { activo = false }
  }, [])

  function colocar(posicion) {
    if (!aColocar) return
    try {
      const actualizado = aColocar.tipo === 'repetidor' ? posicionarRepetidor(aColocar.id, posicion) : posicionarNodo(aColocar.id, posicion)
      setMapa(actualizado)
      setMensajePosicion(`${aColocar.id} colocado en X ${posicion.x}, Y ${posicion.y}.`)
      setAColocar(null)
    } catch {
      setMensajePosicion('No se pudo guardar la posición. Comprueba el almacenamiento del dispositivo y vuelve a intentar.')
    }
  }

  if (!nodos) {
    return carga.error ? <ErrorCarga {...carga} onReintentar={carga.reintentar} /> : <p role="status" className="text-sm text-muted-foreground">Cargando plano de la mina…</p>
  }

  const nodosConNivel = nodos.map((n) => ({
    ...n,
    ...(mapa.nodos[n.node_id] ?? {}),
    ubicado: Boolean(mapa.nodos[n.node_id]),
    nivel: nivelDeNodo(n),
    sensor_ok: n.ultima_lectura.estado.sensor_ok,
  }))
  const repetidoresConPosicion = repetidores.map((r) => ({
    ...r,
    ...(mapa.repetidores?.[r.repetidor_id] ?? {}),
    ubicado: Boolean(mapa.repetidores?.[r.repetidor_id]),
  }))
  const sinUbicar = [
    ...nodosConNivel.filter((n) => !n.ubicado).map((n) => ({ tipo: 'nodo', id: n.node_id, etiqueta: `${n.node_id} · ${n.ubicacion}` })),
    ...repetidoresConPosicion.filter((r) => !r.ubicado).map((r) => ({ tipo: 'repetidor', id: r.repetidor_id, etiqueta: `${r.repetidor_id} · ${r.ubicacion}` })),
  ]

  const entidadSeleccionada =
    seleccionado?.tipo === 'nodo'
      ? nodosConNivel.find((n) => n.node_id === seleccionado.id)
      : seleccionado?.tipo === 'repetidor'
        ? repetidoresConPosicion.find((r) => r.repetidor_id === seleccionado.id)
        : null

  return (
    <div className="animate-enter flex flex-col gap-3">
      <ErrorCarga {...carga} hayDatos onReintentar={carga.reintentar} />
      <p className="text-sm text-muted-foreground">{origenDatos === 'mock' ? 'Nodos y repetidores simulados.' : 'Datos del servicio. Estado de repetidores no disponible; no se muestran repetidores simulados.'}</p>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0"><h1 className="text-xl font-bold text-foreground">Mapa de la mina</h1><p className="mt-1 break-words text-sm leading-5 text-muted-foreground">{mapa.nombre} · {mapa.origen.formato.toUpperCase()}</p></div>
        <p className="shrink-0 text-xs leading-5 text-muted-foreground">Última consulta correcta {horaLocal(actualizadoEn)}</p>
      </div>

      {searchParams.get('colocar') === '1' ? (
        <section className="panel flex flex-wrap items-center gap-3 p-3">
          <div className="min-w-52 flex-1">
            <p className="text-sm font-semibold">Colocar nodos y repetidores sobre el plano</p>
            <p className="text-xs text-muted-foreground">Selecciona una entidad y toca el plano o ingresa sus coordenadas de 0 a 100. X aumenta hacia la derecha; Y, hacia abajo.</p>
          </div>
          <select
            aria-label="Entidad que se colocará en el plano"
            value={aColocar ? `${aColocar.tipo}:${aColocar.id}` : ''}
            onChange={(e) => { const v = e.target.value; setAColocar(v ? { tipo: v.split(':')[0], id: v.slice(v.indexOf(':') + 1) } : null) }}
            className="h-11 min-w-0 max-w-full rounded-xl border border-border bg-background px-3 text-sm"
          >
            <option value="">Seleccionar</option>
            <optgroup label="Nodos">
              {nodosConNivel.map((n) => <option key={n.node_id} value={`nodo:${n.node_id}`}>{n.node_id} · {n.ubicacion}{n.ubicado ? '' : ' · sin ubicar'}</option>)}
            </optgroup>
            <optgroup label="Repetidores">
              {repetidoresConPosicion.map((r) => <option key={r.repetidor_id} value={`repetidor:${r.repetidor_id}`}>{r.repetidor_id} · {r.ubicacion}{r.ubicado ? '' : ' · sin ubicar'}</option>)}
            </optgroup>
          </select>
          <form className="flex w-full flex-wrap items-end gap-3" onSubmit={(e) => {
            e.preventDefault()
            colocar({ x: Number(coordenadas.x), y: Number(coordenadas.y) })
          }}>
            {['x', 'y'].map((eje) => <label key={eje} className="flex flex-col gap-1 text-sm">
              Coordenada {eje.toUpperCase()}
              <input type="number" required min="0" max="100" step="0.01" value={coordenadas[eje]} onChange={(e) => setCoordenadas((actual) => ({ ...actual, [eje]: e.target.value }))} className="h-11 w-24 rounded-lg border border-border bg-background px-3" />
            </label>)}
            <button type="submit" disabled={!aColocar} className="tap-target rounded-lg bg-primary px-4 text-sm text-primary-foreground disabled:opacity-50">Colocar en coordenadas</button>
          </form>
          <button onClick={() => { setAColocar(null); const p = new URLSearchParams(searchParams); p.delete('colocar'); setSearchParams(p, { replace: true }) }} className="tap-target rounded-xl border border-border px-4 text-sm">Terminar</button>
        </section>
      ) : sinUbicar.length > 0 ? (
        <section className="panel flex flex-wrap items-center justify-between gap-3 border-precaucion/40 bg-precaucion/8 p-3">
          <p className="text-sm text-foreground">
            <b>{sinUbicar.length}</b> {sinUbicar.length === 1 ? 'elemento no tiene' : 'elementos no tienen'} posición en este plano — no {sinUbicar.length === 1 ? 'aparece' : 'aparecen'} sobre el mapa.
          </p>
          <button
            onClick={() => { setAColocar({ tipo: sinUbicar[0].tipo, id: sinUbicar[0].id }); const p = new URLSearchParams(searchParams); p.set('colocar', '1'); setSearchParams(p, { replace: true }) }}
            className="tap-target shrink-0 rounded-xl bg-precaucion px-4 text-sm font-semibold text-precaucion-foreground"
          >
            Ubicar ahora
          </button>
        </section>
      ) : null}
      <p role="status" className="text-sm text-muted-foreground">{mensajePosicion}</p>

      <div className="flex flex-wrap gap-4">
        <div>
          <p className="eyebrow mb-1.5">Capas</p>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Capas visibles del mapa">
            {CAPAS_MAPA.map((capa) => <button key={capa.id} type="button" aria-pressed={capasVisibles.includes(capa.id)} onClick={() => setCapasVisibles((actuales) => actuales.includes(capa.id) ? actuales.filter((id) => id !== capa.id) : [...actuales, capa.id])} className={`tap-target max-w-full rounded-lg border px-3 py-2 text-left text-sm font-medium leading-5 transition-colors ${capasVisibles.includes(capa.id) ? 'border-primary/55 bg-primary/12 text-primary' : 'border-border bg-surface text-muted-foreground hover:bg-surface-raised hover:text-foreground'}`}>{capa.etiqueta}</button>)}
          </div>
        </div>
        <div>
          <p className="eyebrow mb-1.5">Texto del plano</p>
          <button
            type="button"
            aria-pressed={etiquetasVisibles}
            onClick={() => setEtiquetasVisibles((actual) => !actual)}
            className={`tap-target max-w-full rounded-lg border px-3 py-2 text-left text-sm font-medium leading-5 transition-colors ${etiquetasVisibles ? 'border-primary/55 bg-primary/12 text-primary' : 'border-border bg-surface text-muted-foreground hover:bg-surface-raised hover:text-foreground'}`}
          >
            {etiquetasVisibles ? 'Ocultar etiquetas' : 'Mostrar etiquetas'}
          </button>
        </div>
      </div>

      <div className={`relative flex h-[48dvh] max-h-[420px] min-h-[280px] w-full overflow-hidden rounded-xl border border-border bg-surface md:h-[60dvh] md:max-h-[560px] ${aColocar ? 'ring-2 ring-primary' : ''}`}>
        {/* Envoltorio propio para el plano: en desktop es el hermano flex
            que se encoge cuando PanelNodo entra al layout (min-w-0 permite
            que el SVG achique más allá de su ancho de contenido natural).
            PanelNodo anima su propio ancho de 0 a 18rem en vez de aparecer
            ya montado a ancho completo — así el SVG se encoge en sincronía
            con el drawer en lugar de saltar de golpe al montarse PanelNodo.
            En móvil sigue ocupando el 100%, porque PanelNodo ahí es un
            drawer `fixed` fuera del flujo y no reserva espacio. */}
        <div className="h-full min-w-0 flex-1">
          <PlanoMina
            mapa={mapa}
            nodos={nodosConNivel}
            repetidores={repetidoresConPosicion}
            seleccionado={seleccionado}
            capasVisibles={capasVisibles}
            etiquetasVisibles={etiquetasVisibles}
            onSeleccionar={(tipo, id) => setSeleccionado({ tipo, id })}
            onColocarPosicion={aColocar ? colocar : null}
          />
        </div>
        <PanelNodo tipo={seleccionado?.tipo} entidad={entidadSeleccionada} onCerrar={() => setSeleccionado(null)} />
      </div>
      <p className="text-xs text-muted-foreground">Arrastra para desplazar · pellizca, rueda del mouse o los botones +/− para hacer zoom.</p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-surface p-3 text-xs text-muted-foreground">
        {LEYENDA_NIVELES.map((l) => (
          <span key={l.nivel} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
            {l.etiqueta}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" />
          Repetidor LoRa
        </span>
      </div>
    </div>
  )
}
