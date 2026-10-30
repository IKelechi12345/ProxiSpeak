# ProxiSpeak Frontend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY shared/package.json ./shared/
COPY client/package.json ./client/

RUN npm install

COPY shared ./shared
COPY client ./client

RUN npm --prefix client run build

# Nginx production stage
FROM nginx:alpine

COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
