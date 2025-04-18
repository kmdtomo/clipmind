import React from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import PopupView from './components/PopupView'
import './index.css'

// デバッグ情報をコンソールに出力
console.log('main.tsx: Initializing React application');
console.log('Electron API available:', typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined');

// ハッシュルーターの設定
const router = createHashRouter([
  {
    path: '/',
    element: <App />
  },
  {
    path: '/popup',
    element: <PopupView />
  }
])

// アプリケーションをレンダリング
const rootElement = document.getElementById('root');
if (rootElement) {
  console.log('main.tsx: Rendering application');
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <RouterProvider router={router} />
  );
} else {
  console.error('main.tsx: Root element not found');
}
