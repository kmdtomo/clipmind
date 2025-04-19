import React, { useEffect, useState, useCallback } from 'react'; // useCallback をインポート
import { ClipboardItem } from './types/ClipboardItem';
// 分割したコンポーネントをインポート
import Header from './components/Header';
import HistoryList from './components/HistoryList';
import Footer from './components/Footer';

function App() {
  const [history, setHistory] = useState<ClipboardItem[]>([]);
  const [isElectron, setIsElectron] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- 状態管理とロジック ---

  // 履歴データをリフレッシュする関数
  const refreshHistory = useCallback(() => { // useCallback でメモ化
    if (window.electronAPI) {
      console.log('App: Manually refreshing history data...');
      window.electronAPI.getHistory();
    }
  }, []); // 依存配列は空

  // 履歴更新コールバックを useCallback でメモ化
  const handleHistoryUpdate = useCallback((newHistory: ClipboardItem[]) => {
    console.log('App.tsx: History update received, items count:', newHistory.length);
    // setHistory を関数形式で呼び出し、意図しないループを防ぐ試み
    setHistory(prevHistory => {
      // 必要に応じてここで新旧履歴のマージや差分更新を行うことも可能
      // 今回は単純に置き換え + source/pinned のデフォルト値設定
      return newHistory.map(item => ({
        ...item,
        source: item.source || 'default',
        pinned: item.pinned || false
      }));
    });
  }, []); // 依存配列は空

  // Electron API のチェックとリスナー設定
  useEffect(() => {
    console.log('App.tsx: Running main useEffect');
    const hasElectronAPI = typeof window !== 'undefined' &&
                           'electronAPI' in window &&
                           typeof window.electronAPI !== 'undefined';
    setIsElectron(hasElectronAPI);

    let historyCleanup: (() => void) | undefined;
    let keydownListener: ((e: KeyboardEvent) => void) | undefined;

    if (hasElectronAPI && window.electronAPI) {
      console.log('App.tsx: Electron API detected. Setting up listeners.');
      window.electronAPI.getHistory(); // 初期履歴取得

      // メモ化したコールバックを使ってリスナーを登録
      historyCleanup = window.electronAPI.onHistoryUpdate(handleHistoryUpdate);

      // キーボードリスナー
      keydownListener = (e: KeyboardEvent) => {
         if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'v') {
           window.electronAPI?.showAtCursor?.();
         }
         if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
           refreshHistory();
         }
      };
      window.addEventListener('keydown', keydownListener);

    } else {
      console.error('Electron API not found in window object');
      // 非Electron環境用のダミーデータ
      const dummyData: ClipboardItem[] = [
        { id: 'dummy-1', type: 'text', value: 'サンプルテキスト 1 (非Electron)', timestamp: Date.now() - 60000, source: 'default', pinned: false },
      ];
      setHistory(dummyData);
    }

    // クリーンアップ関数
    return () => {
      console.log('App.tsx: Cleaning up main useEffect');
      if (keydownListener) {
        window.removeEventListener('keydown', keydownListener);
      }
      historyCleanup?.(); // リスナー解除
    };
  // useEffect の依存配列にメモ化したコールバックを含める
  // refreshHistory も依存関係に含める (useCallback でメモ化済み)
  }, [handleHistoryUpdate, refreshHistory]);


  // 検索フィルター
  const filteredItems = history.filter(item =>
    item.type === 'text' && item.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 日付フォーマット関数
  const formatTimestamp = useCallback((timestamp: number) => { // useCallback でメモ化
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }, []); // 依存配列は空

  // --- イベントハンドラ ---
  const deleteItem = useCallback((id: string) => { // useCallback でメモ化
    window.electronAPI?.deleteItem(id);
  }, []);

  const togglePin = useCallback((id: string) => { // useCallback でメモ化
    const item = history.find(item => item.id === id);
    if (item) {
      window.electronAPI?.updateItem({...item, pinned: !item.pinned});
    }
  }, [history]); // history が変更されたら再生成

  const copyToClipboard = useCallback((item: ClipboardItem) => { // useCallback でメモ化
    window.electronAPI?.copyToClipboard(item);
  }, []);

  const clearHistory = useCallback(() => { // useCallback でメモ化
    window.electronAPI?.clearHistory();
  }, []);

  // --- レンダリング ---
  console.log(`App rendering - isElectron: ${isElectron}, history length: ${history.length}, filtered length: ${filteredItems.length}`);

  if (!isElectron && history.length === 0) { // isElectron が false かつ history が空の場合のみ注意を表示
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">注意!</strong>
          <span className="block sm:inline"> Electron APIが見つかりません。Electron環境で実行してください。</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'text-gray-100 bg-gray-900' : 'text-gray-800 bg-white'}`}>
      {/* 分割したコンポーネントを使用 */}
      <Header
        darkMode={darkMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onRefreshHistory={refreshHistory}
      />
      <main className="flex-1 p-6 overflow-auto">
        <HistoryList
          items={filteredItems}
          darkMode={darkMode}
          onCopy={copyToClipboard}
          onTogglePin={togglePin}
          onDelete={deleteItem}
          formatTimestamp={formatTimestamp}
        />
      </main>
      <Footer
        darkMode={darkMode}
        onClearHistory={clearHistory}
      />
    </div>
  );
}

export default App;
