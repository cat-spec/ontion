import { createWebChatAdapter } from './shared'

export const telegramKChatAdapter = createWebChatAdapter({
  id: 'telegramk',
  entryUrl: 'https://web.telegram.org/k/',
  allowedHosts: ['web.telegram.org'],
  preloadEntry: 'telegramk.cjs',
  loggedInSelectors: [
    '#chatlist-container',
    '#new-menu > div',
    'ul.chatlist',
  ],
  qrSelectors: ['canvas', '.qr-container', '[class*="qr"]'],
})
