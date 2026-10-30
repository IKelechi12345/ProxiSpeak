# ProxiSpeak Testing & Verification Guide

## 1. Test Architecture Overview

ProxiSpeak includes multi-tier testing:
1. **Mathematical & Geometry Unit Tests**:
   - Euclidean distance calculation
   - Distance volume attenuation curves
   - Stereo panning [-1.0 to 1.0]
   - Line-of-sight ray casting against rectangular obstacles
   - Avatar collision detection with office boundaries and furniture
2. **Proximity Engine & Hysteresis Tests**:
   - Proximity entry detection at $\le 100\text{px}$
   - Deterministic polite offer initiator election
   - Hysteresis deadband validation ($100\text{px} - 120\text{px}$)
   - Proximity exit at $> 120\text{px}$
   - Latency recording and $<20\text{ms}$ performance verification
3. **Integration REST & Socket.io Tests**:
   - User registration and password hashing
   - JWT authentication and profile retrieval
   - Office layout creation and MongoDB persistence
   - Live spatial benchmark endpoint
   - Authenticated Socket.io connection and room joins
4. **Client State Tests**:
   - Participant movement updates
   - Proximity list additions and removals
   - Mute/unmute state machine and volume clamping

---

## 2. Executing Automated Tests

### Run Server Unit & Integration Tests:
```bash
npm --prefix server test
```

### Run Client Tests:
```bash
npm --prefix client test
```

### Run All Tests:
```bash
npm run test
npm run test:client
```

---

## 3. Manual Multi-User Browser Audio Testing Workflow

To test spatial audio and proximity voice chat with two active browser sessions:

1. **Start the backend and frontend**:
   ```bash
   npm --prefix server run dev
   npm --prefix client run dev
   ```
2. **Session 1 (User A)**:
   - Open Chrome at `http://localhost:3000`.
   - Sign in using `demo@proxispeak.io` / `password123`.
   - Join "ProxiSpeak Headquarters & Open Campus".
   - Allow microphone permissions.
3. **Session 2 (User B)**:
   - Open an Incognito window or second browser (e.g., Edge / Firefox) at `http://localhost:3000`.
   - Register a second account (e.g. `Colleague B`).
   - Join the same office room.
4. **Proximity Detection**:
   - User A and User B appear on each other's 60 FPS Canvas in real time.
   - Use WASD keys to walk User B toward User A.
   - When distance drops below **100px**:
     - Glowing cyan proximity halo activates.
     - WebRTC peer connection establishes automatically.
     - Live volume percentage tag appears midway between avatars.
     - Speak into the microphone: User A hears User B!
5. **Stereo Panning & Attenuation**:
   - Walk User B to the right of User A: audio pans into User A's right ear.
   - Walk User B farther away: audio smoothly decreases in volume.
6. **Sound-Blocking Acoustic Partitions**:
   - Walk User B into the Executive Boardroom or behind the acoustic divider.
   - The connection line turns into an orange dashed ray.
   - Audio is muffled or blocked according to the obstacle's attenuation factor.
7. **Proximity Exit**:
   - Walk User B beyond **120px**:
     - WebRTC connection gracefully tears down.
     - Audio processing nodes disconnect with smooth gain ramps.
