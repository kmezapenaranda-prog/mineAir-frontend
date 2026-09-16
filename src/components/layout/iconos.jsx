// Set mínimo de iconos inline (sin dependencia externa). trazo uniforme 1.8.
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
  width: 22,
  height: 22,
  'aria-hidden': true,
}

export function IconoDashboard(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.2" />
      <rect x="14" y="3" width="7" height="5" rx="1.2" />
      <rect x="14" y="12" width="7" height="9" rx="1.2" />
      <rect x="3" y="16" width="7" height="5" rx="1.2" />
    </svg>
  )
}

export function IconoMapa(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  )
}

export function IconoPrediccion(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 17 9 9l4 4 8-9" />
      <path d="M15 4h6v6" />
    </svg>
  )
}

export function IconoRegistro(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M15 3v4h4M9 12h6M9 16h6M9 8h3" />
    </svg>
  )
}

export function IconoConfig(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.64 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.64a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.64a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.36 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  )
}

export function IconoReporte(props) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  )
}

export function IconoSenal(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 18h.01M8 18v-4M12 18v-8M16 18v-12" />
    </svg>
  )
}

export function IconoSinSenal(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 18h.01M8 18v-4M12 18v-8M16 18v-12" opacity="0.35" />
      <path d="M3 3l18 18" />
    </svg>
  )
}

export function IconoAtmosfera(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 8h11.5a3 3 0 1 0-2.8-4" />
      <path d="M3 13.5h15.5a3 3 0 1 1-2.8 4" />
      <path d="M3 19h8.5" />
    </svg>
  )
}

export function IconoRiesgo(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 13h3.5l2-5 3.5 11 2.5-9 1.5 3H21" />
    </svg>
  )
}

export function IconoRed(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="6" cy="6" r="2.3" />
      <circle cx="18" cy="6" r="2.3" />
      <circle cx="12" cy="18" r="2.3" />
      <path d="M8.1 6h7.8M8.9 8 11 16M15.1 8 13 16" />
    </svg>
  )
}

export function IconoAlarma(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3a5 5 0 0 0-5 5v3.3c0 .85-.32 1.66-.9 2.27L4 16h16l-2.1-2.43a3.3 3.3 0 0 1-.9-2.27V8a5 5 0 0 0-5-5Z" />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
    </svg>
  )
}
