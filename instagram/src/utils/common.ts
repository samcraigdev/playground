export function createDateString(): string {
  const date = new Date(Date.now());
  return date.toISOString();
}