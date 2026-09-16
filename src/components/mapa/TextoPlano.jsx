/** Rótulos por encima del trazado, con separación visual de las galerías. */
export default function TextoPlano({ elemento, fontSize = 2.8 }) {
  return (
    <text
      data-id={elemento.id}
      x={elemento.posicion.x}
      y={elemento.posicion.y}
      textAnchor={elemento.ancla ?? 'start'}
      fontSize={fontSize}
      fontFamily="var(--font-sans)"
      fontWeight={500}
      fill="var(--color-foreground)"
      stroke="var(--color-surface)"
      strokeWidth={0.8}
      strokeLinejoin="round"
      paintOrder="stroke fill"
      pointerEvents="none"
    >
      {elemento.texto}
    </text>
  )
}
