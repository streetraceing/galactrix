import type { AiModuleSettings, Provider } from '../../../types';
import { DynamicContextModuleSettings } from './DynamicContextModuleSettings';
import { RetryModuleSettings } from './RetryModuleSettings';
import { SemanticMemoryModuleSettings } from './SemanticMemoryModuleSettings';

export function AiModulesSettings({
  value,
  providers,
  onChange,
}: {
  value: AiModuleSettings;
  providers: Provider[];
  onChange: (value: AiModuleSettings) => void;
}) {
  return (
    <section className="w-full min-w-0 max-w-full space-y-4 sm:space-y-5">
      <RetryModuleSettings
        value={value.retry}
        onChange={(retry) => onChange({ ...value, retry })}
      />
      <DynamicContextModuleSettings
        value={value.dynamicContext}
        providers={providers}
        onChange={(dynamicContext) => onChange({ ...value, dynamicContext })}
      />
      <SemanticMemoryModuleSettings
        value={value.semanticMemory}
        providers={providers}
        onChange={(semanticMemory) => onChange({ ...value, semanticMemory })}
      />
    </section>
  );
}
