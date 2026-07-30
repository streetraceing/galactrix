export function resolveProfileName(profileName: string, fallback: string) {
  return profileName.trim() || fallback;
}
