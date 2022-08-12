import { getFileFromGit, getGitListing, matchUrl } from './lib.js';

export default function () {
  return {

    name: 'vite-plugin-git',

    // Add ".git" to the watcher
    // TODO: figure out how to only watch ".git/logs/HEAD"
    config: () => ({
      server: {
        watch: {
          ignored: ['!**/.git/**'],
        },
      },
    }),

    async load (id) {
      const { ref, filepath } = matchUrl(id);
      if (ref != null) {
        const file = await getFileFromGit(ref, filepath);
        if (file != null) {
          return file.body.toString();
        }
      }
    },

    configureServer (server) {

      server.middlewares.use(async (req, res, next) => {

        const { ref, filepath } = matchUrl(req.url);

        if (ref === '') {
          const listing = await getGitListing(filepath);
          return sendFile(server, req, res, listing);
        }

        // We don't serve JavaScript files,
        // they will be handled by the load plugin hook.
        if (ref != null && !filepath.endsWith('.js')) {
          const file = await getFileFromGit(ref, filepath);
          if (file != null) {
            return sendFile(server, req, res, file);
          }
        }

        next();
      });
    },

    async handleHotUpdate ({ file, read, server }) {
      // Changes on ".git/logs/HEAD" means something happened in git
      if (file.endsWith('.git/logs/HEAD')) {

        // Clear the cache with explicit call to moduleGraph.onFileChange()
        Array
          .from(server.moduleGraph.fileToModulesMap.keys())
          .filter((file) => matchUrl(file).ref != null)
          .forEach((file) => server.moduleGraph.onFileChange(file));

        // Force a page reload
        // TODO: figure out how to only reload the git index and the pages with updatable refs (HEAD~ or branch-name)
        server.ws.send({
          type: 'full-reload',
          path: '*',
        });
      }
    },
  };
}

async function sendFile (server, req, res, file) {
  const body = (file.type === 'text/html')
    ? await server.transformIndexHtml(req.url, file.body.toString(), req.originalUrl)
    : file.body;
  res.setHeader('content-type', file.type);
  res.end(body);
}
