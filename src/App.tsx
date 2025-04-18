import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import { ClipboardItem } from './types/ClipboardItem';
import { Clipboard, Settings, Search, Trash2 as Trash, MapPin } from 'react-feather';

// SourceIconコンポーネント
const SourceIcon = ({ source }: { source: string }) => {
  // アプリケーションソースごとのスタイルとアイコン
  const iconConfig: Record<string, { color: string, icon: string, title: string }> = {
    chrome: {
      color: 'bg-blue-500',
      icon: 'Ch',
      title: 'Chrome'
    },
    firefox: {
      color: 'bg-orange-500',
      icon: 'Ff',
      title: 'Firefox'
    },
    edge: {
      color: 'bg-teal-500',
      icon: 'Ed',
      title: 'Edge'
    },
    vscode: {
      color: 'bg-blue-700',
      icon: 'VS',
      title: 'VS Code'
    },
    slack: {
      color: 'bg-purple-500',
      icon: 'Sl',
      title: 'Slack'
    },
    outlook: {
      color: 'bg-blue-400',
      icon: 'Ou',
      title: 'Outlook'
    },
    gmail: {
      color: 'bg-red-500',
      icon: 'Gm',
      title: 'Gmail'
    },
    word: {
      color: 'bg-blue-600',
      icon: 'Wd',
      title: 'Word'
    },
    excel: {
      color: 'bg-green-600',
      icon: 'Ex',
      title: 'Excel'
    },
    notes: {
      color: 'bg-yellow-500',
      icon: 'No',
      title: 'Notes'
    },
    default: {
      color: 'bg-gray-500',
      icon: '?',
      title: 'Unknown Source'
    }
  };

  // 設定されたソースがなければデフォルトを使用
  const config = iconConfig[source] || iconConfig.default;

  return (
    <div 
      className={`${config.color} rounded-md w-6 h-6 flex items-center justify-center`}
      title={config.title}
    >
      <span className="text-white text-xs">{config.icon}</span>
    </div>
  );
};

function App() {
  const [history, setHistory] = useState<ClipboardItem[]>([]);
  const [isElectron, setIsElectron] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 履歴データをリフレッシュする関数
  const refreshHistory = () => {
    if (window.electronAPI) {
      console.log('App: Manually refreshing history data...');
      window.electronAPI.getHistory();
    }
  };

  useEffect(() => {
    // Electronの環境かどうかをチェック
    console.log('App.tsx: Checking for Electron environment');
    
    // window.electronAPIの存在確認
    const hasElectronAPI = typeof window !== 'undefined' && 
                          'electronAPI' in window &&
                          typeof window.electronAPI !== 'undefined';
    
    console.log('Electron API detected:', hasElectronAPI);
    
    if (hasElectronAPI) {
      console.log('App.tsx: Electron API methods:', Object.keys(window.electronAPI));
      
      // 初期データの取得
      console.log('App.tsx: Requesting initial history data');
      window.electronAPI.getHistory();
      
      // 履歴を定期的に更新するタイマー
      const historyTimer = setInterval(() => {
        console.log('App.tsx: Periodic history refresh');
        window.electronAPI.getHistory();
      }, 2000);

      // 履歴更新のリスナー登録
      const cleanup = window.electronAPI.onHistoryUpdate((newHistory) => {
        console.log('App.tsx: History update received, items count:', newHistory.length);
        
        if (newHistory.length > 0) {
          console.log('App.tsx: First history item:', JSON.stringify(newHistory[0]).substring(0, 100));
        } else {
          console.log('App.tsx: Received empty history array');
        }
        
        // ソース情報を追加
        const historyWithSource = newHistory.map(item => ({
          ...item,
          source: item.source || 'default',
          pinned: item.pinned || false
        }));
        
        console.log('App.tsx: Setting history state with', historyWithSource.length, 'items');
        setHistory(historyWithSource);
      });

      // キーボードショートカットの処理
      const handleKeyDown = (e: KeyboardEvent) => {
        // Cmd+Shift+V または Ctrl+Shift+V
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v') {
          if (window.electronAPI.showAtCursor) {
            window.electronAPI.showAtCursor();
          }
        }
        
        // リフレッシュするためのショートカット (開発用)
        if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
          refreshHistory();
        }
      };

      // キーボードイベントリスナーの追加
      window.addEventListener('keydown', handleKeyDown);

      // コンポーネントのアンマウント時にリスナーを削除
      return () => {
        cleanup();
        clearInterval(historyTimer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      console.error('Electron API not found in window object');
      
      // デバッグ用：ダミーデータを表示
      const dummyData = Array.from({ length: 5 }, (_, i) => ({
        id: `dummy-${i}`,
        text: `サンプルテキスト ${i + 1}`,
        type: 'text' as const,
        source: 'default',
        pinned: false,
        timestamp: Date.now() - i * 60000
      }));
      setHistory(dummyData);
    }
    
    // UIは常に表示するように設定
    setIsElectron(true);
  }, []);

  // 検索フィルター
  const filteredItems = history.filter(item => 
    item.text.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  console.log('App.tsx: Rendering with history items:', history.length);
  console.log('App.tsx: Filtered items:', filteredItems.length);

  // 日付をフォーマット
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  // アイテムを削除
  const deleteItem = (id: string) => {
    // ここで実際のデータも削除する必要があります
    if (window.electronAPI && window.electronAPI.deleteItem) {
      window.electronAPI.deleteItem(id);
    }
  };

  // アイテムをピン留め
  const togglePin = (id: string) => {
    // ここで実際のデータも更新する必要があります
    const item = history.find(item => item.id === id);
    if (item && window.electronAPI && window.electronAPI.updateItem) {
      window.electronAPI.updateItem({...item, pinned: !item.pinned});
    }
  };

  // クリップボードにコピー
  const copyToClipboard = (item: ClipboardItem) => {
    try {
      console.log('Attempting to copy to clipboard:', item.id);
      if (window.electronAPI && window.electronAPI.copyToClipboard) {
        window.electronAPI.copyToClipboard(item);
      } else {
        console.error('electronAPI or copyToClipboard method not available');
        // フォールバック: ブラウザのクリップボードAPIを使用（Electronの制限で動作しない場合あり）
        if (navigator.clipboard && item.text) {
          navigator.clipboard.writeText(item.text)
            .then(() => console.log('Fallback: Text copied to clipboard'))
            .catch(err => console.error('Fallback: Could not copy text: ', err));
        }
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  // 履歴をクリア
  const clearHistory = () => {
    try {
      console.log('Attempting to clear history');
      if (window.electronAPI && window.electronAPI.clearHistory) {
        window.electronAPI.clearHistory();
      } else {
        console.error('electronAPI or clearHistory method not available');
        // フォールバック: ローカルの状態をクリア
        setHistory([]);
      }
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };
  
  // アプリを終了
  const closeApp = () => {
    if (window.electronAPI) {
      // Electronの場合はIPCを使って終了
      if (window.electronAPI.closeApp) {
        window.electronAPI.closeApp();
      } else {
        // フォールバック: ウィンドウを閉じる
        window.close();
      }
    }
  };

  // Electronが利用できない場合の表示
  if (!isElectron) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">注意!</strong>
          <span className="block sm:inline"> このアプリはElectron環境でのみ動作します。ブラウザでは機能しません。</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'text-gray-100 bg-gray-900' : 'text-gray-800 bg-white'}`}>
      {/* ヘッダー */}
      <header className={`flex items-center p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center space-x-2 text-teal-600">
          <Clipboard size={24} />
          <h1 className="text-xl font-semibold">clipmind</h1>
        </div>
        
        <div className={`flex items-center ml-8 px-4 py-2 rounded-lg flex-1 max-w-md ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <Search size={18} className="text-gray-400" />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="履歴を検索..." 
            className="ml-2 bg-transparent w-full focus:outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <button 
          className={`ml-4 p-2 rounded-md ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? '🌞' : '🌙'}
        </button>
        
        <button 
          className={`p-2 rounded-md ${darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
          onClick={refreshHistory}
        >
          <Settings size={20} />
        </button>
      </header>
      
      {/* メインコンテンツ */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold">クリップボード履歴</h2>
          <span className={`px-3 py-1 rounded-full text-sm ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} text-gray-500`}>
            {filteredItems.length} 件
          </span>
        </div>
        
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems
              .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.timestamp - a.timestamp)
              .map(item => (
                <div 
                  key={item.id} 
                  className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer 
                    ${item.pinned ? (darkMode ? 'border-t-2 border-teal-400' : 'border-t-2 border-teal-500') : 
                    (darkMode ? 'border border-gray-700' : 'border border-gray-200')}`}
                  onClick={() => copyToClipboard(item)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-xs text-gray-500">{formatTimestamp(item.timestamp)}</div>
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin(item.id);
                        }}
                        className={`p-1 rounded-full ${item.pinned ? 'text-teal-500' : 'text-gray-400'} hover:bg-gray-100`}
                      >
                        <MapPin size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteItem(item.id);
                        }}
                        className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-100"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                  <div className={`mt-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} break-words line-clamp-3`}>
                    {item.text}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className={`p-8 text-center ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'} rounded-lg`}>
            <Clipboard size={48} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">履歴がありません</h3>
            <p>テキストやイメージをコピー（Cmd+C/Ctrl+C）すると、ここに表示されます。</p>
            <p className="mt-2 text-sm">履歴にアクセスするには、Cmd+Shift+V / Ctrl+Shift+V を押してください。</p>
          </div>
        )}
      </main>
      
      {/* フッター */}
      <footer className={`flex justify-between items-center p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <button 
          className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm text-red-500 border border-red-500 hover:bg-red-500 hover:text-white transition-colors duration-200"
          onClick={clearHistory}
        >
          <Trash size={16} />
          <span>すべて削除</span>
        </button>
        
        <div className="text-sm text-gray-500">
          <p>ClipMind v1.0.0</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
