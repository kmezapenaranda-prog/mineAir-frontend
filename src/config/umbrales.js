/**
 * Umbrales normativos — Decreto 1886 de 2015 (Colombia).
 * Única fuente de verdad para límites de gases. No hardcodear estos
 * valores en componentes: todo consumidor debe importar de aquí.
 *
 * `sentido: 'maximo'` -> alarma cuando el valor SUBE por encima del límite.
 * `sentido: 'minimo'` -> alarma cuando el valor BAJA por debajo del límite (solo O2).
 */

export const SENTIDO = {
  MAXIMO: 'maximo',
  MINIMO: 'minimo',
}

export const NIVEL = {
  NORMAL: 'normal',
  PRECAUCION: 'precaucion',
  ALARMA: 'alarma',
  NO_MONITOREADO: 'no_monitoreado',
}

const CORTES_LECTURA_DEFECTO = Object.freeze({ precaucion: 0.7, alarma: 1.0 })
const CORTES_PREDICCION_DEFECTO = Object.freeze({ precaucion: 0.3, alarma: 0.6 })

/**
 * Cortes de nivel como fracción del umbral normativo (no de probabilidad).
 * Configurables por el ingeniero desde Configuración — mismo patrón que
 * UMBRALES_DEFAULT: objeto mutable, todo consumidor lo importa por
 * referencia y lee sus campos en el momento, así que un cambio en
 * Configuración se refleja en el resto de la app sin recargar.
 */
export const CORTES_NIVEL_LECTURA = { ...CORTES_LECTURA_DEFECTO }

/**
 * Cortes de nivel para probabilidad de predicción (0-1).
 * Configurables por el ingeniero desde Configuración.
 */
export const CORTES_NIVEL_PREDICCION = { ...CORTES_PREDICCION_DEFECTO }

/**
 * Línea base normativa — Decreto 1886 de 2015, congelada. Nunca se muta:
 * es lo que "Restaurar valores del decreto" restablece en Configuración.
 */
const UMBRALES_DECRETO_1886 = Object.freeze({
  o2: Object.freeze({
    gas: 'o2',
    etiqueta: 'O₂',
    limite: 19.5,
    limite_superior: 23.5,
    unidad: 'pct',
    sentido: SENTIDO.MINIMO,
    // Referencia de aire fresco — ancla el otro extremo de la zona de
    // precaución para O2, ya que su rango operativo real (19.5-20.9%) es
    // demasiado angosto para usar la misma fracción multiplicativa que
    // los gases de sentido "máximo" (que parten de una base ~0).
    referencia_segura: 20.9,
    monitoreado: true,
    nota: 'Por debajo del límite: deficiencia de oxígeno, peligro inmediato.',
  }),
  ch4: Object.freeze({
    gas: 'ch4',
    etiqueta: 'CH₄',
    limite: 1.0,
    unidad: 'pct',
    sentido: SENTIDO.MAXIMO,
    monitoreado: true,
    nota: 'En frentes de trabajo.',
  }),
  co2: Object.freeze({
    gas: 'co2',
    etiqueta: 'CO₂',
    limite: 0.5,
    unidad: 'pct',
    sentido: SENTIDO.MAXIMO,
    monitoreado: true,
  }),
  co: Object.freeze({
    gas: 'co',
    etiqueta: 'CO',
    limite: 25,
    unidad: 'ppm',
    sentido: SENTIDO.MAXIMO,
    monitoreado: true,
  }),
  h2s: Object.freeze({
    gas: 'h2s',
    etiqueta: 'H₂S',
    limite: 1,
    limite_stel: 5,
    unidad: 'ppm',
    sentido: SENTIDO.MAXIMO,
    monitoreado: true,
  }),
  so2: Object.freeze({
    gas: 'so2',
    etiqueta: 'SO₂',
    limite: 0.25,
    unidad: 'ppm',
    sentido: SENTIDO.MAXIMO,
    monitoreado: false,
    nota: 'No cubierto por el hardware actual (ZCE04B / MH-410D).',
  }),
  no2: Object.freeze({
    gas: 'no2',
    etiqueta: 'NO₂',
    limite: 0.2,
    unidad: 'ppm',
    sentido: SENTIDO.MAXIMO,
    monitoreado: false,
    nota: 'No cubierto por el hardware actual (ZCE04B / MH-410D).',
  }),
})

/**
 * Copia de trabajo mutable — todo el resto de la app (clasificarLectura,
 * proximidadAlarma, las pantallas) importa y lee ESTE objeto. Configuración
 * muta sus campos `limite` in-place (ver actualizarLimiteUmbral), así que
 * ningún otro módulo necesita releer nada: el mismo objeto referenciado
 * cambia de valor bajo ellos.
 */
export const UMBRALES_DEFAULT = Object.fromEntries(
  Object.entries(UMBRALES_DECRETO_1886).map(([gas, u]) => [gas, { ...u }]),
)

/**
 * Clasifica una lectura de gas contra su umbral.
 * Devuelve NO_MONITOREADO si el gas no está cubierto por el hardware,
 * sin importar el valor recibido (nunca se presenta como "normal").
 */
export function clasificarLectura(gas, valor, umbrales = UMBRALES_DEFAULT) {
  const umbral = umbrales[gas]
  if (!umbral) return NIVEL.NO_MONITOREADO
  if (!umbral.monitoreado || valor == null) return NIVEL.NO_MONITOREADO

  const { limite, sentido } = umbral

  if (sentido === SENTIDO.MINIMO) {
    if (umbral.limite_superior != null && valor > umbral.limite_superior) return NIVEL.ALARMA
    // Zona de precaución: el (1 - fracción) final del margen entre la
    // referencia segura y el límite. Ej. O2: margen 20.9→19.5, precaución
    // arranca al consumir el último 30% de ese margen (≈20.48%).
    const referencia = umbral.referencia_segura ?? limite * 1.1
    const margen = referencia - limite
    const precaucionCorte = limite + margen * (1 - CORTES_NIVEL_LECTURA.precaucion)
    if (valor < limite) return NIVEL.ALARMA
    if (valor < precaucionCorte) return NIVEL.PRECAUCION
    return NIVEL.NORMAL
  }

  const precaucionCorte = limite * CORTES_NIVEL_LECTURA.precaucion
  if (valor > limite) return NIVEL.ALARMA
  if (valor > precaucionCorte) return NIVEL.PRECAUCION
  return NIVEL.NORMAL
}

/**
 * Proximidad normalizada a la alarma, 0 (seguro) → 1 (en el límite o más
 * allá), independiente del sentido del gas. Única fuente para gauges /
 * barras visuales: aquí es donde se "invierte" O2, no en los componentes.
 */
export function proximidadAlarma(gas, valor, umbrales = UMBRALES_DEFAULT) {
  const umbral = umbrales[gas]
  if (!umbral || !umbral.monitoreado || valor == null) return null

  const { limite, sentido } = umbral
  if (sentido === SENTIDO.MINIMO) {
    const referencia = umbral.referencia_segura ?? limite * 1.1
    const margen = referencia - limite
    return clamp((referencia - valor) / margen, 0, 1.2)
  }
  return clamp(valor / limite, 0, 1.2)
}

function clamp(valor, min, max) {
  return Math.max(min, Math.min(max, valor))
}

/**
 * Clasifica una predicción por su probabilidad, según los cortes
 * configurables del contrato de datos (nivel viene calculado desde el edge,
 * pero se recalcula en el cliente si los cortes locales difieren).
 */
export function clasificarPrediccion(probabilidad, cortes = CORTES_NIVEL_PREDICCION) {
  if (probabilidad > cortes.alarma) return NIVEL.ALARMA
  if (probabilidad >= cortes.precaucion) return NIVEL.PRECAUCION
  return NIVEL.NORMAL
}

/**
 * Persistencia de la configuración editable (Fase 4 — Configuración).
 * Solo se guardan los campos que el ingeniero puede tocar (límite de cada
 * gas, cortes de nivel); todo lo demás del contrato (sentido, unidad,
 * monitoreado, notas) sigue viniendo de UMBRALES_DECRETO_1886 y nunca se
 * sobrescribe desde acá.
 */
// v2 invalida overrides creados sobre los límites regulatorios incorrectos
// anteriores a contrato v1.4 (CO 50/H2S 20). No deben sobrevivir en silencio.
const STORAGE_KEY = 'mineair.config_umbrales.v2'
const CONFIG_API = import.meta.env?.VITE_EDGE_API_URL ?? 'https://mineair-backend-production.up.railway.app/api'
let ultimaPublicacion = Promise.resolve()

function storageDisponible() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

function cargarOverrides() {
  if (!storageDisponible()) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function guardarOverrides(publicar = true) {
  if (!storageDisponible()) return
  try {
    const limites = Object.fromEntries(Object.entries(UMBRALES_DEFAULT).map(([gas, u]) => [gas, u.limite]))
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ limites, cortesLectura: CORTES_NIVEL_LECTURA, cortesPrediccion: CORTES_NIVEL_PREDICCION }),
    )
  } catch {
    // Almacenamiento lleno o no disponible: los cambios siguen activos en
    // memoria para esta sesión aunque no persistan entre recargas.
  }
  if (publicar) {
    const limites = Object.fromEntries(Object.entries(UMBRALES_DEFAULT).map(([gas, u]) => [gas, u.limite]))
    ultimaPublicacion = publicarConfiguracion({ limites, cortesLectura: CORTES_NIVEL_LECTURA, cortesPrediccion: CORTES_NIVEL_PREDICCION })
  }
}

async function publicarConfiguracion(umbrales) {
  try {
    const respuesta = await fetch(`${CONFIG_API}/configuracion`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ umbrales }),
      signal: AbortSignal.timeout(15000),
    })
    if (!respuesta.ok) throw new Error(`No se pudo sincronizar los umbrales (${respuesta.status})`)
  } catch {
    // La copia local permite continuar sin red.
  }
}

// Aplica lo persistido (si hay) sobre las copias mutables, una sola vez al
// cargar el módulo — antes de que cualquier pantalla lea UMBRALES_DEFAULT.
;(function aplicarOverridesAlCargar() {
  const guardado = cargarOverrides()
  if (!guardado) return
  for (const [gas, limite] of Object.entries(guardado.limites ?? {})) {
    if (UMBRALES_DEFAULT[gas] && typeof limite === 'number' && Number.isFinite(limite)) {
      UMBRALES_DEFAULT[gas].limite = limite
    }
  }
  if (guardado.cortesLectura) Object.assign(CORTES_NIVEL_LECTURA, guardado.cortesLectura)
  if (guardado.cortesPrediccion) Object.assign(CORTES_NIVEL_PREDICCION, guardado.cortesPrediccion)
})()

/** Edita el límite normativo de un gas monitoreado. Persiste de inmediato. */
export function actualizarLimiteUmbral(gas, limite) {
  if (!UMBRALES_DEFAULT[gas] || !Number.isFinite(limite) || limite <= 0) return
  UMBRALES_DEFAULT[gas].limite = limite
  guardarOverrides()
}

export async function sincronizarUmbrales() {
  await ultimaPublicacion
  try {
    const respuesta = await fetch(`${CONFIG_API}/configuracion`, { signal: AbortSignal.timeout(15000) })
    if (!respuesta.ok) return
    const remoto = (await respuesta.json()).configuracion?.umbrales
    if (!remoto || typeof remoto !== 'object') return
    for (const [gas, limite] of Object.entries(remoto.limites ?? {})) {
      if (UMBRALES_DEFAULT[gas] && typeof limite === 'number' && Number.isFinite(limite)) UMBRALES_DEFAULT[gas].limite = limite
    }
    if (remoto.cortesLectura) Object.assign(CORTES_NIVEL_LECTURA, remoto.cortesLectura)
    if (remoto.cortesPrediccion) Object.assign(CORTES_NIVEL_PREDICCION, remoto.cortesPrediccion)
    guardarOverrides(false)
  } catch {
    // Usar la copia local si el backend no estÃ¡ disponible.
  }
}

/** Edita los cortes de nivel (lectura o predicción). `precaucion` debe ser < `alarma`. */
export function actualizarCortes(tipo, cortes) {
  const objetivo = tipo === 'prediccion' ? CORTES_NIVEL_PREDICCION : CORTES_NIVEL_LECTURA
  if (!(cortes.precaucion < cortes.alarma)) return
  Object.assign(objetivo, cortes)
  guardarOverrides()
}

/** Restaura límites y cortes a los valores del Decreto 1886. */
export function restaurarUmbralesPorDefecto() {
  for (const [gas, u] of Object.entries(UMBRALES_DECRETO_1886)) {
    UMBRALES_DEFAULT[gas].limite = u.limite
  }
  Object.assign(CORTES_NIVEL_LECTURA, CORTES_LECTURA_DEFECTO)
  Object.assign(CORTES_NIVEL_PREDICCION, CORTES_PREDICCION_DEFECTO)
  guardarOverrides()
}
