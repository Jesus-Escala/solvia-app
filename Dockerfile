# syntax=docker/dockerfile:1

# ---- Build stage ----------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
ARG VITE_CURRENCY=PEN
ARG VITE_APP_URL=http://localhost:8080
ARG VITE_LANDING_URL=http://localhost:8081
ENV VITE_API_URL=$VITE_API_URL VITE_CURRENCY=$VITE_CURRENCY VITE_APP_URL=$VITE_APP_URL VITE_LANDING_URL=$VITE_LANDING_URL
RUN npm run build

# ---- Runtime stage --------------------------------------------------------
FROM nginx:1.27-alpine AS runtime
# Where /api is proxied to; override at run time: docker run -e API_UPSTREAM=https://api.example.com
ENV API_UPSTREAM=http://backend:4000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
