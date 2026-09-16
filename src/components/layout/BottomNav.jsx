import { NavLink } from 'react-router-dom'
import { IconoDashboard, IconoMapa, IconoPrediccion, IconoRegistro, IconoConfig } from './iconos.jsx'

const ITEMS = [
  { to: '/', label: 'Panel', Icono: IconoDashboard, fin: true },
  { to: '/mapa', label: 'Mapa', Icono: IconoMapa },
  { to: '/predicciones', label: 'Predicción', Icono: IconoPrediccion },
  { to: '/registro', label: 'Registro', Icono: IconoRegistro },
  { to: '/configuracion', label: 'Ajustes', Icono: IconoConfig },
]

/**
 * Navegación inferior — uso principal en celular. El escritorio reutiliza
 * el mismo componente como barra lateral (ver AppShell).
 */
export default function BottomNav({ orientacion = 'horizontal' }) {
  const esVertical = orientacion === 'vertical'
  return (
    <nav
      className={
        esVertical
          ? 'flex flex-col gap-1.5 p-3'
          : 'fixed inset-x-3 bottom-3 z-40 flex rounded-2xl border border-border/80 bg-surface/90 p-1 shadow-2xl backdrop-blur-xl'
      }
      aria-label="Navegación principal"
    >
      {ITEMS.map(({ to, label, Icono, fin }) => (
        <NavLink
          key={to}
          to={to}
          end={fin}
          className={({ isActive }) =>
            [
              'flex items-center gap-2 transition-colors',
              esVertical
                ? 'rounded-xl px-3 py-3 text-sm'
                : 'flex-1 flex-col justify-center gap-0.5 rounded-xl py-2 text-[10px]',
              isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-surface-raised/60 hover:text-foreground',
            ].join(' ')
          }
        >
          <Icono width={esVertical ? 20 : 22} height={esVertical ? 20 : 22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
