import { useEffect, useRef, useState } from 'react'
import { useDialogAccesible } from '../lib/useDialogAccesible.js'

/**
 * Bottom sheet genérico y accesible (foco atrapado, Escape, aria-modal),
 * mismo mecanismo de animación que PanelNodo (doble rAF de entrada, salida
 * guiada por transitionend con fallback de carrera si se cierra antes de
 * que la entrada termine de animar) pero sin la variante de sidebar en
 * desktop — pensado para diálogos de una sola pantalla como filtros, cuyo
 * contenido no cambia mientras están abiertos.
 */
export default function Drawer({ abierto, onCerrar, titulo, children }) {
  const dialogRef = useDialogAccesible(abierto, onCerrar)
  const [montado, setMontado] = useState(abierto)
  const [visible, setVisible] = useState(false)
  const estabaAbiertoRef = useRef(false)

  useEffect(() => {
    if (abierto) {
      setMontado(true)
      let id2
      const id1 = requestAnimationFrame(() => {
        id2 = requestAnimationFrame(() => {
          estabaAbiertoRef.current = true
          setVisible(true)
        })
      })
      return () => {
        cancelAnimationFrame(id1)
        if (id2) cancelAnimationFrame(id2)
      }
    }
    const yaHabiaAbierto = estabaAbiertoRef.current
    estabaAbiertoRef.current = false
    setVisible(false)
    if (!yaHabiaAbierto) setMontado(false)
  }, [abierto])

  if (!montado) return null

  function alTerminarTransicion(e) {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return
    if (!visible) setMontado(false)
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-200 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onCerrar}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        onTransitionEnd={alTerminarTransicion}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        className={`fixed inset-x-0 bottom-0 z-40 max-h-[75dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface-raised p-4 shadow-2xl transition-transform duration-200 ease-drawer ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {children}
      </div>
    </>
  )
}
