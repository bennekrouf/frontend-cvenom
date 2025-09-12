// src/utils/imageCompression.ts
export const compressImage = (file: File, maxSizeKB: number = 500): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions (max 1200px width/height)
      const maxDimension = 1200;
      let { width, height } = img;

      if (width > height && width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      } else if (height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Start with high quality and reduce if needed
      const quality = 0.9;
      const maxSizeBytes = maxSizeKB * 1024;

      const tryCompress = (q: number) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            // Fallback if compression fails
            canvas.toBlob((fallbackBlob) => {
              const compressedFile = new File([fallbackBlob!], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            }, 'image/jpeg', 0.7);
            return;
          }

          // If still too large and quality can be reduced further
          if (blob.size > maxSizeBytes && q > 0.3) {
            tryCompress(q - 0.1);
          } else {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          }
        }, 'image/jpeg', q);
      };

      tryCompress(quality);
    };

    img.src = URL.createObjectURL(file);
  });
};
