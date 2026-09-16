import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getNodos } from '../../data/index.js'
import {
  cargarEstadoAlarmas,
  confirmarAlarma,
  descripcionAlarma,
  detectarAlarmasCriticas,
  guardarEstadoAlarmas,
  reconciliarAlarmas,
} from '../../lib/alarmas.js'
import { IconoAlarma } from '../layout/iconos.jsx'

async function mostrarNotificacion(alarma, escalada = false) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false
  const opciones = {
    body: descripcionAlarma(alarma),
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: `mineair-${alarma.id}${escalada ? '-escalada' : ''}`,
    renotify: escalada,
    requireInteraction: true,
    data: { url: `/nodo/${alarma.nodeId}` },
    actions: [{ action: 'ver', title: 'Ver nodo' }],
  }
  if ('serviceWorker' in navigator) {
    const registro = await navigator.serviceWorker.ready
    await registro.showNotification(escalada ? 'ALARMA SIN CONFIRMAR · MineAIr' : `Alarma crítica · ${alarma.etiqueta}`, opciones)
  } else {
    new Notification(`Alarma crítica · ${alarma.etiqueta}`, opciones)
  }
  return true
}

function sonarAlarma() {
  const AudioContext = window.AudioContext ?? window.webkitAudioContext
  if (!AudioContext) return
  const contexto = new AudioContext()
  const ganancia = contexto.createGain()
  ganancia.gain.setValueAtTime(0.0001, contexto.currentTime)
  ganancia.gain.exponentialRampToValueAtTime(0.18, contexto.currentTime + 0.02)
  ganancia.gain.exponentialRampToValueAtTime(0.0001, contexto.currentTime + 0.7)
  ganancia.connect(contexto.destination)
  for (const [frecuencia, inicio] of [[880, 0], [660, 0.25], [880, 0.5]]) {
    const oscilador = contexto.createOscillator()
    oscilador.frequency.value = frecuencia
    oscilador.connect(ganancia)
    oscilador.start(contexto.currentTime + inicio)
    oscilador.stop(contexto.currentTime + inicio + 0.18)
  }
  setTimeout(() => contexto.close(), 1000)
}

export default function CentroAlarmas() {
  const [estado, setEstado] = useState(cargarEstadoAlarmas)
  const [permiso, setPermiso] = useState(() => 'Notification' in window ? Notification.permission : 'unsupported')
  const montado = useRef(true)

  const actualizar = useCallback(async () => {
    try {
      const nodos = await getNodos()
      if (!montado.current) return
      setEstado((previo) => reconciliarAlarmas(detectarAlarmasCriticas(nodos), previo, Date.now(), nodos))
    } catch {
      // Estado de conexión ya informa la caída; conservar alarmas activas evita falsos despejes.
    }
  }, [])

  useEffect(() => {
    montado.current = true
    actualizar()
    const intervalo = setInterval(actualizar, 15000)
    return () => { montado.current = false; clearInterval(intervalo) }
  }, [actualizar])

  useEffect(() => {
    guardarEstadoAlarmas(estado)
    for (const alarma of Object.values(estado)) {
      if (!alarma.confirmadaEn && (!alarma.notificada || (alarma.escalada && !alarma.escaladaNotificada))) {
        mostrarNotificacion(alarma, alarma.escalada).then((mostrada) => {
          if (!mostrada || !montado.current) return
          setEstado((actual) => actual[alarma.id]
            ? { ...actual, [alarma.id]: {
              ...actual[alarma.id],
              notificada: true,
              escaladaNotificada: alarma.escalada || actual[alarma.id].escaladaNotificada,
            } }
            : actual)
        })
      }
    }
  }, [estado])

  const alarmas = useMemo(() => Object.values(estado).sort((a, b) => Number(b.escalada) - Number(a.escalada)), [estado])
  const pendientes = alarmas.filter((alarma) => !alarma.confirmadaEn)
  if (alarmas.length === 0) {
    if (permiso !== 'default') return null
    return (
      <section className="border-b border-border/60 bg-surface/55 px-4 py-2 md:px-7" aria-label="Configuración de alertas críticas">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Recibe avisos de alarmas críticas mientras MineAIr esté ejecutándose.</p>
          <button type="button" onClick={activarNotificaciones} className="tap-target shrink-0 rounded-lg border border-primary/45 px-3 text-xs font-bold text-primary">
            Activar alertas
          </button>
        </div>
      </section>
    )
  }

  async function activarNotificaciones() {
    const siguiente = await Notification.requestPermission()
    setPermiso(siguiente)
    if (siguiente === 'granted') {
      sonarAlarma()
      for (const alarma of pendientes) await mostrarNotificacion(alarma, alarma.escalada)
      setEstado((actual) => Object.fromEntries(Object.entries(actual).map(([id, alarma]) => [id, {
        ...alarma,
        notificada: true,
        escaladaNotificada: alarma.escalada || alarma.escaladaNotificada,
      }])))
    }
  }

  function confirmar(id) {
    setEstado((actual) => confirmarAlarma(actual, id))
  }

  return (
    <section className="border-b border-alarma/45 bg-alarma/12 px-4 py-3 md:px-7" aria-labelledby="titulo-alarmas" aria-live="assertive">
      <div className="mx-auto flex max-w-5xl flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-alarma">
            <IconoAlarma width={22} height={22} />
            <h2 id="titulo-alarmas" className="text-base font-bold">
              {pendientes.length ? `${pendientes.length} alarma${pendientes.length === 1 ? '' : 's'} por confirmar` : 'Alarmas confirmadas en seguimiento'}
            </h2>
          </div>
          {permiso === 'default' && (
            <button type="button" onClick={activarNotificaciones} className="tap-target rounded-lg bg-alarma px-3 text-sm font-bold text-alarma-foreground">
              Activar avisos
            </button>
          )}
          {permiso === 'denied' && <p className="text-xs text-alarma">Notificaciones bloqueadas en el navegador</p>}
        </div>
        <div className="grid gap-2">
          {alarmas.map((alarma) => (
            <article key={alarma.id} className="flex flex-col gap-3 rounded-xl bg-background/55 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-bold text-foreground">
                  {alarma.escalada && !alarma.confirmadaEn ? 'SIN CONFIRMAR · ' : ''}{alarma.etiqueta} · {alarma.valor} {alarma.unidad}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{alarma.ubicacion} · límite {alarma.limite} {alarma.unidad}</p>
                {alarma.pendienteVerificacion && <p className="mt-1 text-sm text-precaucion">Sin lectura vigente: alarma pendiente de verificación.</p>}
                {alarma.confirmadaEn && <p className="mt-1 text-xs text-normal">Recepción confirmada · requiere seguimiento operativo</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <Link to={`/nodo/${alarma.nodeId}`} className="tap-target rounded-lg border border-alarma/50 px-3 text-sm font-semibold text-foreground">Ver nodo</Link>
                {!alarma.confirmadaEn && <button type="button" onClick={() => confirmar(alarma.id)} className="tap-target rounded-lg bg-alarma px-3 text-sm font-bold text-alarma-foreground">Confirmar recepción</button>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
