import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'message_box'
  | 'chats'
  | 'galaxies'
  | 'telescope'
  | 'profile'
  | 'plus'
  | 'search'
  | 'send'
  | 'sparkles'
  | 'settings'
  | 'shield'
  | 'database'
  | 'chevron'
  | 'more'
  | 'close'
  | 'check'
  | 'key'
  | 'brain'
  | 'book'
  | 'planet'
  | 'user'
  | 'copy'
  | 'refresh'
  | 'edit'
  | 'trash'
  | 'pin'
  | 'clear'
  | 'back'
  | 'info'
  | 'branch'
  | 'memory'
  | 'sidebar'
  | 'minimize'
  | 'maximize'
  | 'restore'
  | 'history'
  | 'regenerate'
  | 'grip'
  | 'download'
  | 'upload'
  | 'chevron-left'
  | 'chevron-right';

export function Icon({
  name,
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  const paths: Record<IconName, ReactNode> = {
    chats: (
      <>
        <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
        <path d="M8 12h.01" />
        <path d="M12 12h.01" />
        <path d="M16 12h.01" />
      </>
    ),
    galaxies: (
      <>
        <circle cx="12" cy="12" r="2.5" />
        <path d="M4.7 7.2c2.4-3.5 8.2-4.7 12-2.3 3.7 2.4 3.1 6.7-.3 9.8-3.3 3.1-8.4 4-11.5 1.5-3-2.5-1.9-6.5 1.3-9.2" />
        <path d="M7 4.5c-1.2 3.2.2 8.1 3.7 11.2 3.5 3.2 7.4 3.5 9.1.7" />
      </>
    ),
    message_box: (
      <>
        <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
        <path d="M8 12h.01" />
        <path d="M12 12h.01" />
        <path d="M16 12h.01" />
      </>
    ),
    telescope: (
      <>
        <path d="m5 7 10-4 2 4-10 4Z" />
        <path d="m7 11 4 3M11 14l-3 7M11 14l4 7M4 8l-2 1" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    send: (
      <>
        <path d="m3 3 18 9-18 9 4-9Z" />
        <path d="M7 12h14" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2Z" />
        <path d="m18 14 .7 2.3L21 17l-2.3.7L18 20l-.7-2.3L15 17l2.3-.7Z" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.6 2.9 8.1 7 10 4.1-1.9 7-5.4 7-10V6Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    key: (
      <>
        <circle cx="8" cy="15" r="4" />
        <path d="m11 12 9-9M16 7l2 2M14 9l2 2" />
      </>
    ),
    brain: (
      <>
        <path d="M9.5 4.5A3 3 0 0 0 6 7.4 3.5 3.5 0 0 0 4.5 14 3.5 3.5 0 0 0 9 19.3V4.5ZM14.5 4.5A3 3 0 0 1 18 7.4a3.5 3.5 0 0 1 1.5 6.6 3.5 3.5 0 0 1-4.5 5.3V4.5Z" />
        <path d="M9 9H7M15 9h2M9 14H6.5M15 14h2.5" />
      </>
    ),
    book: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5Z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5Z" />
      </>
    ),
    planet: (
      <>
        <circle cx="12" cy="12" r="6" />
        <path d="M3.5 9.5c-1.2 1.4-.8 2.8.8 3.8 3 1.8 9 1.1 13.4-1.4 3.2-1.8 4.2-3.8 2.8-5" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M6 20a6 6 0 0 1 12 0" />
      </>
    ),
    copy: (
      <>
        <rect x="8" y="8" width="11" height="11" rx="2" />
        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 6v5h-5" />
        <path d="M19 11a7 7 0 1 0-1.5 5" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" />
        <path d="M10 11v5M14 11v5" />
      </>
    ),
    pin: (
      <>
        <path d="m14 4 6 6-3 1-4 4-1 5-2-2-2-2 5-1 4-4Z" />
        <path d="m4 20 6-6" />
      </>
    ),
    clear: (
      <>
        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
        <path d="M10 10v6M14 10v6" />
      </>
    ),
    back: <path d="m15 18-6-6 6-6" />,
    branch: (
      <>
        <circle cx="6" cy="5" r="2" />
        <circle cx="18" cy="7" r="2" />
        <circle cx="18" cy="18" r="2" />
        <path d="M8 5h3a4 4 0 0 1 4 4v7M8 5v8a5 5 0 0 0 5 5h3" />
      </>
    ),
    memory: (
      <>
        <path d="M9 4.5A3 3 0 0 0 6 7.4 3.5 3.5 0 0 0 4.5 14 3.5 3.5 0 0 0 9 19.3V4.5ZM15 4.5a3 3 0 0 1 3 2.9 3.5 3.5 0 0 1 1.5 6.6 3.5 3.5 0 0 1-4.5 5.3V4.5Z" />
        <path d="M9 9H7M15 9h2M9 14H6.5M15 14h2.5" />
      </>
    ),
    sidebar: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" />
      </>
    ),
    minimize: <path d="M5 12h14" />,
    maximize: (
      <>
        <path d="M6 6h12v12H6z" />
      </>
    ),
    restore: (
      <>
        <path d="M8 5h10a1 1 0 0 1 1 1v10" />
        <path d="M5 8h11a1 1 0 0 1 1 1v10H5Z" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    regenerate: (
      <>
        <path d="M20 7v5h-5" />
        <path d="M19 12a7 7 0 1 0-2 5" />
      </>
    ),
    grip: (
      <>
        <circle cx="9" cy="5" r="1" />
        <circle cx="15" cy="5" r="1" />
        <circle cx="9" cy="12" r="1" />
        <circle cx="15" cy="12" r="1" />
        <circle cx="9" cy="19" r="1" />
        <circle cx="15" cy="19" r="1" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M4 21h16" />
      </>
    ),
    upload: (
      <>
        <path d="M12 21V9" />
        <path d="m7 14 5-5 5 5" />
        <path d="M4 3h16" />
      </>
    ),
    'chevron-left': <path d="m15 18-6-6 6-6" />,
    'chevron-right': <path d="m9 18 6-6-6-6" />,
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </>
    ),
  };

  return (
    <svg
      viewBox="-1 -1 26 26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      overflow="visible"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
