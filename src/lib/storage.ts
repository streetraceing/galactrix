function browserStorage() {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function readStorageItem(key: string) {
  try {
    return browserStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorageItem(key: string, value: string) {
  try {
    browserStorage()?.setItem(key, value);
  } catch {
    // Local persistence is best-effort in restricted browser contexts.
  }
}

export function removeStorageItem(key: string) {
  try {
    browserStorage()?.removeItem(key);
  } catch {
    // Local persistence is best-effort in restricted browser contexts.
  }
}
