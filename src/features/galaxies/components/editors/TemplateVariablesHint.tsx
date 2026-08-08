import { Icon } from '../../../../components/Icon';
import { useTranslation } from 'react-i18next';

export function TemplateVariablesHint() {
  const { t } = useTranslation('galaxies');

  return (
    <div className="flex items-start gap-2 rounded-xl border border-separator bg-accent/5 px-3 py-2.5 text-xs leading-5 text-muted sm:px-4">
      <Icon name="sparkles" className="mt-0.5 size-4 shrink-0 text-accent" />
      <p>
        {t('templateVariablesHint.prefix')}{' '}
        <code className="rounded bg-default px-1 py-0.5 text-foreground">
          {'{{user}}'}
        </code>{' '}
        {t('templateVariablesHint.and')}{' '}
        <code className="rounded bg-default px-1 py-0.5 text-foreground">
          {'{{char}}'}
        </code>
        . {t('templateVariablesHint.description')}
      </p>
    </div>
  );
}
