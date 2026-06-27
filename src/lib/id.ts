/** Small id helper — crypto.randomUUID where available, else a timestamp fallback. */
export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}
