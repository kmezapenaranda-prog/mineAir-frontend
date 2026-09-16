import { useEffect, useState } from 'react'
import { getEstadoConexion } from '../../data/index.js'
import { IconoSenal, IconoSinSenal } from './iconos.jsx'

function formatoRelativo(iso) {
  if (!iso) return 'sin datos'
  const segundos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (segundos < 10) return 'ahora mismo'
  if (segundos < 60) return `hace ${segundos}s`
  const minutos = Math.round(segundos / 60)
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.round(minutos / 60)
  return `hace ${horas} h`
}

/**
 * Indicador de estado de conexión con el nodo de borde. Siempre visible:
 * el ingeniero nunca debe confundir un snapshot viejo con un dato en vivo.
 */
export default function EstadoConexion() {
  const [estado, setEstado] = useState(null)

  useEffect(() => {
    let cancelado = false
    async function consultar() {
      const resultado = await getEstadoConexion()
      if (!cancelado) setEstado(resultado)
    }
    consultar()
    const intervalo = setInterval(consultar, 15000)
    return () => {
      cancelado = true
      clearInterval(intervalo)
    }
  }, [])

  const online = estado?.online ?? false
  const esSimulacion = estado?.origen === 'mock'
  const etiqueta = esSimulacion ? 'Simulación' : online ? 'En vivo' : `Último dato: ${formatoRelativo(estado?.ultima_sync)}`
  const detalle = esSimulacion
    ? 'Datos simulados para demostración; el servicio ML aún no está conectado.'
    : estado
      ? `Última sincronización: ${estado.ultima_sync ?? 'desconocida'}`
      : 'Consultando estado…'

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-300 ease-out ${
        esSimulacion ? 'bg-primary/15 text-primary' : online ? 'bg-normal/15 text-normal' : 'bg-offline/15 text-offline'
      }`}
      title={detalle}
    >
      {online ? <IconoSenal width={16} height={16} /> : <IconoSinSenal width={16} height={16} />}
      <span>{etiqueta}</span>
    </div>
  )
}
