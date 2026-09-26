/** Longest side a plan's picture keeps: sharp enough to read, light enough to upload. */
const MAX_SIDE = 2400;
const MAX_KEEP_BYTES = 3 * 1024 * 1024;

/**
 * Reads the picture of a floor plan: gives its width / height and, when it is big (a phone
 * photo), a smaller copy (WEBP) so the upload stays under the server's limit. Throws when the
 * file is not a picture the browser can read.
 */
export async function preparePlanImage(file: File): Promise<{ file: Blob; aspect: number }> {
  const bitmap = await createImageBitmap(file);
  const aspect = Math.min(5, Math.max(0.2, bitmap.width / bitmap.height));
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= MAX_KEEP_BYTES) {
    bitmap.close();
    return { file, aspect };
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.88),
  );
  return { file: blob ?? file, aspect };
}
