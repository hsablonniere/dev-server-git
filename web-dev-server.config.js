import gitPlugin from './src/dev-server-git.js';

export default {
  port: 8082,
  watch: true,
  nodeResolve: true,
  plugins: [
    gitPlugin(),
  ],
};

