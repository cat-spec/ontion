import { createWebChatAdapter } from './shared'

export const telegramChatAdapter = createWebChatAdapter({
  id: 'telegram',
  entryUrl: 'https://web.telegram.org/a/',
  allowedHosts: ['web.telegram.org'],
  preloadEntry: 'telegram.cjs',
  loggedInSelectors: [
    '#LeftColumn-main',
    '#LeftColumn-main > div.NewChatButton',
    'div.chat-list',
  ],
  qrSelectors: ['canvas', '.qr-container', '[class*="qr"]'],
})
