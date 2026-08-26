/**
 * Utility to compress and convert images to low-resolution, lightweight data URLs
 * to ensure Firebase Firestore / database is never overloaded with heavy payloads.
 */
export async function compressImageToLowRes(
  imageSrc: string,
  maxWidth = 380,
  maxHeight = 380,
  quality = 0.72
): Promise<string> {
  if (!imageSrc) return imageSrc;
  
  // If it's already an external CDN url and not a heavy base64 string, we can return or compress on demand
  if (imageSrc.startsWith("http") && !imageSrc.includes("base64") && imageSrc.length < 300) {
    return imageSrc;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      const timeout = setTimeout(() => {
        resolve(imageSrc);
      }, 5000);

      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement("canvas");
          let width = img.naturalWidth || img.width || 400;
          let height = img.naturalHeight || img.height || 400;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = Math.max(100, width);
          canvas.height = Math.max(100, height);
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(imageSrc);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Output ultra-lightweight JPEG (~20KB-35KB max)
          const lowResDataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(lowResDataUrl);
        } catch {
          resolve(imageSrc);
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        resolve(imageSrc);
      };

      img.src = imageSrc;
    } catch {
      resolve(imageSrc);
    }
  });
}

export async function compressImageFile(
  file: File,
  maxWidth = 1000,
  maxHeight = 600,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const resultStr = e.target?.result as string;
      if (!resultStr) {
        reject(new Error("Empty file content"));
        return;
      }
      try {
        const compressed = await compressImageToLowRes(resultStr, maxWidth, maxHeight, quality);
        resolve(compressed);
      } catch (err) {
        resolve(resultStr);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
