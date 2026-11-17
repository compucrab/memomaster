export function readMediaFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.readAsDataURL(file);
  });
}

export async function createMediaAsset(file) {
  if (!file?.type?.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 12 * 1024 * 1024) throw new Error("Choose an image smaller than 12 MB.");
  return {
    id: crypto.randomUUID(),
    name: file.name || "Image",
    type: file.type,
    size: file.size,
    data: await readMediaFile(file),
    createdAt: new Date().toISOString(),
  };
}
