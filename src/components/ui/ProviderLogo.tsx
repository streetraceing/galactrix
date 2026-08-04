import { useEffect, useState } from 'react';
import type { ProviderKind } from '../../types';

const providerLogos: Partial<Record<ProviderKind, string>> = {
  mistral: '/provider-logos/mistral-ai.svg',
  cerebras: '/provider-logos/cerebras.svg',
  'nvidia-nim': '/provider-logos/nvidia.svg',
  'google-gemini': '/provider-logos/google-gemini.svg',
  groq: '/provider-logos/groq.svg',
  openrouter: '/provider-logos/openrouter.svg',
  huggingface: '/provider-logos/hugging-face.svg',
  ollama: '/provider-logos/ollama.svg',
  'ollama-cloud': '/provider-logos/ollama.svg',
  'cloudflare-workers-ai': '/provider-logos/cloudflare.svg',
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
