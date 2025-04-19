import React, { useEffect, useState, useRef } from 'react';
// 型名を ClipboardItem に統一
import { ClipboardItem } from '../types/ClipboardItem';
// Image アイコンを追加
import { Image as ImageIcon } from 'react-feather';

const PopupView: React.FC = () => {
  // すべてのstateをここで定義 (型名を ClipboardItem に統一)
  const [history, setHistory] = useState<ClipboardItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [notification, setNotification] = useState('');
  const [isElectron, setIsElectron] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 検索フィルター - 常に計算する (item.value を使用し、テキストのみ対象)
  const filteredHistory = history.filter(item =>
    item.type === 'text' && item.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Electronの環境チェックと履歴データの初期取得
  useEffect(() => {
    // Electronの環境かどうかをチェック
    console.log('PopupView.tsx: Checking for Electron environment');
    
    // window.electronAPIの存在確認
    const hasElectronAPI = typeof window !== 'undefined' && 
                           'electronAPI' in window &&
                           typeof window.electronAPI !== 'undefined';
    
    console.log('Electron API detected:', hasElectronAPI);
    // window.electronAPI の参照エラーを修正 (型定義が適用されれば不要になるはず)
    if (hasElectronAPI && window.electronAPI) {
      console.log('Electron API methods:', Object.keys(window.electronAPI));
    }

    setIsElectron(hasElectronAPI);

    // window.electronAPI の参照エラーを修正
    if (hasElectronAPI && window.electronAPI) {
      // 初期データの取得
      console.log('PopupView.tsx: Requesting history data');
      window.electronAPI.getHistory();

      // 履歴更新のリスナー登録 (型を ClipboardItem[] に修正)
      const cleanup = window.electronAPI.onHistoryUpdate((newHistory: ClipboardItem[]) => {
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

      // Cmd+Shift+V または Ctrl+Shift+V (window.electronAPI の参照エラーを修正)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v') {
        if (window.electronAPI?.showAtCursor) { // Optional chaining を使用
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

  // クリップボードアイテムを選択したときの処理 (型名を ClipboardItem に統一)
  const handleSelectItem = (item: ClipboardItem) => {
    // window.electronAPI の参照エラーを修正
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
        
        {/* クリアボタン (window.electronAPI の参照エラーを修正) */}
        <div className="flex justify-end p-2">
          <button
            onClick={() => window.electronAPI?.clearHistory()} // Optional chaining を使用
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
                  <div className="flex-1 overflow-hidden flex items-center space-x-2"> {/* アイコンとテキストを横並び */}
                    {item.type === 'image' && <ImageIcon size={16} className="text-gray-500 flex-shrink-0" />} {/* 画像アイコン */}
                    <p className="text-sm text-gray-900 truncate">
                      {/* item.text を item.value に変更 */}
                      {item.type === 'text' ? item.value : '画像'} {/* 画像の場合は「画像」と表示 */}
                    </p>
                  </div>
                  {/* 縦三点リーダーボタンは削除 */}
                </div> // この閉じdivが正しい位置にあるか確認
              ))}
            </div> // この閉じdivが正しい位置にあるか確認
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
