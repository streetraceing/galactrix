import { useEffect, useState } from 'react';
import type { ProviderKind } from '../../types';

const providerLogos: Partial<Record<ProviderKind, string>> = {
  mistral: 'https://cdn.simpleicons.org/mistralai',
  cerebras:
    'https://cdn.sanity.io/images/e4qjo92p/production/e7a55ae5ab7e2c4fdfd4e66a51f628d1f2f44207-967x967.png?w=512&h=512&fit=max&auto=format',
  'nvidia-nim': 'https://cdn.simpleicons.org/nvidia',
  'google-gemini': 'https://cdn.simpleicons.org/googlegemini',
  groq: 'https://groq.com/favicon.ico',
  openrouter: 'https://cdn.simpleicons.org/openrouter/_/e5e7eb',
  huggingface: 'https://cdn.simpleicons.org/huggingface',
  ollama: 'https://cdn.simpleicons.org/ollama/_/e5e7eb',
  'ollama-cloud': 'https://cdn.simpleicons.org/ollama/_/e5e7eb',
  'cloudflare-workers-ai': 'https://cdn.simpleicons.org/cloudflare',
  custom: '/galactrix-mark.svg',
};

export function ProviderLogo({
  kind,
  name,
  className = 'size-11',
  padding = true,
}: {
  kind: ProviderKind;
  name: string;
  className?: string;
  padding?: boolean;
}) {
  const logoUrl = providerLogos[kind];
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [logoUrl]);

  return (
    <span
      className={`${className} ${padding && 'p-2'} grid shrink-0 place-items-center overflow-hidden rounded-xl border border-separator bg-default/60 text-xs font-semibold text-accent`}
    >
      {logoUrl && !failed ? (
        <img
          src={logoUrl}
          alt=""
          className="size-full object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        name.slice(0, 2).toLocaleUpperCase('ru-RU')
      )}
    </span>
  );
}
