# ProxiSpeak Backend Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/

# Install dependencies
RUN npm install

# Copy source files
COPY shared ./shared
COPY server ./server

# Build shared and server
RUN npm --prefix shared run build
RUN npm --prefix server run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/

RUN npm install --omit=dev

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/shared/types ./shared/types
COPY --from=builder /app/server/dist ./server/dist

EXPOSE 5000

CMD ["node", "server/dist/server.js"]
