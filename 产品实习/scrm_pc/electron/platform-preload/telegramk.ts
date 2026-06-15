import { startWebChatPreload } from './web-chat-preload'

startWebChatPreload({
  platformId: 'telegramk',
  loginSelectors: ['#chatlist-container', '#new-menu > div', 'ul.chatlist'],
  qrSelectors: ['canvas', '.qr-container', '[class*="qr"]'],
  messageSelector: 'div.message.spoilers-container[dir]:not([data-translate-status])',
  messageContainerSelector: '#column-center div.scrollable.scrollable-y',
  messageTextSelector: 'span.translatable-message',
  inputSelector: 'div[contenteditable="true"]',
  sendButtonSelector: 'button.send.btn-icon.rp.btn-circle.btn-send.animated-button-icon, button[aria-label*="Send"], button.send',
  conversationSelector: '#column-center header .peer-title, [class*="chat-info"] [class*="title"]',
  unreadSelector: 'ul.chatlist div.dialog-subtitle-badge-unread',
  toolbarAnchorSelector: '.toggle-emoticons',
  languageStorage: {
    local: 'localLanguage-tg',
    target: 'targetLanguage-tg',
    defaultLocal: 'zh',
    defaultTarget: 'en',
  },
  cacheDbName: 'TelegramDB',
  writeDraft(input, translatedText) {
    input.textContent = translatedText
    input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }))
  },
})
