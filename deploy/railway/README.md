# Web MineAir en Railway

Crea un servicio desde el repositorio de la web y usa
`deploy/railway/Dockerfile`. En las variables de build define:

- `VITE_DATA_SOURCE=edge`
- `VITE_EDGE_API_URL=https://DOMINIO_DE_LA_API/api`

Genera primero el dominio de la API, porque Vite incorpora esta URL durante el
build. Luego configura `MINEAIR_CORS_ORIGINS` en la API con el dominio de esta
web.
