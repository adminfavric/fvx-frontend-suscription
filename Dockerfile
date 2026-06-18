# syntax=docker/dockerfile:1
# Dev (default): ng serve en :4201. El navegador sigue usando environment.ts → localhost:8080 (API publicada en el host).
# Prod: nginx sirve el build; proxifica /api/* a fvx_suscription_backend_web (misma red fvx_suscription_shared). Usa build production (URLs relativas).
FROM node:20-bookworm-slim AS dev
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
EXPOSE 4201
ENV NG_CLI_ANALYTICS=false
ENTRYPOINT ["/bin/sh", "./docker-entrypoint-dev.sh"]
CMD ["npm", "run", "start", "--", "--host", "0.0.0.0", "--port", "4201", "--poll", "2000"]

FROM dev AS build
RUN npm run build -- --configuration=production

FROM nginx:1.27-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/fvx-frontend/browser /usr/share/nginx/html
EXPOSE 80
