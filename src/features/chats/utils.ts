import { i18next } from '../../i18n';

export function draftKey(chatId: string) {
  return `galactrix:draft:${chatId}`;
}

export function markdownToPreview(content: string) {
  return content
    .replace(
      /```[\s\S]*?```/g,
      i18next.t('preview.codeFragment', { ns: 'chats' }),
    )
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*[-+*]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
