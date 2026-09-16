import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  UMBRALES_DEFAULT,
  CORTES_NIVEL_LECTURA,
  CORTES_NIVEL_PREDICCION,
  actualizarLimiteUmbral,
  actualizarCortes,
  restaurarUmbralesPorDefecto,
} from '../config/umbrales.js'
import { getDatosMina, guardarDatosMina, agregarFrente, eliminarFrente } from '../config/mina.js'
// NODOS/actualizarActivoNodo son metadata de configuración del prototipo,
// fuera del contrato de telemetría intercambiable (igual que
// getEstadoRepetidores en Mapa.jsx) — alta/baja no depende de si la fuente
// de datos activa es mock o edge.
import { NODOS, actualizarActivoNodo } from '../data/mock/nodos.js'
import Interruptor from '../components/Interruptor.jsx'
import { getMapaActivo, restaurarMapaDemo } from '../config/mapaStore.js'

// Sin borde/fondo propio a propósito: cada sección ya contiene su propia
// tarjeta (fila de frente, fila de nodo, tabla de umbrales, formulario de
// cortes) — envolverlas otra vez acá crearía "tarjeta dentro de tarjeta".
function Seccion({ titulo, descripcion, children }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h2>
        {descripcion && <p className="mt-0.5 text-xs text-muted-foreground">{descripcion}</p>}
      </div>
      {children}
    </section>
  )
}

const claseInput =
  'h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors duration-150 ease-out focus:border-primary'

function BotonPrimario({ children, ...props }) {
  return (
    <button
      type="button"
      className="tap-target self-start rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-transform duration-120 ease-out active:scale-95 disabled:opacity-50"
      {...props}
    >
      {children}
    </button>
  )
}

function BotonSecundario({ children, ...props }) {
  return (
    <button
      type="button"
      className="tap-target self-start rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-[border-color,transform] duration-150 ease-out hover:border-primary active:scale-95"
      {...props}
    >
      {children}
    </button>
  )
}

function SeccionDatosMina() {
  const datos = getDatosMina()
  const [nombre, setNombre] = useState(datos.nombre)
  const [municipio, setMunicipio] = useState(datos.municipio)
  const [capacidadVagoneta, setCapacidadVagoneta] = useState(datos.capacidad_ton_vagoneta)
  const [guardadoEn, setGuardadoEn] = useState(null)

  function guardar() {
    const capacidad = Number(capacidadVagoneta)
    guardarDatosMina({
      nombre: nombre.trim() || datos.nombre,
      municipio: municipio.trim(),
      capacidad_ton_vagoneta: capacidad > 0 ? capacidad : datos.capacidad_ton_vagoneta,
    })
    setGuardadoEn(Date.now())
  }

  return (
    <Seccion titulo="Datos de la mina" descripcion="Aparecen en el encabezado de los informes ANM.">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Nombre</span>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className={claseInput} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Municipio</span>
            <input
              type="text"
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
              className={claseInput}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Capacidad por vagoneta (ton)</span>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={capacidadVagoneta}
              onChange={(e) => setCapacidadVagoneta(e.target.value)}
              className={claseInput}
            />
            <span className="text-xs text-muted-foreground">
              Convierte el conteo real de vagonetas (nodos "contador") a toneladas en Panel de la mina y Registro.
            </span>
          </label>
        </div>
        <div className="flex items-center gap-3">
          <BotonPrimario onClick={guardar}>Guardar</BotonPrimario>
          {guardadoEn && <span className="text-xs text-normal">Guardado.</span>}
        </div>
      </div>
    </Seccion>
  )
}

function SeccionFrentes() {
  const [frentes, setFrentes] = useState(getDatosMina().frentes)
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [mantoNuevo, setMantoNuevo] = useState('')
  const [confirmarBaja, setConfirmarBaja] = useState(null)

  function agregar() {
    if (!nombreNuevo.trim()) return
    const actualizado = agregarFrente(nombreNuevo, mantoNuevo)
    setFrentes(actualizado.frentes)
    setNombreNuevo('')
    setMantoNuevo('')
  }

  function quitar(id) {
    if (confirmarBaja !== id) {
      setConfirmarBaja(id)
      return
    }
    const actualizado = eliminarFrente(id)
    setFrentes(actualizado.frentes)
    setConfirmarBaja(null)
  }

  return (
    <Seccion titulo="Frentes" descripcion="Alimentan el selector de frente en Registro de variables operativas.">
      <ul className="flex flex-col gap-2">
        {frentes.map((f) => (
          <li
            key={f.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{f.nombre}</p>
              <p className="text-xs text-muted-foreground">{f.manto}</p>
            </div>
            <button
              type="button"
              onClick={() => quitar(f.id)}
              disabled={frentes.length <= 1}
              className={`tap-target shrink-0 rounded-lg px-3 text-xs font-medium transition-colors duration-150 ease-out disabled:opacity-40 ${
                confirmarBaja === f.id ? 'bg-alarma text-alarma-foreground' : 'bg-surface-raised text-muted-foreground'
              }`}
            >
              {confirmarBaja === f.id ? '¿Confirmar?' : 'Eliminar'}
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Nombre del frente</span>
          <input
            type="text"
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Ej. Frente C"
            className={`${claseInput} w-40`}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Manto</span>
          <input
            type="text"
            value={mantoNuevo}
            onChange={(e) => setMantoNuevo(e.target.value)}
            placeholder="Ej. Manto 1"
            className={`${claseInput} w-32`}
          />
        </label>
        <BotonSecundario onClick={agregar}>+ Agregar</BotonSecundario>
      </div>
    </Seccion>
  )
}

function SeccionNodos() {
  const [version, setVersion] = useState(0)

  function alternar(nodeId, activo) {
    actualizarActivoNodo(nodeId, activo)
    setVersion((v) => v + 1)
  }

  return (
    <Seccion
      titulo="Nodos"
      descripcion="Los nodos corresponden al hardware desplegado (contrato de telemetría). Dar de baja retira un nodo del monitoreo en vivo — dashboard, mapa y predicciones — sin perder su historial; darlo de alta lo reincorpora."
    >
      <ul key={version} className="flex flex-col gap-2">
        {NODOS.map((n) => (
          <li
            key={n.node_id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{n.ubicacion}</p>
              <p className="text-xs text-muted-foreground">
                {n.node_id} · {n.node_type}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-muted-foreground">{n.activo !== false ? 'Activo' : 'De baja'}</span>
              <Interruptor
                etiqueta={`${n.ubicacion} activo`}
                activo={n.activo !== false}
                onCambiar={(v) => alternar(n.node_id, v)}
              />
            </div>
          </li>
        ))}
      </ul>
    </Seccion>
  )
}

function SeccionMapa() {
  const [mapa, setMapa] = useState(getMapaActivo)
  function restaurar() { setMapa(restaurarMapaDemo()) }
  return <Seccion titulo="Mapa de la mina" descripcion="Importa un plano 2D de AutoCAD mediante DXF y úsalo sin conexión.">
    <div className="panel flex flex-wrap items-center justify-between gap-4 p-4"><div><p className="font-semibold text-foreground">{mapa.nombre}</p><p className="mt-1 text-xs text-muted-foreground">Origen: {mapa.origen.formato.toUpperCase()}{mapa.origen.archivo ? ` · ${mapa.origen.archivo}` : ''} · {mapa.elementos.length} elementos</p></div><div className="flex flex-wrap gap-2"><Link to="/configuracion/mapa/importar" className="tap-target rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Importar DXF</Link>{mapa.id !== 'esquematico-demo' ? <button onClick={restaurar} className="tap-target rounded-xl border border-border px-4 text-sm">Restaurar demo</button> : null}</div></div>
  </Seccion>
}

function SeccionUmbrales() {
  const [version, setVersion] = useState(0)
  const [restaurado, setRestaurado] = useState(false)

  function commit(gas, valor) {
    const num = Number(valor)
    if (Number.isFinite(num) && num > 0) actualizarLimiteUmbral(gas, num)
    setVersion((v) => v + 1)
  }

  function restaurar() {
    restaurarUmbralesPorDefecto()
    setVersion((v) => v + 1)
    setRestaurado(true)
  }

  return (
    <Seccion
      titulo="Umbrales normativos"
      descripcion="Precargados con el Decreto 1886 de 2015. Editar el límite ajusta de inmediato las alarmas en toda la app."
    >
      <div key={version} className="overflow-x-auto rounded-lg border border-border p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Gas</th>
              <th className="px-3 py-2">Límite</th>
              <th className="px-3 py-2">Sentido</th>
              <th className="px-3 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(UMBRALES_DEFAULT).map((u) => (
              <tr key={u.gas} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-semibold text-foreground">{u.etiqueta}</td>
                <td className="px-3 py-2">
                  {u.monitoreado ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        defaultValue={u.limite}
                        onBlur={(e) => commit(u.gas, e.target.value)}
                        className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 num-critico text-foreground outline-none focus:border-primary"
                      />
                      <span className="text-xs text-muted-foreground">{u.unidad === 'pct' ? '%' : 'ppm'}</span>
                    </div>
                  ) : (
                    <span className="num-critico text-muted-foreground">
                      {u.limite} {u.unidad === 'pct' ? '%' : 'ppm'}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{u.sentido === 'minimo' ? 'mínimo' : 'máximo'}</td>
                <td className="px-3 py-2">
                  {u.monitoreado ? (
                    <span className="text-normal">Monitoreado</span>
                  ) : (
                    <span className="text-muted-foreground">No monitoreado (sin hardware)</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <BotonSecundario onClick={restaurar}>Restaurar valores del Decreto 1886</BotonSecundario>
        {restaurado && <span className="text-xs text-normal">Restaurado.</span>}
      </div>
    </Seccion>
  )
}

function FormularioCortes({ titulo, descripcion, cortesActuales, tipo }) {
  const [precaucion, setPrecaucion] = useState(Math.round(cortesActuales.precaucion * 100))
  const [alarma, setAlarma] = useState(Math.round(cortesActuales.alarma * 100))
  const [error, setError] = useState(null)
  const [guardado, setGuardado] = useState(false)

  function guardar() {
    const p = Number(precaucion) / 100
    const a = Number(alarma) / 100
    if (!(p < a)) {
      setError('El corte de precaución debe ser menor que el de alarma.')
      setGuardado(false)
      return
    }
    setError(null)
    actualizarCortes(tipo, { precaucion: p, alarma: a })
    setGuardado(true)
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
      <p className="text-sm font-medium text-foreground">{titulo}</p>
      <p className="text-xs text-muted-foreground">{descripcion}</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Precaución (%)</span>
          <input
            type="number"
            min="1"
            max="99"
            value={precaucion}
            onChange={(e) => setPrecaucion(e.target.value)}
            className={`${claseInput} w-24`}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Alarma (%)</span>
          <input
            type="number"
            min="1"
            max="200"
            value={alarma}
            onChange={(e) => setAlarma(e.target.value)}
            className={`${claseInput} w-24`}
          />
        </label>
        <BotonSecundario onClick={guardar}>Guardar</BotonSecundario>
      </div>
      {error && (
        <span role="alert" className="text-xs font-medium text-alarma">
          {error}
        </span>
      )}
      {guardado && !error && <span className="text-xs text-normal">Guardado.</span>}
    </div>
  )
}

function SeccionCortes() {
  return (
    <Seccion
      titulo="Cortes de nivel de alerta"
      descripcion="Definen a partir de qué punto una lectura o predicción pasa de precaución a alarma."
    >
      <FormularioCortes
        titulo="Lectura de gas"
        descripcion="Como % del límite normativo del gas."
        cortesActuales={CORTES_NIVEL_LECTURA}
        tipo="lectura"
      />
      <FormularioCortes
        titulo="Probabilidad de predicción"
        descripcion="Como % de probabilidad de superar el umbral normativo."
        cortesActuales={CORTES_NIVEL_PREDICCION}
        tipo="prediccion"
      />
    </Seccion>
  )
}

export default function Configuracion() {
  return (
    <div className="animate-enter flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Datos de la mina, frentes, nodos, umbrales normativos y cortes de alerta.
        </p>
      </div>

      <SeccionDatosMina />
      <SeccionFrentes />
      <SeccionMapa />
      <SeccionNodos />
      <SeccionUmbrales />
      <SeccionCortes />
    </div>
  )
}
