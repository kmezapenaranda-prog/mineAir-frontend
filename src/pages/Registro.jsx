import { useCargaPeriodica } from '../lib/useCargaPeriodica.js'
import { inicioTurnoActual } from '../lib/turnos.js'
import { cloneElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { postVariablesOperativas, getNodos } from '../data/index.js'
import { getDatosMina } from '../config/mina.js'
import { produccionDelRegistro } from '../lib/produccion.js'
import Interruptor from '../components/Interruptor.jsx'
import { validarRegistro } from '../lib/validarRegistro.js'

const ULTIMO_REGISTRADO_POR_KEY = 'mineair.ultimo_registrado_por'

function fechaHoy() {
  const d = inicioTurnoActual()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function horaAhora() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Mismos cortes de turno que src/data/mock/fisica.js (produccionEnHora) y
// VOLADURAS_HORA — el formulario asume el turno que está corriendo ahora,
// el caso más común al cerrarlo.
function turnoActual() {
  const h = new Date().getHours()
  if (h >= 6 && h < 14) return 'manana'
  if (h >= 14 && h < 22) return 'tarde'
  return 'noche'
}

function ultimoRegistradoPor() {
  try {
    return window.localStorage.getItem(ULTIMO_REGISTRADO_POR_KEY) ?? ''
  } catch {
    return ''
  }
}

function recordarRegistradoPor(valor) {
  try {
    window.localStorage.setItem(ULTIMO_REGISTRADO_POR_KEY, valor)
  } catch {
    // No crítico: el formulario sigue funcionando sin recordar el último usuario.
  }
}

function estadoInicial(frentes) {
  const frente = frentes[0]
  return {
    fecha: fechaHoy(),
    turno: turnoActual(),
    frente: frente.id,
    manto: frente.manto,
    produccion_ton: '',
    produccion_origen: 'estimada',
    indice_gasificacion_m3_ton: '',
    ventilador_principal_on: true,
    caudal_m3_s: '',
    voladuras: [],
    observaciones: '',
    registrado_por: ultimoRegistradoPor(),
  }
}

const TURNOS = [
  { valor: 'manana', etiqueta: 'Mañana' },
  { valor: 'tarde', etiqueta: 'Tarde' },
  { valor: 'noche', etiqueta: 'Noche' },
]

const PASOS = ['Turno', 'Producción', 'Ventilación', 'Voladuras', 'Cierre']

function Chip({ activo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`tap-target shrink-0 rounded-full px-3 text-sm font-medium transition-[color,background-color,transform] duration-150 ease-out active:scale-95 ${
        activo ? 'bg-primary text-primary-foreground' : 'bg-surface-raised text-muted-foreground'
      }`}
    >
      {children}
    </button>
  )
}

function Campo({ etiqueta, error, children, id }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{etiqueta}</span>
      {cloneElement(children, { 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined })}
      {error && (
        <span id={`${id}-error`} role="alert" className="text-xs font-medium text-alarma">
          {error}
        </span>
      )}
    </label>
  )
}

const claseInput =
  'h-11 rounded-lg border border-border bg-surface px-3 text-base text-foreground outline-none transition-colors duration-150 ease-out focus:border-primary'

// Transición de paso reutilizando el mismo patrón de doble rAF que Drawer.jsx
// (ver componente): arranca oculto, se hace visible en el frame siguiente al
// montaje para que la transición CSS sí dispare. Se remonta por `key` en
// cada cambio de paso.
function PasoAnimado({ pasoKey, children }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(false)
    let id2
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setVisible(true))
    })
    return () => {
      cancelAnimationFrame(id1)
      if (id2) cancelAnimationFrame(id2)
    }
  }, [pasoKey])

  return (
    <div
      className={`flex flex-col gap-4 transition-[opacity,transform] duration-200 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
    >
      {children}
    </div>
  )
}

export default function Registro() {
  const datosMina = getDatosMina()
  const [form, setForm] = useState(() => estadoInicial(datosMina.frentes))
  const [paso, setPaso] = useState(0)
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(null)
  const [errorGuardado, setErrorGuardado] = useState(null)
  const [persistencia, setPersistencia] = useState(null)
  const guardandoRef = useRef(false)
  const pasoRef = useRef(null)
  const guardadoRef = useRef(null)
  const focoPendiente = useRef(null)
  const anuncioRef = useRef(null)
  const cargarProduccion = useCallback(async () => produccionDelRegistro(await getNodos(), {
    fecha: form.fecha, turno: form.turno, frente: form.frente,
  }), [form.fecha, form.turno, form.frente])
  const cargaProduccion = useCargaPeriodica(cargarProduccion)
  const produccionContada = cargaProduccion.datos
  const errorContador = cargaProduccion.error

  function set(clave, valor) {
    setForm((f) => ({ ...f, [clave]: valor, ...(['fecha', 'turno'].includes(clave) && f.produccion_origen === 'contada' ? { produccion_ton: '', produccion_origen: 'estimada' } : {}) }))
  }

  function elegirFrente(frenteId) {
    const frente = datosMina.frentes.find((f) => f.id === frenteId)
    setForm((f) => ({ ...f, frente: frenteId, manto: frente?.manto ?? f.manto, ...(f.produccion_origen === 'contada' ? { produccion_ton: '', produccion_origen: 'estimada' } : {}) }))
  }

  function agregarVoladura() {
    setForm((f) => ({ ...f, voladuras: [...f.voladuras, { hora: horaAhora(), cantidad_kg: '' }] }))
  }

  function actualizarVoladura(indice, clave, valor) {
    setForm((f) => ({
      ...f,
      voladuras: f.voladuras.map((v, i) => (i === indice ? { ...v, [clave]: valor } : v)),
    }))
  }

  function quitarVoladura(indice) {
    setForm((f) => ({ ...f, voladuras: f.voladuras.filter((_, i) => i !== indice) }))
  }

  function validarPaso(indice) {
    const e = validarRegistro(form, indice)
    setErrores(e)
    if (Object.keys(e).length) focoPendiente.current = Object.keys(e)[0]
    return Object.keys(e).length === 0
  }

  useEffect(() => {
    if (focoPendiente.current && focoPendiente.current !== 'paso') {
      document.getElementById(focoPendiente.current)?.focus()
      focoPendiente.current = null
    }
  }, [errores])

  function siguiente() {
    if (!validarPaso(paso)) return
    focoPendiente.current = 'paso'
    setPaso((p) => Math.min(p + 1, PASOS.length - 1))
  }

  function atras() {
    setErrores({})
    focoPendiente.current = 'paso'
    setPaso((p) => Math.max(p - 1, 0))
  }

  async function guardar() {
    if (guardandoRef.current) return
    for (let i = 0; i < PASOS.length; i++) {
      if (!validarPaso(i)) { setPaso(i); return }
    }
    guardandoRef.current = true
    setGuardando(true)
    setErrorGuardado(null)
    const payload = {
      schema_v: '1.0',
      fecha: form.fecha,
      turno: form.turno,
      frente: form.frente,
      manto: form.manto,
      produccion_ton: Number(form.produccion_ton),
      produccion_origen: form.produccion_origen,
      indice_gasificacion_m3_ton: Number(form.indice_gasificacion_m3_ton),
      ventilador_principal_on: form.ventilador_principal_on,
      caudal_m3_s: Number(form.caudal_m3_s),
      voladuras: form.voladuras
        .map((v) => ({ hora: v.hora, cantidad_kg: Number(v.cantidad_kg) })),
      observaciones: form.observaciones.trim(),
      registrado_por: form.registrado_por.trim(),
    }
    recordarRegistradoPor(payload.registrado_por)
    try {
      const resultado = await postVariablesOperativas(payload)
      if (!resultado?.registro || resultado.ok === false) throw new Error('Registro no confirmado')
      setPersistencia(resultado.persistencia ?? 'servidor')
      setGuardado(resultado.registro)
    } catch {
      setErrorGuardado('No se pudo confirmar el guardado. Tus datos siguen en el formulario. Comprueba la conexión; antes de reintentar, verifica si el servicio recibió el registro para evitar duplicados.')
    } finally {
      guardandoRef.current = false
      setGuardando(false)
    }
  }

  function registrarOtro() {
    setForm(estadoInicial(datosMina.frentes))
    setErrores({})
    setPaso(0)
    setGuardado(null)
    setErrorGuardado(null)
    focoPendiente.current = 'paso'
  }

  useEffect(() => {
    if (guardado) guardadoRef.current?.focus()
    if (anuncioRef.current) anuncioRef.current.textContent = `Paso ${paso + 1} de ${PASOS.length}: ${PASOS[paso]}`
    if (focoPendiente.current === 'paso') {
      pasoRef.current?.focus()
      focoPendiente.current = null
    }
  }, [paso, guardado])

  const pctProgreso = useMemo(() => ((paso + 1) / PASOS.length) * 100, [paso])

  if (guardado) {
    return (
      <div className="animate-enter flex min-h-[60dvh] flex-col items-center justify-center gap-3 rounded-xl border border-normal/30 bg-normal/10 p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-normal/20 text-2xl text-normal">
          ✓
        </span>
        <p ref={guardadoRef} tabIndex={-1} role="status" className="text-lg font-semibold text-foreground">{persistencia === 'sesion' ? 'Registro conservado solo en esta sesión' : 'Registro guardado'}</p>
        {persistencia === 'sesion' && <p role="alert" className="max-w-sm text-sm text-precaucion">El almacenamiento no está disponible. Descarga una copia antes de cerrar o recargar; de lo contrario perderás este registro.</p>}
        {persistencia === 'local' && <p className="max-w-sm text-sm text-muted-foreground">Guardado en este dispositivo. No se ha enviado al servicio predictivo.</p>}
        <p className="max-w-sm text-sm text-muted-foreground">
          {guardado.frente} · {guardado.turno} · {new Date(guardado.registrado_en).toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
          })}
          .
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {persistencia === 'sesion' && <button type="button" className="tap-target rounded-lg bg-primary px-4 text-sm text-primary-foreground" onClick={() => {
            const url = URL.createObjectURL(new Blob([JSON.stringify(guardado, null, 2)], { type: 'application/json' }))
            const enlace = document.createElement('a')
            enlace.href = url
            enlace.download = `registro-${guardado.fecha}.json`
            enlace.click()
            setTimeout(() => URL.revokeObjectURL(url), 1000)
          }}>Descargar copia</button>}
          <button
            type="button"
            onClick={registrarOtro}
            className="tap-target rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-transform duration-120 ease-out active:scale-95"
          >
            Registrar otro
          </button>
          <Link
            to="/reportes"
            className="tap-target rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-[border-color,transform] duration-150 ease-out hover:border-primary active:scale-95"
          >
            Ver reportes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-enter flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Registro de variables operativas</h1>
        <p className="text-sm text-muted-foreground">Cierre de turno — alimenta al modelo predictivo.</p>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Paso {paso + 1} de {PASOS.length}
          </span>
          <span ref={pasoRef} id="paso" tabIndex={-1}>{PASOS[paso]}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised">
          <div
            className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-200 ease-out"
            style={{ transform: `scaleX(${pctProgreso / 100})` }}
          />
        </div>
        <p ref={anuncioRef} aria-live="polite" className="sr-only" />
      </div>

      <fieldset disabled={guardando} className="min-w-0 rounded-xl border border-border bg-surface p-4">
        <legend className="sr-only">{PASOS[paso]}</legend>
        <PasoAnimado pasoKey={paso}>
          {paso === 0 && (
            <>
              <Campo etiqueta="Fecha" id="fecha" error={errores.fecha}>
                <input
                  id="fecha"
                  type="date"
                  value={form.fecha}
                  onChange={(e) => set('fecha', e.target.value)}
                  className={claseInput}
                />
              </Campo>

              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-foreground">Turno</legend>
                <div className="flex flex-wrap gap-2">
                  {TURNOS.map((t) => (
                    <Chip key={t.valor} activo={form.turno === t.valor} onClick={() => set('turno', t.valor)}>
                      {t.etiqueta}
                    </Chip>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-foreground">Frente</legend>
                <div className="flex flex-wrap gap-2">
                  {datosMina.frentes.map((f) => (
                    <Chip key={f.id} activo={form.frente === f.id} onClick={() => elegirFrente(f.id)}>
                      {f.nombre}
                    </Chip>
                  ))}
                </div>
              </fieldset>

              <Campo etiqueta="Manto" id="manto" error={errores.manto}>
                <input
                  id="manto"
                  type="text"
                  value={form.manto}
                  onChange={(e) => set('manto', e.target.value)}
                  className={claseInput}
                />
              </Campo>
            </>
          )}

          {paso === 1 && (
            <>
              {errorContador && <p role="status" className="text-sm text-precaucion">No se pudo consultar el contador. Puedes ingresar la producción estimada manualmente.</p>}
              {produccionContada && !errorContador && !produccionContada.sinContadores && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 p-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Contado para {form.fecha} · {form.turno} · frente {form.frente}</p>
                    <p className="num-critico text-lg text-foreground">
                      {produccionContada.toneladas} ton{' '}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({produccionContada.vagonetas} vagonetas)
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        produccion_ton: String(produccionContada.toneladas),
                        produccion_origen: 'contada',
                      }))
                    }
                    className="tap-target shrink-0 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-transform duration-120 ease-out active:scale-95"
                  >
                    Usar este valor
                  </button>
                </div>
              )}

              <Campo etiqueta="Producción del turno (ton)" id="produccion" error={errores.produccion}>
                <input
                  id="produccion"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={form.produccion_ton}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, produccion_ton: e.target.value, produccion_origen: 'estimada' }))
                  }
                  className={claseInput}
                  placeholder="Ej. 42.5"
                />
              </Campo>

              <Campo
                etiqueta="Índice de gasificación (m³/ton)"
                id="gasificacion"
                error={errores.gasificacion}
              >
                <input
                  id="gasificacion"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={form.indice_gasificacion_m3_ton}
                  onChange={(e) => set('indice_gasificacion_m3_ton', e.target.value)}
                  className={claseInput}
                  placeholder="Ej. 8.2"
                />
              </Campo>
            </>
          )}

          {paso === 2 && (
            <>
              <div className="flex items-center justify-between gap-3">
                <span id="lbl-ventilador" className="text-sm font-medium text-foreground">
                  Ventilador principal
                </span>
                <Interruptor
                  id="ventilador"
                  etiqueta="Ventilador principal"
                  activo={form.ventilador_principal_on}
                  onCambiar={(v) => set('ventilador_principal_on', v)}
                />
              </div>

              <Campo etiqueta="Caudal (m³/s)" id="caudal" error={errores.caudal}>
                <input
                  id="caudal"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={form.caudal_m3_s}
                  onChange={(e) => set('caudal_m3_s', e.target.value)}
                  className={claseInput}
                  placeholder="Ej. 12.4"
                />
              </Campo>
            </>
          )}

          {paso === 3 && (
            <>
              {form.voladuras.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin voladuras registradas en este turno.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {form.voladuras.map((v, i) => (
                    <li key={i} className="flex flex-wrap items-end gap-2">
                      <Campo etiqueta="Hora" id={`voladura-hora-${i}`} error={errores[`voladura-hora-${i}`]}>
                        <input
                          id={`voladura-hora-${i}`}
                          type="time"
                          value={v.hora}
                          onChange={(e) => actualizarVoladura(i, 'hora', e.target.value)}
                          className={`${claseInput} w-full`}
                        />
                      </Campo>
                      <Campo etiqueta="Kg" id={`voladura-kg-${i}`} error={errores[`voladura-kg-${i}`]}>
                        <input
                          id={`voladura-kg-${i}`}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          value={v.cantidad_kg}
                          onChange={(e) => actualizarVoladura(i, 'cantidad_kg', e.target.value)}
                          className={`${claseInput} w-24`}
                        />
                      </Campo>
                      <button
                        type="button"
                        onClick={() => quitarVoladura(i)}
                        aria-label={`Quitar voladura ${i + 1}`}
                        className="tap-target rounded-lg bg-surface-raised text-sm text-muted-foreground transition-transform duration-120 ease-out active:scale-95"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={agregarVoladura}
                className="tap-target self-start rounded-lg border border-dashed border-border px-3 text-sm font-medium text-primary transition-[border-color,transform] duration-150 ease-out hover:border-primary active:scale-95"
              >
                + Agregar voladura
              </button>
            </>
          )}

          {paso === 4 && (
            <>
              <Campo etiqueta="Observaciones" id="observaciones">
                <textarea
                  id="observaciones"
                  value={form.observaciones}
                  onChange={(e) => set('observaciones', e.target.value)}
                  rows={3}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-base text-foreground outline-none transition-colors duration-150 ease-out focus:border-primary"
                  placeholder="Ej. Se detectó filtración en zona sellada norte"
                />
              </Campo>

              <Campo etiqueta="Registrado por" id="registrado_por" error={errores.registrado_por}>
                <input
                  id="registrado_por"
                  type="text"
                  value={form.registrado_por}
                  onChange={(e) => set('registrado_por', e.target.value)}
                  className={claseInput}
                  placeholder="Nombre o ID"
                />
              </Campo>

              <div className="rounded-lg bg-surface-raised p-3 text-sm text-muted-foreground">
                <p className="mb-1 font-semibold text-foreground">Resumen</p>
                <p>
                  {form.fecha} · {form.turno} · {datosMina.frentes.find((f) => f.id === form.frente)?.nombre} ·{' '}
                  {form.manto}
                </p>
                <p>
                  Producción {form.produccion_ton || 0} ton · Gasificación {form.indice_gasificacion_m3_ton || 0} m³/ton
                </p>
                <p>
                  Ventilador {form.ventilador_principal_on ? 'encendido' : 'apagado'} · Caudal{' '}
                  {form.caudal_m3_s || 0} m³/s
                </p>
                <p>{form.voladuras.length} voladura(s) registrada(s)</p>
              </div>
            </>
          )}
        </PasoAnimado>
      </fieldset>

      {errorGuardado && <p role="alert" className="rounded-lg border border-alarma/40 bg-alarma/10 p-3 text-sm text-alarma">{errorGuardado}</p>}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={atras}
          disabled={paso === 0 || guardando}
          className="tap-target rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-[border-color,transform] duration-150 ease-out hover:border-primary active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        >
          ← Atrás
        </button>

        {paso < PASOS.length - 1 ? (
          <button
            type="button"
            onClick={siguiente}
            className="tap-target rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform duration-120 ease-out active:scale-95"
          >
            Siguiente →
          </button>
        ) : (
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="tap-target rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform duration-120 ease-out active:scale-95 disabled:opacity-60"
          >
            {guardando ? 'Guardando…' : 'Guardar registro'}
          </button>
        )}
      </div>
    </div>
  )
}
