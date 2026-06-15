import { startWebChatPreload } from './web-chat-preload'

startWebChatPreload({
  platformId: 'whatsapp',
  loginSelectors: [
    'footer div[contenteditable="true"]',
    'div[role="application"]',
    '#pane-side',
  ],
  qrSelectors: ['canvas', 'div[data-ref]'],
  messageSelector: 'span[dir] > span:not([data-translate-status])',
  messageContainerSelector: 'div[role="application"]',
  inputSelector: 'footer div[contenteditable="true"]',
  sendButtonSelector: 'footer span[data-icon="send"]',
  conversationSelector: '#main header span[title], #main header [dir="auto"]',
  unreadSelector: '#pane-side [aria-label*="unread"], #pane-side [data-testid*="unread"]',
  toolbarAnchorSelector: 'footer button, footer [role="button"]',
  languageStorage: {
    local: 'localLanguage',
    target: 'targetLanguage',
    defaultLocal: 'zh',
    defaultTarget: 'en',
  },
  cacheDbName: 'TranslationDB',
  collectMessages() {
    return Array.from(document.querySelectorAll<HTMLElement>('span[dir] > span:not([data-translate-status])'))
      .filter((element) => Boolean(element.closest('div[role="application"]')))
      .map((element) => ({
        element,
        text: element.textContent?.trim() || '',
        direction: 'incoming',
      }))
      .filter((candidate) => candidate.text.length > 0)
  },
  shouldBypassSendTranslation(input) {
    return Boolean(input.querySelector('span') && input.querySelectorAll('span.selectable-text.copyable-text[data-lexical-text="true"]').length === 0)
  },
})
