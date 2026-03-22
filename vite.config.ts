import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig(async () => {
  const { default: react } = await import('@vitejs/plugin-react')
  const { default: tailwindcss } = await import('@tailwindcss/vite')

  return {
    plugins: [react(), tailwindcss()],
    root: '.',
    publicDir: 'static',
    build: {
      outDir: 'public',
      emptyOutDir: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/config.js': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})
