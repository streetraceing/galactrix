export function createRuntimeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `runtime-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
