import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import { useEnVista } from '../../lib/useEnVista.js'
import { TOOLTIP_CLASS } from './tooltipEstilo.js'

function colorPico(pico, umbral) {
  if (pico >= umbral) return 'var(--color-alarma)'
  if (pico >= umbral * 0.7) return 'var(--color-precaucion)'
  return 'var(--color-normal)'
}

function TooltipPico({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className={TOOLTIP_CLASS}>
      <p className="font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-muted-foreground">
        Pico <b className="num-critico text-foreground">{d.pico}%</b>
      </p>
      <p className="text-muted-foreground">
        Promedio <b className="num-critico text-foreground">{d.promedio}%</b>
      </p>
      {d.alarmas > 0 ? <p className="mt-1 text-alarma">{d.alarmas} lectura{d.alarmas === 1 ? '' : 's'} en alarma</p> : null}
    </div>
  )
}

/** Pico y promedio de CH4 por turno — "picos por período" en la unidad temporal que la mina usa. */
export default function PicosPorTurno({ datos }) {
  const [ref, enVista] = useEnVista()
  const umbral = datos[0]?.umbral ?? 1
  const sinDatos = datos.every((d) => d.pico === 0 && d.promedio === 0)
  const resumen = datos
    .map((d) => `${d.turno}: pico ${d.pico}%, promedio ${d.promedio}%, ${d.alarmas} lecturas en alarma`)
    .join('. ')

  return (
    <article ref={ref} className="panel panel-interactive min-w-0 p-4">
      <p className="eyebrow">Pico de CH₄ por turno · últimos 4 días</p>
      {sinDatos ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Sin lecturas de CH₄ en el período.</p>
      ) : (
        <div
          className={`mt-2 h-44 transition-[opacity,transform] duration-[400ms] ease-out ${enVista ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
          aria-hidden="true"
        >
          {enVista && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datos} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="turno"
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--color-border)' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }}
                  width={34}
                  tickLine={false}
                  axisLine={false}
                  unit="%"
                />
                <Tooltip content={<TooltipPico />} cursor={{ fill: 'var(--color-border)', opacity: 0.25 }} />
                <ReferenceLine y={umbral} stroke="var(--color-alarma)" strokeDasharray="4 4" />
                <Bar dataKey="pico" radius={[6, 6, 0, 0]} isAnimationActive={false} maxBarSize={44}>
                  {datos.map((d) => (
                    <Cell key={d.turno} fill={colorPico(d.pico, umbral)} className="transition-opacity duration-150" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
      <div className="sr-only">
        <table>
          <caption>{resumen || 'Sin lecturas de CH₄ en el período.'}</caption>
          <thead>
            <tr>
              <th scope="col">Turno</th>
              <th scope="col">Pico</th>
              <th scope="col">Promedio</th>
              <th scope="col">Lecturas en alarma</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((d) => (
              <tr key={d.turno}>
                <td>{d.turno}</td>
                <td>{d.pico}%</td>
                <td>{d.promedio}%</td>
                <td>{d.alarmas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-2 grid grid-cols-3 gap-1 text-xs text-muted-foreground">
        {datos.map((d) => (
          <li key={d.turno} className="truncate">
            {d.turno}: {d.alarmas} en alarma
          </li>
        ))}
      </ul>
    </article>
  )
}
