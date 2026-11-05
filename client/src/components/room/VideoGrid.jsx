import React, { useState } from 'react';
import { VideoTile } from './VideoTile';

export const VideoGrid = ({
  localStream,
  user,
  isAudioMuted,
  isVideoOff,
  isScreenSharing,
  remoteStreams
}) => {
  const [pinnedId, setPinnedId] = useState(null);

  // Build complete list of tiles (local user + remote peers)
  const localTile = {
    id: 'local',
    isLocal: true,
    stream: localStream,
    participant: user,
    isAudioMuted,
    isVideoOff,
    isScreenSharing
  };

  const remoteTiles = Object.entries(remoteStreams).map(([socketId, data]) => ({
    id: socketId,
    isLocal: false,
    stream: data.stream,
    participant: data.participant,
    isAudioMuted: data.participant?.isAudioMuted || false,
    isVideoOff: data.participant?.isVideoOff || false,
    isScreenSharing: data.participant?.isScreenSharing || false
  }));

  const allTiles = [localTile, ...remoteTiles];
  const totalCount = allTiles.length;

  const handleTogglePin = (tileId) => {
    setPinnedId((prev) => (prev === tileId ? null : tileId));
  };

  // If a tile is pinned, render Spotlight mode
  if (pinnedId && allTiles.some((t) => t.id === pinnedId)) {
    const pinnedTile = allTiles.find((t) => t.id === pinnedId);
    const otherTiles = allTiles.filter((t) => t.id !== pinnedId);

    return (
      <div className="flex-1 flex flex-col p-3 sm:p-4 gap-3 h-full overflow-hidden">
        {/* Main Pinned View */}
        <div className="flex-1 w-full min-h-0 relative">
          <VideoTile
            stream={pinnedTile.stream}
            participant={pinnedTile.participant}
            isLocal={pinnedTile.isLocal}
            isAudioMuted={pinnedTile.isAudioMuted}
            isVideoOff={pinnedTile.isVideoOff}
            isScreenSharing={pinnedTile.isScreenSharing}
            isPinned={true}
            onTogglePin={() => handleTogglePin(pinnedTile.id)}
          />
        </div>

        {/* Thumbnail Filmstrip for other participants */}
        {otherTiles.length > 0 && (
          <div className="h-28 sm:h-36 flex gap-3 overflow-x-auto pb-1 shrink-0">
            {otherTiles.map((tile) => (
              <div key={tile.id} className="h-full aspect-video shrink-0">
                <VideoTile
                  stream={tile.stream}
                  participant={tile.participant}
                  isLocal={tile.isLocal}
                  isAudioMuted={tile.isAudioMuted}
                  isVideoOff={tile.isVideoOff}
                  isScreenSharing={tile.isScreenSharing}
                  isPinned={false}
                  onTogglePin={() => handleTogglePin(tile.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Calculate dynamic grid CSS classes based on participant count
  let gridLayoutClass = 'grid-cols-1';
  if (totalCount === 2) {
    gridLayoutClass = 'grid-cols-1 md:grid-cols-2';
  } else if (totalCount === 3 || totalCount === 4) {
    gridLayoutClass = 'grid-cols-1 sm:grid-cols-2';
  } else if (totalCount >= 5) {
    gridLayoutClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  }

  return (
    <div className="flex-1 p-3 sm:p-4 overflow-y-auto flex items-center justify-center">
      <div
        className={`w-full h-full max-w-7xl max-h-full grid ${gridLayoutClass} gap-3 sm:gap-4 auto-rows-fr`}
      >
        {allTiles.map((tile) => (
          <VideoTile
            key={tile.id}
            stream={tile.stream}
            participant={tile.participant}
            isLocal={tile.isLocal}
            isAudioMuted={tile.isAudioMuted}
            isVideoOff={tile.isVideoOff}
            isScreenSharing={tile.isScreenSharing}
            isPinned={false}
            onTogglePin={() => handleTogglePin(tile.id)}
          />
        ))}
      </div>
    </div>
  );
};

