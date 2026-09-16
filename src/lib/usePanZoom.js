import { useCallback, useEffect, useRef, useState } from 'react'

const ESCALA_MIN = 1
const ESCALA_MAX = 4
const UMBRAL_ARRASTRE_PX = 6 // por debajo de esto, un pan corto se trata como tap/click

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}

/**
 * El viewBox es cuadrado (100x100) pero el elemento <svg> casi nunca lo es:
 * con el preserveAspectRatio por defecto (xMidYMid meet), el navegador lo
 * escala de forma UNIFORME según el lado más chico del recuadro y deja
 * franjas vacías ("letterbox") en el otro eje. Convertir X e Y por separado
 * con rect.width/rect.height (como si cada eje tuviera su propia escala)
 * desplaza cualquier punto de pantalla respecto a dónde cae en el plano.
 */
function medidasViewBox(rect) {
  const escalaPx = Math.min(rect.width, rect.height) / 100
  return {
    escalaPx,
    offsetX: (rect.width - 100 * escalaPx) / 2,
    offsetY: (rect.height - 100 * escalaPx) / 2,
  }
}

/**
 * Pan + zoom para un <svg> con viewBox fijo "0 0 100 100": en vez de tocar
 * el viewBox, mueve/escala un <g> interno. El propio <svg> sirve de
 * referencia estable para convertir coordenadas de pantalla a unidades del
 * viewBox (necesario para "zoom hacia el cursor/pellizco").
 *
 * El seguimiento de arrastre/pellizco usa listeners en `window`, NO
 * `setPointerCapture`: capturar el puntero en el propio <svg> retargetea
 * también el click de compatibilidad al elemento capturador, así que un
 * tap sobre un nodo nunca llegaba a disparar su <circle onClick>. Con
 * listeners globales el click sigue el hit-testing normal del DOM.
 *
 * Soporta: rueda del mouse, arrastre con un dedo/mouse, pellizco de dos
 * dedos, doble clic, y botones +/-/reset para cuando no hay gestos finos
 * disponibles (guantes, mouse sin rueda).
 */
export function usePanZoom(svgRef) {
  const [transform, setTransform] = useState({ escala: 1, tx: 0, ty: 0 })
  // Solo importa para decidir si el <g> anima su transform (ver PlanoMina):
  // en `true` mientras hay un dedo/mouse en contacto, para que el arrastre y
  // el pellizco sigan al puntero 1:1 sin el retardo de una transición CSS.
  // Un zoom discreto (rueda, doble clic, botones +/-, reset) ocurre con
  // `enGesto` en `false`, así que sí anima — sin eso saltaba de una escala a
  // otra en un solo frame.
  const [enGesto, setEnGesto] = useState(false)
  const punteros = useRef(new Map())
  const gesto = useRef(null)
  const arrastreAcumulado = useRef(0)

  const aCoordenadasVB = useCallback(
    (clientX, clientY) => {
      const rect = svgRef.current.getBoundingClientRect()
      const { escalaPx, offsetX, offsetY } = medidasViewBox(rect)
      return {
        x: (clientX - rect.left - offsetX) / escalaPx,
        y: (clientY - rect.top - offsetY) / escalaPx,
      }
    },
    [svgRef],
  )

  const zoomEn = useCallback((vx, vy, factor) => {
    setTransform((prev) => {
      const nuevaEscala = clamp(prev.escala * factor, ESCALA_MIN, ESCALA_MAX)
      if (nuevaEscala === prev.escala) return prev
      // Punto de contenido bajo (vx,vy) antes del zoom, para mantenerlo fijo bajo el cursor/pellizco.
      const px = (vx - prev.tx) / prev.escala
      const py = (vy - prev.ty) / prev.escala
      const min = 100 - 100 * nuevaEscala
      return {
        escala: nuevaEscala,
        tx: clamp(vx - px * nuevaEscala, min, 0),
        ty: clamp(vy - py * nuevaEscala, min, 0),
      }
    })
  }, [])

  const panearPx = useCallback(
    (dxClient, dyClient) => {
      const rect = svgRef.current.getBoundingClientRect()
      const { escalaPx } = medidasViewBox(rect)
      setTransform((prev) => {
        const min = 100 - 100 * prev.escala
        return {
          ...prev,
          tx: clamp(prev.tx + dxClient / escalaPx, min, 0),
          ty: clamp(prev.ty + dyClient / escalaPx, min, 0),
        }
      })
    },
    [svgRef],
  )

  const onWheel = useCallback(
    (e) => {
      e.preventDefault()
      const { x, y } = aCoordenadasVB(e.clientX, e.clientY)
      zoomEn(x, y, e.deltaY < 0 ? 1.2 : 1 / 1.2)
    },
    [aCoordenadasVB, zoomEn],
  )

  const onMovimientoGlobal = useCallback(
    (e) => {
      if (!punteros.current.has(e.pointerId)) return
      punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (gesto.current?.tipo === 'pan' && punteros.current.size === 1) {
        const dx = e.clientX - gesto.current.ultimo.x
        const dy = e.clientY - gesto.current.ultimo.y
        arrastreAcumulado.current += Math.abs(dx) + Math.abs(dy)
        panearPx(dx, dy)
        gesto.current.ultimo = { x: e.clientX, y: e.clientY }
      } else if (gesto.current?.tipo === 'pinch' && punteros.current.size === 2) {
        const [a, b] = [...punteros.current.values()]
        const distancia = Math.hypot(a.x - b.x, a.y - b.y)
        const centro = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
        const { x, y } = aCoordenadasVB(centro.x, centro.y)
        if (gesto.current.distancia > 0) zoomEn(x, y, distancia / gesto.current.distancia)
        gesto.current.distancia = distancia
      }
    },
    [aCoordenadasVB, panearPx, zoomEn],
  )

  // Referencia a sí misma para poder quitarse de `window` al soltar el
  // último puntero — válido porque solo se ejecuta de forma asíncrona,
  // cuando `onFinGlobal` ya quedó completamente asignada.
  const onFinGlobal = useCallback(
    (e) => {
      punteros.current.delete(e.pointerId)
      if (punteros.current.size === 0) {
        gesto.current = null
        setEnGesto(false)
        window.removeEventListener('pointermove', onMovimientoGlobal)
        window.removeEventListener('pointerup', onFinGlobal)
        window.removeEventListener('pointercancel', onFinGlobal)
      } else if (punteros.current.size === 1) {
        const [[, restante]] = [...punteros.current.entries()]
        gesto.current = { tipo: 'pan', ultimo: restante }
      }
    },
    [onMovimientoGlobal],
  )

  const onPointerDown = useCallback(
    (e) => {
      const esPrimero = punteros.current.size === 0
      punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (punteros.current.size === 1) {
        arrastreAcumulado.current = 0
        gesto.current = { tipo: 'pan', ultimo: { x: e.clientX, y: e.clientY } }
      } else if (punteros.current.size === 2) {
        const [a, b] = [...punteros.current.values()]
        gesto.current = { tipo: 'pinch', distancia: Math.hypot(a.x - b.x, a.y - b.y) }
      }

      if (esPrimero) {
        setEnGesto(true)
        window.addEventListener('pointermove', onMovimientoGlobal)
        window.addEventListener('pointerup', onFinGlobal)
        window.addEventListener('pointercancel', onFinGlobal)
      }
    },
    [onMovimientoGlobal, onFinGlobal],
  )

  // Red de seguridad si el componente se desmonta a mitad de un gesto.
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', onMovimientoGlobal)
      window.removeEventListener('pointerup', onFinGlobal)
      window.removeEventListener('pointercancel', onFinGlobal)
    }
  }, [onMovimientoGlobal, onFinGlobal])

  // Si el gesto fue un arrastre real, se descarta el click que el navegador
  // dispara después del pointerup — si no, seleccionar un nodo se
  // interpretaría accidentalmente cada vez que se desplaza el plano.
  const onClickCapture = useCallback((e) => {
    if (arrastreAcumulado.current > UMBRAL_ARRASTRE_PX) {
      e.stopPropagation()
      arrastreAcumulado.current = 0
    }
  }, [])

  const onDoubleClick = useCallback(
    (e) => {
      const { x, y } = aCoordenadasVB(e.clientX, e.clientY)
      zoomEn(x, y, 1.7)
    },
    [aCoordenadasVB, zoomEn],
  )

  const zoomBoton = useCallback((factor) => zoomEn(50, 50, factor), [zoomEn])
  const reiniciar = useCallback(() => setTransform({ escala: 1, tx: 0, ty: 0 }), [])

  return {
    transform,
    enGesto,
    handlers: { onWheel, onPointerDown, onClickCapture, onDoubleClick },
    acercar: () => zoomBoton(1.4),
    alejar: () => zoomBoton(1 / 1.4),
    reiniciar,
    conZoom: transform.escala > 1,
    aCoordenadasVB,
  }
}
