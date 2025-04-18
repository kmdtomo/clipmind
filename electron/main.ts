import { app, BrowserWindow, clipboard, globalShortcut, ipcMain, Menu, nativeImage, screen, Tray } from 'electron';
import { join } from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';

// デバッグ情報を表示
console.log('Electron main process starting...');

// ESモジュールでの__dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

console.log('__dirname:', __dirname);

// データ永続化のためのストア設定
interface ClipboardItem {
  id: string;
  type: 'text' | 'image';
  value: string;
  timestamp: number;
  pinned?: boolean;
  source?: string;
}

interface StoreSchema {
  history: ClipboardItem[];
}

const store = new Store<StoreSchema>({
  defaults: {
    history: []
  }
});

// グローバル変数
let mainWindow: BrowserWindow | null = null;
let popupWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let clipboardWatcher: NodeJS.Timeout | null = null;
const MAX_HISTORY_ITEMS = 20;

// メインウィンドウの作成
function createMainWindow() {
  console.log('Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 380,
    height: 480,
    webPreferences: {
      preload: join(__dirname, '../dist-electron/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: true, // 初期状態から表示する
    frame: false, // フレームなしでモダンな見た目に
    resizable: false, // サイズ固定
  });

  console.log('Preload path:', join(__dirname, '../dist-electron/preload.js'));

  // 開発環境ではDevToolsを開く
  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
    console.log('Development mode detected, opening DevTools');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Viteで開発中のURLまたはビルドされたindex.htmlを読み込む
  if (process.env.VITE_DEV_SERVER_URL) {
    console.log('Loading URL:', process.env.VITE_DEV_SERVER_URL);
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const htmlPath = join(__dirname, '../index.html');
    console.log('Loading file:', htmlPath);
    mainWindow.loadFile(htmlPath);
  }

  // ロード完了時の処理
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Main window WebContents finished loading');
    if (mainWindow) {
      // ウィンドウを画面中央に配置
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;
      const bounds = mainWindow.getBounds();
      
      mainWindow.setPosition(
        Math.floor(width / 2 - bounds.width / 2),
        Math.floor(height / 2 - bounds.height / 2)
      );
      
      // 複数回、異なるタイミングで初期データを送信して確実に届くようにする
      sendHistoryToMain();
    }
  });

  // DOM準備完了時の処理も追加
  mainWindow.webContents.on('dom-ready', () => {
    console.log('Main window DOM ready');
    sendHistoryToMain();
  });

  // ウィンドウが表示されたら履歴を送信
  mainWindow.on('show', () => {
    console.log('Main window shown');
    sendHistoryToMain();
  });

  // ウィンドウがフォーカスを得たときにも履歴を送信
  mainWindow.on('focus', () => {
    console.log('Main window focused');
    sendHistoryToMain();
  });

  // ウィンドウが閉じられたときの処理
  mainWindow.on('closed', () => {
    console.log('Main window closed');
    mainWindow = null;
  });

  return mainWindow;
}

// ポップアップウィンドウの作成
function createPopupWindow() {
  if (popupWindow) {
    popupWindow.focus();
    return popupWindow;
  }

  popupWindow = new BrowserWindow({
    width: 400,
    height: 500,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: join(__dirname, '../dist-electron/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Viteで開発中のURLまたはビルドされたindex.htmlを読み込む
  if (process.env.VITE_DEV_SERVER_URL) {
    popupWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#/popup`);
  } else {
    popupWindow.loadFile(join(__dirname, '../index.html'), { hash: 'popup' });
  }

  // ウィンドウがフォーカスを失ったときに閉じる
  popupWindow.on('blur', () => {
    if (popupWindow) {
      popupWindow.hide();
    }
  });

  // ウィンドウが閉じられたときの処理
  popupWindow.on('closed', () => {
    popupWindow = null;
  });

  return popupWindow;
}

// トレイアイコンの作成
function createTray() {
  // アイコンの作成（実際のアイコンファイルに置き換える）
  const icon = nativeImage.createFromPath(join(__dirname, '../../public/electron-vite.svg'));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'ClipMind', enabled: false },
    { type: 'separator' },
    { label: '履歴を表示', click: showPopup },
    { label: '履歴をクリア', click: clearHistory },
    { type: 'separator' },
    { label: '終了', click: () => { app.quit(); } }
  ]);
  
  tray.setToolTip('ClipMind');
  tray.setContextMenu(contextMenu);
  
  // トレイアイコンをクリックしたときにポップアップを表示
  tray.on('click', showPopup);
}

// クリップボード監視の開始
function startClipboardWatcher() {
  console.log('Starting clipboard watcher');
  let lastText = clipboard.readText();
  let lastImage = clipboard.readImage();

  console.log('Initial clipboard state - text exists:', !!lastText, 'image empty:', lastImage.isEmpty());

  // 初期状態のクリップボード内容を履歴に追加
  if (lastText) {
    console.log('Initial clipboard text:', lastText.substring(0, 30) + '...');
    addToHistory({
      id: Date.now().toString(),
      type: 'text',
      value: lastText,
      timestamp: Date.now(),
      source: 'system',
      pinned: false
    });
  }

  clipboardWatcher = setInterval(() => {
    // テキストの監視
    const newText = clipboard.readText();
    
    // 大きな変更: トリムしてから比較する
    const trimmedNewText = newText ? newText.trim() : '';
    const trimmedLastText = lastText ? lastText.trim() : '';
    
    if (newText && trimmedNewText !== trimmedLastText) {
      console.log('New clipboard text detected:', newText.substring(0, 30) + '...');
      // 履歴に追加してから lastText を更新
      addToHistory({
        id: Date.now().toString(),
        type: 'text',
        value: newText,
        timestamp: Date.now(),
        source: 'system',
        pinned: false
      });
      lastText = newText;
    }

    // 画像の監視
    const newImage = clipboard.readImage();
    if (!newImage.isEmpty() && newImage.toDataURL() !== lastImage.toDataURL()) {
      console.log('New clipboard image detected');
      // 履歴に追加してから lastImage を更新
      addToHistory({
        id: Date.now().toString(),
        type: 'image',
        value: newImage.toDataURL(),
        timestamp: Date.now(),
        source: 'system',
        pinned: false
      });
      lastImage = newImage;
    }
  }, 500); // 0.5秒ごとにチェック
}

// 履歴に追加
function addToHistory(item: ClipboardItem) {
  console.log('Adding item to history:', item.type, item.value?.substring(0, 30) + '...');
  const history = store.get('history');
  
  // 重複チェックの修正 - 完全一致のみ重複と見なす
  const isDuplicate = history.some(existingItem => {
    if (existingItem.type !== item.type) return false;
    
    // テキストの場合は完全一致のみ重複とする
    if (item.type === 'text') {
      return existingItem.value.trim() === item.value.trim();
    }
    
    // 画像の場合も完全一致
    return existingItem.value === item.value;
  });
  
  if (!isDuplicate) {
    // 新しいアイテムを先頭に追加
    const newHistory = [item, ...history].slice(0, MAX_HISTORY_ITEMS);
    store.set('history', newHistory);
    
    console.log('Added new item to history, total items:', newHistory.length);
    
    // メインウィンドウに更新を通知
    if (mainWindow) {
      console.log('Sending update to main window');
      mainWindow.webContents.send('update-history', newHistory);
      
      // 通知が確実に届くように少し遅延して再送信
      setTimeout(() => {
        if (mainWindow) {
          console.log('Re-sending update to main window after delay');
          mainWindow.webContents.send('update-history', newHistory);
        }
      }, 100);
    } else {
      console.log('Main window not available for update');
    }
    
    // ポップアップウィンドウが開いている場合は更新
    if (popupWindow && popupWindow.isVisible()) {
      console.log('Sending update to popup window');
      popupWindow.webContents.send('update-history', newHistory);
    }
  } else {
    console.log('Duplicate item, not adding to history');
  }
}

// 履歴をクリア
function clearHistory() {
  store.set('history', []);
  
  // ポップアップウィンドウが開いている場合は更新
  if (popupWindow && popupWindow.isVisible()) {
    popupWindow.webContents.send('update-history', []);
  }
}

// ポップアップを表示
function showPopup() {
  console.log('Showing popup window');
  const popup = createPopupWindow();
  
  // 画面の中央に配置
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const popupBounds = popup.getBounds();
  
  popup.setPosition(
    Math.floor(width / 2 - popupBounds.width / 2),
    Math.floor(height / 2 - popupBounds.height / 2)
  );
  
  popup.show();
  popup.focus();
  
  // 履歴データを送信
  const history = store.get('history');
  console.log('Sending history data to popup:', history.length, 'items');
  popup.webContents.send('update-history', history);
}

// アプリケーションの準備ができたときの処理
app.whenReady().then(() => {
  console.log('App is ready');
  createMainWindow();
  createTray();
  
  // クリップボード監視を即時開始
  console.log('Starting clipboard watcher immediately');
  startClipboardWatcher();
  
  // グローバルショートカットの登録
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    console.log('Global shortcut triggered: CommandOrControl+Shift+V');
    showPopup();
  });
  
  console.log('Global shortcuts registered');
  
  // macOSでのドックアイコンクリック時の処理
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// すべてのウィンドウが閉じられたときの処理
app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// アプリケーションが終了する前の処理
app.on('before-quit', () => {
  console.log('App is quitting, cleaning up resources');
  // グローバルショートカットの登録解除
  globalShortcut.unregisterAll();
  
  // クリップボード監視の停止
  if (clipboardWatcher) {
    clearInterval(clipboardWatcher);
    clipboardWatcher = null;
  }
});

// IPC通信の設定
ipcMain.on('get-history', (event) => {
  console.log('IPC: get-history requested');
  const history = store.get('history');
  console.log('IPC: Sending history data via IPC:', history.length, 'items');
  
  try {
    event.reply('update-history', history);
    console.log('IPC: update-history reply sent');
    
    // 確実に届くように遅延して再送信
    setTimeout(() => {
      try {
        if (!event.sender.isDestroyed()) {
          console.log('IPC: Re-sending update-history after delay');
          event.reply('update-history', store.get('history'));
        } else {
          console.log('IPC: Cannot re-send, sender is destroyed');
        }
      } catch (error) {
        console.error('IPC: Error re-sending update-history:', error);
      }
    }, 500);
  } catch (error) {
    console.error('IPC: Error sending update-history reply:', error);
  }
});

ipcMain.on('copy-to-clipboard', (_, item: ClipboardItem) => {
  console.log('IPC: copy-to-clipboard', item.type);
  if (item.type === 'text') {
    clipboard.writeText(item.value);
  } else if (item.type === 'image') {
    const image = nativeImage.createFromDataURL(item.value);
    clipboard.writeImage(image);
  }
  
  // ポップアップを閉じる
  if (popupWindow) {
    popupWindow.hide();
  }
});

ipcMain.on('delete-item', (_, itemId: string) => {
  console.log('IPC: delete-item', itemId);
  const history = store.get('history');
  const newHistory = history.filter((item: ClipboardItem) => item.id !== itemId);
  store.set('history', newHistory);
  
  // メインウィンドウとポップアップウィンドウに更新を通知
  if (mainWindow) {
    mainWindow.webContents.send('update-history', newHistory);
  }
  if (popupWindow && popupWindow.isVisible()) {
    popupWindow.webContents.send('update-history', newHistory);
  }
});

ipcMain.on('update-item', (_, updatedItem: ClipboardItem) => {
  console.log('IPC: update-item', updatedItem.id);
  const history = store.get('history');
  const newHistory = history.map((item: ClipboardItem) => 
    item.id === updatedItem.id ? { ...item, ...updatedItem } : item
  );
  store.set('history', newHistory);
  
  // メインウィンドウとポップアップウィンドウに更新を通知
  if (mainWindow) {
    mainWindow.webContents.send('update-history', newHistory);
  }
  if (popupWindow && popupWindow.isVisible()) {
    popupWindow.webContents.send('update-history', newHistory);
  }
});

ipcMain.on('clear-history', () => {
  console.log('IPC: clear-history');
  clearHistory();
});

// メインウィンドウに履歴データを送信する関数
function sendHistoryToMain() {
  if (!mainWindow) {
    console.log('sendHistoryToMain: mainWindow is null, cannot send history');
    return;
  }
  
  if (mainWindow.isDestroyed()) {
    console.log('sendHistoryToMain: mainWindow is destroyed, cannot send history');
    return;
  }
  
  const history = store.get('history');
  console.log('sendHistoryToMain: Sending history data to main window:', history.length, 'items');
  
  try {
    // 直接送信
    mainWindow.webContents.send('update-history', history);
    console.log('sendHistoryToMain: Initial update-history sent');
    
    // 確実に届くように複数回送信
    const delays = [100, 500, 1000];
    delays.forEach(delay => {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          console.log(`sendHistoryToMain: Re-sending history data after ${delay}ms delay`);
          try {
            mainWindow.webContents.send('update-history', store.get('history'));
          } catch (error) {
            console.error(`sendHistoryToMain: Error re-sending after ${delay}ms:`, error);
          }
        } else {
          console.log(`sendHistoryToMain: Cannot re-send after ${delay}ms - mainWindow unavailable`);
        }
      }, delay);
    });
  } catch (error) {
    console.error('sendHistoryToMain: Error sending history data:', error);
  }
}

// アプリケーションの準備完了
console.log('Electron main process initialized');
