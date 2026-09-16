/**
 * Switch accesible (role="switch") — Fase 4: ventilador on/off en Registro,
 * alta/baja de nodo en Configuración. El thumb usa una transición CSS
 * normal, así que ya queda cubierto por la regla global de
 * prefers-reduced-motion en index.css sin lógica adicional.
 */
export default function Interruptor({ activo, onCambiar, etiqueta, id }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      onClick={() => onCambiar(!activo)}
      className={`relative flex h-11 w-14 shrink-0 items-center rounded-full p-1 transition-colors duration-150 ease-out ${
        activo ? 'bg-primary' : 'bg-surface-raised'
      }`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-foreground transition-transform duration-150 ease-out ${
          activo ? 'translate-x-7' : 'translate-x-0'
        }`}
      />
    </button>
  )
}
