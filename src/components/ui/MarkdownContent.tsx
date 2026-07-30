import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  safeMarkdownImageSrc,
  safeMarkdownLinkHref,
} from '../../lib/safeMarkdownUrl';
import { cn } from '../../lib/utils';

const markdownPlugins = [remarkGfm];
const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-3 mt-5 text-xl font-semibold first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2.5 mt-5 text-lg font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 mt-4 text-sm font-semibold first:mt-0">{children}</h4>
  ),
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="text-muted">{children}</del>,
  a: ({ href, children }) => {
    const safeHref = safeMarkdownLinkHref(href);
    if (!safeHref) return <span>{children}</span>;
    const isAnchor = safeHref.startsWith('#');
    return (
      <a
        href={safeHref}
        target={isAnchor ? undefined : '_blank'}
        rel={isAnchor ? undefined : 'noopener noreferrer'}
        referrerPolicy="no-referrer"
        className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
      >
        {children}
      </a>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-accent/60 pl-3 text-muted">
      {children}
    </blockquote>
  ),
  ul: ({ className, children }) => (
    <ul
      className={cn(
        'my-2 space-y-1',
        className?.includes('contains-task-list')
          ? 'list-none pl-0'
          : 'list-disc pl-5',
      )}
    >
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  li: ({ className, children }) => (
    <li
      className={cn(
        'pl-0.5',
        className?.includes('task-list-item') && 'list-none pl-0',
      )}
    >
      {children}
    </li>
  ),
  hr: () => <hr className="my-4 border-separator" />,
  pre: ({ children }) => (
    <pre className="scrollbar-thin my-3 max-w-full overflow-x-auto rounded-xl bg-default p-3 text-[0.8rem] leading-5 text-default-foreground">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const value = String(children).replace(/\n$/, '');
    const isBlock = Boolean(className) || value.includes('\n');

    if (isBlock) {
      return <code className={cn('font-mono', className)}>{value}</code>;
    }

    return (
      <code className="rounded-md bg-default px-1.5 py-0.5 font-mono text-[0.85em] text-default-foreground">
        {value}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="scrollbar-thin my-3 max-w-full overflow-x-auto rounded-xl border border-separator">
      <table className="w-full min-w-max border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-default text-default-foreground">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border-b border-separator px-3 py-2 font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-separator px-3 py-2">{children}</td>
  ),
  img: ({ src, alt }) => {
    const safeSrc = safeMarkdownImageSrc(src);
    if (!safeSrc) {
      return alt ? <span className="text-muted">[{alt}]</span> : null;
    }
    return (
      <img
        src={safeSrc}
        alt={alt ?? ''}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="my-3 block h-auto w-auto max-h-96 max-w-full rounded-xl object-contain"
      />
    );
  },
  input: ({ checked, type }) => (
    <input
      type={type}
      checked={checked}
      disabled
      readOnly
      className="mr-2 size-4 align-[-0.15em] accent-accent"
    />
  ),
};

function MarkdownContentComponent({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'min-w-0 wrap-break-word text-sm leading-6 text-current',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={markdownPlugins}
        components={markdownComponents}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownContent = memo(MarkdownContentComponent);
