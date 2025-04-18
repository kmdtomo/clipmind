import React, { useEffect, useState, useRef } from 'react';
import { ClipboardItem as ClipboardItemType } from '../types/ClipboardItem';

const PopupView: React.FC = () => {
  // すべてのstateをここで定義
  const [history, setHistory] = useState<ClipboardItemType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [notification, setNotification] = useState('');
  const [isElectron, setIsElectron] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 検索フィルター - 常に計算する
  const filteredHistory = history.filter(item => {
    return item.text.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Electronの環境チェックと履歴データの初期取得
  useEffect(() => {
    // Electronの環境かどうかをチェック
    console.log('PopupView.tsx: Checking for Electron environment');
    
    // window.electronAPIの存在確認
    const hasElectronAPI = typeof window !== 'undefined' && 
                           'electronAPI' in window &&
                           typeof window.electronAPI !== 'undefined';
    
    console.log('Electron API detected:', hasElectronAPI);
    if (hasElectronAPI) {
      console.log('Electron API methods:', Object.keys(window.electronAPI));
    }
    
    setIsElectron(hasElectronAPI);

    if (hasElectronAPI) {
      // 初期データの取得
      console.log('PopupView.tsx: Requesting history data');
      window.electronAPI.getHistory();

      // 履歴更新のリスナー登録
      const cleanup = window.electronAPI.onHistoryUpdate((newHistory) => {
        console.log('PopupView.tsx: History data updated:', newHistory);
        setHistory(newHistory);
      });

      // コンポーネントのアンマウント時にリスナーを削除
      return cleanup;
    }
  }, []);

  // キーボードイベントとフォーカス管理のためのuseEffect
  useEffect(() => {
    // 環境チェック済みかつElectron環境でない場合は何もしない
    if (!isElectron) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredHistory.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        case 'Enter':
          if (filteredHistory[selectedIndex]) {
            handleSelectItem(filteredHistory[selectedIndex]);
            window.close(); // 選択後にウィンドウを閉じる
          }
          break;
        case 'Escape':
          window.close();
          break;
      }

      // Cmd+Shift+V または Ctrl+Shift+V
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v') {
        if (window.electronAPI && window.electronAPI.showAtCursor) {
          window.electronAPI.showAtCursor();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // フォーカスを検索ボックスに設定
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [filteredHistory, selectedIndex, isElectron]);

  // クリップボードアイテムを選択したときの処理
  const handleSelectItem = (item: ClipboardItemType) => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.copyToClipboard(item);
      setNotification('コピーしました');
      
      // 3秒後に通知を消す
      setTimeout(() => {
        setNotification('');
      }, 3000);
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

  // メインのUIレンダリング
  return (
    <div className="bg-gray-100 w-full h-screen flex flex-col items-center pt-4">
      {/* Windowsスタイルのポップアップウィンドウ */}
      <div className="bg-white w-full max-w-md rounded-md shadow-md overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-gray-50 px-4 py-2 border-b">
          <h2 className="text-gray-700 font-medium">クリップボード履歴</h2>
        </div>
        
        {/* 検索ボックス */}
        <div className="p-2 border-b">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="検索..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full p-2 rounded border text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        
        {/* クリアボタン */}
        <div className="flex justify-end p-2">
          <button 
            onClick={() => window.electronAPI.clearHistory()}
            className="text-xs text-blue-500 hover:text-blue-700"
          >
            すべてクリア
          </button>
        </div>
        
        {/* 履歴リスト */}
        <div className="overflow-y-auto max-h-72 p-2">
          {filteredHistory.length > 0 ? (
            <div className="space-y-2">
              {filteredHistory.map((item, index) => (
                <div 
                  key={item.id}
                  className={`p-3 border rounded-md flex items-start group relative ${
                    index === selectedIndex ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  } cursor-pointer`}
                  onClick={() => handleSelectItem(item)}
                >
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm text-gray-900 truncate">
                      {item.text}
                    </p>
                  </div>
                  <button className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 absolute top-1 right-1">
                    &#x22EE; {/* 縦三点リーダー */}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              {history.length === 0 ? '履歴がありません' : '検索結果がありません'}
            </div>
          )}
        </div>
      </div>
      
      {/* 通知 */}
      {notification && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded shadow-lg">
          {notification}
        </div>
      )}
    </div>
  );
};

export default PopupView;
