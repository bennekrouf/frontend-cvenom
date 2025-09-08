'use client';

import React from 'react';
import { FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import { useTranslations } from 'next-intl';

interface DeleteCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaboratorName: string | null;
  onDeleteCollaborator: () => Promise<void>;
  isDeleting: boolean;
}

const DeleteCollaboratorModal: React.FC<DeleteCollaboratorModalProps> = ({
  isOpen,
  onClose,
  collaboratorName,
  onDeleteCollaborator,
  isDeleting
}) => {
  const t = useTranslations('fileEditor');

  const handleDelete = async () => {
    await onDeleteCollaborator();
  };

  const handleClose = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  if (!isOpen || !collaboratorName) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-96">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center">
            <FiAlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{t('deleteCollaboratorTitle')}</h3>
            <p className="text-sm text-muted-foreground">{t('deleteCollaboratorSubtitle')}</p>
          </div>
        </div>

        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-800 dark:text-red-200 mb-2">
            {t('deleteCollaboratorWarning', { name: collaboratorName })}
          </p>
          <ul className="text-xs text-red-700 dark:text-red-300 space-y-1">
            <li>• {t('deleteCollaboratorWarningFiles')}</li>
            <li>• {t('deleteCollaboratorWarningPictures')}</li>
            <li>• {t('deleteCollaboratorWarningCVs')}</li>
          </ul>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <FiTrash2 className="w-4 h-4" />
            )}
            <span>{isDeleting ? t('deleting') : t('deleteCollaboratorConfirm')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteCollaboratorModal;
