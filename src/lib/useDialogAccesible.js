import { useEffect, useRef } from 'react'

const SELECTOR_ENFOCABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Accesibilidad de diálogo/drawer reutilizable: mientras `activo` es true,
 * atrapa el foco dentro del contenedor devuelto, cierra con Escape, y
 * devuelve el foco al elemento que lo abrió (ej. el marcador del mapa) al
 * desactivarse. Pensado para cualquier modal futuro, no solo PanelNodo.
 */
export function useDialogAccesible(activo, onCerrar) {
  const contenedorRef = useRef(null)

  useEffect(() => {
    if (!activo) return

    const elementoPrevio = document.activeElement
    const nodo = contenedorRef.current
    const primerEnfocable = nodo?.querySelector(SELECTOR_ENFOCABLE)
    ;(primerEnfocable ?? nodo)?.focus()

    function alTeclado(e) {
      if (e.key === 'Escape') {
        onCerrar()
        return
      }
      if (e.key !== 'Tab' || !nodo) return

      const enfocables = Array.from(nodo.querySelectorAll(SELECTOR_ENFOCABLE)).filter(
        (el) => el.offsetParent !== null,
      )
      if (enfocables.length === 0) return

      const primero = enfocables[0]
      const ultimo = enfocables[enfocables.length - 1]

      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', alTeclado)
    return () => {
      document.removeEventListener('keydown', alTeclado)
      elementoPrevio?.focus?.()
    }
  }, [activo, onCerrar])

  return contenedorRef
}
