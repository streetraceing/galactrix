import { Button, Input, Surface } from '@heroui/react';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../../components/Icon';
import { AppAvatar } from '../../../components/ui/AppAvatar';
import { AvatarPicker } from '../../../components/ui/AvatarPicker';
import { toast } from '../../../i18n/toast';
import {
  galaxyItemAvatar,
  galaxyInputAvatar,
  withAvatar,
} from '../../../lib/avatar';
import type { AppSettings, GalaxyItem, GalaxyItemInput } from '../../../types';
import { galaxyKindLabels } from '../../galaxies/catalog';
import { draftFromItem } from '../../galaxies/model';

export function IdentitySettings({
  settings,
  galaxyItems,
  onChangeSettings,
  onSaveGalaxyItem,
}: {
  settings: AppSettings;
  galaxyItems: GalaxyItem[];
  onChangeSettings: (settings: AppSettings) => Promise<boolean>;
  onSaveGalaxyItem: (input: GalaxyItemInput) => Promise<void>;
}) {
  const [profileName, setProfileName] = useState(settings.profileName);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingItemId, setSavingItemId] = useState('');
  const identities = useMemo(
    () =>
      galaxyItems.filter(
        (item) => item.kind === 'persona' || item.kind === 'character',
      ),
    [galaxyItems],
  );

  useEffect(() => setProfileName(settings.profileName), [settings.profileName]);

  const saveProfile = async (patch: Partial<AppSettings>) => {
    if (savingProfile) return false;
    setSavingProfile(true);
    try {
      const saved = await onChangeSettings({ ...settings, ...patch });
      if (saved) {
        toast.success('Профиль обновлён');
      }
      return saved;
    } finally {
      setSavingProfile(false);
    }
  };

  const saveIdentityAvatar = async (item: GalaxyItem, avatar?: string) => {
    if (savingItemId) return;
    setSavingItemId(item.id);
    try {
      const draft = draftFromItem(item);
      await onSaveGalaxyItem({
        ...draft,
        data: withAvatar(draft.data as Record<string, unknown>, avatar),
      });
      toast.success(
        avatar
          ? `Фото «${item.name}» обновлено`
          : `Фото «${item.name}» удалено`,
      );
    } finally {
      setSavingItemId('');
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <Surface className="overflow-hidden rounded-2xl border border-separator flex flex-col gap-4 p-4">
        <div className="border-b border-separator">
          <h2 className="section-title">Ваш профиль</h2>
          <p className="section-description">
            Это имя и изображение используются для ваших сообщений, если в чате
            не выбрана отдельная персона.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
          <AvatarPicker
            value={settings.profileAvatar}
            name={settings.profileName}
            disabled={savingProfile}
            description="Фото обрезается до квадрата и сохраняется только на этом устройстве."
            onChange={async (profileAvatar) => {
              await saveProfile({ profileAvatar });
            }}
          />
          <div className="min-w-0">
            <label
              htmlFor="profile-display-name"
              className="text-sm font-medium"
            >
              Отображаемое имя
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                autoComplete="off"
                id="profile-display-name"
                fullWidth
                variant="secondary"
                value={profileName}
                maxLength={80}
                placeholder="Как вас показывать в чатах"
                onChange={(event) => setProfileName(event.target.value)}
              />
              <Button
                variant="primary"
                className="sm:shrink-0"
                isPending={savingProfile}
                isDisabled={
                  !profileName.trim() ||
                  profileName.trim() === settings.profileName
                }
                onPress={() =>
                  void saveProfile({ profileName: profileName.trim() })
                }
              >
                <Icon name="check" className="size-4" />
                Сохранить
              </Button>
            </div>
          </div>
        </div>
      </Surface>

      <section>
        <div className="mb-3">
          <h2 className="section-title">Персоны и персонажи</h2>
          <p className="section-description">
            Управляйте всеми изображениями в одном месте. Они также доступны в
            редакторе «Галактик».
          </p>
        </div>

        {identities.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {identities.map((item, index) => {
              const avatar = galaxyItemAvatar(item);
              return (
                <Surface
                  key={item.id}
                  className="mobile-card-enter flex min-w-0 items-center gap-3 rounded-2xl border border-separator p-3 sm:p-4"
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <AppAvatar
                    src={avatar}
                    name={item.name}
                    className="size-14"
                  />
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm font-semibold">
                      {item.name}
                    </strong>
                    <span className="mt-0.5 block text-xs text-muted">
                      {galaxyKindLabels[item.kind]}
                    </span>
                    <div className="mt-2">
                      <AvatarPicker
                        compact
                        value={galaxyInputAvatar(item.data)}
                        name={item.name}
                        disabled={Boolean(
                          savingItemId && savingItemId !== item.id,
                        )}
                        onChange={(value) => saveIdentityAvatar(item, value)}
                      />
                    </div>
                  </div>
                </Surface>
              );
            })}
          </div>
        ) : (
          <Surface className="rounded-2xl border border-dashed border-muted p-6 text-center">
            <p className="font-medium">Нет персон и персонажей</p>
            <p className="mt-1.5 text-sm text-muted">
              Создайте их во вкладке «Галактики», после чего здесь появится
              управление фотографиями.
            </p>
          </Surface>
        )}
      </section>
    </div>
  );
}
