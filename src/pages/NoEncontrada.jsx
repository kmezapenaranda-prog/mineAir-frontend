import { Link } from 'react-router-dom'

export default function NoEncontrada() {
  return (
    <section className="flex min-h-[50dvh] flex-col items-start justify-center gap-4">
      <p className="eyebrow text-primary">Ruta no encontrada</p>
      <h1 className="text-2xl font-bold text-foreground">No encontramos ese lugar</h1>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">
        La dirección puede haber cambiado. Vuelve al panel o abre el mapa de la mina para continuar.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link to="/" className="tap-target rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Ir al panel</Link>
        <Link to="/mapa" className="tap-target rounded-lg border border-border bg-surface px-4 text-sm text-foreground">Abrir mapa</Link>
      </div>
    </section>
  )
}
