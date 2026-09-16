import { lecturaVigente } from '../../lib/vigencia.js'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { UMBRALES_DEFAULT, clasificarLectura } from '../../config/umbrales.js'
import NivelBadge from '../NivelBadge.jsx'
import { nivelDeNodo } from '../../lib/nivelNodo.js'
import { useDialogAccesible } from '../../lib/useDialogAccesible.js'

const GASES_RESUMEN = ['o2', 'ch4', 'co2', 'co', 'h2s']

function FilaGas({ gas, nodo }) {
  const umbral = UMBRALES_DEFAULT[gas]
  const campo = umbral.unidad === 'pct' ? `${gas}_pct` : `${gas}_ppm`
  const valor = lecturaVigente(nodo.ultima_lectura) ? nodo.ultima_lectura.gases[campo] : null
  const sinEquipo = nodo.node_type === 'casco' && gas === 'co2'

  return (
    <li className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{umbral.etiqueta}</span>
      {sinEquipo ? (
        <span className="text-xs text-muted-foreground">No equipado</span>
      ) : (
        <span className="flex items-center gap-2">
          <span className="num-critico">
            {valor == null ? '—' : valor}
            {valor != null && <span className="ml-0.5 text-xs font-normal text-muted-foreground">{umbral.unidad === 'pct' ? '%' : 'ppm'}</span>}
          </span>
          <NivelBadge nivel={clasificarLectura(gas, valor)} />
        </span>
      )}
    </li>
  )
}

/**
 * Resumen del nodo/repetidor seleccionado en el mapa.
 *
 * Móvil: drawer `fixed` que sube desde abajo, fuera del flujo — se
 * superpone al plano a propósito, es un bottom sheet.
 *
 * Desktop (`md:`): dueño deja de ser `fixed`/`absolute` y pasa a ser un
 * hermano flex normal de PlanoMina (ver Mapa.jsx) — así el plano se encoge
 * en vez de quedar tapado por el panel. Ningún nodo debe quedar oculto
 * detrás del panel en desktop; si vuelve a usarse `absolute` acá, ese es
 * el bug que reaparece.
 */
export default function PanelNodo({ tipo, entidad, onCerrar }) {
  const dialogRef = useDialogAccesible(Boolean(entidad), onCerrar)

  // El drawer necesita seguir montado durante la animación de salida, así
  // que `mostrado` retiene el último contenido real mientras `entidad` ya
  // volvió a null. `abierto` es lo único que dispara la transición.
  const [mostrado, setMostrado] = useState(entidad ? { tipo, entidad } : null)
  const [abierto, setAbierto] = useState(false)
  const entidadPrevRef = useRef(entidad)
  const estabaAbiertoRef = useRef(false)

  // Sincroniza el contenido DURANTE el render (no en un efecto): así el
  // <div role="dialog"> ya existe en el DOM en el mismo commit en que
  // useDialogAccesible intenta enfocar su primer elemento. Si esto viviera
  // en un efecto, llegaría un render tarde y la primera apertura perdería
  // el foco (el contenedor todavía no existiría cuando ese otro efecto
  // corre). Ver "Adjusting state when a prop changes" en la doc de React.
  if (entidad && entidad !== entidadPrevRef.current) {
    setMostrado({ tipo, entidad })
  }
  entidadPrevRef.current = entidad

  useEffect(() => {
    if (entidad) {
      if (!estabaAbiertoRef.current) {
        // Doble rAF: el primer frame confirma que el navegador ya pintó la
        // posición cerrada; recién en el segundo se pide la posición
        // abierta, si no la transición corre el riesgo de fusionarse en un
        // solo paint y saltar directo al estado final sin animar.
        let id2
        const id1 = requestAnimationFrame(() => {
          id2 = requestAnimationFrame(() => {
            estabaAbiertoRef.current = true
            setAbierto(true)
          })
        })
        return () => {
          cancelAnimationFrame(id1)
          if (id2) cancelAnimationFrame(id2)
        }
      }
      // Ya estaba abierto (se seleccionó otro nodo/repetidor sin cerrar):
      // el contenido ya se sincronizó arriba, sin repetir la animación de entrada.
    } else {
      const yaHabiaAbierto = estabaAbiertoRef.current
      estabaAbiertoRef.current = false
      setAbierto(false)
      if (!yaHabiaAbierto) {
        // Se cerró antes de que corriera el rAF de entrada: nunca hubo una
        // transición real, así que tampoco habrá `transitionend` que limpie
        // `mostrado` — se limpia ya, para no dejar el drawer montado e
        // invisible para siempre.
        setMostrado(null)
      }
    }
  }, [entidad])

  if (!mostrado) return null

  const { tipo: tipoMostrado, entidad: entidadMostrada } = mostrado

  function alTerminarTransicion(e) {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return
    if (!abierto) setMostrado(null)
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-200 ease-out md:hidden ${abierto ? 'opacity-100' : 'opacity-0'}`}
        onClick={onCerrar}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        onTransitionEnd={alTerminarTransicion}
        className={`fixed inset-x-0 bottom-16 z-40 max-h-[65dvh] overflow-y-auto overflow-x-hidden rounded-t-2xl border-t border-border bg-surface-raised shadow-2xl transition-[transform,width] duration-200 ease-drawer md:static md:inset-auto md:h-full md:max-h-none md:translate-y-0 md:shrink-0 md:rounded-none md:rounded-l-2xl md:border-t-0 ${
          // El ancho en desktop anima de 0 a 18rem junto con el mismo
          // duration/curva del translate-y en móvil: así el SVG hermano (que
          // se encoge por ser flex-1, ver Mapa.jsx) se achica en sincronía
          // con la aparición del panel en vez de saltar de golpe cuando
          // PanelNodo se monta ya a ancho completo.
          abierto ? 'translate-y-0 md:w-72 md:border-l' : 'translate-y-full md:w-0 md:border-l-0'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={entidadMostrada.ubicacion}
        tabIndex={-1}
      >
        <div className="p-4 md:w-72">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-foreground">{entidadMostrada.ubicacion}</p>
            <p className="text-xs text-muted-foreground">
              {tipoMostrado === 'repetidor' ? entidadMostrada.repetidor_id : entidadMostrada.node_id} ·{' '}
              {tipoMostrado === 'repetidor' ? 'repetidor LoRa' : entidadMostrada.node_type}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="tap-target rounded-full bg-surface text-sm text-muted-foreground transition-transform duration-120 ease-out hover:text-foreground active:scale-95"
          >
            ✕
          </button>
        </div>

        {tipoMostrado === 'repetidor' ? (
          <div className="flex flex-col gap-2">
            <NivelBadge
              nivel={entidadMostrada.conectado ? 'normal' : 'no_monitoreado'}
              className={entidadMostrada.conectado ? '' : 'bg-offline/20! text-offline!'}
            />
            <p className="text-sm text-muted-foreground">
              {entidadMostrada.conectado ? 'Conectado a la malla LoRa.' : 'Sin conexión reciente con la malla.'}
            </p>
            <p className="text-xs text-muted-foreground">Solo retransmite — no reporta lecturas de gas.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <NivelBadge nivel={nivelDeNodo(entidadMostrada)} />

            {entidadMostrada.node_type === 'superficie' ? (
              <p className="text-sm text-muted-foreground">
                Estación de superficie: solo reporta ambiente (presión barométrica de referencia).
              </p>
            ) : entidadMostrada.node_type === 'contador' ? (
              <div>
                <p className="text-xs text-muted-foreground">Vagonetas — última hora</p>
                <p className="num-critico text-2xl text-foreground">
                  {entidadMostrada.ultima_lectura.conteo?.vagonetas ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  Conteo real de producción del frente {entidadMostrada.frente} — no reporta gases.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {GASES_RESUMEN.map((gas) => (
                  <FilaGas key={gas} gas={gas} nodo={entidadMostrada} />
                ))}
              </ul>
            )}

            <p className="text-xs text-muted-foreground">
              Batería {entidadMostrada.ultima_lectura.estado.bateria_pct}% · Señal{' '}
              {entidadMostrada.ultima_lectura.estado.rssi_dbm} dBm
              {!entidadMostrada.ultima_lectura.estado.sensor_ok && (
                <span className="ml-2 font-semibold text-alarma">Sensor en falla</span>
              )}
            </p>

            <Link
              to={`/nodo/${entidadMostrada.node_id}`}
              className="mt-1 rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground"
            >
              Ver detalle completo →
            </Link>
          </div>
        )}
        </div>
      </div>
    </>
  )
}
