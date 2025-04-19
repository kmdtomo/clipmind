import React from 'react';
// 型名を ClipboardItem に統一 (as は不要)
import { ClipboardItem } from '../types/ClipboardItem';
// Image アイコンを追加
import { Image as ImageIcon } from 'react-feather';

interface ClipboardItemProps {
  // 型名を ClipboardItem に統一
  item: ClipboardItem;
  onSelect: (item: ClipboardItem) => void;
}

const ClipboardItemComponent: React.FC<ClipboardItemProps> = ({ item, onSelect }) => { // コンポーネント名を変更 (ファイル名と区別)
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
      <div className="flex justify-between items-center"> {/* items-center に変更 */}
        <div className="flex-1 min-w-0 flex items-center space-x-2"> {/* アイコンとテキストを横並び */}
          {item.type === 'image' && <ImageIcon size={16} className="text-gray-500 flex-shrink-0" />} {/* 画像アイコン */}
          <p className="text-sm text-gray-900 truncate">
            {/* item.text を item.value に変更 */}
            {item.type === 'text' ? item.value : '画像'} {/* 画像の場合は「画像」と表示 */}
          </p>
        </div>
        <span className="text-xs text-gray-500 ml-2 whitespace-nowrap flex-shrink-0"> {/* flex-shrink-0 を追加 */}
          {formatDate(item.timestamp)}
        </span>
      </div>
    </div>
  );
};

export default ClipboardItemComponent; // コンポーネント名を変更
