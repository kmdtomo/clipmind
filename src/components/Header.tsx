import React, { useRef } from 'react';
import { Clipboard, Settings, Search } from 'react-feather';

// Propsの型定義
interface HeaderProps {
  darkMode: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleDarkMode: () => void;
  onRefreshHistory: () => void; // 設定ボタンのクリックハンドラ（リフレッシュ用）
}

const Header: React.FC<HeaderProps> = ({
  darkMode,
  searchQuery,
  onSearchChange,
  onToggleDarkMode,
  onRefreshHistory,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null); // 検索入力への参照

  return (
    <header className={`flex items-center p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      {/* アプリタイトル */}
      <div className="flex items-center space-x-2 text-teal-600">
        <Clipboard size={24} />
        <h1 className="text-xl font-semibold">clipmind</h1>
      </div>

      {/* 検索バー */}
      <div className={`flex items-center ml-8 px-4 py-2 rounded-lg flex-1 max-w-md ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <Search size={18} className="text-gray-400" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="履歴を検索..."
          className="ml-2 bg-transparent w-full focus:outline-none"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)} // 入力変更時に親コンポーネントの関数を呼ぶ
        />
      </div>

      {/* ダークモード切り替えボタン */}
      <button
        className={`ml-4 p-2 rounded-md ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
        onClick={onToggleDarkMode} // クリック時に親コンポーネントの関数を呼ぶ
        title="ダークモード切替"
      >
        {darkMode ? '🌞' : '🌙'}
      </button>

      {/* 設定（リフレッシュ）ボタン */}
      <button
        className={`p-2 rounded-md ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
        onClick={onRefreshHistory} // クリック時に親コンポーネントの関数を呼ぶ
        title="履歴を更新"
      >
        <Settings size={20} />
      </button>
    </header>
  );
};

export default Header;
