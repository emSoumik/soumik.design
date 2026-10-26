// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://soumik.design',
  integrations: [mdx()],
  // lossless whitespace, as the hand-written html had it (astro 7's default 'jsx' rules drop spaces between lines)
  compressHTML: true,
  // one request per page: the css rides in the html, the way index.html always did it
  build: { inlineStylesheets: 'always' },
  // its pill sits right on top of the garden's hint and clear button
  devToolbar: { enabled: false },
  // code blocks sit on the same warm paper as everything else
  markdown: { shikiConfig: { theme: 'github-light' } },
});
