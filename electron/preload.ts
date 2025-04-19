import { contextBridge, ipcRenderer } from 'electron';

// デバッグログ
console.log('Preload script starting...');
import { ClipboardItem } from '../src/types/ClipboardItem'; // インポート

console.log('contextBridge available:', !!contextBridge);

// クリップボードアイテムの型定義はインポートするため削除
// 型変換ヘルパー関数 convertClipboardItems は不要なため削除

// レンダラープロセスに公開するAPI
contextBridge.exposeInMainWorld('electronAPI', {
  // 履歴データの取得
  getHistory: () => {
    console.log('Preload: getHistory called');
    
    try {
      ipcRenderer.send('get-history');
      console.log('Preload: get-history IPC message sent successfully');
    } catch (error) {
      console.error('Preload: Error sending get-history IPC message:', error);
    }
  },
  
  // 履歴データの更新を受け取るリスナー (型をインポートしたものに修正)
  onHistoryUpdate: (callback: (history: ClipboardItem[]) => void) => {
    console.log('Preload: onHistoryUpdate listener registered');

    // listener の引数の型を ClipboardItem[] に修正
    const listener = (_: Electron.IpcRendererEvent, history: ClipboardItem[]) => {
      console.log('Preload: update-history received:', history?.length || 0, 'items');

      // データ形式の検証 (より厳密に)
      if (!Array.isArray(history) || !history.every(item => item && typeof item === 'object' && 'id' in item && 'type' in item && 'value' in item && 'timestamp' in item)) {
        console.error('Preload: Invalid history data structure received:', history);
        callback([]); // エラー時は空配列を返す
        return;
      }

      // 有効なデータが来たかを確認
      if (history.length > 0) {
        console.log('Preload: First history item sample:', JSON.stringify(history[0]).substring(0, 100));
      }

      // 型変換は不要なので、そのままコールバックに渡す
      // setTimeoutによる遅延も不要 (IPC効率化で対応)
      try {
        callback(history);
        console.log('Preload: History callback executed with', history.length, 'items');
      } catch (error) {
        console.error('Preload: Error in history update callback:', error);
      }
    };
    
    try {
      ipcRenderer.on('update-history', listener);
      console.log('Preload: update-history IPC listener registered successfully');
    } catch (error) {
      console.error('Preload: Error registering update-history IPC listener:', error);
    }
    
    // テスト用のダミーデータ送信は削除 (または開発時のみ有効にする)
    
    // クリーンアップ関数を返す
    return () => {
      console.log('Preload: removing update-history listener');
      try {
        ipcRenderer.removeListener('update-history', listener);
      } catch (error) {
        console.error('Preload: Error removing update-history listener:', error);
      }
    };

  },
  
  // クリップボードにコピー (型をインポートしたものに修正、変換不要)
  copyToClipboard: (item: ClipboardItem) => {
    console.log('Preload: copyToClipboard called with item:', item.id, item.type);
    // 型変換は不要なので、そのまま送信
    ipcRenderer.send('copy-to-clipboard', item);
  },
  
  // 履歴アイテムを削除
  deleteItem: (id: string) => {
    console.log('Preload: deleteItem called with id:', id);
    ipcRenderer.send('delete-item', id);
  },
  
  // 履歴アイテムを更新 (型をインポートしたものに修正、変換不要)
  updateItem: (item: ClipboardItem) => {
    console.log('Preload: updateItem called with item:', item.id);
    // 型変換は不要なので、そのまま送信
    ipcRenderer.send('update-item', item);
  },
  
  // 履歴をクリア
  clearHistory: () => {
    console.log('Preload: clearHistory called');
    ipcRenderer.send('clear-history');
  },
  
  // アプリを終了
  closeApp: () => {
    console.log('Preload: closeApp called');
    ipcRenderer.send('close-app');
  },
  
  // カーソル位置にウィンドウを表示
  showAtCursor: () => {
    console.log('Preload: showAtCursor called');
    ipcRenderer.send('show-at-cursor');
  }
});

// デバッグ: APIが正しく公開されたか確認
console.log('Preload script completed, electronAPI exposed:', !!window.electronAPI);
console.log('Available APIs:', Object.keys((window as any).electronAPI || {}));

// テスト用の関数を追加
contextBridge.exposeInMainWorld('electronTest', {
  isElectron: true,
  ping: () => 'pong'
});
