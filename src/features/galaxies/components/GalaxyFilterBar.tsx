import { Button, Chip, Surface } from '@heroui/react';
import type { GalaxyItem, GalaxyKind } from '../../../types';
import { galaxyFilters } from '../catalog';

export function GalaxyFilterBar({
  items,
  value,
  onChange,
}: {
  items: GalaxyItem[];
  value: 'all' | GalaxyKind;
  onChange: (value: 'all' | GalaxyKind) => void;
}) {
  return (
    <Surface
      className="scrollbar-thin overflow-x-auto rounded-2xl border border-separator p-2"
    >
      <div className="flex min-w-max items-center gap-1">
        {galaxyFilters.map((filter) => {
          const count =
            filter.id === 'all'
              ? items.length
              : items.filter((item) => item.kind === filter.id).length;
          return (
            <Button
              key={filter.id}
              size="sm"
              variant={value === filter.id ? 'secondary' : 'ghost'}
              onPress={() => onChange(filter.id)}
            >
              {filter.label}
              <Chip size="sm" variant="soft" className='bg-transparent'>
                {count}
              </Chip>
            </Button>
          );
        })}
      </div>
    </Surface>
  );
}
