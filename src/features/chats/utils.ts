export function draftKey(chatId: string) {
  return `galactrix:draft:${chatId}`;
}

export function markdownToPreview(content: string) {
  return content
    .replace(/```[\s\S]*?```/g, 'Фрагмент кода')
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
