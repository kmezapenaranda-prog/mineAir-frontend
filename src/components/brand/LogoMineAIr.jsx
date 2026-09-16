import {
  VIEWBOX,
  CASCO_D,
  NERVADURA,
  SOPORTE_LAMPARA,
  LAMPARA,
  BRILLO_LAMPARA,
  NODOS,
  LINEAS,
  ONDAS,
} from './logoPaths.js'

/**
 * Isotipo MineAIr: casco minero + red neuronal + lámpara frontal + ondas de
 * aire. Cuadrado, con ~20% de margen de seguridad ya incorporado en las
 * coordenadas (ver logoPaths.js) — usable tal cual como ícono maskable de
 * PWA. `fondo` agrega un rect de fondo a pantalla completa, necesario para
 * los íconos maskable (el SO recorta con su propia máscara y espera que el
 * ícono ya traiga fondo sólido).
 */
export function IsotipoMineAIr({ className, fondo = false, titulo = 'MineAIr' }) {
  return (
    <svg viewBox={VIEWBOX} className={className} role="img" aria-label={titulo}>
      <title>{titulo}</title>
      {fondo && <rect x="0" y="0" width="200" height="200" fill="var(--color-background)" />}

      <path d={CASCO_D} fill="var(--color-brand-teal)" />
      <rect
        x={NERVADURA.x}
        y={NERVADURA.y}
        width={NERVADURA.width}
        height={NERVADURA.height}
        rx={NERVADURA.rx}
        fill="#fff"
        opacity="0.12"
      />

      {LINEAS.map(([x1, y1, x2, y2], i) => (
        <line
          key={`linea-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="var(--color-brand-ambar)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.9"
        />
      ))}
      {NODOS.map(([x, y], i) => (
        <circle key={`nodo-${i}`} cx={x} cy={y} r="3.2" fill="var(--color-brand-ambar)" />
      ))}

      <rect
        x={SOPORTE_LAMPARA.x}
        y={SOPORTE_LAMPARA.y}
        width={SOPORTE_LAMPARA.width}
        height={SOPORTE_LAMPARA.height}
        rx={SOPORTE_LAMPARA.rx}
        fill="var(--color-foreground)"
      />
      <defs>
        <radialGradient id="mineair-lampara" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="var(--color-brand-lamp)" />
          <stop offset="100%" stopColor="var(--color-brand-ambar-deep)" />
        </radialGradient>
      </defs>
      <circle cx={LAMPARA.cx} cy={LAMPARA.cy} r={LAMPARA.r} fill="url(#mineair-lampara)" />
      <ellipse
        cx={BRILLO_LAMPARA.cx}
        cy={BRILLO_LAMPARA.cy}
        rx={BRILLO_LAMPARA.rx}
        ry={BRILLO_LAMPARA.ry}
        fill="var(--color-brand-lamp)"
        opacity="0.6"
      />

      {ONDAS.map((onda, i) => (
        <path
          key={`onda-${i}`}
          d={onda.d}
          fill="none"
          stroke="var(--color-brand-ambar)"
          strokeWidth="7"
          strokeLinecap="round"
          opacity={onda.opacity}
        />
      ))}
    </svg>
  )
}

/**
 * Lockup completo para el header: isotipo + wordmark "MineAIr" con "AI" en
 * ámbar de marca. El texto se compone como DOM real (no vectorizado) a
 * propósito: nitidez en cualquier densidad de píxeles y texto seleccionable
 * por lectores de pantalla, en vez de un <text> SVG o paths de letras.
 */
export function LockupMineAIr({ className = 'h-7' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <IsotipoMineAIr className="h-full w-auto" />
      <span className="font-display text-lg font-bold tracking-[-0.02em] text-foreground">
        Mine<span className="text-brand-ambar">AI</span>r
      </span>
    </span>
  )
}
