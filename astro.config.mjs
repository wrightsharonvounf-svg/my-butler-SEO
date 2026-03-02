import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

export default defineConfig({
  site: 'https://www.butler-tim.ru',
  integrations: [sitemap()],
  output: 'static',

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
      chunkSizeWarningLimit: 2000,
      minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
      assetsInlineLimit: 0,
    }
  }
});