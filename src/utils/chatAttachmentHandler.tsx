// src/utils/chatAttachmentHandler.tsx
import React from 'react';
import Image from 'next/image';
import { FiFile } from 'react-icons/fi';
import { FileAttachment } from '@/types/chat';
import { formatFileSize } from './chatUtils';

export class ChatAttachmentHandler {
  /**
   * Render attachments for a chat message
   */
  static renderAttachments(attachments: FileAttachment[]): React.ReactNode {
    if (!attachments || attachments.length === 0) {
      return null;
    }

    return (
      <div className="mt-3 space-y-2">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center space-x-3 p-2 bg-secondary/50 rounded border"
          >
            {attachment.preview ? (
              <Image
                src={attachment.preview}
                alt={attachment.name}
                width={48}
                height={48}
                className="object-cover rounded"
              />
            ) : (
              <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                <FiFile className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{attachment.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.size)}
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              {this.getFileTypeDisplay(attachment.type)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  /**
   * Get display name for file type
   */
  private static getFileTypeDisplay(mimeType: string): string {
    const typeMap: Record<string, string> = {
      'image/jpeg': 'JPG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'image/webp': 'WEBP',
      'application/pdf': 'PDF',
      'text/plain': 'TXT',
      'application/json': 'JSON'
    };

    return typeMap[mimeType] || mimeType.split('/')[1]?.toUpperCase() || 'FILE';
  }

  /**
   * Check if attachment is an image
   */
  static isImage(attachment: FileAttachment): boolean {
    return attachment.type.startsWith('image/');
  }

  /**
   * Check if attachment is a document
   */
  static isDocument(attachment: FileAttachment): boolean {
    return attachment.type === 'application/pdf' ||
      attachment.type === 'text/plain' ||
      attachment.type === 'application/json';
  }

  /**
   * Get attachment count summary
   */
  static getAttachmentSummary(attachments: FileAttachment[]): string {
    if (!attachments || attachments.length === 0) return '';

    const images = attachments.filter(this.isImage).length;
    const documents = attachments.filter(this.isDocument).length;
    const others = attachments.length - images - documents;

    const parts = [];
    if (images > 0) parts.push(`${images} image${images > 1 ? 's' : ''}`);
    if (documents > 0) parts.push(`${documents} document${documents > 1 ? 's' : ''}`);
    if (others > 0) parts.push(`${others} file${others > 1 ? 's' : ''}`);

    return parts.join(', ');
  }
}
