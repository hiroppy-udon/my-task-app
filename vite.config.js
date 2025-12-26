import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0', // コンテナ内の全インターフェースで待機
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    cors: true,
    hmr: {
      clientPort: 443, // HTTPSトンネル経由の通信を許可
    },
  },
})