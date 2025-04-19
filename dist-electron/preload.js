"use strict";
const electron = require("electron");
console.log("Preload script starting...");
console.log("contextBridge available:", !!electron.contextBridge);
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // 履歴データの取得
  getHistory: () => {
    console.log("Preload: getHistory called");
    try {
      electron.ipcRenderer.send("get-history");
      console.log("Preload: get-history IPC message sent successfully");
    } catch (error) {
      console.error("Preload: Error sending get-history IPC message:", error);
    }
  },
  // 履歴データの更新を受け取るリスナー (型をインポートしたものに修正)
  onHistoryUpdate: (callback) => {
    console.log("Preload: onHistoryUpdate listener registered");
    const listener = (_, history) => {
      console.log("Preload: update-history received:", (history == null ? void 0 : history.length) || 0, "items");
      if (!Array.isArray(history) || !history.every((item) => item && typeof item === "object" && "id" in item && "type" in item && "value" in item && "timestamp" in item)) {
        console.error("Preload: Invalid history data structure received:", history);
        callback([]);
        return;
      }
      if (history.length > 0) {
        console.log("Preload: First history item sample:", JSON.stringify(history[0]).substring(0, 100));
      }
      try {
        callback(history);
        console.log("Preload: History callback executed with", history.length, "items");
      } catch (error) {
        console.error("Preload: Error in history update callback:", error);
      }
    };
    try {
      electron.ipcRenderer.on("update-history", listener);
      console.log("Preload: update-history IPC listener registered successfully");
    } catch (error) {
      console.error("Preload: Error registering update-history IPC listener:", error);
    }
    return () => {
      console.log("Preload: removing update-history listener");
      try {
        electron.ipcRenderer.removeListener("update-history", listener);
      } catch (error) {
        console.error("Preload: Error removing update-history listener:", error);
      }
    };
  },
  // クリップボードにコピー (型をインポートしたものに修正、変換不要)
  copyToClipboard: (item) => {
    console.log("Preload: copyToClipboard called with item:", item.id, item.type);
    electron.ipcRenderer.send("copy-to-clipboard", item);
  },
  // 履歴アイテムを削除
  deleteItem: (id) => {
    console.log("Preload: deleteItem called with id:", id);
    electron.ipcRenderer.send("delete-item", id);
  },
  // 履歴アイテムを更新 (型をインポートしたものに修正、変換不要)
  updateItem: (item) => {
    console.log("Preload: updateItem called with item:", item.id);
    electron.ipcRenderer.send("update-item", item);
  },
  // 履歴をクリア
  clearHistory: () => {
    console.log("Preload: clearHistory called");
    electron.ipcRenderer.send("clear-history");
  },
  // アプリを終了
  closeApp: () => {
    console.log("Preload: closeApp called");
    electron.ipcRenderer.send("close-app");
  },
  // カーソル位置にウィンドウを表示
  showAtCursor: () => {
    console.log("Preload: showAtCursor called");
    electron.ipcRenderer.send("show-at-cursor");
  }
});
console.log("Preload script completed, electronAPI exposed:", !!window.electronAPI);
console.log("Available APIs:", Object.keys(window.electronAPI || {}));
electron.contextBridge.exposeInMainWorld("electronTest", {
  isElectron: true,
  ping: () => "pong"
});
