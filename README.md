# Talkme - Real-Time Communication & Collaboration Platform

Talkme is a production-ready, full-stack real-time communication application featuring multi-user WebRTC video conferencing (mesh topology), live collaborative whiteboarding, screen sharing, peer-to-peer chunked file sharing via WebRTC Data Channels, and in-room text chat.

---

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Axios, Socket.io-client
- **Backend**: Node.js, Express, Socket.io
- **Real-Time Signaling**: WebSockets via Socket.io
- **Media Engine**: WebRTC Mesh Topology (4–6 participants) with STUN/TURN NAT traversal
- **Data Channels**: WebRTC `RTCDataChannel` for direct peer-to-peer chunked file sharing
- **Database**: MongoDB with Mongoose (with automated fallback to persistent storage for instant zero-setup execution)
- **Authentication**: JWT (Short-lived access token + rotating refresh tokens in HTTP-only cookies) + Bcrypt password hashing + frictionless Guest sessions
- **Security**: Built-in DTLS-SRTP media encryption, Helmet security headers, CORS origin enforcement, and Express rate limiting

---

## Architecture & Project Structure

```
Talkme/
├── package.json               # Root scripts for running server & client concurrently
├── .env.example               # Root environment variables guide
├── .gitignore
├── README.md                  # System architecture, signaling flow, setup documentation
│
├── server/                    # Node.js + Express + Socket.io backend
│   ├── package.json
│   ├── .env.example
│   ├── .env
│   ├── uploads/               # Safe storage directory for fallback file transfers
│   └── src/
│       ├── config/
│       │   ├── db.js          # MongoDB connection with zero-setup persistent fallback
│       │   └── rtcConfig.js   # STUN/TURN ICE server configuration
│       ├── controllers/
│       │   ├── authController.js  # Signup, login, guest access, token rotation, logout
│       │   ├── roomController.js  # Room creation, metadata query, ICE servers endpoint
│       │   └── fileController.js  # Fallback file upload/download with MIME & size validation
│       ├── middleware/
│       │   ├── authMiddleware.js  # JWT verification (headers/cookies) & guest handling
│       │   ├── rateLimiter.js     # API & auth endpoint brute-force protection
│       │   └── errorHandler.js    # Centralized HTTP error handler
│       ├── models/
│       │   ├── User.js        # User model with bcrypt hashing & JWT methods
│       │   ├── Room.js        # Room model with TTL expiry & participant tracking
│       │   └── memoryStore.js # Fast local persistent store fallback
│       ├── routes/
│       │   ├── authRoutes.js  # /api/auth endpoints
│       │   ├── roomRoutes.js  # /api/rooms endpoints
│       │   └── fileRoutes.js  # /api/files endpoints
│       ├── sockets/
│       │   ├── socketAuth.js          # JWT authentication middleware for WebSockets
│       │   ├── signalingHandler.js    # WebRTC mesh signaling (join, offer, answer, ICE)
│       │   ├── chatHandler.js         # Real-time message dispatch & system alerts
│       │   └── whiteboardHandler.js   # Live stroke broadcasting & canvas history sync
│       └── server.js                  # Express app, HTTP & Socket.io server initialization
│
└── client/                    # React (Vite) + Tailwind CSS frontend
    ├── package.json
    ├── vite.config.js         # Vite configuration with API & WebSocket proxies
    ├── tailwind.config.js     # Tailwind design system & custom animations
    ├── postcss.config.js
    ├── index.html
    ├── .env.example
    ├── .env
    └── src/
        ├── api/
        │   ├── axiosClient.js # Axios instance with automatic 401 refresh token interceptor
        │   ├── authApi.js     # Auth API client
        │   └── roomApi.js     # Rooms & file transfer API client
        ├── context/
        │   ├── AuthContext.jsx   # Global user state, login, signup, guest access
        │   └── SocketContext.jsx # Socket.io connection lifecycle & auth token sync
        ├── hooks/
        │   ├── useMediaDevices.js# Webcam, microphone, screen sharing & track replacement
        │   └── useWebRTC.js      # Mesh RTCPeerConnections, DataChannels, chunked file transfer
        ├── components/
        │   ├── auth/
        │   │   ├── LoginForm.jsx   # Login form with guest quick-action
        │   │   └── SignupForm.jsx  # User registration form with validation
        │   ├── layout/
        │   │   ├── Navbar.jsx          # Top navigation with user status & branding
        │   │   └── ProtectedRoute.jsx  # Route guard for meeting rooms
        │   └── room/
        │       ├── RoomHeader.jsx        # Room info, meeting timer, copy link with toast
        │       ├── VideoTile.jsx         # Video element, mic indicator, avatar fallback, pin button
        │       ├── VideoGrid.jsx         # Responsive 1 to 6+ grid + spotlight pinned view
        │       ├── ControlsBar.jsx       # Mic, camera, share, whiteboard, chat, leave
        │       ├── ChatDrawer.jsx        # In-room text chat with timestamps & system alerts
        │       ├── WhiteboardModal.jsx   # Collaborative HTML5 canvas with live socket sync
        │       ├── FileTransferModal.jsx # WebRTC DataChannel chunking + progress bar
        │       └── ParticipantsModal.jsx # Participant roster with audio/video/screen state
        ├── pages/
        │   ├── HomePage.jsx   # Landing page with instant meeting & code join
        │   ├── AuthPage.jsx   # Sign in, signup, and guest bypass
        │   └── RoomPage.jsx   # Main conferencing view assembling RTC components
        ├── utils/
        │   └── rtcConfig.js   # Client ICE servers configuration
        ├── App.jsx            # Router and provider tree
        ├── main.jsx           # React DOM root
        └── index.css          # Tailwind CSS directives & custom styling
```

---

## WebRTC Signaling Flow Explained

In a **Mesh Topology**, each participant establishes a direct peer-to-peer connection (`RTCPeerConnection`) with every other participant in the room. For $N$ participants, each client maintains $N - 1$ peer connections.

### 1. Peer Connection Negotiation (Offer / Answer / ICE)

```
[Peer A (Existing)]                 [Signaling Server (Socket.io)]               [Peer B (New Joiner)]
         |                                        |                                        |
         |                                        |<------- 1. join-room(roomId) ----------|
         |<------- 2. user-joined(Peer B) --------|                                        |
         |                                        |--- 3. existing-participants([Peer A])->|
         |                                        |                                        |
         |                                        |-- 4. createOffer() & setLocalDesc()    |
         |                                        |------- 5. emit('offer', offer) ------->|
         |<-------- 6. relay('offer') ------------|                                        |
         |                                        |                                        |
         |-- 7. setRemoteDesc(offer)              |                                        |
         |-- 8. createAnswer() & setLocalDesc()   |                                        |
         |-- 9. emit('answer', answer) ---------->|                                        |
         |                                        |-------- 10. relay('answer') ---------->|
         |                                        |-- 11. setRemoteDesc(answer)            |
         |                                        |                                        |
         |======== 12. Exchange ICE Candidates via Server ('ice-candidate') ======================|
         |                                                                                        |
         |<================ Direct P2P Media Stream (DTLS-SRTP Audio & Video) ===================>|
```

1. **Join Notification**: Peer B joins the room. The server notifies existing peers via `user-joined` and gives Peer B the list of existing peers via `existing-participants`.
2. **Offer Creation**: Peer B iterates through existing participants and calls `peerConnection.createOffer()`, sets `setLocalDescription(offer)`, and emits the offer through the signaling server.
3. **Answer Creation**: Peer A receives the offer, sets `setRemoteDescription(offer)`, calls `peerConnection.createAnswer()`, sets `setLocalDescription(answer)`, and emits the answer back.
4. **Answer Handshake**: Peer B sets `setRemoteDescription(answer)`.
5. **Trickle ICE Negotiation**: Both peers gather network candidates via `pc.onicecandidate` and relay them through the server. If candidates arrive before the remote description is set, they are buffered in a queue and flushed immediately upon description completion.
6. **Direct Peer Media Stream**: Direct DTLS-SRTP encrypted peer-to-peer media flowing without passing media through the server.

---

### 2. Screen Sharing Flow

```
User Clicks "Share Screen"
       │
       ▼
navigator.mediaDevices.getDisplayMedia({ video: true })
       │
       ▼
Extract new screen video track
       │
       ▼
For each active RTCPeerConnection:
  sender = pc.getSenders().find(s => s.track.kind === 'video')
  sender.replaceTrack(newScreenTrack)
       │
       ▼
Broadcast socket.emit('media-state-change', { isScreenSharing: true })
       │
       ▼
When user clicks "Stop Sharing":
  screenTrack.stop()
  sender.replaceTrack(webcamVideoTrack)
  Broadcast socket.emit('media-state-change', { isScreenSharing: false })
```

---

### 3. WebRTC Data Channel File Sharing (Chunked P2P)

WebRTC Data Channels allow direct, encrypted peer-to-peer file transmission without passing files through the backend server:

1. **Initiation**: When creating the `RTCPeerConnection`, Peer A creates a data channel:
   ```javascript
   const dataChannel = pc.createDataChannel('fileTransfer', { ordered: true });
   ```
2. **Metadata Header**: Before sending data, Peer A emits a JSON metadata message containing `fileId`, `fileName`, `fileSize`, `mimeType`, and `totalChunks`.
3. **Chunking**: The file is read via `FileReader` / `ArrayBuffer` in fixed 32 KB slices (`CHUNK_SIZE = 32768 bytes`). Each chunk is prefixed with the 36-byte `fileId` header and sent across active data channels.
4. **Assembly**: Peer B receives chunks, tracks progress (`receivedBytes / totalBytes`), accumulates the slices, reconstructs a `Blob`, and creates an instant download URL.
5. **Fallback**: If peers are not directly connectable via Data Channels, an integrated HTTP fallback upload endpoint (`/api/files/upload`) with Multer and size validation handles persistent downloads.

---

### 4. Live Collaborative Whiteboard

- **HTML5 Canvas** rendered with normalized coordinates `(x / width, y / height)` between `0.0` and `1.0`. This ensures drawings align with pixel accuracy across laptops, desktops, and mobile devices of varying resolutions.
- Real-time stroke broadcasting via Socket.io `whiteboard-draw`.
- Global room history buffer (`history.length <= 3000`) stored in memory so participants joining mid-meeting receive the full current state via `whiteboard-request-state`.

---

## Security Measures

1. **End-to-End Media Encryption**: All audio, video, and data channel communication uses WebRTC's mandatory **DTLS** (Datagram Transport Layer Security) and **SRTP** (Secure Real-time Transport Protocol).
2. **JWT Authentication & Rotation**:
   - Short-lived Access Tokens (15 min) for authorized operations and WebSocket handshakes.
   - Long-lived Refresh Tokens (7 days) stored in secure, `httpOnly`, `SameSite` cookies with single-use rotation.
   - One-click Guest tokens generated and signed with JWT for secure guest participation.
3. **Helmet & Content Security Policy**:
   - HTTP response headers configured to allow WebRTC STUN/TURN, canvas blob URLs, and WebSocket handshakes while blocking cross-site scripting (XSS).
4. **CORS Whitelisting**:
   - Strict origin validation matching client URL with credential support.
5. **Rate Limiting**:
   - API endpoints limited to 300 requests / 15 min per IP.
   - Authentication routes limited to 25 attempts / 15 min to prevent credential brute-forcing.
   - File uploads capped to 50 uploads / 15 min.
6. **Input Validation & File Sanitization**:
   - Passwords hashed with `bcryptjs` (salt rounds = 10).
   - Strict 50MB file size ceiling.
   - Blocked execution vectors (`.exe`, `.bat`, `.cmd`, `.sh`, `.vbs`, `.msi`).
   - Filenames sanitized with UUIDs to prevent directory traversal attacks.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ or v20+
- (Optional) Local MongoDB instance or MongoDB Atlas URI. *If no MongoDB instance is running, the server automatically boots an in-memory persistent storage layer so the app runs immediately.*

### 1. Installation

From the project root:

```bash
# Install root dependencies
npm install

# Install server dependencies
npm install --prefix server

# Install client dependencies
npm install --prefix client
```

Or using the convenience script:
```bash
npm run install:all
```

---

### 2. Environment Configuration

Copy the example `.env` files:

```bash
# Root example
cp .env.example .env

# Server .env
cp server/.env.example server/.env

# Client .env
cp client/.env.example client/.env
```

Default values in `.env` are configured for local development (`http://localhost:5173` client and `http://localhost:5000` server).

---

### 3. Running the Application

You can start both the client and server concurrently with one command from the project root:

```bash
npm run dev
```

Or run them individually in separate terminal sessions:

```bash
# Terminal 1: Backend Server (runs on port 5000)
npm run dev:server

# Terminal 2: Frontend Client (runs on port 5173)
npm run dev:client
```

Open your browser at:
```
http://localhost:5173
```

---

### 4. Testing Multi-User Calling

1. Open `http://localhost:5173` in a browser window.
2. Click **New Meeting** or sign in / continue as guest.
3. Copy the meeting link from the header using **Copy Link**.
4. Open an **Incognito / Private window** (or a second browser like Chrome / Firefox / Edge) and paste the link.
5. Enter a guest name (e.g. "Alice") and join the room.
6. Both participants will instantly connect via WebRTC mesh with live audio/video, screen sharing, chat, whiteboard, and file sharing!

