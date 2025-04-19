import { app, BrowserWindow, clipboard, globalShortcut, ipcMain, Menu, nativeImage, screen, Tray } from 'electron';
import { join } from 'path';
import { fileURLToPath } from 'url';
import ElectronStore from 'electron-store';
// src/types から ClipboardItem をインポート
import { ClipboardItem } from '../src/types/ClipboardItem';

// デバッグ情報を表示
console.log('Electron main process starting...');

// ESモジュールでの__dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

console.log('__dirname:', __dirname);

// データ永続化のためのストア設定
// interface ClipboardItem は src/types/ClipboardItem.ts からインポートするため削除

interface StoreSchema {
  history: ClipboardItem[]; // インポートした ClipboardItem を使用
}

// Store インスタンスを生成
const store = new ElectronStore<StoreSchema>({
  defaults: {
    history: []
  }
});

// 型定義の拡張
interface TypedElectronStore<T extends Record<string, any>> extends ElectronStore<T> {
  get<K extends keyof T>(key: K): T[K];
  set<K extends keyof T>(key: K, value: T[K]): void;
}

// 型付けされたストアとして使用
const typedStore = store as TypedElectronStore<StoreSchema>;

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
      value: lastText, // value にテキストを格納
      timestamp: Date.now(),
      source: 'system', // source はオプション
      pinned: false // pinned はオプション
    });
  }
  // 画像の初期チェックは不要かもしれない（監視ループ内で処理されるため）

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
        value: newText, // value にテキストを格納
        timestamp: Date.now(),
        source: 'system', // source はオプション
        pinned: false // pinned はオプション
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
        value: newImage.toDataURL(), // value に Data URL を格納
        timestamp: Date.now(),
        source: 'system', // source はオプション
        pinned: false // pinned はオプション
      });
      lastImage = newImage;
    }
  }, 500); // 0.5秒ごとにチェック
}

// 履歴に追加
function addToHistory(item: ClipboardItem) {
  console.log('Adding item to history:', item.type, item.value?.substring(0, 30) + '...');
  const history = typedStore.get('history');
  
  // 重複チェックの修正 - 完全一致のみ重複と見なす
  // 重複チェック: type と value が完全に一致する場合に重複とみなす
  const isDuplicate = history.some((existingItem: ClipboardItem) =>
    existingItem.type === item.type && existingItem.value.trim() === item.value.trim()
  );
  
  if (!isDuplicate) {
    // 新しいアイテムを先頭に追加
    const newHistory = [item, ...history].slice(0, MAX_HISTORY_ITEMS);
    typedStore.set('history', newHistory);
    
    console.log('Added new item to history, total items:', newHistory.length);
    
    // メインウィンドウに更新を通知
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) { // mainWindow と webContents が破棄されていないかチェック
      console.log('Sending update to main window');
      try {
        mainWindow.webContents.send('update-history', newHistory); // ★ここ
        console.log('Update sent to main window successfully');

        // 遅延再送信も同様にチェックを追加
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) { // 再度チェック
            console.log('Re-sending update to main window after delay');
            try {
              mainWindow.webContents.send('update-history', newHistory); // ★ここ
            } catch (error) {
               console.error('Error re-sending update to main window after delay:', error);
            }
          } else {
             console.log('Main window or webContents destroyed, cannot re-send update after delay.');
          }
        }, 100);

      } catch (error) {
        console.error('Error sending update to main window:', error);
      }
    } else {
      console.log('Main window or webContents not available or destroyed, cannot send update.');
    }
    
    // ポップアップウィンドウが開いている場合は更新
    if (popupWindow && popupWindow.isVisible() && !popupWindow.isDestroyed() && !popupWindow.webContents.isDestroyed()) { // popupWindow と webContents が破棄されていないかチェック
      console.log('Sending update to popup window');
       try {
         popupWindow.webContents.send('update-history', newHistory); // ★ここ
         console.log('Update sent to popup window successfully');
       } catch (error) {
         console.error('Error sending update to popup window:', error);
       }
    } else if (popupWindow) {
       console.log('Popup window exists but is not visible or destroyed, cannot send update.');
    }
  } else {
    console.log('Duplicate item, not adding to history');
  }
}

// 履歴をクリア
function clearHistory() {
  typedStore.set('history', []);
  
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
  const history = typedStore.get('history');
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
  const history = typedStore.get('history');
  console.log('IPC: Sending history data via IPC:', history.length, 'items');
  
  try {
    event.reply('update-history', history);
    console.log('IPC: update-history reply sent');
    
    // 確実に届くように遅延して再送信
    setTimeout(() => {
      try {
        if (!event.sender.isDestroyed()) {
          console.log('IPC: Re-sending update-history after delay');
          event.reply('update-history', typedStore.get('history'));
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

// IPC通信の設定
// Rendererから受け取る item の型もインポートした ClipboardItem を使用
ipcMain.on('copy-to-clipboard', (_, item: ClipboardItem) => {
  console.log('IPC: copy-to-clipboard', item.type, item.id);
  try {
    if (item.type === 'text') {
      clipboard.writeText(item.value);
      console.log('IPC: Text copied to clipboard');
    } else if (item.type === 'image') {
      const image = nativeImage.createFromDataURL(item.value);
      clipboard.writeImage(image);
      console.log('IPC: Image copied to clipboard');
    } else {
      console.warn('IPC: Unknown item type for copy-to-clipboard:', item.type);
    }
  } catch (error) {
    console.error('IPC: Error writing to clipboard:', error);
  }
  
  // ポップアップを閉じる
  if (popupWindow) {
    popupWindow.hide();
  }
});

ipcMain.on('delete-item', (event, itemId: string) => { // eventを追加
  console.log('IPC: delete-item', itemId);
  const history = typedStore.get('history');
  const newHistory = history.filter((item: ClipboardItem) => item.id !== itemId);
  typedStore.set('history', newHistory);
  
  // メインウィンドウとポップアップウィンドウに更新を通知
  if (mainWindow) {
    mainWindow.webContents.send('update-history', newHistory);
  }
  if (popupWindow && popupWindow.isVisible()) {
    popupWindow.webContents.send('update-history', newHistory);
  }
});

// Rendererから受け取る updatedItem の型もインポートした ClipboardItem を使用
ipcMain.on('update-item', (event, updatedItem: ClipboardItem) => { // eventを追加
  console.log('IPC: update-item', updatedItem.id);
  const history = typedStore.get('history');
  // 更新ロジックを修正: updatedItem で完全に置き換えるのではなく、必要なプロパティのみ更新
  // (ここでは主に pinned の更新を想定)
  const newHistory = history.map((item: ClipboardItem) =>
    item.id === updatedItem.id ? { ...item, pinned: updatedItem.pinned } : item
  );
  typedStore.set('history', newHistory);
  
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
  // Rendererプロセスにも更新を通知
  if (mainWindow) {
    mainWindow.webContents.send('update-history', []);
  }
  if (popupWindow && popupWindow.isVisible()) {
    popupWindow.webContents.send('update-history', []);
  }
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
  
  const history = typedStore.get('history');
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
            mainWindow.webContents.send('update-history', typedStore.get('history'));
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