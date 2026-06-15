import { createWebChatAdapter } from './shared'

export const whatsappChatAdapter = createWebChatAdapter({
  id: 'whatsapp',
  entryUrl: 'https://web.whatsapp.com/',
  allowedHosts: ['web.whatsapp.com'],
  preloadEntry: 'whatsapp.cjs',
  loggedInSelectors: [
    'footer div[contenteditable="true"]',
    'div[role="application"]',
    '#pane-side',
  ],
  qrSelectors: ['canvas', 'div[data-ref]'],
})
