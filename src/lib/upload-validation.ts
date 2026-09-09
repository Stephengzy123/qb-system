export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_FILES = 500;
export function destinationName(value: unknown): string {
  if(typeof value!=="string")throw new Error('Enter a name.');
  const name=value.trim().normalize('NFC');
  if(!name || name.length>100 || name==='.' || name==='..' || /[/\\\x00-\x1f]/.test(name))
    throw new Error('Use a name of 1–100 characters, without slashes or dot-only names.');
  return name;
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
