'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { compressImage } from '@/utils/imageCompression';

const MAX_FILE_MB = 10;
const COMPRESS_THRESHOLD_KB = 500;

interface UploadPictureModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaboratorName: string | null;
  onUploadPicture: (file: File) => Promise<void>;
  isLoading: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const UploadPictureModal: React.FC<UploadPictureModalProps> = ({
  isOpen, onClose, collaboratorName, onUploadPicture, isLoading,
}) => {
  const [uploadFile, setUploadFile]     = useState<File | null>(null);
  const [preview, setPreview]           = useState<string | null>(null);
  const [sizeInfo, setSizeInfo]         = useState<{ original: number; final: number } | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [compressing, setCompressing]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setUploadFile(null);
    setPreview(null);
    setSizeInfo(null);
    setError(null);
    setCompressing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleClose = useCallback(() => { reset(); onClose(); }, [reset, onClose]);

  useEffect(() => { if (!isOpen) reset(); }, [isOpen, reset]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isLoading) handleClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, isLoading, handleClose]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    setUploadFile(null);
    setPreview(null);
    setSizeInfo(null);

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, WebP, etc.)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File is too large (${formatSize(file.size)}). Maximum allowed is ${MAX_FILE_MB} MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const originalSize = file.size;

    // Auto-compress if above threshold
    if (file.size > COMPRESS_THRESHOLD_KB * 1024) {
      setCompressing(true);
      try {
        const compressed = await compressImage(file, COMPRESS_THRESHOLD_KB);
        setUploadFile(compressed);
        setSizeInfo({ original: originalSize, final: compressed.size });
        const reader = new FileReader();
        reader.onload = (ev) => setPreview(ev.target?.result as string);
        reader.readAsDataURL(compressed);
      } catch {
        // Compression failed — fall back to original
        setUploadFile(file);
        setSizeInfo({ original: originalSize, final: originalSize });
        const reader = new FileReader();
        reader.onload = (ev) => setPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
      } finally {
        setCompressing(false);
      }
    } else {
      setUploadFile(file);
      setSizeInfo({ original: originalSize, final: originalSize });
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    await onUploadPicture(uploadFile);
    handleClose();
  };

  if (!isOpen || !collaboratorName) return null;

  const wasCompressed = sizeInfo && sizeInfo.final < sizeInfo.original * 0.95;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Upload Picture for {collaboratorName}
        </h3>

        <div className="space-y-4">
          {/* Preview */}
          {preview && (
            <div className="flex justify-center">
              <img
                src={preview}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-lg border border-border"
              />
            </div>
          )}

          {/* File input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Profile Picture
              <span className="text-muted-foreground font-normal ml-1">(max {MAX_FILE_MB} MB)</span>
            </label>

            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-colors">
              <span className="text-sm text-muted-foreground">
                {compressing ? 'Compressing…' : 'Click to choose or drag & drop'}
              </span>
              <span className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={compressing || isLoading}
              />
            </label>

            {/* Status messages */}
            {error && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                <span>⚠</span> {error}
              </p>
            )}
            {compressing && (
              <p className="text-xs text-blue-500 mt-2">Optimising image…</p>
            )}
            {uploadFile && sizeInfo && !compressing && (
              <div className="text-xs mt-2 space-y-0.5">
                <p className="text-green-600 dark:text-green-400">
                  ✓ {uploadFile.name}
                </p>
                {wasCompressed ? (
                  <p className="text-muted-foreground">
                    Compressed: {formatSize(sizeInfo.original)} → <strong>{formatSize(sizeInfo.final)}</strong>
                  </p>
                ) : (
                  <p className="text-muted-foreground">{formatSize(sizeInfo.final)}</p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!uploadFile || isLoading || compressing}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading…
                </span>
              ) : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPictureModal;
