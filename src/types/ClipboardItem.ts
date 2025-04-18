export interface ClipboardItem {
  id: string;
  text: string;
  timestamp: number;
  source?: string;
  pinned?: boolean;
}

// Electronプリロードスクリプトで公開されるAPI
export interface ElectronAPI {
  getHistory: () => void;
  onHistoryUpdate: (callback: (history: ClipboardItem[]) => void) => () => void;
  copyToClipboard: (item: ClipboardItem) => void;
  clearHistory: () => void;
  closeApp?: () => void; // アプリを終了する関数（オプショナル）
  showAtCursor?: () => void; // カーソル位置にウィンドウを表示する関数
  deleteItem?: (id: string) => void; // 特定のアイテムを削除する関数
  updateItem?: (item: ClipboardItem) => void; // アイテムを更新する関数
}

// グローバルウィンドウオブジェクトの拡張
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
