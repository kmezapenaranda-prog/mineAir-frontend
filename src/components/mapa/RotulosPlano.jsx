import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { distribuirRotulos } from '../../lib/rotulosMapa.js'
import TextoPlano from './TextoPlano.jsx'

/** Mide el texto real en unidades SVG antes de resolver las colisiones. */
export default function RotulosPlano({ elementos, marcadores = [], fontSize = 2.8 }) {
  const medidasRef = useRef(null)
  const [medidas, setMedidas] = useState([])
  const textos = elementos.filter((e) => e.tipo === 'texto')
  const firma = JSON.stringify(textos.map((e) => [e.id, e.texto, e.posicion, e.ancla]))

  useLayoutEffect(() => {
    let activo = true
    const medir = () => {
      if (!activo || !medidasRef.current) return
      setMedidas([...medidasRef.current.querySelectorAll('text')].map((texto) => {
        const caja = texto.getBBox()
        return { id: texto.dataset.id, x: caja.x, y: caja.y, width: caja.width, height: caja.height }
      }))
    }
    medir()
    document.fonts?.ready.then(medir)
    return () => { activo = false }
  }, [firma, fontSize])

  const obstaculos = marcadores.filter((m) => Number.isFinite(m.x) && Number.isFinite(m.y))
    .map((m) => ({ x: m.x - 3, y: m.y - 3, width: 6, height: 6 }))
  const firmaObstaculos = JSON.stringify(obstaculos)
  const distribucion = useMemo(() => new Map(distribuirRotulos(medidas, JSON.parse(firmaObstaculos)).map((r) => [r.id, r])), [medidas, firmaObstaculos])

  return <g pointerEvents="none">
    <g ref={medidasRef} visibility="hidden" aria-hidden="true">
      {textos.map((e) => <TextoPlano key={e.id} elemento={e} fontSize={fontSize} />)}
    </g>
    {/* Las líneas guía quedan debajo de todos los rótulos. */}
    {textos.map((e) => {
      const r = distribucion.get(e.id)
      if (!r?.caja || Math.hypot(r.dx, r.dy) < 1.5) return null
      const x = Math.max(r.caja.x, Math.min(r.caja.x + r.caja.width, e.posicion.x))
      const y = Math.max(r.caja.y, Math.min(r.caja.y + r.caja.height, e.posicion.y))
      return <path key={e.id} d={`M${e.posicion.x} ${e.posicion.y}L${x} ${y}`} fill="none" stroke="var(--color-muted-foreground)" strokeWidth={0.25} opacity={0.7} />
    })}
    {textos.map((e) => {
      const r = distribucion.get(e.id)
      return <g key={e.id}>
        {r?.caja ? <rect {...r.caja} rx={0.5} fill="var(--color-surface)" /> : null}
        <g transform={`translate(${r?.dx ?? 0} ${r?.dy ?? 0})`}>
          <TextoPlano elemento={e} fontSize={fontSize} />
        </g>
      </g>
    })}
  </g>
}
