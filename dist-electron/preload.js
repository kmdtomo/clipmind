import { contextBridge, ipcRenderer } from "electron";
console.log("Preload script starting...");
console.log("contextBridge available:", !!contextBridge);
function convertClipboardItems(items) {
  console.log("Converting clipboard items, received count:", (items == null ? void 0 : items.length) || 0);
  if (!items || !Array.isArray(items)) {
    console.error("Invalid items received for conversion:", items);
    return [];
  }
  try {
    return items.map((item) => {
      if (!item || typeof item !== "object") {
        console.error("Invalid item received for conversion:", item);
        return {
          id: `error-${Date.now()}`,
          timestamp: Date.now(),
          pinned: false,
          source: "error",
          text: "変換エラー",
          type: "text"
        };
      }
      const convertedItem = {
        id: item.id || `generated-${Date.now()}`,
        timestamp: item.timestamp || Date.now(),
        pinned: item.pinned || false,
        source: item.source || "default",
        text: "",
        type: item.type || "text"
      };
      if (item.type === "text" && item.value) {
        convertedItem.text = item.value;
        console.log(`Converting text item ${item.id}: "${item.value.substring(0, 30)}..."`);
      } else if (item.type === "image" && item.value) {
        convertedItem.text = "[画像データ]";
        console.log(`Converting image item ${item.id}`);
      } else if (item.text) {
        convertedItem.text = item.text;
        console.log(`Item ${item.id} already has text property`);
      } else {
        convertedItem.text = "不明なデータ";
        console.log(`Item ${item.id} has no recognizable content`);
      }
      return convertedItem;
    });
  } catch (error) {
    console.error("Error converting clipboard items:", error);
    return [];
  }
}
contextBridge.exposeInMainWorld("electronAPI", {
  // 履歴データの取得
  getHistory: () => {
    console.log("Preload: getHistory called");
    try {
      ipcRenderer.send("get-history");
      console.log("Preload: get-history IPC message sent successfully");
    } catch (error) {
      console.error("Preload: Error sending get-history IPC message:", error);
    }
  },
  // 履歴データの更新を受け取るリスナー
  onHistoryUpdate: (callback) => {
    console.log("Preload: onHistoryUpdate listener registered");
    const listener = (_, history) => {
      console.log("Preload: update-history received:", (history == null ? void 0 : history.length) || 0, "items");
      console.log("Preload: Received history data structure:", Array.isArray(history) ? "Array" : typeof history);
      if (!history || !Array.isArray(history)) {
        console.error("Preload: Invalid history data received:", history);
        callback([]);
        return;
      }
      if (history.length > 0) {
        console.log("Preload: First history item sample:", JSON.stringify(history[0]).substring(0, 100));
      }
      const convertedHistory = convertClipboardItems(history || []);
      console.log("Preload: Converted history items count:", convertedHistory.length);
      try {
        setTimeout(() => {
          callback(convertedHistory);
          console.log("Preload: History callback executed with", convertedHistory.length, "items");
        }, 50);
      } catch (error) {
        console.error("Preload: Error in history update callback:", error);
      }
    };
    try {
      ipcRenderer.on("update-history", listener);
      console.log("Preload: update-history IPC listener registered successfully");
    } catch (error) {
      console.error("Preload: Error registering update-history IPC listener:", error);
    }
    console.log("Preload: Creating test history item");
    const testItem = {
      id: `test-${Date.now()}`,
      timestamp: Date.now(),
      text: "テスト項目 - 正しく表示されていれば履歴機能は動作しています",
      pinned: false,
      source: "test"
    };
    setTimeout(() => {
      try {
        console.log("Preload: Sending test history item");
        callback([testItem]);
      } catch (error) {
        console.error("Preload: Error sending test item:", error);
      }
    }, 1e3);
    return () => {
      console.log("Preload: removing update-history listener");
      try {
        ipcRenderer.removeListener("update-history", listener);
      } catch (error) {
        console.error("Preload: Error removing update-history listener:", error);
      }
    };
  },
  // クリップボードにコピー
  copyToClipboard: (item) => {
    console.log("Preload: copyToClipboard called with item:", item.id);
    const convertedItem = {
      id: item.id,
      type: "text",
      value: item.text || "",
      timestamp: item.timestamp
    };
    ipcRenderer.send("copy-to-clipboard", convertedItem);
  },
  // 履歴アイテムを削除
  deleteItem: (id) => {
    console.log("Preload: deleteItem called with id:", id);
    ipcRenderer.send("delete-item", id);
  },
  // 履歴アイテムを更新
  updateItem: (item) => {
    console.log("Preload: updateItem called with item:", item.id);
    const convertedItem = {
      id: item.id,
      type: item.type || "text",
      value: item.text || "",
      timestamp: item.timestamp,
      pinned: item.pinned
    };
    ipcRenderer.send("update-item", convertedItem);
  },
  // 履歴をクリア
  clearHistory: () => {
    console.log("Preload: clearHistory called");
    ipcRenderer.send("clear-history");
  },
  // アプリを終了
  closeApp: () => {
    console.log("Preload: closeApp called");
    ipcRenderer.send("close-app");
  },
  // カーソル位置にウィンドウを表示
  showAtCursor: () => {
    console.log("Preload: showAtCursor called");
    ipcRenderer.send("show-at-cursor");
  }
});
console.log("Preload script completed, electronAPI exposed:", !!window.electronAPI);
console.log("Available APIs:", Object.keys(window.electronAPI || {}));
contextBridge.exposeInMainWorld("electronTest", {
  isElectron: true,
  ping: () => "pong"
});
