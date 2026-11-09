import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx()],
  site: 'https://miguelcorderocollar.com',
  output: 'static',
  trailingSlash: 'always',
  compressHTML: true,
  build: { inlineStylesheets: 'auto' },
  // Opt-in hover/focus prefetch (links carry data-astro-prefetch). Not prefetchAll:
  // /brand/ links to multi-megabyte downloads that must never be fetched on hover.
  prefetch: { defaultStrategy: 'hover' },
  devToolbar: { enabled: false },
  server: { host: '127.0.0.1', port: 8000 },
});
