import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const SOSPECHOSO_MOJIBAKE = /Ã.|Â.|â(?:€|™|œ|š|ž|†|‡|€¦|€”|€“)/u

async function archivosFuente(directorio) {
  const entradas = await readdir(directorio, { withFileTypes: true })
  const archivos = await Promise.all(
    entradas.map(async (entrada) => {
      const destino = path.join(directorio, entrada.name)
      if (entrada.isDirectory()) return archivosFuente(destino)
      return /\.(?:js|jsx|css)$/.test(entrada.name) ? [destino] : []
    }),
  )
  return archivos.flat()
}

test('el código de interfaz no contiene secuencias típicas de mojibake', async () => {
  const archivos = await archivosFuente(fileURLToPath(new URL('../src/', import.meta.url)))
  archivos.push(fileURLToPath(new URL('../vite.config.js', import.meta.url)))

  for (const archivo of archivos) {
    const contenido = await readFile(archivo, 'utf8')
    assert.doesNotMatch(contenido, SOSPECHOSO_MOJIBAKE, String(archivo))
  }
})

test('los marcadores SVG concentran semántica y teclado en el elemento enfocable', async () => {
  const contenido = await readFile(new URL('../src/components/mapa/PlanoMina.jsx', import.meta.url), 'utf8')
  assert.equal((contenido.match(/role="button"/g) ?? []).length, 2)
  assert.equal((contenido.match(/tabIndex=\{0\}/g) ?? []).length, 2)
  assert.equal((contenido.match(/onKeyDown=\{/g) ?? []).length, 2)
})

test('la gráfica diferencial ofrece datos equivalentes fuera del SVG', async () => {
  const contenido = await readFile(new URL('../src/components/dashboard/DiferencialCh4.jsx', import.meta.url), 'utf8')
  assert.match(contenido, /aria-hidden="true"/)
  assert.match(contenido, /<caption>Metano en retorno y entrada/)
  assert.match(contenido, /<th scope="col">Diferencial<\/th>/)
  assert.match(contenido, /className={`tap-target/)
})

test('el motor PDF queda fuera del precache inicial de la PWA', async () => {
  const contenido = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8')
  assert.match(contenido, /return 'pdf-export'/)
  assert.match(contenido, /globIgnores: \['\*\*\/pdf-export-\*\.js'\]/)
  assert.match(contenido, /cacheName: 'pdf-export-v1'/)
})
