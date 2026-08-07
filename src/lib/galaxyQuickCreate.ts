import type { GalaxyKind } from '../types';

const GALAXY_QUICK_CREATE_EVENT = 'galactrix:new-galaxy-item';

type GalaxyQuickCreateRequest = GalaxyKind | 'current';

let pendingRequest: GalaxyQuickCreateRequest | null = null;

export function requestGalaxyQuickCreate(kind?: GalaxyKind) {
  pendingRequest = kind ?? 'current';
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(GALAXY_QUICK_CREATE_EVENT));
  }
}

export function consumeGalaxyQuickCreate(): GalaxyQuickCreateRequest | null {
  const request = pendingRequest;
  pendingRequest = null;
  return request;
}

export function subscribeGalaxyQuickCreate(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(GALAXY_QUICK_CREATE_EVENT, listener);
  return () => window.removeEventListener(GALAXY_QUICK_CREATE_EVENT, listener);
}
