import { Button, Chip, Switch } from '@heroui/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '../../../components/Icon';
import type {
  AiModuleId,
  AiModuleSettings,
  ChatModuleOverrides,
} from '../../../types';
import { setChatModuleOverride } from '../chatModules';

type ModuleEntry = {
  id: AiModuleId;
  icon: IconName;
  title: string;
  description: string;
  globallyEnabled: boolean;
};

export function ChatModuleOverridesPanel({
  globalSettings,
  value,
  onChange,
}: {
  globalSettings: AiModuleSettings;
  value: ChatModuleOverrides;
  onChange: (value: ChatModuleOverrides) => void;
}) {
  const { t } = useTranslation(['chats', 'settings']);
  const modules = useMemo<ModuleEntry[]>(
    () => [
      {
        id: 'retry',
        icon: 'refresh',
        title: t('ai.retry.title', { ns: 'settings' }),
        description: t('ai.retry.description', { ns: 'settings' }),
        globallyEnabled: globalSettings.retry.enabled,
      },
      {
        id: 'dynamicContext',
        icon: 'brain',
        title: t('ai.dynamic.title', { ns: 'settings' }),
        description: t('ai.dynamic.description', { ns: 'settings' }),
        globallyEnabled: globalSettings.dynamicContext.enabled,
      },
      {
        id: 'semanticMemory',
        icon: 'memory',
        title: t('ai.semantic.title', { ns: 'settings' }),
        description: t('ai.semantic.description', { ns: 'settings' }),
        globallyEnabled: globalSettings.semanticMemory.enabled,
      },
      {
        id: 'contextBudget',
        icon: 'database',
        title: t('ai.contextBudget.title', { ns: 'settings' }),
        description: t('ai.contextBudget.description', { ns: 'settings' }),
        globallyEnabled: globalSettings.contextBudget.enabled,
      },
      {
        id: 'repetitionGuard',
        icon: 'shield',
        title: t('ai.repetitionGuard.title', { ns: 'settings' }),
        description: t('ai.repetitionGuard.description', { ns: 'settings' }),
        globallyEnabled: globalSettings.repetitionGuard.enabled,
      },
      {
        id: 'responseCleanup',
        icon: 'sparkles',
        title: t('ai.responseCleanup.title', { ns: 'settings' }),
        description: t('ai.responseCleanup.description', { ns: 'settings' }),
        globallyEnabled: globalSettings.responseCleanup.enabled,
      },
    ],
    [globalSettings, t],
  );
  const overriddenCount = Object.keys(value).length;

  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="section-title">{t('chatModules.title')}</h2>
          <p className="section-description max-w-3xl">
            {t('chatModules.description')}
          </p>
        </div>
        {overriddenCount > 0 ? (
          <Button size="sm" variant="ghost" onPress={() => onChange({})}>
            {t('chatModules.resetAll')}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-2 sm:gap-3 lg:grid-cols-2">
        {modules.map((module) => {
          const override = value[module.id];
          const isInherited = override == null;
          const effectiveEnabled = override ?? module.globallyEnabled;
          return (
            <div
              key={module.id}
              className="rounded-2xl border border-separator bg-surface px-3 py-3 ring-1 ring-inset ring-foreground/5 sm:px-4"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                  <Icon name={module.icon} className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <strong className="min-w-0 text-sm font-medium">
                      {module.title}
                    </strong>
                    <Chip size="sm" variant="soft">
                      {isInherited
                        ? t(
                            module.globallyEnabled
                              ? 'chatModules.globalOn'
                              : 'chatModules.globalOff',
                          )
                        : t('chatModules.overridden')}
                    </Chip>
                  </div>
                  <p className="mt-0.5 text-xs leading-5 text-muted">
                    {module.description}
                  </p>
                </div>
                <Switch
                  className="shrink-0"
                  isSelected={effectiveEnabled}
                  aria-label={module.title}
                  onChange={(nextEnabled) =>
                    onChange(
                      setChatModuleOverride(
                        globalSettings,
                        value,
                        module.id,
                        nextEnabled,
                      ),
                    )
                  }
                >
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              </div>

              {!isInherited ? (
                <div className="mt-2 flex justify-end border-t border-separator pt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onPress={() =>
                      onChange(
                        setChatModuleOverride(
                          globalSettings,
                          value,
                          module.id,
                          module.globallyEnabled,
                        ),
                      )
                    }
                  >
                    {t('chatModules.useGlobal')}
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
