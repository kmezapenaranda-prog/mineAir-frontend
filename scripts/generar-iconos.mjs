// Genera los PNG del manifest de la PWA a partir del isotipo vectorial.
// Los colores acá van en hex literal (no var(--color-...)) porque el
// rasterizador (sharp/librsvg) no resuelve variables CSS de un stylesheet
// externo — son el equivalente sRGB exacto de los tokens oklch definidos en
// src/index.css. Si se cambia un token de marca ahí, actualizar el mapa
// COLORES de abajo para que el ícono no quede desincronizado del theme.
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import {
  VIEWBOX,
  CASCO_D,
  NERVADURA,
  SOPORTE_LAMPARA,
  LAMPARA,
  BRILLO_LAMPARA,
  NODOS,
  LINEAS,
  ONDAS,
} from '../src/components/brand/logoPaths.js'

const COLORES = {
  brandTeal: '#006768',
  brandAmbar: '#EB8A00',
  brandAmbarDeep: '#DB6D00',
  brandLamp: '#FBE9C6',
  background: '#080D16',
  foreground: '#F3F5F9',
}

function construirSvg({ fondo }) {
  const lineas = LINEAS.map(
    ([x1, y1, x2, y2]) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COLORES.brandAmbar}" stroke-width="1.5" stroke-linecap="round" opacity="0.9" />`,
  ).join('')
  const nodos = NODOS.map(
    ([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="${COLORES.brandAmbar}" />`,
  ).join('')
  const ondas = ONDAS.map(
    (o) =>
      `<path d="${o.d}" fill="none" stroke="${COLORES.brandAmbar}" stroke-width="7" stroke-linecap="round" opacity="${o.opacity}" />`,
  ).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}">
    ${fondo ? `<rect x="0" y="0" width="200" height="200" fill="${COLORES.background}" />` : ''}
    <path d="${CASCO_D}" fill="${COLORES.brandTeal}" />
    <rect x="${NERVADURA.x}" y="${NERVADURA.y}" width="${NERVADURA.width}" height="${NERVADURA.height}" rx="${NERVADURA.rx}" fill="#fff" opacity="0.12" />
    ${lineas}
    ${nodos}
    <rect x="${SOPORTE_LAMPARA.x}" y="${SOPORTE_LAMPARA.y}" width="${SOPORTE_LAMPARA.width}" height="${SOPORTE_LAMPARA.height}" rx="${SOPORTE_LAMPARA.rx}" fill="${COLORES.foreground}" />
    <defs>
      <radialGradient id="lampara" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stop-color="${COLORES.brandLamp}" />
        <stop offset="100%" stop-color="${COLORES.brandAmbarDeep}" />
      </radialGradient>
    </defs>
    <circle cx="${LAMPARA.cx}" cy="${LAMPARA.cy}" r="${LAMPARA.r}" fill="url(#lampara)" />
    <ellipse cx="${BRILLO_LAMPARA.cx}" cy="${BRILLO_LAMPARA.cy}" rx="${BRILLO_LAMPARA.rx}" ry="${BRILLO_LAMPARA.ry}" fill="${COLORES.brandLamp}" opacity="0.6" />
    ${ondas}
  </svg>`
}

const DIR_SALIDA = path.resolve(import.meta.dirname, '../public/icons')

async function main() {
  await mkdir(DIR_SALIDA, { recursive: true })

  const svgTransparente = construirSvg({ fondo: false })
  const svgMaskable = construirSvg({ fondo: true })

  await writeFile(path.join(DIR_SALIDA, 'isotipo-mineair.svg'), svgTransparente)

  await sharp(Buffer.from(svgTransparente), { density: 384 })
    .resize(192, 192)
    .png()
    .toFile(path.join(DIR_SALIDA, 'icon-192.png'))

  await sharp(Buffer.from(svgTransparente), { density: 384 })
    .resize(512, 512)
    .png()
    .toFile(path.join(DIR_SALIDA, 'icon-512.png'))

  await sharp(Buffer.from(svgMaskable), { density: 384 })
    .resize(512, 512)
    .png()
    .toFile(path.join(DIR_SALIDA, 'icon-512-maskable.png'))

  // iOS rellena de negro las zonas transparentes de un apple-touch-icon, así
  // que ese usa la variante con fondo (la misma que la maskable de Android).
  await sharp(Buffer.from(svgMaskable), { density: 384 })
    .resize(180, 180)
    .png()
    .toFile(path.join(DIR_SALIDA, 'icon-180.png'))

  console.log('Íconos generados en public/icons/')
}

main()
