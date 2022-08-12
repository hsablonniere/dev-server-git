import { defineConfig } from 'vite';
import gitPlugin from './src/vite-plugin-git.js';

export default defineConfig({
  server: {
    port: 8081,
    watch: {
      ignored: ['!**/.idea/**'],
    },
  },
  plugins: [
    gitPlugin(),
  ],
});


