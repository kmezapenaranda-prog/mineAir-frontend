import { useEffect, useRef, useState } from 'react'

/**
 * true una vez que el elemento entra (o está por entrar) al viewport, y se
 * queda en true — no vuelve a false al salir de pantalla. Para montar
 * contenido pesado (gráficas) de a uno a medida que se hace scroll, en vez
 * de todos a la vez: en celulares con poca memoria, montar varias
 * instancias de Recharts simultáneamente puede dejar el render a medias
 * sin ningún error visible.
 */
export function useEnVista(margen = '200px') {
  const ref = useRef(null)
  const [enVista, setEnVista] = useState(false)

  useEffect(() => {
    if (enVista || !ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setEnVista(true)
      },
      { rootMargin: margen },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [enVista, margen])

  return [ref, enVista]
}
