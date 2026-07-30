const SAFE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const SAFE_LOCAL_IMAGE_PROTOCOLS = new Set(['asset:', 'blob:']);
const SAFE_DATA_IMAGE =
  /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i;

export function safeMarkdownLinkHref(href?: string): string | undefined {
  const value = href?.trim();
  if (!value) return undefined;
  if (value.startsWith('#')) return value;

  try {
    const url = new URL(value);
    return SAFE_LINK_PROTOCOLS.has(url.protocol) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function safeMarkdownImageSrc(src?: string): string | undefined {
  const value = src?.trim();
  if (!value) return undefined;
  if (SAFE_DATA_IMAGE.test(value)) return value;

  try {
    const url = new URL(value);
    return SAFE_LOCAL_IMAGE_PROTOCOLS.has(url.protocol) ? value : undefined;
  } catch {
    return undefined;
  }
}
