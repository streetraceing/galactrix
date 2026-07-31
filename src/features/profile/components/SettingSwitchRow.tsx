import { Switch } from '@heroui/react';

export function SettingSwitchRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex w-full min-w-0 max-w-full items-center gap-3 sm:gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <strong className="block text-sm font-medium">{label}</strong>
        <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
      </div>
      <Switch
        className="shrink-0"
        isSelected={value}
        onChange={onChange}
        aria-label={label}
      >
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Content>
      </Switch>
    </div>
  );
}
