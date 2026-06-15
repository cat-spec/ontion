import { startWebChatPreload } from './web-chat-preload'

startWebChatPreload({
  platformId: 'telegram',
  loginSelectors: ['#LeftColumn-main', '#LeftColumn-main > div.NewChatButton', 'div.chat-list'],
  qrSelectors: ['canvas', '.qr-container', '[class*="qr"]'],
  messageSelector: 'div.text-content.clearfix.with-meta:not([data-translate-status])',
  messageContainerSelector: 'div.messages-container',
  messageTextSelector: 'span.translatable-message',
  inputSelector: 'div[contenteditable="true"]',
  sendButtonSelector: 'button[aria-label*="Send"], button.Button.send, button.send',
  conversationSelector: '#MiddleColumn .ChatInfo .title, [class*="chat-info"] [class*="title"]',
  unreadSelector: 'div.ChatBadge.unread:not(.muted), div.dialog-subtitle-badge-unread',
  toolbarAnchorSelector: 'div.NewChatButton',
  languageStorage: {
    local: 'localLanguage-tg',
    target: 'targetLanguage-tg',
    defaultLocal: 'zh',
    defaultTarget: 'en',
  },
  cacheDbName: 'TelegramDB',
  readDraft(input) {
    const parts: string[] = []
    input.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push(node.textContent || '')
      } else if (node instanceof HTMLBRElement) {
        parts.push('\n')
      } else if (node instanceof HTMLImageElement && node.classList.contains('emoji')) {
        parts.push(node.alt || '')
      } else if (node instanceof HTMLElement) {
        parts.push(node.innerText || node.textContent || '')
      }
    })
    return parts.join('') || input.innerText || input.textContent || ''
  },
  writeDraft(input, translatedText) {
    input.innerText = translatedText
    input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
  },
})
