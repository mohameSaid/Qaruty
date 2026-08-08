/** Human-readable Arabic file size, e.g. "120 كيلوبايت" / "0.9 ميجابايت". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} بايت`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} كيلوبايت`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
}
