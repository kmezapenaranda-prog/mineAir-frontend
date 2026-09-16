import { Component } from 'react'

/**
 * Aísla fallos de render de un subárbol para que no se lleven puesto el
 * resto de la página. Se usa por gráfica en DetalleNodo: si una tarjeta
 * de tendencia falla, las demás siguen mostrándose y el error queda
 * visible acá en vez de dejar un hueco silencioso sin pista alguna.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', this.props.etiqueta ?? '', error, info?.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-w-0 rounded-xl border border-alarma/50 bg-surface p-3 text-sm text-alarma">
          <p className="font-semibold">Error mostrando {this.props.etiqueta ?? 'este contenido'}</p>
          <p className="mt-1 text-xs break-words text-muted-foreground">{String(this.state.error.message ?? this.state.error)}</p>
        </div>
      )
    }
    return this.props.children
  }
}
