// クリップボードアイテムの共通データ構造
export interface ClipboardItem {
  id: string;
  type: 'text' | 'image'; // アイテムの種類（テキストか画像か）
  value: string; // テキストの内容、または画像のData URL
  timestamp: number; // コピーされたタイムスタンプ
  source?: string; // コピー元のアプリケーション（将来的な拡張用）
  pinned?: boolean; // ピン留めされているか
}

// Electronプリロードスクリプトで公開されるAPIの型定義
export interface ElectronAPI {
  getHistory: () => void;
  onHistoryUpdate: (callback: (history: ClipboardItem[]) => void) => () => void;
  copyToClipboard: (item: ClipboardItem) => void;
  deleteItem: (id: string) => void;
  updateItem: (item: ClipboardItem) => void;
  clearHistory: () => void;
  closeApp?: () => void;
  showAtCursor?: () => void;
}

// グローバルウィンドウオブジェクトの拡張
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
