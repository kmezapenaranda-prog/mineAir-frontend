/** Marcador honesto para pantallas todavía no construidas — ver Fases en CLAUDE.md. */
export default function PlaceholderFase({ titulo, fase, descripcion }) {
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-8 text-center">
      <h1 className="text-xl font-bold text-foreground">{titulo}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{descripcion}</p>
      <span className="mt-2 rounded-full bg-surface-raised px-3 py-1 text-xs font-medium text-muted-foreground">
        {fase}
      </span>
    </div>
  )
}
