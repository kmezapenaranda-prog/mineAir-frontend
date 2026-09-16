import { useState } from 'react'
import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from 'recharts'
import { useEnVista } from '../../lib/useEnVista.js'
import { NIVEL } from '../../config/umbrales.js'
import AnimatedNumber from './AnimatedNumber.jsx'

const COLOR_NIVEL = {
  [NIVEL.NORMAL]: 'var(--color-normal)',
  [NIVEL.PRECAUCION]: 'var(--color-precaucion)',
  [NIVEL.ALARMA]: 'var(--color-alarma)',
  [NIVEL.NO_MONITOREADO]: 'var(--color-sin-monitorear)',
}

// Crece ligeramente el gajo activo — respuesta inmediata al pasar el cursor,
// sin reflow del resto de la dona (mismo radio interior/exterior + 4px).
function gajoActivo(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 4}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
  )
}

/** Dona de conteo por nivel, reutilizado para nodos y para predicciones. */
export default function DonutNiveles({ titulo, datos }) {
  const [ref, enVista] = useEnVista()
  const [activo, setActivo] = useState(null)
  const total = datos.reduce((a, d) => a + d.cantidad, 0)
  const resumen = datos.map((d) => `${d.etiqueta}: ${d.cantidad}`).join(', ')
  const normal = datos.find((d) => d.nivel === NIVEL.NORMAL)
  const centro = activo != null ? datos[activo] : normal

  return (
    <article ref={ref} className="panel panel-interactive min-w-0 p-4">
      <p className="eyebrow">{titulo}</p>
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Sin datos.</p>
      ) : (
        <div
          className={`relative mt-2 h-36 transition-[opacity,transform] duration-[400ms] ease-out ${enVista ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
          aria-hidden="true"
        >
          {enVista && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={datos}
                  dataKey="cantidad"
                  nameKey="etiqueta"
                  innerRadius="62%"
                  outerRadius="100%"
                  strokeWidth={2}
                  stroke="var(--color-surface)"
                  isAnimationActive={false}
                  activeIndex={activo ?? undefined}
                  activeShape={gajoActivo}
                  onMouseEnter={(_, i) => setActivo(i)}
                  onMouseLeave={() => setActivo(null)}
                >
                  {datos.map((d) => (
                    <Cell
                      key={d.nivel}
                      fill={COLOR_NIVEL[d.nivel] ?? 'var(--color-border)'}
                      className="cursor-default transition-opacity duration-150"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="num-critico text-2xl"
              style={{ color: centro ? (COLOR_NIVEL[centro.nivel] ?? 'var(--color-foreground)') : undefined }}
            >
              <AnimatedNumber value={centro ? centro.cantidad : total} />
            </span>
            <span className="text-[11px] text-muted-foreground">{centro ? centro.etiqueta : 'Total'}</span>
          </div>
        </div>
      )}
      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {datos.map((d) => (
          <li key={d.nivel} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ background: COLOR_NIVEL[d.nivel] ?? 'var(--color-border)' }}
            />
            {d.etiqueta} · {d.cantidad}
          </li>
        ))}
      </ul>
      <span className="sr-only">{resumen}</span>
    </article>
  )
}
