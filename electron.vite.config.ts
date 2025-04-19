import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    // メインプロセスの設定
    plugins: [externalizeDepsPlugin()],
    build: {
      // input を使ってエントリーポイントを指定
      rollupOptions: {
        input: 'electron/main.ts'
      }
    }
  },
  preload: {
    // プリロードスクリプトの設定
    plugins: [externalizeDepsPlugin()],
    build: {
      // input を使ってエントリーポイントを指定
      rollupOptions: {
        input: 'electron/preload.ts'
      }
    }
  },
  renderer: {
    // レンダラープロセス（React UI）の設定
    root: '.', // Reactアプリのルートをプロジェクトルートに変更
    resolve: {
      alias: {
        // '@renderer': resolve('src') // エイリアスを使用する場合のパスも修正
      }
    },
    build: {
      // rollupOptions.input はルートの index.html を指すため変更不要
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html')
        }
      }
    },
    plugins: [react()]
  }
})
