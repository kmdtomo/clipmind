import React from 'react';
import { ClipboardItem } from '../types/ClipboardItem';
import HistoryItemCard from './HistoryItemCard'; // 作成したカードコンポーネントをインポート
import { Clipboard } from 'react-feather'; // アイコンをインポート

// Propsの型定義
interface HistoryListProps {
  items: ClipboardItem[]; // 表示するアイテムの配列
  darkMode: boolean;
  onCopy: (item: ClipboardItem) => void;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
  formatTimestamp: (timestamp: number) => string;
}

const HistoryList: React.FC<HistoryListProps> = ({
  items,
  darkMode,
  onCopy,
  onTogglePin,
  onDelete,
  formatTimestamp,
}) => {
  return (
    <>
      {/* ヘッダー（件数表示など） */}
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">クリップボード履歴</h2>
        <span className={`px-3 py-1 rounded-full text-sm ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} text-gray-500`}>
          {items.length} 件
        </span>
      </div>

      {/* 履歴リスト本体 */}
      {items.length > 0 ? (
        // アイテムがある場合: グリッド表示
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items
            // ピン留めされたアイテムを優先し、次にタイムスタンプでソート
            .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.timestamp - a.timestamp)
            // 各アイテムを HistoryItemCard でレンダリング
            .map(item => (
              <HistoryItemCard
                key={item.id} // リストレンダリングには key が必要
                item={item}
                darkMode={darkMode}
                onCopy={onCopy}
                onTogglePin={onTogglePin}
                onDelete={onDelete}
                formatTimestamp={formatTimestamp}
              />
            ))}
        </div>
      ) : (
        // アイテムがない場合: プレースホルダー表示
        <div className={`p-8 text-center ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'} rounded-lg`}>
          <Clipboard size={48} className="mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">履歴がありません</h3>
          <p>テキストやイメージをコピー（Cmd+C/Ctrl+C）すると、ここに表示されます。</p>
          <p className="mt-2 text-sm">履歴にアクセスするには、Cmd+Shift+V / Ctrl+Shift+V を押してください。</p>
        </div>
      )}
    </>
  );
};

export default HistoryList;
