import { memo } from 'react';
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
  | 'screen-full'
  | 'screen-normal'
  | 'history'
  | 'regenerate'
  | 'grip'
  | 'download'
  | 'upload'
  | 'chevron-left'
  | 'chevron-right';

// screen-full and screen-normal use the MIT-licensed VS Code Codicons paths.
const paths = createIconPaths();

function createIconPaths(): Record<IconName, ReactNode> {
  return {
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
    'screen-full': (
      <path d="M3.75 3C3.33579 3 3 3.33579 3 3.75V5.5C3 5.77614 2.77614 6 2.5 6C2.22386 6 2 5.77614 2 5.5V3.75C2 2.7835 2.7835 2 3.75 2H5.5C5.77614 2 6 2.22386 6 2.5C6 2.77614 5.77614 3 5.5 3H3.75ZM10 2.5C10 2.22386 10.2239 2 10.5 2H12.25C13.2165 2 14 2.7835 14 3.75V5.5C14 5.77614 13.7761 6 13.5 6C13.2239 6 13 5.77614 13 5.5V3.75C13 3.33579 12.6642 3 12.25 3H10.5C10.2239 3 10 2.77614 10 2.5ZM2.5 10C2.77614 10 3 10.2239 3 10.5V12.25C3 12.6642 3.33579 13 3.75 13H5.5C5.77614 13 6 13.2239 6 13.5C6 13.7761 5.77614 14 5.5 14H3.75C2.7835 14 2 13.2165 2 12.25V10.5C2 10.2239 2.22386 10 2.5 10ZM13.5 10C13.7761 10 14 10.2239 14 10.5V12.25C14 13.2165 13.2165 14 12.25 14H10.5C10.2239 14 10 13.7761 10 13.5C10 13.2239 10.2239 13 10.5 13H12.25C12.6642 13 13 12.6642 13 12.25V10.5C13 10.2239 13.2239 10 13.5 10Z" />
    ),
    'screen-normal': (
      <path d="M11 4C11 4.55228 11.4477 5 12 5H13.5C13.7761 5 14 5.22386 14 5.5C14 5.77614 13.7761 6 13.5 6H12C10.8954 6 10 5.10457 10 4V2.5C10 2.22386 10.2239 2 10.5 2C10.7761 2 11 2.22386 11 2.5V4ZM11 12C11 11.4477 11.4477 11 12 11H13.5C13.7761 11 14 10.7761 14 10.5C14 10.2239 13.7761 10 13.5 10H12C10.8954 10 10 10.8954 10 12V13.5C10 13.7761 10.2239 14 10.5 14C10.7761 14 11 13.7761 11 13.5V12ZM4 11C4.55228 11 5 11.4477 5 12V13.5C5 13.7761 5.22386 14 5.5 14C5.77614 14 6 13.7761 6 13.5V12C6 10.8954 5.10457 10 4 10H2.5C2.22386 10 2 10.2239 2 10.5C2 10.7761 2.22386 11 2.5 11H4ZM5 4C5 4.55228 4.55228 5 4 5H2.5C2.22386 5 2 5.22386 2 5.5C2 5.77614 2.22386 6 2.5 6H4C5.10457 6 6 5.10457 6 4V2.5C6 2.22386 5.77614 2 5.5 2C5.22386 2 5 2.22386 5 2.5V4Z" />
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
}

function IconComponent({
  name,
  ...props
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  const isVsCodeScreenIcon = name === 'screen-full' || name === 'screen-normal';

  return (
    <svg
      viewBox={isVsCodeScreenIcon ? '0 0 16 16' : '-1 -1 26 26'}
      fill={isVsCodeScreenIcon ? 'currentColor' : 'none'}
      stroke={isVsCodeScreenIcon ? 'none' : 'currentColor'}
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

export const Icon = memo(IconComponent);
