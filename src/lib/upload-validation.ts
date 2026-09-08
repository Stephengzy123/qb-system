export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_FILES = 500;
export function pathParts(value: unknown): string[] {
  if (typeof value !== "string" || value.length > 1000) throw new Error("Enter a destination such as Biology / Chapter 1 / Practice set.");
  const parts = value.split("/").map((part) => part.trim());
  if (parts.length < 2 || parts.length > 20 || parts.some((part) => !part || part === "." || part === ".." || part.length > 100 || /[\\\x00-\x1f]/.test(part))) throw new Error("Use a folder and set name separated by /, with no empty names, dots, or backslashes.");
  return parts;
}
export function validSourcePath(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 1000 && !/[\\\x00-\x1f]/.test(value) && value.split("/").every((p) => p && p !== "." && p !== "..");
}
export function imageType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  if ([137,80,78,71,13,10,26,10].every((n, i) => bytes[i] === n)) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP") return "image/webp";
  return null;
}
