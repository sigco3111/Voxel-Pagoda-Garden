import { defineConfig } from 'vite';

// `base: './'` keeps asset URLs relative so the built site also works
// when served from a sub-path, e.g. GitHub Pages project sites.
export default defineConfig({
  base: './',
});
