function safeFilePart(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('ru-RU')
    .replace(/[^a-zа-яё0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

export function datedJsonName(prefix: string) {
  const date = new Date().toISOString().slice(0, 10);
  return `${safeFilePart(prefix) || 'galactrix'}-${date}.json`;
}

export type ExportDestination = 'choose-file' | 'share' | 'downloads';

type WritableFile = {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
};

type SaveFileHandle = {
  createWritable: () => Promise<WritableFile>;
};

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<SaveFileHandle>;
};

export function canChooseExportFile() {
  return (
    typeof (window as SaveFilePickerWindow).showSaveFilePicker === 'function'
  );
}

export function canShareExportFile() {
  if (
    typeof navigator.share !== 'function' ||
    typeof navigator.canShare !== 'function'
  ) {
    return false;
  }

  try {
    return navigator.canShare({
      files: [new File(['{}'], 'galactrix.json', { type: 'application/json' })],
    });
  } catch {
    return false;
  }
}

export function defaultExportDestination(): ExportDestination {
  if (canChooseExportFile()) return 'choose-file';
  if (canShareExportFile()) return 'share';
  return 'downloads';
}

export async function exportJsonFile(
  filename: string,
  value: unknown,
  destination: ExportDestination = defaultExportDestination(),
) {
  const json = JSON.stringify(value, null, 2);
  const file = new File([json], filename, {
    type: 'application/json;charset=utf-8',
  });

  if (destination === 'choose-file' && canChooseExportFile()) {
    try {
      const handle = await (
        window as SaveFilePickerWindow
      ).showSaveFilePicker?.({
        suggestedName: filename,
        types: [
          {
            description: 'Galactrix JSON',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      if (!handle) return false;
      const writable = await handle.createWritable();
      await writable.write(file);
      await writable.close();
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return false;
      }
      throw error;
    }
  }

  if (destination === 'share' && canShareExportFile()) {
    try {
      await navigator.share({ files: [file], title: filename });
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return false;
      }
      throw error;
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  return true;
}

export async function importJsonFile(): Promise<unknown | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.autocomplete = 'off';
    input.style.display = 'none';
    document.body.appendChild(input);

    let settled = false;
    const finish = (value: unknown | null, error?: unknown) => {
      if (settled) return;
      settled = true;
      input.remove();
      if (error) reject(error);
      else resolve(value);
    };

    input.addEventListener(
      'change',
      () => {
        const file = input.files?.[0];
        if (!file) {
          finish(null);
          return;
        }
        void file
          .text()
          .then((text) => finish(JSON.parse(text) as unknown))
          .catch((error) => finish(null, error));
      },
      { once: true },
    );

    window.addEventListener(
      'focus',
      () => window.setTimeout(() => !input.files?.length && finish(null), 350),
      { once: true },
    );
    input.click();
  });
}
