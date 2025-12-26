import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // これを追加：コンテナ外からのアクセスを許可する
    port: 5173, // ポート番号を固定（念のため）
    strictPort: true, // ポートが使用中の場合に勝手に変えない
    watch: {
      usePolling: true, // Docker環境でファイルの変更を検知しやすくする
    },
  },
})