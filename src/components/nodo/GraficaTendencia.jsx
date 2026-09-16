import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useEnVista } from '../../lib/useEnVista.js'

/**
 * Gráfica de tendencia reutilizable con la línea de umbral normativo siempre
 * visible. Recharts no expone los datos a lectores de pantalla: el SVG queda
 * aria-hidden y una tabla sr-only con las mismas lecturas es la versión
 * accesible real, no un adorno.
 *
 * El propio Recharts (ResponsiveContainer + su ResizeObserver) se monta
 * recién cuando la tarjeta entra en pantalla — con 5 gráficas por nodo,
 * montarlas todas a la vez puede dejar el render a medias en celulares con
 * poca memoria, sin ningún error visible. La tarjeta y su alto (h-56) están
 * siempre presentes para que no haya salto de layout al hacer scroll.
 */
export default function GraficaTendencia({ datos, dataKey, etiqueta, umbral, color = 'var(--color-primary)' }) {
  const [ref, enVista] = useEnVista()
  const sufijo = umbral.unidad === 'pct' ? '%' : 'ppm'
  const resumen =
    datos.length > 0
      ? `${datos.length} lecturas de ${etiqueta} entre ${datos[0].hora} y ${datos[datos.length - 1].hora}, límite normativo ${umbral.limite} ${sufijo}.`
      : `Sin lecturas de ${etiqueta} en esta ventana.`

  return (
    <div ref={ref} className="h-56 min-w-0 rounded-xl border border-border bg-surface p-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{etiqueta}</p>
      <div aria-hidden="true" style={{ height: '87%' }}>
        {enVista && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={datos} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="hora" tick={{ fontSize: 10 }} minTickGap={30} stroke="var(--color-border)" />
              <YAxis tick={{ fontSize: 10 }} width={34} stroke="var(--color-border)" />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)' }}
                formatter={(valor) => [`${valor} ${sufijo}`, etiqueta]}
              />
              <ReferenceLine y={umbral.limite} stroke="var(--color-alarma)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      {/* sr-only en un <div> envolvente, no en la <table> misma: en una tabla,
          `height` es solo un mínimo sugerido (CSS 2.1 §17.5.3) — el navegador
          igual dibuja todas las filas a su alto real por detrás, e infla el
          scroll de la página aunque sea invisible. Un <div> sí respeta
          height:1px como límite real. */}
      <div className="sr-only">
        <table>
          <caption>{resumen}</caption>
          <thead>
            <tr>
              <th scope="col">Hora</th>
              <th scope="col">{etiqueta}</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((d, i) => (
              <tr key={`${d.hora}-${i}`}>
                <td>{d.hora}</td>
                <td>{d[dataKey] == null ? 'sin dato' : `${d[dataKey]} ${sufijo}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
