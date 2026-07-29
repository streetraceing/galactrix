import {
  Accordion,
  Button,
  Checkbox,
  Input,
  Label,
  Surface,
  TextArea,
} from '@heroui/react';
import { useState } from 'react';
import type { DragEvent } from 'react';
import { Icon } from '../../../../components/Icon';
import type { PromptBlock, PromptConfig } from '../../../../types';
import { createPromptBlock } from './promptBuilderModel';
import { PromptPrioritySelect } from './PromptPrioritySelect';

export function PromptCustomBlocksSection({
  value,
  onChange,
}: {
  value: PromptConfig;
  onChange: (value: PromptConfig) => void;
}) {
  const [draggedId, setDraggedId] = useState('');
  const [dropTargetId, setDropTargetId] = useState('');
  const patchBlock = (id: string, patch: Partial<PromptBlock>) => {
    onChange({
      ...value,
      customBlocks: value.customBlocks.map((block) =>
        block.id === id ? { ...block, ...patch } : block,
      ),
    });
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.customBlocks.length) return;
    const customBlocks = [...value.customBlocks];
    [customBlocks[index], customBlocks[target]] = [
      customBlocks[target],
      customBlocks[index],
    ];
    onChange({ ...value, customBlocks });
  };

  const dropBlock = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const sourceIndex = value.customBlocks.findIndex(
      (block) => block.id === draggedId,
    );
    const targetIndex = value.customBlocks.findIndex(
      (block) => block.id === targetId,
    );
    if (sourceIndex < 0 || targetIndex < 0) return;
    const customBlocks = [...value.customBlocks];
    const [moved] = customBlocks.splice(sourceIndex, 1);
    customBlocks.splice(targetIndex, 0, moved);
    onChange({ ...value, customBlocks });
  };

  const startDragging = (event: DragEvent<HTMLElement>, id: string) => {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  };

  const finishDragging = () => {
    setDraggedId('');
    setDropTargetId('');
  };

  return (
    <Accordion.Item id="custom">
      <Accordion.Heading>
        <Accordion.Trigger className="px-4 sm:px-5">
          <span className="min-w-0 flex-1 text-left">
            <strong className="block text-sm">Свои блоки</strong>
            <span className="mt-0.5 block text-xs font-normal text-muted">
              Постоянные инструкции для конкретного чата
            </span>
          </span>
          <Accordion.Indicator />
        </Accordion.Trigger>
      </Accordion.Heading>
      <Accordion.Panel>
        <Accordion.Body className="px-4 pb-5 sm:px-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Button
              size="sm"
              variant="secondary"
              isDisabled={value.customBlocks.length >= 16}
              onPress={() =>
                onChange({
                  ...value,
                  customBlocks: [...value.customBlocks, createPromptBlock()],
                })
              }
            >
              <Icon name="plus" className="size-4" />
              Добавить блок
            </Button>
          </div>

          <div className="space-y-3">
            {value.customBlocks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-muted px-4 py-6 text-center text-sm text-muted">
                Пользовательских инструкций пока нет.
              </div>
            ) : null}

            {value.customBlocks.map((block, index) => {
              const missingRequired =
                block.enabled && (!block.title.trim() || !block.content.trim());

              return (
                <Surface
                  key={block.id}
                  className={`rounded-xl border p-3 transition-[border-color,opacity,transform] sm:p-4 ${
                    dropTargetId === block.id
                      ? 'border-accent/70'
                      : 'border-separator'
                  } ${draggedId === block.id ? 'opacity-55' : ''}`}
                  onDragOver={(event) => {
                    if (!draggedId || draggedId === block.id) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDropTargetId(block.id);
                  }}
                  onDragLeave={() =>
                    setDropTargetId((current) =>
                      current === block.id ? '' : current,
                    )
                  }
                  onDrop={(event) => {
                    event.preventDefault();
                    dropBlock(block.id);
                    finishDragging();
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      draggable
                      role="button"
                      tabIndex={0}
                      aria-label={`Перетащить блок «${block.title || index + 1}»`}
                      className="hidden cursor-grab touch-none rounded-lg p-1.5 text-muted outline-none hover:bg-default-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus active:cursor-grabbing sm:inline-flex"
                      onDragStart={(event) => startDragging(event, block.id)}
                      onDragEnd={finishDragging}
                    >
                      <Icon name="grip" className="size-4" />
                    </span>
                    <Checkbox
                      isSelected={block.enabled}
                      variant="secondary"
                      onChange={(enabled) => patchBlock(block.id, { enabled })}
                    >
                      <Checkbox.Content>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                        Включён
                      </Checkbox.Content>
                    </Checkbox>
                    <span className="ml-auto flex items-center gap-0.5">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        isDisabled={index === 0}
                        aria-label="Переместить блок выше"
                        onPress={() => moveBlock(index, -1)}
                      >
                        <Icon
                          name="chevron-left"
                          className="size-4 rotate-90"
                        />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        isDisabled={index === value.customBlocks.length - 1}
                        aria-label="Переместить блок ниже"
                        onPress={() => moveBlock(index, 1)}
                      >
                        <Icon
                          name="chevron-right"
                          className="size-4 rotate-90"
                        />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        className="text-danger"
                        aria-label="Удалить блок"
                        onPress={() =>
                          onChange({
                            ...value,
                            customBlocks: value.customBlocks.filter(
                              (entry) => entry.id !== block.id,
                            ),
                          })
                        }
                      >
                        <Icon name="trash" className="size-4" />
                      </Button>
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`prompt-title-${block.id}`}>
                        Название
                      </Label>
                      <Input
                        id={`prompt-title-${block.id}`}
                        fullWidth
                        variant="secondary"
                        value={block.title}
                        maxLength={80}
                        autoComplete="off"
                        onChange={(event) =>
                          patchBlock(block.id, {
                            title: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Приоритет</Label>
                      <PromptPrioritySelect
                        value={block.priority}
                        label={`Приоритет блока ${block.title}`}
                        onChange={(priority) =>
                          patchBlock(block.id, { priority })
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-1.5">
                    <Label htmlFor={`prompt-content-${block.id}`}>
                      Инструкция
                    </Label>
                    <TextArea
                      id={`prompt-content-${block.id}`}
                      fullWidth
                      variant="secondary"
                      rows={5}
                      maxLength={12_000}
                      value={block.content}
                      placeholder="Опишите обязательное поведение, ограничения, формат или цель ответа."
                      className="min-h-32 resize-y"
                      autoComplete="off"
                      onChange={(event) =>
                        patchBlock(block.id, {
                          content: event.target.value,
                        })
                      }
                    />
                    <span className="text-right text-[0.65rem] tabular-nums text-muted">
                      {block.content.length.toLocaleString('ru-RU')} / 12 000
                    </span>
                    {missingRequired ? (
                      <span className="text-xs text-danger">
                        Заполните название и инструкцию или выключите этот блок.
                      </span>
                    ) : null}
                  </div>
                </Surface>
              );
            })}
          </div>
        </Accordion.Body>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
