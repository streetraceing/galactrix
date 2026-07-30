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
import { TooltipIconButton } from '../../../../components/ui/TooltipIconButton';
import { formatNumber } from '../../../../i18n';
import type { PromptBlock, PromptConfig } from '../../../../types';
import { createPromptBlock } from './promptBuilderModel';
import { PromptPrioritySelect } from './PromptPrioritySelect';
import { useTranslation } from 'react-i18next';

export function PromptCustomBlocksSection({
  value,
  onChange,
}: {
  value: PromptConfig;
  onChange: (value: PromptConfig) => void;
}) {
  const { t } = useTranslation('chats');
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
            <strong className="block text-sm">
              {t('promptCustomBlocksSection.customBlocks')}
            </strong>
            <span className="mt-0.5 block text-xs font-normal text-muted">
              {t(
                'promptCustomBlocksSection.persistentInstructionsForASpecificChat',
              )}
            </span>
          </span>
          <Accordion.Indicator />
        </Accordion.Trigger>
      </Accordion.Heading>
      <Accordion.Panel>
        <Accordion.Body className="px-4 pt-1 pb-5 sm:px-5">
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
              {t('promptCustomBlocksSection.addBlock')}
            </Button>
          </div>

          <div className="space-y-3">
            {value.customBlocks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
                {t('promptCustomBlocksSection.noCustomInstructionsYet')}
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
                      aria-label={t(
                        'promptCustomBlocksSection.dragBlockValue1',
                        { value1: block.title || index + 1 },
                      )}
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
                        {t('promptCustomBlocksSection.enabled')}
                      </Checkbox.Content>
                    </Checkbox>
                    <span className="ml-auto flex items-center gap-0.5">
                      <TooltipIconButton
                        label={t('promptCustomBlocksSection.moveBlockUp')}
                        size="sm"
                        variant="ghost"
                        isDisabled={index === 0}
                        onPress={() => moveBlock(index, -1)}
                      >
                        <Icon
                          name="chevron-left"
                          className="size-4 rotate-90"
                        />
                      </TooltipIconButton>
                      <TooltipIconButton
                        label={t('promptCustomBlocksSection.moveBlockDown')}
                        size="sm"
                        variant="ghost"
                        isDisabled={index === value.customBlocks.length - 1}
                        onPress={() => moveBlock(index, 1)}
                      >
                        <Icon
                          name="chevron-right"
                          className="size-4 rotate-90"
                        />
                      </TooltipIconButton>
                      <TooltipIconButton
                        label={t('promptCustomBlocksSection.deleteBlock')}
                        size="sm"
                        variant="ghost"
                        className="text-danger"
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
                      </TooltipIconButton>
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`prompt-title-${block.id}`}>
                        {t('chatSetupModal.name')}
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
                      <Label>{t('promptCustomBlocksSection.priority')}</Label>
                      <PromptPrioritySelect
                        value={block.priority}
                        label={t('promptCustomBlocksSection.blockPriority', {
                          value1: block.title,
                        })}
                        onChange={(priority) =>
                          patchBlock(block.id, { priority })
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-1.5">
                    <Label htmlFor={`prompt-content-${block.id}`}>
                      {t('promptCustomBlocksSection.instruction')}
                    </Label>
                    <TextArea
                      id={`prompt-content-${block.id}`}
                      fullWidth
                      variant="secondary"
                      rows={5}
                      maxLength={12_000}
                      value={block.content}
                      placeholder={t(
                        'promptCustomBlocksSection.describeRequiredBehaviorConstraintsFormatOrResponseGoal',
                      )}
                      className="min-h-32 resize-y"
                      autoComplete="off"
                      onChange={(event) =>
                        patchBlock(block.id, {
                          content: event.target.value,
                        })
                      }
                    />
                    <span className="text-right text-[0.65rem] tabular-nums text-muted">
                      {formatNumber(block.content.length)} / 12 000
                    </span>
                    {missingRequired ? (
                      <span className="text-xs text-danger">
                        {t(
                          'promptCustomBlocksSection.fillInTheTitleAndInstructionOrDisableThisBlock',
                        )}
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
