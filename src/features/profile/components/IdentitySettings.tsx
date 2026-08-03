import { Button, Input, Surface } from '@heroui/react';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../../components/Icon';
import { AppAvatar } from '../../../components/ui/AppAvatar';
import { AvatarPicker } from '../../../components/ui/AvatarPicker';
import { toast } from '../../../i18n/toast';
import { galaxyItemAvatar, withAvatar } from '../../../lib/avatar';
import { resolveProfileName } from '../../../lib/profile';
import type { AppSettings, GalaxyItem, GalaxyItemInput } from '../../../types';
import { galaxyKindLabelKeys } from '../../galaxies/catalog';
import { draftFromItem } from '../../galaxies/model';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation(['profile', 'common']);
  const [profileName, setProfileName] = useState(settings.profileName);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingItemId, setSavingItemId] = useState('');
  const [avatarOverrides, setAvatarOverrides] = useState(
    () => new Map<string, string | null>(),
  );
  const identities = useMemo(
    () =>
      galaxyItems
        .filter((item) => item.kind === 'persona' || item.kind === 'character')
        .sort((left, right) => {
          const kindOrder = left.kind.localeCompare(right.kind);
          if (kindOrder !== 0) return kindOrder;
          const nameOrder = left.name.localeCompare(right.name);
          return nameOrder !== 0 ? nameOrder : left.id.localeCompare(right.id);
        }),
    [galaxyItems],
  );
  const normalizedProfileName = profileName.trim();
  const displayProfileName = resolveProfileName(
    settings.profileName,
    t('user.defaultName', { ns: 'common' }),
  );

  useEffect(() => setProfileName(settings.profileName), [settings.profileName]);

  useEffect(() => {
    setAvatarOverrides((current) => {
      if (current.size === 0) return current;
      const next = new Map(current);
      let changed = false;
      for (const [id, expected] of current) {
        const item = galaxyItems.find((candidate) => candidate.id === id);
        const persisted = galaxyItemAvatar(item) ?? null;
        if (!item || persisted === expected) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [galaxyItems]);

  const saveProfile = async (patch: Partial<AppSettings>) => {
    if (savingProfile) return false;
    setSavingProfile(true);
    try {
      const saved = await onChangeSettings({ ...settings, ...patch });
      if (saved) {
        toast.success(t('identitySettings.profileUpdated'));
      }
      return saved;
    } finally {
      setSavingProfile(false);
    }
  };

  const saveIdentityAvatar = async (item: GalaxyItem, avatar?: string) => {
    if (savingItemId) return;
    setSavingItemId(item.id);
    setAvatarOverrides((current) => {
      const next = new Map(current);
      next.set(item.id, avatar ?? null);
      return next;
    });
    try {
      const draft = draftFromItem(item);
      await onSaveGalaxyItem({
        ...draft,
        data: withAvatar(draft.data as Record<string, unknown>, avatar),
      });
      toast.success(
        avatar
          ? t('identitySettings.photoForValue1Updated', { value1: item.name })
          : t('identitySettings.photoForValue1Removed', { value1: item.name }),
      );
    } catch (error) {
      setAvatarOverrides((current) => {
        const next = new Map(current);
        next.delete(item.id);
        return next;
      });
      throw error;
    } finally {
      setSavingItemId('');
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <Surface className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-separator bg-surface p-4 shadow-surface ring-1 ring-inset ring-foreground/5">
        <div className="border-b border-separator pb-4">
          <h2 className="section-title">{t('identitySettings.yourProfile')}</h2>
          <p className="section-description">
            {t('identitySettings.thisNameAndImageAreUsedForYourMessagesWhen')}
          </p>
        </div>
        <div className="flex flex-col gap-5 md:items-start">
          <div className="min-w-0">
            <label
              htmlFor="profile-display-name"
              className="text-sm font-medium"
            >
              {t('identitySettings.displayName')}
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                autoComplete="off"
                id="profile-display-name"
                fullWidth
                variant="secondary"
                value={profileName}
                maxLength={80}
                placeholder={t('user.defaultName', { ns: 'common' })}
                onChange={(event) => setProfileName(event.target.value)}
              />
              <Button
                variant="primary"
                className="sm:shrink-0"
                isPending={savingProfile}
                isDisabled={
                  normalizedProfileName === settings.profileName.trim()
                }
                onPress={() =>
                  void saveProfile({ profileName: normalizedProfileName })
                }
              >
                <Icon name="check" className="size-4" />
                {t('identitySettings.save')}
              </Button>
            </div>
          </div>
          <label className="min-w-0 text-sm font-medium">
            {t('identitySettings.avatar', { ns: 'profile' })}
          </label>
          <AvatarPicker
            value={settings.profileAvatar}
            name={displayProfileName}
            disabled={savingProfile}
            showPreview
            description={t(
              'identitySettings.thePhotoIsCroppedToASquareAndStoredOnly',
            )}
            onChange={async (profileAvatar) => {
              await saveProfile({ profileAvatar });
            }}
            className="items-start"
          />
        </div>
      </Surface>

      <section>
        <div className="mb-3">
          <h2 className="section-title">
            {t('identitySettings.personasAndCharacters')}
          </h2>
          <p className="section-description">
            {t(
              'identitySettings.manageAllImagesInOnePlaceTheyAreAlsoAvailable',
            )}
          </p>
        </div>

        {identities.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {identities.map((item, index) => {
              const avatar = avatarOverrides.has(item.id)
                ? (avatarOverrides.get(item.id) ?? undefined)
                : galaxyItemAvatar(item);
              return (
                <Surface
                  key={item.id}
                  className="mobile-card-enter flex min-w-0 items-start gap-3 rounded-2xl border border-separator bg-surface p-3 shadow-surface ring-1 ring-inset ring-foreground/5 sm:p-4"
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
                      {t(galaxyKindLabelKeys[item.kind], { ns: 'common' })}
                    </span>
                    <div className="mt-2">
                      <AvatarPicker
                        compact
                        value={avatar}
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
          <Surface className="rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="font-medium">
              {t('identitySettings.noPersonasOrCharacters')}
            </p>
            <p className="mt-1.5 text-sm text-muted">
              {t(
                'identitySettings.createThemInGalaxiesThenPhotoControlsWillAppearHere',
              )}
            </p>
          </Surface>
        )}
      </section>
    </div>
  );
}
