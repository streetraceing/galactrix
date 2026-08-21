import type { GenerationJob, Message } from '../../types';

export function generationForChat(
  jobs: GenerationJob[],
  chatId: string | undefined,
) {
  if (!chatId) return undefined;
  return jobs.find((job) => job.chatId === chatId);
}

export function sortGenerationJobs(jobs: GenerationJob[]) {
  return [...jobs].sort(
    (left, right) =>
      left.startedAt - right.startedAt || left.id.localeCompare(right.id),
  );
}

export function mergeGenerationJobs(
  remoteJobs: GenerationJob[],
  localJobs: GenerationJob[],
) {
  const merged = new Map(remoteJobs.map((job) => [job.id, job]));
  for (const job of localJobs) {
    if (!merged.has(job.id)) merged.set(job.id, job);
  }
  return sortGenerationJobs([...merged.values()]);
}

export function withGenerationPlaceholder(
  messages: Message[],
  job: GenerationJob | undefined,
) {
  if (
    !job ||
    job.mode !== 'send' ||
    messages.some((message) => message.id === job.messageId)
  ) {
    return messages;
  }

  return [
    ...messages,
    {
      id: job.messageId,
      chatId: job.chatId,
      role: 'assistant' as const,
      content: '',
      createdAt: job.startedAt,
      remembered: false,
      activeVariantIndex: 0,
      variants: [],
      pending: true,
    },
  ];
}
