FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public
ARG VITE_DATA_SOURCE=edge
ARG VITE_EDGE_API_URL
ENV VITE_DATA_SOURCE=${VITE_DATA_SOURCE}
ENV VITE_EDGE_API_URL=${VITE_EDGE_API_URL}
RUN npm run build

FROM nginx:stable-alpine
COPY deploy/railway/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
