const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_AVATAR_SIDE = 256;
const MAX_COMPRESSED_IMAGE_BYTES = 48 * 1024;
const COMPRESSION_QUALITIES = [0.82, 0.7, 0.58, 0.45];

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("This image could not be opened."));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("This image could not be compressed."));
        }
      },
      "image/webp",
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("This image could not be prepared for upload."));
      }
    };
    reader.onerror = () => reject(new Error("This image could not be prepared for upload."));
    reader.readAsDataURL(blob);
  });
}

export async function compressAvatarImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }

  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error("Choose an image smaller than 10 MB.");
  }

  const image = await loadImage(file);
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error("This image has invalid dimensions.");
  }

  const initialScale = Math.min(
    1,
    MAX_AVATAR_SIDE / Math.max(image.naturalWidth, image.naturalHeight),
  );
  let width = Math.max(1, Math.round(image.naturalWidth * initialScale));
  let height = Math.max(1, Math.round(image.naturalHeight * initialScale));

  for (let resizeAttempt = 0; resizeAttempt < 6; resizeAttempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Your browser could not process this image.");
    }

    context.drawImage(image, 0, 0, width, height);

    for (const quality of COMPRESSION_QUALITIES) {
      const blob = await canvasToBlob(canvas, quality);
      if (blob.size <= MAX_COMPRESSED_IMAGE_BYTES) {
        return blobToDataUrl(blob);
      }
    }

    width = Math.max(1, Math.floor(width * 0.75));
    height = Math.max(1, Math.floor(height * 0.75));
  }

  throw new Error("This image could not be reduced enough to upload.");
}
