# MineAIr en Google Cloud — preparación

Estado: proyecto **MineAIr** creado (`mineair-platform-20260910`) y Google Cloud CLI instalado y autenticado. **Aplicación no desplegada**: la única cuenta de facturación visible está cerrada. Pendientes facturación activa, selección final de acceso/región y dominio.

## Arquitectura propuesta

Compute Engine ejecuta web y API mediante Docker Compose. Nginx sirve la PWA y reenvía `/api` al contenedor Python; el navegador no necesita acceder al localhost del ingeniero. SQLite reside en un volumen Docker sobre el disco persistente de la VM. Debe preservarse el disco y configurarse respaldo antes de usar datos operativos; no ejecutar `docker compose down -v`.

La configuración inicial publica únicamente `127.0.0.1:8080` en la VM para una verificación privada mediante SSH/IAP. Publicar la aplicación requiere definir autenticación y HTTPS: la API actual permite escritura y no tiene autenticación propia.

El firmware y el puente USB permanecen cerca de los sensores. El código de inferencia y los artefactos se empaquetan, pero arrancar la API actual **no inicia el motor predictivo**: recibe predicciones publicadas por otro proceso. La conexión de ese proceso y la recepción de telemetría deben cerrarse según el alcance elegido. No se iniciará un simulador presentándolo como una mina real.

## Preparar y comprobar

Desde `mineair-web`:

```text
node deploy/google-cloud/preparar.mjs
docker compose -f deploy/google-cloud/compose.yaml config
docker compose -f deploy/google-cloud/compose.yaml build
docker compose -f deploy/google-cloud/compose.yaml up -d
```

La app estará en `http://localhost:8080`. Las rutas `/mapa` y `/registro` deben cargar directamente. `/api/estado` debe devolver el estado del servicio; una base nueva no tiene telemetría.

El preparador copia únicamente fuentes, schemas y modelos desde el proyecto hermano `mineair-ml` a `.bundle/ml`. No modifica aquel proyecto. No copia `.env`, credenciales, `estado_servicio.db`, datasets, entornos virtuales ni reportes. Una migración de la base existente se realiza aparte con un backup consistente de SQLite.

## Requisitos pendientes para desplegar

- Activar una cuenta de facturación y vincularla a `mineair-platform-20260910`.
- Google Cloud CLI está instalado en `%LOCALAPPDATA%/Google/Cloud SDK/google-cloud-sdk/bin/gcloud.cmd`; abrir una nueva terminal para actualizar el PATH.
- Confirmar si se despliega web/API o solo la demostración web, región y modalidad de acceso.
- Docker Engine activo para comprobar imágenes localmente, o construirlas en la VM/Cloud Build.

Referencias: [discos persistentes](https://docs.cloud.google.com/compute/docs/disks/persistent-disks), [SSH mediante IAP](https://docs.cloud.google.com/compute/docs/connect/ssh-using-iap), [sistema de archivos efímero de Cloud Run](https://docs.cloud.google.com/run/docs/container-contract#file_system).
