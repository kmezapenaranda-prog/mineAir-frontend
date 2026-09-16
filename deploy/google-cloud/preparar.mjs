import { cp, mkdir, copyFile, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const carpeta = path.dirname(fileURLToPath(import.meta.url))
const ml = path.resolve(carpeta, '../../../mineair-ml')
const destino = path.join(carpeta, '.bundle/ml')
// Evita mezclar versiones en un contexto previamente preparado.
try {
  await access(destino)
  throw new Error(`Ya existe ${destino}. Conserva o elimina manualmente ese paquete antes de preparar otro.`)
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}
const archivos = ['telemetria.schema.json', 'variables_operativas.schema.json', 'prediccion.schema.json']
for (const archivo of [...archivos, 'src/servicio/api.py', 'models/v2/ch4_woa_xgboost.json', 'models/v2/co_woa_xgboost.json']) {
  await access(path.join(ml, archivo))
}
await mkdir(destino, { recursive: true })
for (const archivo of archivos) await copyFile(path.join(ml, archivo), path.join(destino, archivo))
for (const directorio of ['src', 'models']) {
  await cp(path.join(ml, directorio), path.join(destino, directorio), {
    recursive: true,
    filter: (origen) => !origen.split(path.sep).includes('__pycache__') && !origen.endsWith('.pyc'),
  })
}
await copyFile(path.join(carpeta, 'Dockerfile.api'), path.join(destino, 'Dockerfile'))
console.log('Contexto API preparado: fuentes, schemas y modelos. No incluye credenciales, bases locales ni datasets.')
