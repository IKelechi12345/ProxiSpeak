# ProxiSpeak API & Event Documentation

## 1. Authentication REST APIs

### 1.1 Register User
- **Endpoint**: `POST /api/auth/register`
- **Auth**: None
- **Body**:
```json
{
  "username": "Morgan Vance",
  "email": "morgan@proxispeak.io",
  "password": "securePassword123",
  "avatar": "avatar-1"
}
```
- **Response** (`201 Created`):
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "662f8a12bc90fe1234567890",
      "username": "Morgan Vance",
      "email": "morgan@proxispeak.io",
      "avatar": "avatar-1",
      "createdAt": "2026-10-29T15:00:00.000Z",
      "updatedAt": "2026-10-29T15:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsIn..."
    }
  }
}
```

### 1.2 Login User
- **Endpoint**: `POST /api/auth/login`
- **Auth**: None
- **Body**:
```json
{
  "email": "morgan@proxispeak.io",
  "password": "securePassword123"
}
```
- **Response** (`200 OK`):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "tokens": { "accessToken": "..." }
  }
}
```

### 1.3 Get Current User Profile
- **Endpoint**: `GET /api/auth/me`
- **Auth**: `Bearer <token>`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

---

## 2. Virtual Office REST APIs

### 2.1 List All Offices
- **Endpoint**: `GET /api/offices`
- **Auth**: Optional
- **Response** (`200 OK`): Returns array of office objects with active participant counts and layout metadata.

### 2.2 Create Office
- **Endpoint**: `POST /api/offices`
- **Auth**: `Bearer <token>`
- **Body**:
```json
{
  "name": "Design & Innovation Lab",
  "description": "Cross-functional collaborative studio",
  "maxUsers": 50,
  "layout": { ... }
}
```

### 2.3 Update Office Layout
- **Endpoint**: `PUT /api/offices/:id`
- **Auth**: `Bearer <token>` (Owner only)
- **Body**: Custom furniture and obstacle layout coordinates.

---

## 3. Spatial Performance Audit & Health APIs

### 3.1 Get Current Spatial Latency Audit
- **Endpoint**: `GET /api/audit/spatial`
- **Response** (`200 OK`):
```json
{
  "success": true,
  "data": {
    "queryCount": 1420,
    "avgLatencyMs": 0.084,
    "p95LatencyMs": 0.162,
    "maxLatencyMs": 0.512,
    "meetsTarget": true
  }
}
```

### 3.2 Run Live Multi-User Benchmark
- **Endpoint**: `POST /api/audit/benchmark?users=50&iterations=100`
- **Response** (`200 OK`): Runs 50 simulated active avatars and 100 movement iterations to measure real spatial query performance.

---

## 4. Real-Time Socket.io Events

### 4.1 Client to Server Events
| Event | Payload | Description |
|---|---|---|
| `office:join` | `{ officeId: string, initialPosition?: { x, y } }` | Enter virtual office room |
| `office:leave` | none | Leave current office room |
| `avatar:move` | `{ position: {x,y}, direction, isMoving, timestamp }` | Send validated movement step |
| `audio:mute` | `{ isMuted: boolean }` | Broadcast microphone mute state |
| `audio:speaking`| `{ isSpeaking: boolean }` | Broadcast VAD speaking wave |
| `webrtc:offer` | `{ targetUserId, senderUserId, sdp }` | Forward WebRTC SDP offer |
| `webrtc:answer`| `{ targetUserId, senderUserId, sdp }` | Forward WebRTC SDP answer |
| `webrtc:ice-candidate` | `{ targetUserId, senderUserId, candidate }` | Exchange ICE candidate |

### 4.2 Server to Client Events
| Event | Payload | Description |
|---|---|---|
| `office:joined` | `{ office, localParticipant, participants, nearbyPeerIds }` | Initial room state |
| `user:joined` | `Participant` | A new colleague entered the office |
| `user:left` | `{ userId: string }` | A colleague left the office |
| `avatar:update` | `{ userId, position, direction, isMoving, timestamp }` | Remote avatar movement |
| `proximity:enter`| `{ peerId, username, distance, relativeX, attenuation, shouldInitiateOffer }` | Peer entered $\le 100\text{px}$ proximity |
| `proximity:leave`| `{ peerId, reason }` | Peer exited $> 120\text{px}$ proximity |
| `proximity:update`| `{ relationships: ProximityRelationship[] }` | Real-time distance and stereo pan |
| `audio:state` | `{ userId, isMuted, isSpeaking }` | Peer voice activity update |
