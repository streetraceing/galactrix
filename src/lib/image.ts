const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_AVATAR_LENGTH = 600_000;

type CanvasAttempt = {
  size: number;
  quality: number;
};

const attempts: CanvasAttempt[] = [
  { size: 512, quality: 0.86 },
  { size: 420, quality: 0.78 },
  { size: 320, quality: 0.72 },
];

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const source = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(source);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(source);
      reject(new Error('Не удалось прочитать изображение'));
    };
    image.src = source;
  });
}

function renderSquare(
  image: HTMLImageElement,
  { size, quality }: CanvasAttempt,
) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Обработка изображений недоступна');

  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    size,
    size,
  );

  const webp = canvas.toDataURL('image/webp', quality);
  return webp.startsWith('data:image/webp')
    ? webp
    : canvas.toDataURL('image/jpeg', quality);
}

export async function prepareAvatar(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Выберите изображение');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('Исходный файл должен быть меньше 12 МБ');
  }

  const image = await loadImage(file);
  if (!image.naturalWidth || !image.naturalHeight) {
    throw new Error('Изображение повреждено');
  }

  for (const attempt of attempts) {
    const avatar = renderSquare(image, attempt);
    if (avatar.length <= MAX_AVATAR_LENGTH) return avatar;
  }

  throw new Error('Не удалось достаточно уменьшить изображение');
}
