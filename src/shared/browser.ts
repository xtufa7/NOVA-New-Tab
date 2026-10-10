export interface FloatingRecord {
  viewerId?: number;
  popupTabId?: number;
  sourceId: number;
}
export interface PopupRecord {
  tabId: number;
  windowId: number;
  index: number;
  popupWindowId: number;
}
export interface CaptureRecord {
  error?: string;
  streamId: string;
  tabId: number;
}
export async function sessionValue<T>(key: string): Promise<T | undefined> {
  return (await chrome.storage.session.get(key))[key] as T | undefined;
}
