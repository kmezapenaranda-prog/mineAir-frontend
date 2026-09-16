import { useEffect, useState } from 'react'

const CONSULTA = '(prefers-reduced-motion: reduce)'

/**
 * Lee prefers-reduced-motion en JS para los casos que la media query CSS
 * global (src/index.css) no alcanza: SMIL de SVG (<animate>), o cualquier
 * animación que decida su propia lógica en vez de una transición CSS.
 */
export function useReduceMovimiento() {
  const [reducir, setReducir] = useState(() => window.matchMedia(CONSULTA).matches)

  useEffect(() => {
    const media = window.matchMedia(CONSULTA)
    const alCambiar = (e) => setReducir(e.matches)
    media.addEventListener('change', alCambiar)
    return () => media.removeEventListener('change', alCambiar)
  }, [])

  return reducir
}
