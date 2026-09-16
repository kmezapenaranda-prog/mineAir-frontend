import { useEffect, useRef, useState } from 'react'
import { useReduceMovimiento } from '../../lib/useReduceMovimiento.js'

/**
 * Cuenta desde el valor previamente mostrado hasta el nuevo (no desde 0):
 * un refresco de polling se lee como un tick real, no como un remount.
 * Con prefers-reduced-motion, salta directo al valor final.
 */
export default function AnimatedNumber({ value, decimals = 0, duration = 600, prefix = '', suffix = '' }) {
  const reducir = useReduceMovimiento()
  const [mostrado, setMostrado] = useState(value)
  const previoRef = useRef(value)
  const frameRef = useRef(null)

  useEffect(() => {
    const desde = previoRef.current
    const hasta = value
    if (reducir || desde === hasta || !Number.isFinite(desde) || !Number.isFinite(hasta)) {
      setMostrado(hasta)
      previoRef.current = hasta
      return
    }
    const inicio = performance.now()
    function tick(ahora) {
      const t = Math.min(1, (ahora - inicio) / duration)
      const suavizado = 1 - Math.pow(1 - t, 3)
      setMostrado(desde + (hasta - desde) * suavizado)
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        previoRef.current = hasta
      }
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value, duration, reducir])

  return (
    <span className="tabular-nums">
      {prefix}
      {mostrado.toFixed(decimals)}
      {suffix}
    </span>
  )
}
