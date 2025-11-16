// src/components/editor/CVUploadDropZone.tsx
'use client';

import React, { useState, useRef } from 'react';
import { FiUpload, FiFile, FiX, FiCheck } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import { getAuth } from 'firebase/auth';
import { getApiUrl } from '@/lib/config';

interface CVUploadDropZoneProps {
  onUploadSuccess?: (personName: string) => void;
  className?: string;
}

interface UploadResult {
  success: boolean;
  person_name?: string;
  message?: string;
  error?: string;
  error_code?: string;
  suggestions?: string[];
}

const CVUploadDropZone: React.FC<CVUploadDropZoneProps> = ({ onUploadSuccess, className = '' }) => {
  const { user, isAuthenticated } = useAuth();
  const t = useTranslations('fileEditor');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getGreeting = (): string => {
    if (!user?.displayName) return 'Welcome';

    const firstName = user.displayName.split(' ')[0];
    const hour = new Date().getHours();

    if (hour < 12) return `${t('goodMorning')}, ${firstName}`;
    if (hour < 17) return `${t('goodAfternoon')}, ${firstName}`;
    return `${t('goodEvening')}, ${firstName}`;
  };

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['.pdf', '.docx'];
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(extension)) {
      return 'Only PDF and Word documents (.docx) are supported';
    }

    if (file.size > 10 * 1024 * 1024) {
      return 'File size exceeds 10MB limit';
    }

    return null;
  };

  const uploadCV = async (file: File): Promise<UploadResult> => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('Authentication required');
    }

    const token = await user.getIdToken();
    const formData = new FormData();
    formData.append('cv_file', file);

    const response = await fetch(`${getApiUrl()}/cv/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    return response.json();
  };

  const handleFileUpload = async (file: File) => {
    setError('');
    setSuccess('');

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);

    try {
      const result = await uploadCV(file);

      if (result.success) {
        setSuccess(result.message || `CV converted! Profile "${result.person_name}" created`);
        if (result.person_name && onUploadSuccess) {
          onUploadSuccess(result.person_name);
        }
      } else {
        let errorMessage = result.error || 'Upload failed';
        if (result.suggestions && result.suggestions.length > 0) {
          errorMessage += '\n\nSuggestions:\n• ' + result.suggestions.join('\n• ');
        }
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Personalized Greeting */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {getGreeting()}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t('uploadCVDescription')}
        </p>
      </div>

      {/* Upload Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${isDragOver
            ? 'border-primary bg-primary/5 scale-102'
            : uploading
              ? 'border-muted bg-muted/20'
              : 'border-border hover:border-primary hover:bg-primary/5'
          }
          ${uploading ? 'cursor-wait' : 'cursor-pointer'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />

        <div className="flex flex-col items-center space-y-4">
          {uploading ? (
            <>
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-lg font-medium text-foreground">{t('convertingCV')}</p>
                <p className="text-sm text-muted-foreground">{t('conversionMayTakeTime')}</p>
              </div>
            </>
          ) : isDragOver ? (
            <>
              <FiUpload className="w-12 h-12 text-primary" />
              <p className="text-lg font-medium text-primary">{t('dropCVHere')}</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <FiFile className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground mb-1">{t('uploadYourCV')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('dragDropOrClick')}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('supportsPDFWord')}
                </p>
              </div>
            </>
          )}
        </div>

        {(isDragOver || uploading) && (
          <div className="absolute inset-0 rounded-lg bg-primary/5 pointer-events-none" />
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex items-start">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                {t('uploadFailed')}
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 whitespace-pre-line">
                {error}
              </p>
            </div>
            <button
              onClick={clearMessages}
              className="ml-2 p-1 text-red-500 hover:text-red-700"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
          <div className="flex items-start">
            <FiCheck className="w-5 h-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                {t('uploadSuccess')}
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                {success}
              </p>
            </div>
            <button
              onClick={clearMessages}
              className="ml-2 p-1 text-green-500 hover:text-green-700"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CVUploadDropZone;
