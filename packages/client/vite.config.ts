import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig(({ mode }) => {
  // 本番環境かどうかを判定
  const isProduction = mode === 'production';
  
  // 環境変数の優先順位を明確化
  // 1. 環境変数 VITE_WORKER_WS
  // 2. 本番環境のデフォルト
  // 3. 開発環境のデフォルト
  const workerWsUrl = process.env.VITE_WORKER_WS || 
    (isProduction 
      ? 'https://secret-werewolf-prod.qmdg2pmnw6.workers.dev'
      : 'http://localhost:8787');
  
  return {
    plugins: [react()],
    server: { 
      port: 5173,
      host: true,
      strictPort: false,
      hmr: {
        port: 24678,
        host: 'localhost',
        clientPort: 24678
      },
      fs: {
        allow: ['..']
      }
    },
    preview: {
      port: 4174,
      host: true,
      strictPort: false,
      cors: true
    },
    base: "/",
    publicDir: "public",
    build: {
      // 本番用ビルドの最適化
      minify: isProduction ? 'terser' : false,
      sourcemap: true, // デバッグ用にソースマップを有効化
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            ui: ['framer-motion', 'lucide-react']
          }
        }
      }
    },
    resolve: { 
      alias: { 
        "@": "/src",
        "@/components": "/src/components",
        "@/pages": "/src/pages",
        "@/utils": "/src/utils",
        "@/lib": "/src/lib",
        "@/hooks": "/src/hooks",
        "@/state": "/src/state",
        "@/types": "/src/types",
        "@/assets": "/src/assets"
      } 
    },
    assetsInclude: ["**/*.PNG", "**/*.png", "**/*.JPG", "**/*.jpg", "**/*.jpeg", "**/*.gif", "**/*.svg", "**/*.mov", "**/*.mp4", "**/*.webm"],
    optimizeDeps: {
      include: ['react', 'react-dom']
    },
    define: {
      // 本番環境でのデバッグ情報を無効化
      __DEV__: !isProduction,
      __PROD__: isProduction,
      // 環境変数から動的にサーバーURLを設定
      'import.meta.env.VITE_WORKER_WS': JSON.stringify(workerWsUrl),
      // 環境情報を注入
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.1'),
      'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toISOString())
    }
  };
});
