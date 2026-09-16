import { useRef } from 'react'
import { NIVEL } from '../../config/umbrales.js'
import { usePanZoom } from '../../lib/usePanZoom.js'
import { useReduceMovimiento } from '../../lib/useReduceMovimiento.js'
import { capaDeElemento, CAPAS_MAPA } from '../../config/capasMapa.js'
import RotulosPlano from './RotulosPlano.jsx'

const COLOR_NIVEL = {
  [NIVEL.NORMAL]: 'var(--color-normal)',
  [NIVEL.PRECAUCION]: 'var(--color-precaucion)',
  [NIVEL.ALARMA]: 'var(--color-alarma)',
  [NIVEL.NO_MONITOREADO]: 'var(--color-sin-monitorear)',
}

/** Radio visible del marcador; el área de toque real es más grande (ver `<circle r={7} ... />` invisible). */
const RADIO_MARCADOR = 2.2
const RADIO_TOQUE = 7

function MarcadorNodo({ nodo, seleccionado, onSeleccionar, reduceMovimiento }) {
  const color = COLOR_NIVEL[nodo.nivel] ?? COLOR_NIVEL[NIVEL.NO_MONITOREADO]
  const enAlarma = nodo.nivel === NIVEL.ALARMA

  let forma
  if (nodo.node_type === 'superficie') {
    const s = RADIO_MARCADOR * 1.15
    forma = <rect x={nodo.x - s} y={nodo.y - s} width={s * 2} height={s * 2} rx={1} fill={color} stroke="var(--color-background)" strokeWidth={0.8} />
  } else if (nodo.node_type === 'contador') {
    // Diamante: distinto de los círculos de gas y del cuadrado de superficie
    // a propósito — un contador de vagonetas no es un sensor de gas.
    const s = RADIO_MARCADOR * 1.05
    forma = (
      <rect
        x={nodo.x - s}
        y={nodo.y - s}
        width={s * 2}
        height={s * 2}
        fill={color}
        stroke="var(--color-background)"
        strokeWidth={0.8}
        transform={`rotate(45 ${nodo.x} ${nodo.y})`}
      />
    )
  } else if (nodo.node_type === 'casco') {
    forma = (
      <>
        <circle cx={nodo.x} cy={nodo.y} r={RADIO_MARCADOR} fill={color} stroke="var(--color-background)" strokeWidth={0.8} />
        <circle cx={nodo.x} cy={nodo.y} r={RADIO_MARCADOR * 0.4} fill="var(--color-background)" opacity={0.85} />
      </>
    )
  } else {
    forma = <circle cx={nodo.x} cy={nodo.y} r={RADIO_MARCADOR} fill={color} stroke="var(--color-background)" strokeWidth={0.8} />
  }

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={nodo.ubicacion}
      className="cursor-pointer outline-none"
      onClick={() => onSeleccionar('nodo', nodo.node_id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSeleccionar('nodo', nodo.node_id)
        }
      }}
    >
      {nodo.nivel !== NIVEL.NO_MONITOREADO && (
        // Halo suave detrás del marcador: contra el trazado denso del plano
        // DXF (galerías, machones, rótulos), un punto de 3-4 unidades del
        // mismo tono que las líneas del fondo se pierde — el halo separa
        // figura de fondo sin introducir un color nuevo.
        <circle cx={nodo.x} cy={nodo.y} r={RADIO_MARCADOR + 1.6} fill={color} opacity={0.16} />
      )}
      {enAlarma && (
        // A diferencia del anillo de selección (abajo), este pulso es
        // permanente mientras el nodo esté en alarma — la información
        // crítica debe reconocerse a distancia sin necesitar selección
        // previa. Movimiento reducido: anillo fijo, sin <animate>.
        <circle
          cx={nodo.x}
          cy={nodo.y}
          r={reduceMovimiento ? RADIO_MARCADOR + 1.8 : RADIO_MARCADOR + 1.1}
          fill="none"
          stroke={color}
          strokeWidth={0.7}
          opacity={0.65}
        >
          {!reduceMovimiento && (
            <animate
              attributeName="r"
              values={`${RADIO_MARCADOR + 1.1};${RADIO_MARCADOR + 2.75};${RADIO_MARCADOR + 1.1}`}
              dur="1.6s"
              repeatCount="indefinite"
            />
          )}
          {!reduceMovimiento && (
            <animate attributeName="opacity" values="0.65;0.1;0.65" dur="1.6s" repeatCount="indefinite" />
          )}
        </circle>
      )}
      {seleccionado && (
        // El anillo de selección se queda fijo (visible = mismo cambio de
        // estado) para quien prefiere movimiento reducido; solo el pulso
        // SMIL se omite, porque la media query CSS no controla <animate>.
        <circle
          cx={nodo.x}
          cy={nodo.y}
          r={reduceMovimiento ? RADIO_MARCADOR + 1.5 : RADIO_MARCADOR + 0.9}
          fill="none"
          stroke={color}
          strokeWidth={0.9}
          opacity={0.55}
        >
          {!reduceMovimiento && (
            <animate
              attributeName="r"
              values={`${RADIO_MARCADOR + 0.9};${RADIO_MARCADOR + 2.1};${RADIO_MARCADOR + 0.9}`}
              dur="2s"
              repeatCount="indefinite"
            />
          )}
        </circle>
      )}
      {!nodo.sensor_ok && (
        <text x={nodo.x} y={nodo.y - RADIO_MARCADOR - 1.2} textAnchor="middle" fontSize={3.2} fill="var(--color-offline)" fontWeight="700">
          ⚠
        </text>
      )}
      {forma}
      <circle
        cx={nodo.x}
        cy={nodo.y}
        r={RADIO_TOQUE}
        fill="transparent"
      />
    </g>
  )
}

function MarcadorRepetidor({ repetidor, seleccionado, onSeleccionar }) {
  const color = repetidor.conectado ? 'var(--color-muted-foreground)' : 'var(--color-offline)'
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={repetidor.ubicacion}
      className="cursor-pointer outline-none"
      onClick={() => onSeleccionar('repetidor', repetidor.repetidor_id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSeleccionar('repetidor', repetidor.repetidor_id)
        }
      }}
    >
      {seleccionado && (
        <circle cx={repetidor.x} cy={repetidor.y} r={4.4} fill="none" stroke={color} strokeWidth={0.7} opacity={0.6} />
      )}
      <circle cx={repetidor.x} cy={repetidor.y} r={1.7} fill={color} stroke="var(--color-background)" strokeWidth={0.5} />
      <circle
        cx={repetidor.x}
        cy={repetidor.y}
        r={RADIO_TOQUE * 0.8}
        fill="transparent"
      />
    </g>
  )
}

function BotonZoom({ onClick, etiqueta, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      className="tap-target rounded-lg border border-border bg-surface-raised text-lg font-bold text-foreground shadow transition-transform duration-120 ease-out active:scale-95"
    >
      {children}
    </button>
  )
}

/**
 * Plano esquemático SVG de la mina (prototipo, no cartografía real).
 * Puramente presentacional respecto a los datos: recibe nodos/repetidores
 * ya resueltos con su nivel/estado y delega la selección al padre. El
 * pan/zoom es un detalle interno (ver usePanZoom).
 */
/** Nombre amigable de la capa de un elemento, para el tooltip al pasar el cursor — la misma agrupación que usan los botones de "Capas". */
function etiquetaCapa(elemento) {
  const id = capaDeElemento(elemento)
  return CAPAS_MAPA.find((capa) => capa.id === id)?.etiqueta ?? elemento.capa_origen ?? null
}

function ElementoMapa({ elemento }) {
  const color = elemento.categoria === 'entrada' ? 'var(--color-mapa-entrada)' : elemento.categoria === 'retorno' ? 'var(--color-mapa-retorno)' : elemento.categoria === 'ducto' ? 'var(--color-mapa-ducto)' : elemento.categoria === 'sellada' ? 'var(--color-precaucion)' : elemento.categoria === 'seguridad' ? 'var(--color-normal)' : elemento.categoria === 'labor_antigua' ? 'var(--color-muted-foreground)' : 'var(--color-border)'
  const secundaria = ['labor_antigua', 'topografia', 'superficie', 'infraestructura', 'referencia'].includes(elemento.categoria)
  const ancho = elemento.categoria === 'galeria' ? 1.3 : ['entrada', 'retorno', 'ducto'].includes(elemento.categoria) ? .9 : .55
  const discontinuo = elemento.categoria === 'retorno' ? '2 1.4' : elemento.categoria === 'labor_antigua' ? '1.2 1.6' : undefined
  const etiqueta = etiquetaCapa(elemento)
  if (elemento.tipo === 'path') return (
    <g>
      {/* Trazo ancho e invisible debajo del visible: el real (0.55-1.3 unidades) es
          demasiado angosto para que el cursor lo "atrape" de forma confiable. */}
      {etiqueta && <path d={elemento.d} fill="none" stroke="transparent" strokeWidth={ancho + 3} strokeLinecap="round" strokeLinejoin="round"><title>{etiqueta}</title></path>}
      <path d={elemento.d} fill="none" stroke={color} opacity={secundaria ? .42 : 1} strokeWidth={ancho} strokeDasharray={discontinuo} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
  if (elemento.tipo === 'polilinea') {
    const puntos = elemento.puntos.map((p) => `${p.x},${p.y}`).join(' ')
    return (
      <g>
        {etiqueta && <polyline points={puntos} fill="none" stroke="transparent" strokeWidth={ancho + 3} strokeLinecap="round" strokeLinejoin="round"><title>{etiqueta}</title></polyline>}
        <polyline points={puntos} fill={elemento.cerrada && elemento.categoria === 'sellada' ? color : 'none'} fillOpacity={.08} stroke={color} opacity={secundaria ? .42 : 1} strokeWidth={ancho} strokeDasharray={discontinuo} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    )
  }
  if (elemento.tipo === 'rectangulo') return <g><rect x={elemento.x} y={elemento.y} width={elemento.width} height={elemento.height} fill={color} fillOpacity={.08} stroke={color} strokeDasharray="1.4 1.2" strokeWidth={.6} rx={1}/>{elemento.etiqueta ? <text x={elemento.x + elemento.width / 2} y={elemento.y + elemento.height / 2} textAnchor="middle" fontSize={3} fill={color}>{elemento.etiqueta}</text> : null}</g>
  if (elemento.tipo === 'texto') return <text x={elemento.posicion.x} y={elemento.posicion.y} textAnchor={elemento.ancla ?? 'start'} fontSize={2.8} fill="var(--color-muted-foreground)">{elemento.texto}</text>
  if (elemento.tipo === 'simbolo') return <g transform={`translate(${elemento.posicion.x} ${elemento.posicion.y}) rotate(${-elemento.rotacion})`}><circle r={1.8} fill="var(--color-surface)" stroke={color} strokeWidth={.6}/><path d="M-1 0h2M0-1v2" stroke={color} strokeWidth={.4}/><title>{elemento.bloque}</title></g>
  return null
}

export default function PlanoMina({ nodos, repetidores, seleccionado, onSeleccionar, mapa, categoriasVisibles = null, capasVisibles = null, etiquetasVisibles = true, onColocarPosicion = null }) {
  const svgRef = useRef(null)
  const { transform, handlers, acercar, alejar, reiniciar, conZoom, aCoordenadasVB, enGesto } = usePanZoom(svgRef)
  const reduceMovimiento = useReduceMovimiento()
  const elementosVisibles = mapa.elementos.filter((elemento) =>
    (!categoriasVisibles || categoriasVisibles.includes(elemento.categoria)) &&
    (!capasVisibles || capasVisibles.includes(capaDeElemento(elemento))))
  // Solo se dibujan nodos/repetidores con posición conocida en este plano:
  // uno recién dado de alta o importado de un DXF nuevo no tiene
  // coordenadas todavía (`mapa.nodos[id]`/`mapa.repetidores[id]` vacío) —
  // dibujarlo en (0,0) lo apilaría, invisible, en la esquina superior del
  // viewBox. Mapa.jsx avisa aparte cuántos faltan por ubicar.
  const nodosUbicados = nodos.filter((n) => Number.isFinite(n.x) && Number.isFinite(n.y))
  const repetidoresUbicados = repetidores.filter((r) => Number.isFinite(r.x) && Number.isFinite(r.y))

  function onClickPlano(e) {
    if (!onColocarPosicion || !svgRef.current) return
    // Coordenadas de pantalla -> unidades del viewBox (0-100) -> deshacer el
    // pan/zoom actual del <g> interno, para ubicar el nodo donde el dedo o
    // el cursor apuntan realmente, no donde apuntarían con el plano en su
    // posición original.
    const { x: vbX, y: vbY } = aCoordenadasVB(e.clientX, e.clientY)
    const x = (vbX - transform.tx) / transform.escala
    const y = (vbY - transform.ty) / transform.escala
    onColocarPosicion({ x: +x.toFixed(2), y: +y.toFixed(2) })
  }

  return (
    <div className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        className={`h-full w-full touch-none select-none ${onColocarPosicion ? 'cursor-crosshair' : ''}`}
        role="img"
        aria-label="Plano esquemático de la mina — arrastra para desplazar, pellizca o usa los botones para hacer zoom"
        {...handlers}
        onClick={onClickPlano}
      >
        <rect x={0} y={0} width={100} height={100} fill="var(--color-surface)" rx={2} />

        <g
          className={enGesto ? '' : 'transition-transform duration-200 ease-out'}
          transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.escala})`}
        >
          {elementosVisibles.filter((elemento) => elemento.tipo !== 'texto').map((elemento) => <ElementoMapa key={elemento.id} elemento={elemento} />)}
          {etiquetasVisibles && <RotulosPlano elementos={elementosVisibles} marcadores={[...nodosUbicados, ...repetidoresUbicados]} />}

          {repetidoresUbicados.map((r) => (
            <MarcadorRepetidor
              key={r.repetidor_id}
              repetidor={r}
              seleccionado={seleccionado?.tipo === 'repetidor' && seleccionado.id === r.repetidor_id}
              onSeleccionar={onSeleccionar}
            />
          ))}

          {nodosUbicados.map((n) => (
            <MarcadorNodo
              key={n.node_id}
              nodo={n}
              seleccionado={seleccionado?.tipo === 'nodo' && seleccionado.id === n.node_id}
              onSeleccionar={onSeleccionar}
              reduceMovimiento={reduceMovimiento}
            />
          ))}
        </g>
      </svg>

      <div className="absolute right-2 bottom-2 flex flex-col gap-1.5">
        <BotonZoom onClick={acercar} etiqueta="Acercar">
          +
        </BotonZoom>
        <BotonZoom onClick={alejar} etiqueta="Alejar">
          −
        </BotonZoom>
        {conZoom && (
          <BotonZoom onClick={reiniciar} etiqueta="Restablecer zoom">
            <span className="text-sm">⤢</span>
          </BotonZoom>
        )}
      </div>
    </div>
  )
}
