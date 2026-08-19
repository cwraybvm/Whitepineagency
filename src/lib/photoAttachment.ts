// No blob-storage token configured in this environment (checked .env /
// .env.local) -- photos are stored as base64 data URLs directly on the
// client record, per the spec's own named fallback. Capped so a phone photo
// doesn't balloon the row.
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
