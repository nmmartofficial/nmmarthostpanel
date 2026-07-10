export async function processImageForUpload(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file.'));
      return;
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const targetSize = 500;

      canvas.width = targetSize;
      canvas.height = targetSize;

      // Calculate aspect ratios for center crop
      const imgRatio = img.width / img.height;
      const canvasRatio = 1;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (imgRatio > canvasRatio) {
        // Image is wider than square - crop sides
        drawHeight = targetSize;
        drawWidth = img.width * (targetSize / img.height);
        offsetX = (targetSize - drawWidth) / 2;
        offsetY = 0;
      } else {
        // Image is taller than square - crop top/bottom
        drawWidth = targetSize;
        drawHeight = img.height * (targetSize / img.width);
        offsetX = 0;
        offsetY = (targetSize - drawHeight) / 2;
      }

      // Draw white background (in case image has transparency)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetSize, targetSize);

      // Draw the image with center crop
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      // Convert canvas to blob - prefer WebP, fallback to JPG
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            canvas.toBlob(
              (jpgBlob) => {
                if (jpgBlob) {
                  resolve(jpgBlob);
                } else {
                  reject(new Error('Failed to process image.'));
                }
              },
              'image/jpeg',
              0.8
            );
          }
        },
        'image/webp',
        0.8
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image.'));
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file.'));
    };

    reader.readAsDataURL(file);
  });
}
