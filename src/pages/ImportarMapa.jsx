import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { parsearDxf, crearMapaMineair, decodificarDxf } from '../lib/dxf.js'
import { guardarMapaActivo } from '../config/mapaStore.js'
import { CAPAS_MAPA, capaDeElemento } from '../config/capasMapa.js'
import RotulosPlano from '../components/mapa/RotulosPlano.jsx'

function VistaPrevia({ mapa }) {
  if (!mapa) return <div className="grid h-72 place-items-center rounded-2xl border border-dashed border-border bg-background/30 p-6 text-center text-sm text-muted-foreground">Selecciona un DXF 2D para generar la vista previa.</div>
  return <div className="h-80 overflow-hidden rounded-2xl border border-border bg-background/40">
    <svg viewBox="0 0 100 100" className="h-full w-full">
      {mapa.elementos.filter((e) => e.tipo !== 'texto').map((e) => e.tipo === 'polilinea' ? <polyline key={e.id} points={e.puntos.map((p) => `${p.x},${p.y}`).join(' ')} fill={e.cerrada && e.categoria === 'sellada' ? 'var(--color-precaucion)' : 'none'} fillOpacity=".08" stroke={e.categoria === 'entrada' ? 'var(--color-mapa-entrada)' : e.categoria === 'retorno' ? 'var(--color-mapa-retorno)' : e.categoria === 'ducto' ? 'var(--color-mapa-ducto)' : e.categoria === 'sellada' ? 'var(--color-precaucion)' : 'var(--color-border)'} strokeWidth={e.categoria === 'galeria' ? 1 : .55} strokeDasharray={e.categoria === 'retorno' ? '2 1' : undefined} vectorEffect="non-scaling-stroke" /> : e.tipo === 'texto' ? <text key={e.id} x={e.posicion.x} y={e.posicion.y} fontSize="2" fill="var(--color-muted-foreground)">{e.texto}</text> : e.tipo === 'simbolo' ? <g key={e.id} transform={`translate(${e.posicion.x} ${e.posicion.y}) rotate(${-e.rotacion})`}><circle r="1.4" fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth=".5"/><path d="M-0.8 0h1.6M0-0.8v1.6" stroke="var(--color-primary)" strokeWidth=".35"/></g> : null)}
      <RotulosPlano elementos={mapa.elementos} fontSize={2} />
    </svg>
  </div>
}

export default function ImportarMapa() {
  const navegar = useNavigate()
  const [archivo, setArchivo] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [capasSeleccionadas, setCapasSeleccionadas] = useState(() => CAPAS_MAPA.map((capa) => capa.id))
  const [nombre, setNombre] = useState('')
  const [unidades, setUnidades] = useState('m')
  const [error, setError] = useState(null)
  const [codificacion, setCodificacion] = useState(null)
  const capasPorGrupo = useMemo(() => CAPAS_MAPA.map((grupo) => ({
    ...grupo,
    capas: (resultado?.capas ?? []).filter((capa) => capaDeElemento({ capa_origen: capa }) === grupo.id),
  })), [resultado])
  const asignaciones = useMemo(() => Object.fromEntries((resultado?.capas ?? []).map((capa) => {
    const grupo = capaDeElemento({ capa_origen: capa })
    return [capa, grupo && capasSeleccionadas.includes(grupo) ? grupo : 'ignorar']
  })), [resultado, capasSeleccionadas])
  const mapa = useMemo(() => resultado ? crearMapaMineair(resultado, asignaciones, { nombre: nombre || archivo?.name?.replace(/\.dxf$/i, ''), archivo: archivo?.name, unidades }) : null, [resultado, asignaciones, nombre, archivo, unidades])

  async function seleccionar(evento) {
    const siguiente = evento.target.files?.[0]
    if (!siguiente) return
    if (!/\.dxf$/i.test(siguiente.name) || siguiente.size > 25 * 1024 * 1024) { setError('Selecciona un archivo .dxf de máximo 25 MB.'); return }
    try {
      const decodificado = decodificarDxf(await siguiente.arrayBuffer())
      const parseado = parsearDxf(decodificado.texto)
      setArchivo(siguiente); setResultado(parseado); setNombre(siguiente.name.replace(/\.dxf$/i, ''))
      setCodificacion(decodificado.codificacion)
      setCapasSeleccionadas(CAPAS_MAPA.map((capa) => capa.id)); setError(null)
    } catch (e) { setError(e.message); setResultado(null) }
  }

  function guardar() {
    if (!mapa) return
    guardarMapaActivo(mapa)
    navegar('/mapa?colocar=1')
  }

  return <div className="flex flex-col gap-5 animate-enter">
    <header><p className="eyebrow text-primary">Configuración cartográfica</p><h1 className="mt-1 text-2xl font-bold">Importar plano DXF 2D</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">El archivo se procesa localmente en este navegador. MineAIr conserva líneas, polilíneas, arcos, círculos y textos; no carga sólidos 3D ni referencias externas.</p></header>
    <div className="grid gap-5 lg:grid-cols-[minmax(300px,.75fr)_minmax(0,1.25fr)]">
      <section className="panel flex flex-col gap-4 p-5">
        <label className="grid min-h-28 cursor-pointer place-items-center rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 text-center transition hover:bg-primary/10"><input className="sr-only" type="file" accept=".dxf,text/plain" onChange={seleccionar}/><span><b className="text-primary">Seleccionar DXF</b><small className="mt-1 block text-muted-foreground">ASCII · máximo 25 MB</small></span></label>
        {error ? <p role="alert" className="rounded-xl bg-alarma/10 p-3 text-sm text-alarma">{error}</p> : null}
        {resultado ? <>
          <div className="grid grid-cols-2 gap-3"><label className="text-xs text-muted-foreground">Nombre<input value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"/></label><label className="text-xs text-muted-foreground">Unidades<select value={unidades} onChange={(e) => setUnidades(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"><option value="m">Metros</option><option value="mm">Milímetros</option><option value="cm">Centímetros</option><option value="sin_especificar">Sin especificar</option></select></label></div>
          <p className="rounded-xl border border-border/60 bg-background/30 p-3 text-xs leading-5 text-muted-foreground">Codificación detectada: <span className="font-medium text-foreground">{codificacion}</span>. {mapa?.diagnostico_importacion.extension_cabecera_aplicada ? `Se aisló la extensión principal y se excluyeron ${mapa.diagnostico_importacion.entidades_fuera_extension} elementos auxiliares externos.` : 'No fue necesario recortar por extensión.'}</p>
          <fieldset className="min-w-0">
            <legend className="mb-3 text-sm font-semibold text-foreground">Capas a importar</legend>
            <div className="space-y-2">
              {capasPorGrupo.map((capa) => (
                <label key={capa.id} className={`flex min-h-11 items-start gap-3 rounded-xl border border-border/60 bg-background/30 p-3 ${capa.capas.length ? 'cursor-pointer' : 'text-muted-foreground'}`}>
                  <input
                    type="checkbox"
                    checked={capa.capas.length > 0 && capasSeleccionadas.includes(capa.id)}
                    disabled={capa.capas.length === 0}
                    onChange={(e) => {
                      const marcada = e.target.checked
                      setCapasSeleccionadas((actuales) => marcada ? [...actuales, capa.id] : actuales.filter((id) => id !== capa.id))
                    }}
                    className="mt-1 h-4 w-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-medium leading-6">{capa.etiqueta}</span>
                    {capa.capas.length === 0 ? <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">No encontrada en este archivo</span> : null}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {Object.keys(resultado.omitidas).length ? <p className="text-xs leading-5 text-precaucion">Entidades omitidas: {Object.entries(resultado.omitidas).map(([tipo, cantidad]) => `${tipo} (${cantidad})`).join(', ')}.</p> : null}
        </> : null}
      </section>
      <section className="panel p-5"><div className="mb-3 flex items-center justify-between"><div><p className="eyebrow">Vista previa normalizada</p><p className="mt-1 text-xs text-muted-foreground">La orientación y coordenadas originales se conservan en los metadatos.</p></div>{mapa ? <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">{mapa.elementos.length} elementos</span> : null}</div><VistaPrevia mapa={mapa}/><div className="mt-4 flex flex-wrap justify-end gap-2"><Link to="/configuracion" className="tap-target rounded-xl border border-border px-4 text-sm">Cancelar</Link><button disabled={!mapa || mapa.elementos.length === 0} onClick={guardar} className="brand-gradient tap-target rounded-xl px-5 text-sm font-bold text-slate-950 disabled:opacity-40">Guardar y colocar nodos</button></div></section>
    </div>
  </div>
}
