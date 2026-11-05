const http = require('http');
const io = require('../client/node_modules/socket.io-client');

const testSuite = async () => {
  console.log('[Test Suite] Starting Talkme server in-process...');
  const { server } = require('./src/server');

  // Wait for server to connect DB and start listening
  await new Promise((resolve) => {
    if (server.listening) return resolve();
    server.on('listening', resolve);
    setTimeout(resolve, 2500);
  });

  const postJSON = (path, body, headers = {}) => {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 5000,
          path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
            ...headers
          }
        },
        (res) => {
          let buf = '';
          res.on('data', (c) => (buf += c));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(buf) });
            } catch {
              resolve({ status: res.statusCode, raw: buf });
            }
          });
        }
      );
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  };

  const getJSON = (path, headers = {}) => {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 5000,
          path,
          method: 'GET',
          headers
        },
        (res) => {
          let buf = '';
          res.on('data', (c) => (buf += c));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(buf) });
            } catch {
              resolve({ status: res.statusCode, raw: buf });
            }
          });
        }
      );
      req.on('error', reject);
      req.end();
    });
  };

  console.log('\n--- 1. Testing Health Check ---');
  const healthRes = await getJSON('/health');
  console.log('Health Response:', healthRes.status, healthRes.body);
  if (healthRes.status !== 200 || healthRes.body?.status !== 'ok') {
    throw new Error('Health check failed');
  }

  console.log('\n--- 2. Testing User Signup ---');
  const testUser = {
    username: 'alexdev',
    email: 'alex_' + Date.now() + '@example.com',
    password: 'Password123!'
  };
  const signupRes = await postJSON('/api/auth/signup', testUser);
  console.log('Signup Response:', signupRes.status, signupRes.body.success, signupRes.body.user);
  if (signupRes.status !== 201 || !signupRes.body.accessToken) {
    throw new Error('Signup failed: ' + JSON.stringify(signupRes.body));
  }
  const token = signupRes.body.accessToken;

  console.log('\n--- 3. Testing Protected /me Route ---');
  const meRes = await getJSON('/api/auth/me', {
    Authorization: `Bearer ${token}`
  });
  console.log('/me Response:', meRes.status, meRes.body.user?.username);
  if (meRes.status !== 200 || meRes.body.user?.username !== 'alexdev') {
    throw new Error('Protected /me failed');
  }

  console.log('\n--- 4. Testing Guest Login ---');
  const guestRes = await postJSON('/api/auth/guest', { guestName: 'Alice Guest' });
  console.log('Guest Response:', guestRes.status, guestRes.body.user);
  if (guestRes.status !== 200 || !guestRes.body.user.isGuest) {
    throw new Error('Guest login failed');
  }
  const guestToken = guestRes.body.accessToken;

  console.log('\n--- 5. Testing Room Creation ---');
  const roomRes = await postJSON(
    '/api/rooms/create',
    { title: "Alex's Sprint Planning", customCode: 'test-room-' + Math.floor(Math.random() * 1000) },
    { Authorization: `Bearer ${token}` }
  );
  console.log('Room Create Response:', roomRes.status, roomRes.body.room?.roomId);
  if (roomRes.status !== 201 || !roomRes.body.room) {
    throw new Error('Room create failed');
  }
  const roomId = roomRes.body.room.roomId;

  console.log('\n--- 6. Testing Room Retrieval & ICE Servers ---');
  const getRoomRes = await getJSON(`/api/rooms/${roomId}`);
  console.log('Get Room:', getRoomRes.status, getRoomRes.body.room?.title);
  if (getRoomRes.status !== 200) {
    throw new Error('Get room failed');
  }

  const iceRes = await getJSON('/api/rooms/ice-servers');
  console.log('ICE Servers count:', iceRes.body.iceServers?.length);
  if (iceRes.status !== 200 || !Array.isArray(iceRes.body.iceServers)) {
    throw new Error('ICE servers failed');
  }

  console.log('\n--- 7. Testing Socket.io Signaling & Whiteboard Handshake ---');
  const socket = io('http://127.0.0.1:5000', {
    auth: { token: guestToken }
  });

  await new Promise((resolve, reject) => {
    socket.on('connect', () => {
      console.log('Socket connected with ID:', socket.id);
      socket.emit('join-room', {
        roomId,
        user: guestRes.body.user
      });
    });

    socket.on('existing-participants', (data) => {
      console.log('Received existing-participants event for room:', data.roomId);

      // Test whiteboard draw emit
      socket.emit('whiteboard-draw', {
        roomId,
        action: { x0: 0.1, y0: 0.1, x1: 0.5, y1: 0.5, color: '#6366f1', size: 4 }
      });

      // Test chat send message
      socket.emit('send-message', {
        roomId,
        text: 'Hello from verification script!'
      });
    });

    socket.on('new-message', (msg) => {
      console.log('Received in-room chat message:', msg.text, 'from:', msg.senderName);
      socket.disconnect();
      resolve();
    });

    socket.on('connect_error', reject);
    setTimeout(() => reject(new Error('Socket timeout')), 5000);
  });

  console.log('\n🎉 ALL FULL-STACK RTC VERIFICATION CHECKS PASSED!\n');
  process.exit(0);
};

testSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
