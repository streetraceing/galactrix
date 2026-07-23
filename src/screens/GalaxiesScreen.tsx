import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Modal } from '../components/Modal';
import type { GalaxyItem, GalaxyItemInput, GalaxyKind } from '../types';

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
  onDelete,
}: {
  items: GalaxyItem[];
  onSave: (item: GalaxyItemInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState<'all' | GalaxyKind>('all');
  const [editing, setEditing] = useState<GalaxyItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [kind, setKind] = useState<GalaxyKind>('persona');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filtered = useMemo(
    () =>
      filter === 'all' ? items : items.filter((item) => item.kind === filter),
    [filter, items],
  );

  const openCreate = () => {
    setEditing(null);
    setKind('persona');
    setName('');
    setDescription('');
    setError('');
    setModalOpen(true);
  };

  const openEdit = (item: GalaxyItem) => {
    setEditing(item);
    setKind(item.kind);
    setName(item.name);
    setDescription(item.description);
    setError('');
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await onSave({
        id: editing?.id,
        kind,
        name: name.trim(),
        description: description.trim(),
      });
      setModalOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing || saving) return;
    setSaving(true);
    setError('');
    try {
      await onDelete(editing.id);
      setModalOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="screen-scroll scroll-area">
      <header className="page-header">
        <div>
          <h1>Галактики</h1>
          <p>Локальные сущности для персон, персонажей, миров и ворлдбуков.</p>
        </div>
        <button className="primary-button" onClick={openCreate}>
          <Icon name="plus" /> Создать
        </button>
      </header>

      <nav className="segmented-control" aria-label="Фильтр галактик">
        {filters.map((entry) => (
          <button
            className={filter === entry.id ? 'active' : ''}
            onClick={() => setFilter(entry.id)}
            key={entry.id}
          >
            {entry.label}
            <span>
              {entry.id === 'all'
                ? items.length
                : items.filter((item) => item.kind === entry.id).length}
            </span>
          </button>
        ))}
      </nav>

      {filtered.length > 0 ? (
        <div className="entity-grid">
          {filtered.map((item) => (
            <button
              className="entity-card"
              key={item.id}
              onClick={() => openEdit(item)}
            >
              <span className="entity-icon">
                <Icon name={kindIcons[item.kind]} />
              </span>
              <span className="entity-copy">
                <span className="entity-type">{kindLabels[item.kind]}</span>
                <strong>{item.name}</strong>
                <p>{item.description || 'Без описания'}</p>
              </span>
              <span className="entity-meta">{item.updatedAt}</span>
              <Icon name="chevron" />
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state page-empty">
          <h2>
            {filter === 'all'
              ? 'Галактика пуста'
              : 'В этой категории пока ничего нет'}
          </h2>
          <p>Созданные сущности сохраняются в локальной базе данных.</p>
          <button className="primary-button" onClick={openCreate}>
            <Icon name="plus" /> Создать объект
          </button>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editing ? 'Редактирование' : 'Новый объект'}
          subtitle={editing ? kindLabels[editing.kind] : undefined}
          onClose={() => !saving && setModalOpen(false)}
          footer={
            <>
              {editing && (
                <button
                  className="danger-button"
                  onClick={() => void remove()}
                  disabled={saving}
                >
                  Удалить
                </button>
              )}
              <span className="modal-footer-spacer" />
              <button
                className="ghost-button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Отмена
              </button>
              <button
                className="primary-button"
                onClick={() => void save()}
                disabled={!name.trim() || saving}
              >
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </>
          }
        >
          <div className="type-picker">
            {(Object.keys(kindLabels) as GalaxyKind[]).map((value) => (
              <button
                className={kind === value ? 'selected' : ''}
                onClick={() => setKind(value)}
                key={value}
              >
                <Icon name={kindIcons[value]} />
                <span>{kindLabels[value]}</span>
              </button>
            ))}
          </div>
          <label className="form-field">
            <span>Название</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </label>
          <label className="form-field">
            <span>Описание</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
            />
          </label>
          {error && <div className="inline-error">{error}</div>}
        </Modal>
      )}
    </div>
  );
}
