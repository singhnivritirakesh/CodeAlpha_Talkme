/**
 * WebRTC ICE Server Configuration (STUN / TURN)
 * Public STUN servers from Google are provided as defaults for NAT traversal.
 * In production environments behind symmetric NATs, a TURN server (e.g. Coturn or Twilio) should be added.
 */
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

module.exports = { rtcConfig };

