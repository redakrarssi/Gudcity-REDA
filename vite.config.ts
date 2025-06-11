import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { resolve } from 'path';
// import { compression } from 'vite-plugin-compression2';
import { splitVendorChunkPlugin } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  // Use relative paths for assets - critical fix for Vercel deployment
  base: './',
  plugins: [
    react({
      // Improve build-time performance
      babel: {
        plugins: [
          ['transform-react-remove-prop-types', { removeImport: true }]
        ],
      },
      // Fast refresh is enabled by default in @vitejs/plugin-react
    }),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true
      }
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
    }
  },
  
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['html5-qrcode', 'react', 'react-dom', 'react-router-dom'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  
  build: {
    // Enable sourcemaps only in analyze mode
    sourcemap: process.env.ANALYZE === 'true',
    
    // Use Terser for minification with optimized settings
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for debugging
        drop_debugger: false, // Keep debugger statements for troubleshooting
        pure_funcs: [], // Don't remove any console functions
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    
    // More granular chunk strategy
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('scheduler') || id.includes('prop-types')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react') || id.includes('@headlessui')) {
              return 'vendor-ui';
            }
            if (id.includes('html5-qrcode') || id.includes('qrcode')) {
              return 'vendor-qr';
            }
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'vendor-i18n';
            }
            if (id.includes('mapbox') || id.includes('recharts')) {
              return 'vendor-charts';
            }
            return 'vendor-other';
          }
          
          // Split app code by features
          if (id.includes('/components/')) {
            return 'app-components';
          }
          if (id.includes('/pages/')) {
            return 'app-pages';
          }
          if (id.includes('/utils/') || id.includes('/services/')) {
            return 'app-core';
          }
        },
        
        // Ensure assets have content-based hashes for better caching
        assetFileNames: 'assets/[name]-[hash].[ext]',
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
      },
    },
    
    // Increase limit to avoid unnecessary warnings
    chunkSizeWarningLimit: 1200,
    
    // Target modern browsers for smaller bundles
    target: 'esnext',
    
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
