import { Suspense } from 'react'
import { Outlet, Link } from 'react-router-dom'
import BottomNav from './BottomNav.jsx'
import EstadoConexion from './EstadoConexion.jsx'
import { LockupMineAIr } from '../brand/LogoMineAIr.jsx'
import CentroAlarmas from '../alarmas/CentroAlarmas.jsx'
import Skeleton from '../Skeleton.jsx'

function CargandoRuta() {
  return (
    <div role="status" aria-label="Cargando sección" className="flex flex-col gap-4">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="grid gap-3 md:grid-cols-2"><Skeleton className="h-36" /><Skeleton className="h-36" /></div>
    </div>
  )
}

/**
 * Shell de la app: mobile-first (nav inferior), con sidebar en pantallas
 * anchas como uso secundario. El estado de conexión vive en el header y es
 * visible en todas las pantallas sin excepción.
 */
export default function AppShell() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[1600px] md:grid md:grid-cols-[230px_minmax(0,1fr)] lg:p-5">
      <aside className="hidden border-r border-border/70 bg-surface/80 md:flex md:flex-col lg:rounded-l-[28px] lg:border lg:border-r-0">
        <Link to="/" className="px-6 pt-7 pb-5">
          <LockupMineAIr className="h-8" />
        </Link>
        <BottomNav orientacion="vertical" />
      </aside>

      {/* flex-1 acá es de ANCHO (fila de arriba: hermano del aside oculto en
          móvil, toma el resto del ancho). min-w-0 es necesario porque, sin
          eso, un ítem flex no puede encogerse más allá del ancho mínimo de
          SU contenido — cualquier cosa sin min-w-0 propio, en cualquier
          profundidad del árbol de abajo, podía empujar TODA la página más
          ancha que la pantalla. Sin min-height acá: el alto lo da el
          contenido real (header + main), no un piso artificial. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl md:justify-end md:px-7 lg:rounded-tr-[28px] lg:border-x lg:border-t lg:bg-surface/70">
          <Link to="/" className="tap-target md:hidden">
            <LockupMineAIr className="h-6" />
          </Link>
          <EstadoConexion />
        </header>

        <CentroAlarmas />

        {/* Sin flex-1: main mide lo que su contenido necesita, no se estira
            a llenar el resto de la pantalla en páginas cortas (eso era lo
            que dejaba "espacio vacío" desplazable debajo del contenido). */}
        <main className="min-w-0 px-4 py-5 pb-24 md:border-x md:border-b md:border-border/70 md:px-7 md:py-7 md:pb-8 lg:rounded-br-[28px]">
          <Suspense fallback={<CargandoRuta />}>
            <Outlet />
          </Suspense>
        </main>

        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  )
}
