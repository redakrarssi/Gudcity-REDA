import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { resolve } from 'path';
// import { compression } from 'vite-plugin-compression2';
import { splitVendorChunkPlugin } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  // Remove relative path base as it causes issues in production
  // base: './',
  plugins: [
    react({
      // Improve build-time performance
      babel: {
        plugins: [
          ['transform-react-remove-prop-types', { removeImport: true }]
        ],
        presets: [
          ['@babel/preset-env', {
            targets: {
              browsers: ['> 1%', 'last 2 versions', 'not dead']
            },
            useBuiltIns: 'usage',
            corejs: 3
          }]
        ]
      },
      // Fast refresh is enabled by default in @vitejs/plugin-react
    }),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true
      },
      // Explicitly include problematic modules
      include: ['net', 'stream', 'events', 'path', 'util', 'buffer']
    }),
    // Compression plugin temporarily disabled due to compatibility issues
    // compression({
    //   algorithm: 'brotli',
    //   exclude: [/\.(br)$/, /\.(gz)$/, /\.(png|jpe?g|gif|webp|ico|svg)$/i],
    //   threshold: 1024, // Only compress files > 1kb
    //   deleteOriginalAssets: false, // Keep original files
    //   compressionOptions: { // Required to avoid null/undefined errors
    //     level: 11
    //   }
    // }),
    // compression({
    //   algorithm: 'gzip',
    //   exclude: [/\.(br)$/, /\.(gz)$/, /\.(png|jpe?g|gif|webp|ico|svg)$/i],
    //   threshold: 1024,
    //   deleteOriginalAssets: false, // Keep original files
    //   compressionOptions: { // Required to avoid null/undefined errors
    //     level: 9
    //   }
    // }),
    // Split chunks intelligently
    splitVendorChunkPlugin(),
    // Add bundle analyzer (only in build mode)
    process.env.ANALYZE === 'true' ? visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }) : null,
  ].filter(Boolean),
  
  resolve: {
    alias: {
      crypto: resolve(__dirname, 'src/utils/cryptoUtils.ts'),
      '@': resolve(__dirname, 'src'),
      // Add aliases for problematic Node.js modules
      'net': resolve(__dirname, 'src/utils/netPolyfill.ts'),
      'express-rate-limit': resolve(__dirname, 'src/utils/rateLimitPolyfill.ts'),
      // Use our own express polyfill instead of browser.js
      'express': resolve(__dirname, 'src/utils/expressPolyfill.ts'),
      // Add HTTP polyfill
      'http': resolve(__dirname, 'src/utils/httpPolyfill.ts'),
      // Add Socket.IO server polyfill
      'socket.io': resolve(__dirname, 'src/utils/socketIoPolyfill.ts'),
      // Replace server.ts with mock implementation in browser
      './server': resolve(__dirname, 'src/utils/serverMock.ts'),
      '../server': resolve(__dirname, 'src/utils/serverMock.ts'),
      'src/server': resolve(__dirname, 'src/utils/serverMock.ts'),
      '/src/server': resolve(__dirname, 'src/utils/serverMock.ts'),
      './server.ts': resolve(__dirname, 'src/utils/serverMock.ts'),
      '../server.ts': resolve(__dirname, 'src/utils/serverMock.ts'),
      'src/server.ts': resolve(__dirname, 'src/utils/serverMock.ts'),
      '/src/server.ts': resolve(__dirname, 'src/utils/serverMock.ts'),
    }
  },
  
  optimizeDeps: {
    exclude: ['lucide-react', 'express-rate-limit', 'express'],
    include: ['html5-qrcode', 'react', 'react-dom', 'react-router-dom', 'lodash'],
    esbuildOptions: {
      target: 'es2020', // Use safer target
      // Define Node.js globals
      define: {
        global: 'globalThis',
      },
    },
  },
  
  build: {
    // Enable sourcemaps only in analyze mode
    sourcemap: process.env.ANALYZE === 'true',
    
    // Use esbuild for minification (more reliable than Terser)
    minify: 'esbuild',
    target: 'es2020', // Use safer target instead of esnext
    
    // Add fallback for problematic builds
    ...(process.env.NODE_ENV === 'production' && {
      minify: false, // Disable minification in production if there are issues
      target: 'es2015', // Use even more conservative target
    }),
    
    // More granular chunk strategy
    rollupOptions: {
      output: {
        manualChunks: {
          // Explicitly define lodash chunk to ensure it loads before charts
          'vendor-lodash': ['lodash'],
        },
      }
    },
    
    // Increase limit to avoid unnecessary warnings
    chunkSizeWarningLimit: 1200,
    
    // Pre-load critical assets for faster initial render
    modulePreload: {
      polyfill: true,
    },
    
    // Ensure CSS is extracted for better caching
    cssCodeSplit: true,
    
    // Optimize assets
    assetsInlineLimit: 4096, // 4kb - inline small assets
  },
  
  // Improve dev server performance
  server: {
    hmr: {
      overlay: true,
    },
    // Reuse open ports when restarting dev server
    strictPort: false, 
    // Optimize for network performance
    fs: {
      strict: true,
    },
  },
  
  preview: {
    // Add headers for better caching in preview mode
    headers: {
      'Cache-Control': 'public, max-age=31536000', // 1 year for static assets
    },
  },
});
