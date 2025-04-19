import React from 'react';
import { ClipboardItem } from '../types/ClipboardItem';
import { Trash2 as Trash, MapPin, Image as ImageIcon } from 'react-feather';

// Propsの型定義
interface HistoryItemCardProps {
  item: ClipboardItem;
  darkMode: boolean;
  onCopy: (item: ClipboardItem) => void;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
  formatTimestamp: (timestamp: number) => string;
}

const HistoryItemCard: React.FC<HistoryItemCardProps> = ({
  item,
  darkMode,
  onCopy,
  onTogglePin,
  onDelete,
  formatTimestamp,
}) => {
  return (
    <div
      key={item.id} // keyはリスト側で付与するが、念のため残す
      className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-pointer
        ${item.pinned ? (darkMode ? 'border-t-2 border-teal-400' : 'border-t-2 border-teal-500') :
        (darkMode ? 'border border-gray-700' : 'border border-gray-200')}`}
      onClick={() => onCopy(item)} // クリックでコピー
    >
      <div className="flex justify-between items-start mb-2">
        {/* タイムスタンプ */}
        <div className="text-xs text-gray-500">{formatTimestamp(item.timestamp)}</div>
        {/* アクションボタン */}
        <div className="flex space-x-1">
          {/* ピン留めボタン */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // 親要素へのクリックイベント伝播を阻止
              onTogglePin(item.id);
            }}
            className={`p-1 rounded-full ${item.pinned ? 'text-teal-500' : 'text-gray-400'} ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            title={item.pinned ? "ピン留め解除" : "ピン留め"}
          >
            <MapPin size={14} />
          </button>
          {/* 削除ボタン */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // 親要素へのクリックイベント伝播を阻止
              onDelete(item.id);
            }}
            className={`p-1 rounded-full text-gray-400 hover:text-red-500 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            title="削除"
          >
            <Trash size={14} />
          </button>
        </div>
      </div>
      {/* コンテンツ表示エリア */}
      <div className={`mt-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'} break-words`}>
        {item.type === 'text' ? (
          // テキストの場合: 3行までに制限
          <p className="line-clamp-3">{item.value}</p>
        ) : (
          // 画像の場合: プレビュー表示
          <div className="flex items-center space-x-2 text-gray-500">
            <ImageIcon size={16} />
            <span>画像</span>
            {/* 画像プレビュー (高さ制限付き) */}
            <img
              src={item.value} // Data URL を src に設定
              alt="クリップボード画像"
              className="max-h-16 max-w-full object-contain rounded mt-1 border border-gray-600" // スタイル調整
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryItemCard;
