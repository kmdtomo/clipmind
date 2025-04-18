import React from 'react';
import { ClipboardItem as ClipboardItemType } from '../types/ClipboardItem';

interface ClipboardItemProps {
  item: ClipboardItemType;
  onSelect: (item: ClipboardItemType) => void;
}

const ClipboardItem: React.FC<ClipboardItemProps> = ({ item, onSelect }) => {
  // 日付フォーマット
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // クリップボードアイテムをクリックしたときの処理
  const handleClick = () => {
    onSelect(item);
  };

  return (
    <div 
      className="p-3 border-b border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors"
      onClick={handleClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 truncate">
            {item.text}
          </p>
        </div>
        <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
          {formatDate(item.timestamp)}
        </span>
      </div>
    </div>
  );
};

export default ClipboardItem;
