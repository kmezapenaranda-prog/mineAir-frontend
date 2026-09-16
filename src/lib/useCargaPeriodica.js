import { useCallback, useEffect, useState } from 'react'

/** Conserva el último resultado durante un fallo, sin solapar peticiones. */
export function useCargaPeriodica(cargar, intervalo = 20000) {
  const [estado, setEstado] = useState({ datos: null, error: null, cargando: true, recibidoEn: null, fuente: cargar })
  const [intento, setIntento] = useState(0)
  const reintentar = useCallback(() => setIntento((n) => n + 1), [])
  useEffect(() => {
    let activo = true
    let temporizador
    async function ejecutar() {
      setEstado((previo) => previo.fuente === cargar
        ? { ...previo, cargando: true }
        : { datos: null, error: null, cargando: true, recibidoEn: null, fuente: cargar })
      try {
        const datos = await cargar()
        if (activo) setEstado({ datos, error: null, cargando: false, recibidoEn: Date.now(), fuente: cargar })
      } catch (error) {
        if (activo) setEstado((previo) => ({ ...previo, error, cargando: false }))
      } finally {
        if (activo) temporizador = setTimeout(ejecutar, intervalo)
      }
    }
    ejecutar()
    return () => { activo = false; clearTimeout(temporizador) }
  }, [cargar, intervalo, intento])
  // Un cambio de nodo/rango nunca muestra la respuesta del anterior.
  return { ...(estado.fuente === cargar ? estado : { datos: null, error: null, cargando: true, recibidoEn: null }), reintentar }
}
