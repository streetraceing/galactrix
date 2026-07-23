import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import type { GalaxyItem, GalaxyKind } from '../types';

const filters: Array<{ id: 'all' | GalaxyKind; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'persona', label: 'Персоны' },
  { id: 'character', label: 'Персонажи' },
  { id: 'universe', label: 'Вселенные' },
  { id: 'worldbook', label: 'Ворлдбуки' },
];

const kindLabels: Record<GalaxyKind, string> = {
  persona: 'Персона',
  character: 'Персонаж',
  universe: 'Вселенная',
  worldbook: 'Ворлдбук',
};

const kindIcons: Record<GalaxyKind, 'user' | 'brain' | 'planet' | 'book'> = {
  persona: 'user',
  character: 'brain',
  universe: 'planet',
  worldbook: 'book',
};

export function GalaxiesScreen({
  items,
  onSave,
}: {
  items: GalaxyItem[];
  onSave: (item: GalaxyItem) => void;
}) {
  const [filter, setFilter] = useState<'all' | GalaxyKind>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [kind, setKind] = useState<GalaxyKind>('persona');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const filtered = useMemo(
    () =>
      filter === 'all' ? items : items.filter((item) => item.kind === filter),
    [filter, items],
  );

  const create = () => {
    if (!name.trim()) return;
    onSave({
      id: crypto.randomUUID(),
      kind,
      name: name.trim(),
      description: description.trim() || 'Описание пока не добавлено.',
      badge: kindLabels[kind],
      accent: ['violet', 'cyan', 'rose', 'amber'][items.length % 4],
      updatedAt: 'только что',
    });
    setName('');
    setDescription('');
    setModalOpen(false);
  };

  return (
    <div className="screen-scroll scroll-area">
      <header className="page-header">
        <div>
          <span className="eyebrow">Твоя ролевая база знаний</span>
          <h1>Галактики</h1>
          <p>
            Собирай персоны, персонажей, миры и ворлдбуки в единый контекст.
          </p>
        </div>
        <button className="primary-button" onClick={() => setModalOpen(true)}>
          <Icon name="plus" /> Создать
        </button>
      </header>

      <section className="galaxy-hero panel">
        <div className="hero-orbits" aria-hidden="true">
          <i />
          <i />
          <i />
          <span />
        </div>
        <div className="galaxy-hero-copy">
          <span className="hero-kicker">
            <Icon name="sparkles" /> Активная сборка
          </span>
          <h2>Стеклянное небо</h2>
          <p>
            Вселенная + персонаж + ворлдбук автоматически собираются в контекст
            перед отправкой модели.
          </p>
          <div className="hero-tags">
            <span>Лира Вейл</span>
            <span>Наблюдатель</span>
            <span>42 записи</span>
          </div>
        </div>
        <button className="secondary-button">
          Открыть сборку <Icon name="chevron" />
        </button>
      </section>

      <nav className="segmented-control" aria-label="Фильтр галактик">
        {filters.map((entry) => (
          <button
            className={filter === entry.id ? 'active' : ''}
            onClick={() => setFilter(entry.id)}
            key={entry.id}
          >
            {entry.label}
          </button>
        ))}
      </nav>

      <div className="galaxy-grid">
        {filtered.map((item) => (
          <article className="galaxy-card panel" key={item.id}>
            <div className={`galaxy-card-icon ${item.accent}`}>
              <Icon name={kindIcons[item.kind]} />
            </div>
            <button className="icon-button card-more" aria-label="Меню">
              <Icon name="more" />
            </button>
            <span className="card-badge">{item.badge}</span>
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <footer>
              <span>Обновлено {item.updatedAt}</span>
              <button>
                Редактировать <Icon name="chevron" />
              </button>
            </footer>
          </article>
        ))}
        <button className="galaxy-add-card" onClick={() => setModalOpen(true)}>
          <span>
            <Icon name="plus" />
          </span>
          <strong>Новый объект</strong>
          <small>Добавить часть вселенной</small>
        </button>
      </div>

      {modalOpen && (
        <Modal
          title="Новый объект галактики"
          subtitle="Позже здесь можно сделать отдельные сложные редакторы для каждого типа."
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button
                className="ghost-button"
                onClick={() => setModalOpen(false)}
              >
                Отмена
              </button>
              <button className="primary-button" onClick={create}>
                Создать
              </button>
            </>
          }
        >
          <div className="type-picker">
            {(
              ['persona', 'character', 'universe', 'worldbook'] as GalaxyKind[]
            ).map((value) => (
              <button
                className={kind === value ? 'selected' : ''}
                onClick={() => setKind(value)}
                key={value}
              >
                <Icon name={kindIcons[value]} />
                <span>
                  {filters.find((entry) => entry.id === value)?.label}
                </span>
              </button>
            ))}
          </div>
          <label className="form-field">
            <span>Название</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Например: Лира Вейл"
              autoFocus
            />
          </label>
          <label className="form-field">
            <span>Краткое описание</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Что это и как должно использоваться в контексте?"
              rows={4}
            />
          </label>
        </Modal>
      )}
    </div>
  );
}
