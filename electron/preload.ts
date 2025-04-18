import { contextBridge, ipcRenderer } from 'electron';

// デバッグログ
console.log('Preload script starting...');
console.log('contextBridge available:', !!contextBridge);

// クリップボードアイテムの型定義
interface ClipboardItem {
  id: string;
  type?: 'text' | 'image';
  text?: string;
  value?: string;
  timestamp: number;
  pinned?: boolean;
  source?: string;
}

// 型変換ヘルパー関数
function convertClipboardItems(items: any[]): ClipboardItem[] {
  console.log('Converting clipboard items, received count:', items?.length || 0);
  
  if (!items || !Array.isArray(items)) {
    console.error('Invalid items received for conversion:', items);
    return [];
  }
  
  try {
    return items.map(item => {
      if (!item || typeof item !== 'object') {
        console.error('Invalid item received for conversion:', item);
        return {
          id: `error-${Date.now()}`,
          timestamp: Date.now(),
          pinned: false,
          source: 'error',
          text: '変換エラー',
          type: 'text'
        };
      }
      
      // main.tsのClipboardItem（type, value）形式から
      // App.tsxのClipboardItem（text）形式に変換
      const convertedItem: ClipboardItem = {
        id: item.id || `generated-${Date.now()}`,
        timestamp: item.timestamp || Date.now(),
        pinned: item.pinned || false,
        source: item.source || 'default',
        text: '',
        type: item.type || 'text'
      };
      
      // テキストアイテムの場合
      if (item.type === 'text' && item.value) {
        convertedItem.text = item.value;
        console.log(`Converting text item ${item.id}: "${item.value.substring(0, 30)}..."`);
      } 
      // 画像アイテムの場合
      else if (item.type === 'image' && item.value) {
        convertedItem.text = '[画像データ]';
        console.log(`Converting image item ${item.id}`);
      }
      // その他のケース
      else if (item.text) {
        convertedItem.text = item.text;
        console.log(`Item ${item.id} already has text property`);
      } else {
        convertedItem.text = '不明なデータ';
        console.log(`Item ${item.id} has no recognizable content`);
      }
      
      return convertedItem;
    });
  } catch (error) {
    console.error('Error converting clipboard items:', error);
    return [];
  }
}

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
  
  // 履歴データの更新を受け取るリスナー
  onHistoryUpdate: (callback: (history: ClipboardItem[]) => void) => {
    console.log('Preload: onHistoryUpdate listener registered');
    
    const listener = (_: any, history: any[]) => {
      console.log('Preload: update-history received:', history?.length || 0, 'items');
      console.log('Preload: Received history data structure:', Array.isArray(history) ? 'Array' : typeof history);
      
      if (!history || !Array.isArray(history)) {
        console.error('Preload: Invalid history data received:', history);
        // 空の配列を渡して、エラーになるのを防ぐ
        callback([]);
        return;
      }
      
      // 有効なデータが来たかを確認
      if (history.length > 0) {
        console.log('Preload: First history item sample:', JSON.stringify(history[0]).substring(0, 100));
      }
      
      // 型変換して渡す
      const convertedHistory = convertClipboardItems(history || []);
      console.log('Preload: Converted history items count:', convertedHistory.length);
      
      try {
        // 少し遅延させて確実に履歴を設定
        setTimeout(() => {
          callback(convertedHistory);
          console.log('Preload: History callback executed with', convertedHistory.length, 'items');
        }, 50);
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
    
    // テスト用: 起動時にダミーデータを表示
    console.log('Preload: Creating test history item');
    const testItem: ClipboardItem = {
      id: `test-${Date.now()}`,
      timestamp: Date.now(),
      text: 'テスト項目 - 正しく表示されていれば履歴機能は動作しています',
      pinned: false,
      source: 'test'
    };
    
    // 1秒後に一度だけテストデータを表示
    setTimeout(() => {
      try {
        console.log('Preload: Sending test history item');
        callback([testItem]);
      } catch (error) {
        console.error('Preload: Error sending test item:', error);
      }
    }, 1000);
    
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
  
  // クリップボードにコピー
  copyToClipboard: (item: ClipboardItem) => {
    console.log('Preload: copyToClipboard called with item:', item.id);
    // App.tsxのtextプロパティをmain.tsのvalue形式に変換
    const convertedItem = {
      id: item.id,
      type: 'text',
      value: item.text || '',
      timestamp: item.timestamp
    };
    ipcRenderer.send('copy-to-clipboard', convertedItem);
  },
  
  // 履歴アイテムを削除
  deleteItem: (id: string) => {
    console.log('Preload: deleteItem called with id:', id);
    ipcRenderer.send('delete-item', id);
  },
  
  // 履歴アイテムを更新
  updateItem: (item: ClipboardItem) => {
    console.log('Preload: updateItem called with item:', item.id);
    // App.tsxのtextプロパティをmain.tsのvalue形式に変換
    const convertedItem = {
      id: item.id,
      type: item.type || 'text',
      value: item.text || '',
      timestamp: item.timestamp,
      pinned: item.pinned
    };
    ipcRenderer.send('update-item', convertedItem);
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
