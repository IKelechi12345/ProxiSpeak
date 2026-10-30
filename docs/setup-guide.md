# ProxiSpeak Setup & Deployment Guide

## 1. Prerequisites
- **Node.js**: v18+ or v20+ (Node v26 verified)
- **npm**: v9+
- **MongoDB**: (Optional locally; the server includes embedded MongoDB zero-config fallback if no local MongoDB instance is running)
- **Redis**: (Optional; automatic fallback to in-memory event bus if Redis is not running)
- **Docker & Docker Compose**: (For containerized deployment)

---

## 2. Local Development Setup

### 2.1 Clone and Install
```bash
# Clone the repository
git clone https://github.com/proxispeak/proxispeak.git
cd proxispeak

# Install dependencies across all workspaces
npm install
```

### 2.2 Configure Environment Variables
Copy `.env.example` to `server/.env`:
```bash
cp .env.example server/.env
```

Default local configuration:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
JWT_SECRET=super_secret_proxispeak_jwt_token_key_change_in_production
PROXIMITY_RADIUS=100
PROXIMITY_EXIT_RADIUS=120
SPATIAL_GRID_CELL_SIZE=100
```

### 2.3 Run Backend Server
In terminal 1:
```bash
npm --prefix server run dev
```
The server will start on `http://localhost:5000`.

### 2.4 Run Frontend Client
In terminal 2:
```bash
npm --prefix client run dev
```
The client Vite dev server will start on `http://localhost:3000`.

Open your browser to `http://localhost:3000`.

---

## 3. Docker Deployment

To spin up the complete multi-container production stack (MongoDB + Redis + Backend + Nginx Client):

```bash
docker-compose up --build -d
```

- Web Application: `http://localhost:3000`
- REST & Signaling API: `http://localhost:5000`
- MongoDB: `localhost:27017`
- Redis: `localhost:6379`

To view logs:
```bash
docker-compose logs -f
```

To shut down:
```bash
docker-compose down
```
