import { useState, useRef, useCallback, useEffect } from 'react';

export const useMediaDevices = () => {
  const [localStream, setLocalStream] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [mediaError, setMediaError] = useState(null);

  const localStreamRef = useRef(null);
  const screenTrackRef = useRef(null);
  const webcamVideoTrackRef = useRef(null);

  /**
   * Acquire local user media (webcam + microphone)
   */
  const startLocalMedia = useCallback(async (customConstraints = null) => {
    try {
      setMediaError(null);
      const constraints = customConstraints || {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      webcamVideoTrackRef.current = stream.getVideoTracks()[0] || null;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.warn('[useMediaDevices] getUserMedia error:', err.name, err.message);
      setMediaError(err.message || 'Failed to access camera/microphone');

      // Attempt audio-only if camera is unavailable or denied
      try {
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = audioOnlyStream;
        setLocalStream(audioOnlyStream);
        setIsVideoOff(true);
        return audioOnlyStream;
      } catch (audioErr) {
        console.error('[useMediaDevices] Audio fallback also failed:', audioErr);
        return null;
      }
    }
  }, []);

  /**
   * Toggle microphone audio track
   */
  const toggleAudio = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioMuted(!audioTrack.enabled);
    }
  }, []);

  /**
   * Toggle camera video track
   */
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  }, []);

  /**
   * Start Screen Sharing
   * Replaces webcam video track in local stream and peer connections
   */
  const startScreenShare = useCallback(async (onTrackReplaced) => {
    try {
      if (isScreenSharing) return;

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      screenTrackRef.current = screenTrack;

      // Handle when user stops sharing via browser UI ("Stop Sharing" bar)
      screenTrack.onended = () => {
        stopScreenShare(onTrackReplaced);
      };

      // Replace current video track in local stream
      const currentVideoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (currentVideoTrack && localStreamRef.current) {
        localStreamRef.current.removeTrack(currentVideoTrack);
        localStreamRef.current.addTrack(screenTrack);
      }

      // Notify peer connections to replace track
      if (onTrackReplaced && typeof onTrackReplaced === 'function') {
        onTrackReplaced(screenTrack);
      }

      setIsScreenSharing(true);
      // Force stream reference refresh in state
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        console.error('[useMediaDevices] Screen sharing error:', err);
      }
    }
  }, [isScreenSharing]);

  /**
   * Stop Screen Sharing and revert back to webcam track
   */
  const stopScreenShare = useCallback((onTrackReplaced) => {
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }

    if (webcamVideoTrackRef.current && localStreamRef.current) {
      const currentTrack = localStreamRef.current.getVideoTracks()[0];
      if (currentTrack) {
        localStreamRef.current.removeTrack(currentTrack);
      }
      localStreamRef.current.addTrack(webcamVideoTrackRef.current);

      if (onTrackReplaced && typeof onTrackReplaced === 'function') {
        onTrackReplaced(webcamVideoTrackRef.current);
      }
    }

    setIsScreenSharing(false);
    if (localStreamRef.current) {
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    }
  }, []);

  /**
   * Clean up all media tracks on unmount
   */
  const stopAllMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
    setLocalStream(null);
  }, []);

  useEffect(() => {
    return () => {
      stopAllMedia();
    };
  }, [stopAllMedia]);

  return {
    localStream,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    mediaError,
    startLocalMedia,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    stopAllMedia
  };
};

