import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import { UMBRALES_DEFAULT } from '../../config/umbrales.js'
import { TOOLTIP_CLASS } from './tooltipEstilo.js'
import AnimatedNumber from './AnimatedNumber.jsx'

const RANGOS = [1, 6, 24]

function TooltipCh4({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const valores = Object.fromEntries(payload.map((item) => [item.dataKey, item.value]))
  const delta = valores.retorno != null && valores.entrada != null ? valores.retorno - valores.entrada : null
  return (
    <div className={TOOLTIP_CLASS}>
      <p className="mb-2 font-semibold text-foreground">{label}</p>
      <p className="text-primary">Retorno <b>{valores.retorno?.toFixed(3)} %</b></p>
      <p className="text-chart-entrada">Entrada <b>{valores.entrada?.toFixed(3)} %</b></p>
      {delta != null ? <p className="mt-2 border-t border-border pt-2 text-foreground">Δ <b>{delta.toFixed(3)} %</b></p> : null}
    </div>
  )
}

/** Control segmentado con pastilla deslizante — se calcula por índice sobre
 * columnas iguales (3 rangos fijos), sin medir refs: más simple y sin
 * saltos si algún día se agrega un cuarto rango habría que pasar a medir. */
function SelectorRango({ rango, onRango }) {
  const indice = RANGOS.indexOf(rango)
  return (
    <div className="relative grid grid-cols-3 rounded-xl bg-background/60 p-1">
      <div
        className="absolute inset-y-1 left-1 rounded-lg bg-primary shadow-lg transition-transform duration-[220ms] ease-out"
        style={{ width: 'calc((100% - 0.5rem) / 3)', transform: `translateX(${indice * 100}%)` }}
        aria-hidden="true"
      />
      {RANGOS.map((horas) => (
        <button
          key={horas}
          onClick={() => onRango(horas)}
          aria-pressed={rango === horas}
          className={`tap-target relative z-10 rounded-lg px-3 text-xs font-semibold transition-[color,transform] duration-150 active:scale-95 ${rango === horas ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {horas} h
        </button>
      ))}
    </div>
  )
}

export default function DiferencialCh4({ retorno, entrada, rango, onRango, retornoNodo, entradaNodo }) {
  const datos = useMemo(() => retorno.map((lectura, i) => ({
    hora: new Date(lectura.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    retorno: lectura.estado.sensor_ok ? lectura.gases.ch4_pct : null,
    entrada: entrada[i]?.estado.sensor_ok ? entrada[i]?.gases.ch4_pct : null,
  })), [retorno, entrada])
  const sinDatos = datos.length === 0 || !datos.some((dato) => dato.retorno != null || dato.entrada != null)
  const ultimo = datos.at(-1)
  const delta = ultimo?.retorno != null && ultimo?.entrada != null ? ultimo.retorno - ultimo.entrada : null

  return (
    <section className="panel min-w-0 overflow-hidden p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Diferencial atmosférico</p>
          <h2 className="mt-1 text-lg font-bold">CH₄ · Retorno vs Entrada</h2>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-primary" />{retornoNodo?.node_id ?? 'Retorno'} Retorno</span>
            <span><i className="mr-1.5 inline-block h-2 w-2 rounded-full bg-chart-entrada" />{entradaNodo?.node_id ?? 'Entrada'} Entrada</span>
          </div>
        </div>
        <SelectorRango rango={rango} onRango={onRango} />
      </div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="eyebrow">Δ Retorno − Entrada</span>
        <strong className="num-critico text-xl text-primary">
          {delta == null ? '—' : <AnimatedNumber value={delta} decimals={3} prefix={delta >= 0 ? '+' : ''} suffix=" %" />}
        </strong>
      </div>
      <div className="h-64 min-w-0 md:h-72" aria-hidden="true">
        {sinDatos ? <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No hay lecturas de CH₄ en el período seleccionado.</p> : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="lineRetorno" x1="0" y1="0" x2="1" y2="0"><stop stopColor="var(--color-chart-retorno-inicio)"/><stop offset="1" stopColor="var(--color-chart-retorno-fin)"/></linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.45} vertical={false} />
            <XAxis dataKey="hora" tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} tickLine={false} axisLine={false} minTickGap={36} />
            <YAxis domain={[0, Math.max(1.05, UMBRALES_DEFAULT.ch4.limite * 1.05)]} tick={{ fontSize: 10, fill: 'var(--color-muted-foreground)' }} tickLine={false} axisLine={false} />
            <ReferenceLine y={UMBRALES_DEFAULT.ch4.limite} stroke="var(--color-alarma)" strokeDasharray="5 5" label={{ value: 'Umbral 1.0%', fill: 'var(--color-alarma)', fontSize: 10 }} />
            <Tooltip content={<TooltipCh4 />} />
            <Line type="monotone" dataKey="retorno" stroke="url(#lineRetorno)" strokeWidth={3} dot={false} connectNulls={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="entrada" stroke="var(--color-chart-entrada)" strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>)}
      </div>
      <div className="sr-only">
        <table>
          <caption>Metano en retorno y entrada durante las últimas {rango} horas.</caption>
          <thead>
            <tr>
              <th scope="col">Hora</th>
              <th scope="col">{retornoNodo?.node_id ?? 'Retorno'} Retorno</th>
              <th scope="col">{entradaNodo?.node_id ?? 'Entrada'} Entrada</th>
              <th scope="col">Diferencial</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((dato, i) => {
              const diferencia = dato.retorno != null && dato.entrada != null ? dato.retorno - dato.entrada : null
              return (
                <tr key={`${dato.hora}-${i}`}>
                  <td>{dato.hora}</td>
                  <td>{dato.retorno == null ? 'sin dato' : `${dato.retorno.toFixed(3)} %`}</td>
                  <td>{dato.entrada == null ? 'sin dato' : `${dato.entrada.toFixed(3)} %`}</td>
                  <td>{diferencia == null ? 'sin dato' : `${diferencia >= 0 ? '+' : ''}${diferencia.toFixed(3)} %`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
