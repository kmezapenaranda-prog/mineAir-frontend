export default function ErrorCarga({ error, onReintentar, cargando = false, hayDatos = false }) {
  if (!error) return null
  return (
    <div role="alert" className="animate-enter flex flex-wrap items-center gap-3 rounded-xl border border-alarma/40 bg-alarma/10 p-4 text-sm">
      <p className="min-w-0 flex-1 text-alarma">
        No fue posible actualizar esta información. {hayDatos ? 'Se muestran los últimos datos recibidos; su vigencia no está confirmada.' : 'Comprueba la conexión y vuelve a intentar.'}
      </p>
      <button type="button" onClick={onReintentar} disabled={cargando} className="tap-target rounded-lg border border-border bg-surface px-4 text-foreground disabled:opacity-60">
        {cargando ? 'Reintentando…' : 'Reintentar'}
      </button>
    </div>
  )
}
