export function isMobilePlatform() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isAndroidPlatform() {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}
