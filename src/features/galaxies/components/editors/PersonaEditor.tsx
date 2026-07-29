import { Button, Input, Label, ListBox, Select, TextArea } from '@heroui/react';
import type { Key } from 'react';
import { Icon } from '../../../../components/Icon';
import type { NamedValue, PersonaData } from '../../../../types';
import { createId, pronounsForGender } from '../../model';
import { EditorSection } from './EditorSection';
import { useTranslation } from 'react-i18next';

export function PersonaEditor({
  data,
  onChange,
}: {
  data: PersonaData;
  onChange: (data: PersonaData) => void;
}) {
  const { t } = useTranslation('galaxies');
  const patch = <K extends keyof PersonaData>(key: K, value: PersonaData[K]) =>
    onChange({ ...data, [key]: value });

  const patchAttribute = (
    id: string,
    key: keyof Pick<NamedValue, 'title' | 'value'>,
    value: string,
  ) =>
    patch(
      'attributes',
      data.attributes.map((attribute) =>
        attribute.id === id ? { ...attribute, [key]: value } : attribute,
      ),
    );

  return (
    <div className="space-y-4">
      <EditorSection
        title={t('personaEditor.basicInformation')}
        description={t(
          'personaEditor.stableInformationAboutUserThatMustPersistBetweenMessages',
        )}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t('personaEditor.gender')}</Label>
            <Select
              fullWidth
              variant="secondary"
              value={data.gender}
              aria-label={t('personaEditor.gender')}
              onChange={(key: Key | Key[] | null) => {
                if (key == null || Array.isArray(key)) return;
                const gender = String(key) as PersonaData['gender'];
                onChange({
                  ...data,
                  gender,
                  pronouns: pronounsForGender(gender),
                });
              }}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="male" textValue={t('personaEditor.male')}>
                    {t('personaEditor.male')}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item
                    id="female"
                    textValue={t('personaEditor.female')}
                  >
                    {t('personaEditor.female')}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item
                    id="unspecified"
                    textValue={t('personaEditor.notSpecified')}
                  >
                    {t('personaEditor.notSpecified')}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="persona-age">{t('personaEditor.age')}</Label>
            <Input
              id="persona-age"
              fullWidth
              variant="secondary"
              value={data.age}
              placeholder={t('personaEditor.forExample25')}
              autoComplete="off"
              onChange={(event) => patch('age', event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="persona-pronouns">
              {t('personaEditor.pronouns')}
            </Label>
            <Input
              id="persona-pronouns"
              fullWidth
              variant="secondary"
              value={data.pronouns}
              placeholder={t('personaEditor.derivedFromGender')}
              readOnly
            />
          </div>
        </div>
      </EditorSection>

      <EditorSection
        title={t('personaEditor.behaviorAndPreferences')}
        description={t(
          'personaEditor.factsFromTheseFieldsAreCombinedIntoASeparatePersona',
        )}
      >
        <TextArea
          fullWidth
          variant="secondary"
          rows={4}
          value={data.habits}
          placeholder={t('personaEditor.habitsAndStableBehavior')}
          aria-label={t('personaEditor.habits')}
          autoComplete="off"
          onChange={(event) => patch('habits', event.target.value)}
        />
        <TextArea
          fullWidth
          variant="secondary"
          rows={4}
          value={data.preferences}
          placeholder={t('personaEditor.preferencesInterestsAndBoundaries')}
          aria-label={t('personaEditor.preferences')}
          autoComplete="off"
          onChange={(event) => patch('preferences', event.target.value)}
        />
        <TextArea
          fullWidth
          variant="secondary"
          rows={3}
          value={data.communicationNotes}
          placeholder={t(
            'personaEditor.howTheCharacterShouldCommunicateWithTheUser',
          )}
          aria-label={t('personaEditor.communicationPreferences')}
          autoComplete="off"
          onChange={(event) => patch('communicationNotes', event.target.value)}
        />
      </EditorSection>

      <EditorSection
        title={t('personaEditor.additionalAttributes')}
        description={t(
          'personaEditor.anyStableFactsOccupationPersonalityFavoriteTopicsBoundariesAndMore',
        )}
        action={
          <Button
            size="sm"
            variant="secondary"
            onPress={() =>
              patch('attributes', [
                ...data.attributes,
                { id: createId(), title: '', value: '' },
              ])
            }
          >
            <Icon name="plus" className="size-4" />{' '}
            {t('personaEditor.attribute')}
          </Button>
        }
      >
        {data.attributes.length === 0 ? (
          <p className="rounded-xl bg-surface-secondary px-4 py-5 text-center text-sm text-muted">
            {t('personaEditor.noAdditionalAttributesYet')}
          </p>
        ) : (
          <div className="space-y-2">
            {data.attributes.map((attribute) => (
              <div
                key={attribute.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-xl border border-separator sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)_auto]"
              >
                <Input
                  fullWidth
                  variant="secondary"
                  className="order-1 min-w-0"
                  value={attribute.title}
                  placeholder={t('personaEditor.attribute')}
                  aria-label={t('personaEditor.attributeName')}
                  autoComplete="off"
                  onChange={(event) =>
                    patchAttribute(attribute.id, 'title', event.target.value)
                  }
                />
                <Input
                  fullWidth
                  variant="secondary"
                  className="order-3 col-span-2 min-w-0 sm:order-2 sm:col-span-1"
                  value={attribute.value}
                  placeholder={t('personaEditor.value')}
                  aria-label={t('personaEditor.attributeValue')}
                  autoComplete="off"
                  onChange={(event) =>
                    patchAttribute(attribute.id, 'value', event.target.value)
                  }
                />
                <Button
                  isIconOnly
                  variant="ghost"
                  className="order-2 sm:order-3"
                  aria-label={t('personaEditor.deleteAttribute')}
                  onPress={() =>
                    patch(
                      'attributes',
                      data.attributes.filter(
                        (item) => item.id !== attribute.id,
                      ),
                    )
                  }
                >
                  <Icon name="trash" className="size-4 text-danger" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </EditorSection>
    </div>
  );
}
