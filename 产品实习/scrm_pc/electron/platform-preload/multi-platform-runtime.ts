import { ipcRenderer } from 'electron'
import type {
  PlatformCaptureState,
  PlatformLoginState,
  RawPlatformCaptureEvent,
} from '../../src/platform/contracts'
import { platformIpcChannels } from '../../src/platform/ipc'

export interface LanguageOption {
  code: string
  displayName: string
  name?: string
}

export function emitPlatformState(payload: {
  loginState?: PlatformLoginState
  captureState?: PlatformCaptureState
  activeUrl?: string
  lastError?: string
}) {
  ipcRenderer.send(platformIpcChannels.guestStateChanged, payload)
}

export function emitPlatformEvent(event: RawPlatformCaptureEvent) {
  ipcRenderer.send(platformIpcChannels.guestEvent, event)
}

export function logPlatformGuest(payload: Record<string, unknown>) {
  ipcRenderer.send(platformIpcChannels.guestLog, payload)
}

export async function translatePlatformText(input: {
  text: string
  local: string
  target: string
}) {
  return ipcRenderer.invoke(platformIpcChannels.translateText, input) as Promise<string | null>
}

export async function getPlatformLanguageList() {
  return ipcRenderer.invoke(platformIpcChannels.languageList) as Promise<LanguageOption[]>
}

export async function openTranslationCache(dbName: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('messages')) {
        const store = db.createObjectStore('messages', { keyPath: ['originalText', 'language'] })
        store.createIndex('originalText', 'originalText', { unique: false })
        store.createIndex('language', 'language', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getCachedTranslation(dbName: string, originalText: string, language: string) {
  const db = await openTranslationCache(dbName)
  return new Promise<{ originalText: string; translatedText: string; language: string } | null>((resolve, reject) => {
    const transaction = db.transaction(['messages'], 'readonly')
    const store = transaction.objectStore('messages')
    const request = store.get([originalText, language])
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
}

export async function saveCachedTranslation(
  dbName: string,
  originalText: string,
  translatedText: string,
  language: string,
) {
  const db = await openTranslationCache(dbName)
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(['messages'], 'readwrite')
    const store = transaction.objectStore('messages')
    const request = store.put({ originalText, translatedText, language })
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
