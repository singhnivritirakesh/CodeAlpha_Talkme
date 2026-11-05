import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  File,
  Download,
  CheckCircle,
  AlertCircle,
  HardDrive,
  Share2
} from 'lucide-react';
import { roomApi } from '../../api/roomApi';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const DISALLOWED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.vbs', '.msi', '.com', '.scr', '.pif', '.dll'
];

export const FileTransferModal = ({
  isOpen,
  onClose,
  sendFileP2P,
  sharedFiles = [],
  setSharedFiles,
  fileTransferProgress,
  roomId,
  currentUserName = 'You'
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [transferMode, setTransferMode] = useState('p2p'); // 'p2p' or 'cloud'
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max size is 50MB.`);
    }

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (DISALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error(`File type ${ext} is restricted for security.`);
    }
  };

  const handleFileChange = (e) => {
    setErrorMessage('');
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      validateFile(file);
      setSelectedFile(file);
    } catch (err) {
      setErrorMessage(err.message);
      setSelectedFile(null);
    }
  };

  const handleSend = async () => {
    if (!selectedFile) return;
    setErrorMessage('');

    try {
      if (transferMode === 'p2p') {
        // Direct P2P WebRTC DataChannel transfer
        await sendFileP2P(selectedFile);
        setSelectedFile(null);
      } else {
        // Server fallback upload
        setIsUploading(true);
        setUploadPercent(0);

        const formData = new FormData();
        formData.append('file', selectedFile);

        const res = await roomApi.uploadFile(formData, (percent) => {
          setUploadPercent(percent);
        });

        if (res.success && res.file) {
          const newFile = {
            fileId: res.file.fileId,
            fileName: res.file.originalName,
            fileSize: res.file.size,
            mimeType: res.file.mimetype,
            downloadUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/files/download/${res.file.storedName}`,
            sender: currentUserName,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            source: 'cloud'
          };
          setSharedFiles((prev) => [newFile, ...prev]);
          setSelectedFile(null);
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'File transfer failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl glass-panel rounded-3xl flex flex-col shadow-2xl border border-slate-700/80 overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="h-16 px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-sm text-slate-100">In-Room File Sharing</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Transfer Mode Selector */}
          <div className="flex items-center gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setTransferMode('p2p')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                transferMode === 'p2p'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WebRTC P2P (Direct & Encrypted)</span>
            </button>
            <button
              onClick={() => setTransferMode('cloud')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                transferMode === 'cloud'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Server Fallback (Persistent)</span>
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Upload Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-900/60 hover:bg-slate-900 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            {selectedFile ? (
              <div>
                <p className="font-semibold text-xs text-indigo-300">{selectedFile.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{formatFileSize(selectedFile.size)}</p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  Click to browse or drop file here
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supports docs, images, archives up to 50MB
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar (P2P or Cloud Upload) */}
          {(fileTransferProgress || isUploading) && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300 truncate max-w-[200px]">
                  {fileTransferProgress?.fileName || selectedFile?.name}
                </span>
                <span className="font-mono text-indigo-400 font-semibold">
                  {fileTransferProgress ? `${fileTransferProgress.percent}%` : `${uploadPercent}%`}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-150"
                  style={{
                    width: `${fileTransferProgress ? fileTransferProgress.percent : uploadPercent}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Send Button */}
          {selectedFile && !fileTransferProgress && !isUploading && (
            <button
              onClick={handleSend}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>
                {transferMode === 'p2p' ? 'Send via WebRTC P2P DataChannel' : 'Upload to Server'}
              </span>
            </button>
          )}

          {/* Shared Files History */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
              Files in this Room ({sharedFiles.length})
            </h3>
            {sharedFiles.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No files shared in this meeting yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sharedFiles.map((file, idx) => (
                  <div
                    key={file.fileId || idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                        <File className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-200 truncate">{file.fileName}</p>
                        <p className="text-[10px] text-slate-500">
                          {formatFileSize(file.fileSize)} • From {file.sender}
                        </p>
                      </div>
                    </div>

                    <a
                      href={file.downloadUrl}
                      download={file.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors shrink-0"
                      title="Download file"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

