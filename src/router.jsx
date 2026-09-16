import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import AppShell from './components/layout/AppShell.jsx'
import NoEncontrada from './pages/NoEncontrada.jsx'

// Code-splitting por ruta: cada pantalla es su propio chunk, para que una
// librería pesada de una sola pantalla (ej. Recharts en DetalleNodo) no
// viaje en el bundle inicial de las demás — clave en una app que se usa con
// conectividad intermitente. El fallback de carga vive en AppShell.
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Mapa = lazy(() => import('./pages/Mapa.jsx'))
const DetalleNodo = lazy(() => import('./pages/DetalleNodo.jsx'))
const Predicciones = lazy(() => import('./pages/Predicciones.jsx'))
const Registro = lazy(() => import('./pages/Registro.jsx'))
const Reportes = lazy(() => import('./pages/Reportes.jsx'))
const Configuracion = lazy(() => import('./pages/Configuracion.jsx'))
const ImportarMapa = lazy(() => import('./pages/ImportarMapa.jsx'))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'mapa', element: <Mapa /> },
      { path: 'nodo/:id', element: <DetalleNodo /> },
      { path: 'predicciones', element: <Predicciones /> },
      { path: 'registro', element: <Registro /> },
      { path: 'reportes', element: <Reportes /> },
      { path: 'configuracion', element: <Configuracion /> },
      { path: 'configuracion/mapa/importar', element: <ImportarMapa /> },
      { path: '*', element: <NoEncontrada /> },
    ],
  },
])
