// src/utils/fileSizeConstants.ts
export const FILE_SIZE_LIMITS = {
  IMAGE_MAX_INITIAL: 5 * 1024 * 1024, // 5MB
  OTHER_MAX_INITIAL: 10 * 1024 * 1024, // 10MB
  COMPRESSED_TARGET: 500, // 500KB
  UPLOAD_HARD_LIMIT: 2 * 1024 * 1024, // 2MB
} as const;
