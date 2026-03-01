// Файл: astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

export default defineConfig({
  site: 'https://www.butler-tim.ru',
  integrations: [sitemap()],
  output: 'static',

  // Для автогенерации anchor + TOC
  markdown: {
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'wrap' }]
    ]
  },

  vite: {
    ssr: {
      external: ["sanitize-html"],
      noExternal: ['@astrojs/*']
    },

    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: undefined,
          inlineDynamicImports: false,
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
      chunkSizeWarningLimit: 2000,
      minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
      assetsInlineLimit: 0,
    },

    server: {
      fs: {
        allow: ['..']
      }
    }
  }
});