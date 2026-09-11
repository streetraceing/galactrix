import { Button, Chip } from '@heroui/react';
import { useMemo, useState } from 'react';
import { Icon } from '../Icon';

export type EntityRevisionRow = {
  id: string;
  createdAt: number;
  badgeLabel?: string;
  title: string;
  preview?: string;
};

export function EntityRevisionsList({
  rows,
  busy,
  restoreLabel,
  confirmTitle,
  confirmLabel,
  cancelLabel,
  emptyLabel,
  onRestore,
}: {
  rows: EntityRevisionRow[];
  busy: boolean;
  restoreLabel: string;
  confirmTitle: string;
  confirmLabel: string;
  cancelLabel: string;
  emptyLabel: string;
  onRestore: (revisionId: string) => Promise<void>;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [],
  );

  const restore = async (revisionId: string) => {
    if (saving || busy) return;
    setSaving(true);
    try {
      await onRestore(revisionId);
      setPendingId(null);
    } finally {
      setSaving(false);
    }
  };

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-default bg-background/55 px-3 py-3 text-sm text-muted">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {rows.map((row) => {
        const confirming = pendingId === row.id;
        return (
          <div key={row.id} className="rounded-2xl border border-separator p-3">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div className="flex min-w-0 items-center gap-2">
                <strong className="min-w-0 truncate text-sm font-semibold">
                  {row.title}
                </strong>
                {row.badgeLabel ? (
                  <Chip size="sm" variant="soft" className="bg-transparent">
                    {row.badgeLabel}
                  </Chip>
                ) : null}
              </div>
              <time className="shrink-0 text-xs text-muted">
                {dateFormatter.format(new Date(row.createdAt * 1_000))}
              </time>
            </div>
            {row.preview ? (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                {row.preview}
              </p>
            ) : null}
            {confirming ? (
              <div className="mt-2 rounded-xl border border-warning/35 bg-warning/10 p-2.5">
                <p className="text-xs leading-5 text-warning">{confirmTitle}</p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <Button
                    size="sm"
                    variant="danger"
                    className="w-full sm:w-auto"
                    isPending={saving || busy}
                    onPress={() => void restore(row.id)}
                  >
                    {confirmLabel}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full sm:w-auto"
                    isDisabled={saving || busy}
                    onPress={() => setPendingId(null)}
                  >
                    {cancelLabel}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                className="mt-2 w-full sm:w-auto"
                isDisabled={busy || saving}
                onPress={() => setPendingId(row.id)}
              >
                <Icon name="restore" className="size-4" />
                {restoreLabel}
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
