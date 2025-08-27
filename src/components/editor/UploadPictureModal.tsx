// src/components/editor/UploadPictureModal.tsx
'use client';

import React, { useRef, useState, useEffect } from 'react';

interface UploadPictureModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaboratorName: string | null;
  onUploadPicture: (file: File) => Promise<void>;
  isLoading: boolean;
}

const UploadPictureModal: React.FC<UploadPictureModalProps> = ({
  isOpen,
  onClose,
  collaboratorName,
  onUploadPicture,
  isLoading
}) => {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadFile(file);
    } else {
      // Reset file input if invalid file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setUploadFile(null);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    await onUploadPicture(uploadFile);
    handleClose();
  };

  const handleClose = () => {
    setUploadFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setUploadFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  if (!isOpen || !collaboratorName) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Upload Picture for {collaboratorName}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Profile Picture
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-secondary file:text-foreground"
            />
            {uploadFile ? (
              <p className="text-xs text-green-600 mt-1">
                Selected: {uploadFile.name}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Please select an image file (PNG, JPG, etc.)
              </p>
            )}
          </div>
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
              disabled={!uploadFile || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPictureModal;
