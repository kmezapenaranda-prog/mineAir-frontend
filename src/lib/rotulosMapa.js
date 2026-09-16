function chocan(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y
}

/** Coloca primero los rótulos superiores y busca el hueco libre más cercano. */
export function distribuirRotulos(rotulos, obstaculos = []) {
  const ocupados = [...obstaculos]
  return [...rotulos].sort((a, b) => a.y - b.y || a.x - b.x).map((rotulo) => {
    const width = rotulo.width + 1.6
    const height = rotulo.height + 1.2
    const limitar = (x, y) => ({
      x: Math.max(1, Math.min(99 - width, x)),
      y: Math.max(1, Math.min(99 - height, y)),
      width, height,
    })
    const candidatos = [limitar(rotulo.x - 0.8, rotulo.y - 0.6)]
    for (let y = 1; y <= 99 - height; y += 1) {
      for (let x = 1; x <= 99 - width; x += 2) candidatos.push({ x, y, width, height })
    }
    const distancia = (c) => (c.x - (rotulo.x - 0.8)) ** 2 + (c.y - (rotulo.y - 0.6)) ** 2
    candidatos.sort((a, b) => distancia(a) - distancia(b))
    const caja = candidatos.find((c) => !ocupados.some((o) => chocan(c, o)))
    // Un plano saturado conserva el texto en su posición; no elimina información.
    if (!caja) return { ...rotulo, dx: 0, dy: 0, caja: null }
    ocupados.push(caja)
    return { ...rotulo, dx: caja.x + 0.8 - rotulo.x, dy: caja.y + 0.6 - rotulo.y, caja }
  })
}
