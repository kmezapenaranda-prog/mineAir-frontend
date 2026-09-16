/**
 * Layout esquemático del plano de la mina (prototipo — no cartografía
 * real). Coordenadas relativas 0-100 sobre un viewBox SVG cuadrado.
 * Única fuente de verdad para posiciones: PlanoMina.jsx no hardcodea
 * coordenadas, solo dibuja lo que hay aquí.
 */

/** Posición de cada nodo del contrato de datos (fijo/casco/superficie/contador). */
export const POSICIONES_NODOS = {
  S1: { x: 78, y: 22 },
  S2: { x: 15, y: 50 },
  S3: { x: 78, y: 78 },
  H1: { x: 88, y: 15 },
  H2: { x: 88, y: 85 },
  SUP1: { x: 3, y: 50 },
  // Contadores de vagonetas (contrato #4, propuesto): en el ramal de cada
  // frente, antes de que se una a la vía principal — el chokepoint natural
  // por donde pasa toda vagoneta que sale de ese frente.
  C1: { x: 58, y: 40 },
  C2: { x: 58, y: 60 },
}

/**
 * Repetidores LoRa: solo retransmiten, no están en el contrato de
 * telemetría — se modelan aparte, únicamente para el plano. Su posición
 * (igual que la de los nodos) vive en `mapa.repetidores`, no aquí — este
 * catálogo solo fija su identidad, para que cada plano pueda ubicarlos en
 * un sitio distinto.
 */
export const REPETIDORES = [
  { repetidor_id: 'R1', ubicacion: 'Repetidor — vía principal' },
  { repetidor_id: 'R2', ubicacion: 'Repetidor — ramal frente A' },
  { repetidor_id: 'R3', ubicacion: 'Repetidor — ramal frente B' },
  { repetidor_id: 'R4', ubicacion: 'Repetidor — retorno' },
]

/** Posición de cada repetidor en el plano esquemático de demostración. */
export const POSICIONES_REPETIDORES = {
  R1: { x: 32, y: 50 },
  R2: { x: 68, y: 38 },
  R3: { x: 68, y: 62 },
  R4: { x: 15, y: 28 },
}

/** Galerías dibujadas como trazos simples — "intake" (aire fresco) vs "retorno" (aire usado). */
export const GALERIAS = [
  { id: 'via-principal', d: 'M3,50 L48,50', tipo: 'intake' },
  { id: 'ramal-frente-a', d: 'M48,50 L60,50 L75,30 L88,15', tipo: 'intake' },
  { id: 'ramal-frente-b', d: 'M48,50 L60,50 L75,70 L88,85', tipo: 'intake' },
  { id: 'retorno-frente-a', d: 'M88,15 L78,22 L50,25 L20,28 L6,32', tipo: 'retorno' },
  { id: 'retorno-frente-b', d: 'M88,85 L78,78 L50,75 L20,72 L6,68', tipo: 'retorno' },
]

/** Zona sellada — área fuera de servicio, referenciada en el contrato de variables operativas. */
export const ZONA_SELLADA_NORTE = { x: 26, y: 3, width: 26, height: 14, etiqueta: 'Zona sellada norte' }

/** Etiquetas de texto libres sobre el plano. */
export const ETIQUETAS_PLANO = [
  // "Bocamina" va debajo de la vía (y=59) y "Vía principal de entrada"
  // arriba (y=44): separadas verticalmente para que nunca se crucen,
  // sin importar cuánto ancho ocupe cada texto.
  { texto: 'Bocamina', x: 3, y: 59, ancla: 'start' },
  { texto: 'Vía principal de entrada', x: 27, y: 44, ancla: 'middle' },
  { texto: 'Frente A', x: 88, y: 9, ancla: 'end' },
  { texto: 'Frente B', x: 88, y: 95, ancla: 'end' },
  { texto: 'Retorno A', x: 35, y: 20, ancla: 'middle' },
  { texto: 'Retorno B', x: 35, y: 80, ancla: 'middle' },
]
