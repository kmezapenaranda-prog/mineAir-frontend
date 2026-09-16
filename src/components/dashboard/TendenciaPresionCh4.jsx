import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useEnVista } from '../../lib/useEnVista.js'

/** Correlación presión barométrica / CH4 — la tesis central del proyecto, visible en un gráfico. */
export default function TendenciaPresionCh4({ datos }) {
  const [ref, enVista] = useEnVista()
  const hayPresion = datos.some((d) => d.presion_hpa != null)
  const hayCh4 = datos.some((d) => d.ch4_pct != null)
  const sinDatos = datos.length === 0 || (!hayPresion && !hayCh4)

  return (
    <div ref={ref} className="min-w-0 rounded-xl border border-border bg-surface p-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Presión barométrica vs. CH₄ · últimas 24 h
      </p>
      <p className="mb-2 text-xs text-muted-foreground">
        Cuando la presión cae, el metano se desorbe de zonas selladas y sube — esta correlación inversa es la base
        de la predicción.
      </p>
      {sinDatos ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Sin lecturas suficientes en el período.</p>
      ) : (
        <div className="h-48" aria-hidden="true">
          {enVista && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datos} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="hora" tick={{ fontSize: 10 }} minTickGap={30} stroke="var(--color-border)" />
                <YAxis
                  yAxisId="presion"
                  tick={{ fontSize: 10 }}
                  width={38}
                  stroke="var(--color-border)"
                  domain={['auto', 'auto']}
                />
                <YAxis
                  yAxisId="ch4"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  width={34}
                  stroke="var(--color-border)"
                  domain={[0, 'auto']}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
                  formatter={(valor, nombre) =>
                    nombre === 'presion_hpa' ? [`${valor} hPa`, 'Presión'] : [`${valor}%`, 'CH₄ promedio']
                  }
                />
                {hayPresion && (
                  <Line
                    yAxisId="presion"
                    type="monotone"
                    dataKey="presion_hpa"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                )}
                {hayCh4 && (
                  <Line
                    yAxisId="ch4"
                    type="monotone"
                    dataKey="ch4_pct"
                    stroke="var(--color-alarma)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
      <div className="sr-only">
        <table>
          <caption>Presión barométrica y CH₄ promedio en las últimas 24 horas, por franja de 15 minutos.</caption>
          <thead>
            <tr>
              <th scope="col">Hora</th>
              <th scope="col">Presión</th>
              <th scope="col">CH₄</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((d, i) => (
              <tr key={`${d.hora}-${i}`}>
                <td>{d.hora}</td>
                <td>{d.presion_hpa == null ? 'sin dato' : `${d.presion_hpa} hPa`}</td>
                <td>{d.ch4_pct == null ? 'sin dato' : `${d.ch4_pct}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        {hayPresion && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--color-primary)' }} />
            Presión (hPa)
          </span>
        )}
        {hayCh4 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--color-alarma)' }} />
            CH₄ (%)
          </span>
        )}
      </div>
    </div>
  )
}
