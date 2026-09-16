function colorBateria(pct) {
  if (pct < 20) return 'var(--color-alarma)'
  if (pct < 40) return 'var(--color-precaucion)'
  return 'var(--color-normal)'
}

function barrasSenal(rssiDbm) {
  if (rssiDbm > -60) return 4
  if (rssiDbm > -70) return 3
  if (rssiDbm > -80) return 2
  if (rssiDbm > -95) return 1
  return 0
}

/** Batería y señal como widgets visuales — números de apoyo, no críticos. */
export default function EstadoDispositivo({ bateria_pct, rssi_dbm }) {
  const barras = barrasSenal(rssi_dbm)
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5" aria-label={`Batería ${bateria_pct}%`}>
        <span className="relative inline-block h-3.5 w-7 rounded-[2px] border border-muted-foreground/70 p-[1.5px]">
          <span className="absolute top-1 -right-[3px] h-1.5 w-[3px] rounded-r-sm bg-muted-foreground/70" />
          <span
            className="block h-full rounded-[1px]"
            style={{ width: `${Math.max(6, bateria_pct)}%`, background: colorBateria(bateria_pct) }}
          />
        </span>
        <span className="text-xs text-muted-foreground">{bateria_pct}%</span>
      </div>

      <div className="flex items-center gap-1.5" aria-label={`Señal ${rssi_dbm} dBm`}>
        <span className="flex h-3 items-end gap-0.5">
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-1 rounded-[1px]"
              style={{
                height: `${i * 25}%`,
                background: i <= barras ? 'var(--color-foreground)' : 'var(--color-border)',
              }}
            />
          ))}
        </span>
        <span className="text-xs text-muted-foreground">{rssi_dbm} dBm</span>
      </div>
    </div>
  )
}
