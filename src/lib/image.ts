/**
 * Read an image File, downscale it to fit within `maxDim`, and return a
 * data URI small enough to store directly in a Firestore doc (< 1 MB limit).
 * Prefers PNG (keeps logo transparency); falls back to JPEG if too large.
 */
export async function fileToScaledDataUrl(file: File, maxDim = 400): Promise<string> {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);

  let out = canvas.toDataURL("image/png");
  // Firestore doc limit is ~1 MB; keep well under it. Fall back to JPEG.
  if (out.length > 700_000) out = canvas.toDataURL("image/jpeg", 0.85);
  if (out.length > 900_000) out = canvas.toDataURL("image/jpeg", 0.7);
  return out;
}

/**
 * Prepare an uploaded image for use as a full-page background: downscale to a
 * sensible max dimension and compress to JPEG under a byte target so it fits in
 * its own Firestore doc (1 MB limit).
 */
export async function fileToBackgroundDataUrl(file: File): Promise<string> {
  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  const maxDim = 1600;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);

  let q = 0.82;
  let out = canvas.toDataURL("image/jpeg", q);
  while (out.length > 720_000 && q > 0.4) {
    q -= 0.1;
    out = canvas.toDataURL("image/jpeg", q);
  }
  return out;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
