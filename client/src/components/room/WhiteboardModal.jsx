import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Edit2, Eraser, Trash2, Download, Palette } from 'lucide-react';

const COLOR_PRESETS = [
  '#ffffff', // White
  '#6366f1', // Indigo
  '#f43f5e', // Rose
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#1e293b'  // Dark slate
];

export const WhiteboardModal = ({ isOpen, onClose, socket, roomId }) => {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const [color, setColor] = useState('#6366f1');
  const [lineWidth, setLineWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);

  /**
   * Draw a line segment on the canvas
   */
  const drawSegment = useCallback((action) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = action.size;

    if (action.isEraser) {
      ctx.strokeStyle = '#0f172a'; // Match background color for smooth erasing
    } else {
      ctx.strokeStyle = action.color;
    }

    ctx.beginPath();
    ctx.moveTo(action.x0 * w, action.y0 * h);
    ctx.lineTo(action.x1 * w, action.y1 * h);
    ctx.stroke();
    ctx.restore();
  }, []);

  /**
   * Clear the entire canvas
   */
  const clearLocalCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  /**
   * Handle incoming socket whiteboard events
   */
  useEffect(() => {
    if (!socket || !isOpen) return;

    const handleRemoteDraw = ({ action }) => {
      drawSegment(action);
    };

    const handleRemoteClear = () => {
      clearLocalCanvas();
    };

    const handleInitState = ({ history }) => {
      clearLocalCanvas();
      if (Array.isArray(history)) {
        history.forEach((action) => drawSegment(action));
      }
    };

    socket.on('whiteboard-draw', handleRemoteDraw);
    socket.on('whiteboard-clear', handleRemoteClear);
    socket.on('whiteboard-init-state', handleInitState);

    // Request existing strokes from server
    socket.emit('whiteboard-request-state', { roomId });

    return () => {
      socket.off('whiteboard-draw', handleRemoteDraw);
      socket.off('whiteboard-clear', handleRemoteClear);
      socket.off('whiteboard-init-state', handleInitState);
    };
  }, [socket, isOpen, roomId, drawSegment, clearLocalCanvas]);

  /**
   * Resize canvas to container on mount/open
   */
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      clearLocalCanvas();
      // Re-fetch state so drawings render at new size
      socket?.emit('whiteboard-request-state', { roomId });
    }
  }, [isOpen, clearLocalCanvas, socket, roomId]);

  if (!isOpen) return null;

  /**
   * Normalized coordinate extraction (0 to 1) for cross-resolution consistency
   */
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) / canvas.width;
    const y = (clientY - rect.top) / canvas.height;

    return { x, y };
  };

  const handlePointerDown = (e) => {
    isDrawingRef.current = true;
    lastPosRef.current = getCoordinates(e);
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    const currentPos = getCoordinates(e);

    const action = {
      x0: lastPosRef.current.x,
      y0: lastPosRef.current.y,
      x1: currentPos.x,
      y1: currentPos.y,
      color,
      size: lineWidth,
      isEraser
    };

    // Draw locally immediately
    drawSegment(action);

    // Broadcast live to room
    if (socket && roomId) {
      socket.emit('whiteboard-draw', {
        roomId,
        action
      });
    }

    lastPosRef.current = currentPos;
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const handleClear = () => {
    clearLocalCanvas();
    if (socket && roomId) {
      socket.emit('whiteboard-clear', { roomId });
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `talkme-whiteboard-${roomId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-5xl h-[88vh] glass-panel rounded-3xl flex flex-col shadow-2xl border border-slate-700/80 overflow-hidden">
        {/* Toolbar Header */}
        <div className="h-16 px-4 sm:px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Collaborative Whiteboard</span>
            </span>

            <div className="h-5 w-px bg-slate-800 hidden sm:block" />

            {/* Tool Selection: Pencil / Eraser */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setIsEraser(false)}
                title="Pencil"
                className={`p-2 rounded-lg transition-colors ${
                  !isEraser ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsEraser(true)}
                title="Eraser"
                className={`p-2 rounded-lg transition-colors ${
                  isEraser ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eraser className="w-4 h-4" />
              </button>
            </div>

            {/* Color Palette Presets */}
            {!isEraser && (
              <div className="flex items-center gap-1.5 pl-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full border transition-transform ${
                      color === c ? 'scale-125 border-white ring-2 ring-indigo-500/50' : 'border-slate-700 hover:scale-110'
                    }`}
                  />
                ))}
                <label className="relative cursor-pointer ml-1">
                  <Palette className="w-5 h-5 text-slate-400 hover:text-indigo-400" />
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                </label>
              </div>
            )}

            {/* Brush Size Slider */}
            <div className="hidden md:flex items-center gap-2 pl-3">
              <span className="text-xs text-slate-400 font-mono">{lineWidth}px</span>
              <input
                type="range"
                min="1"
                max="30"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-20 accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              title="Clear Whiteboard"
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>

            <button
              onClick={handleDownload}
              title="Download Canvas PNG"
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 w-full h-full relative cursor-crosshair bg-slate-900 touch-none">
          <canvas
            ref={canvasRef}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            className="w-full h-full block"
          />
        </div>
      </div>
    </div>
  );
};

