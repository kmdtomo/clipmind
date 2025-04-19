import React from 'react';
import { Trash2 as Trash } from 'react-feather';

// Propsの型定義
interface FooterProps {
  darkMode: boolean;
  onClearHistory: () => void; // 全削除ボタンのクリックハンドラ
}

const Footer: React.FC<FooterProps> = ({ darkMode, onClearHistory }) => {
  return (
    <footer className={`flex justify-between items-center p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      {/* 全削除ボタン */}
      <button
        className="flex items-center space-x-2 px-4 py-2 rounded-md text-sm text-red-500 border border-red-500 hover:bg-red-500 hover:text-white transition-colors duration-200"
        onClick={onClearHistory} // クリック時に親コンポーネントの関数を呼ぶ
        title="すべての履歴を削除"
      >
        <Trash size={16} />
        <span>すべて削除</span>
      </button>

      {/* バージョン情報 */}
      <div className="text-sm text-gray-500">
        <p>ClipMind v1.0.0</p> {/* バージョン情報は必要に応じて動的に取得 */}
      </div>
    </footer>
  );
};

export default Footer;
