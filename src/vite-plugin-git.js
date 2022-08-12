import { getFileFromGit, getGitListing, matchUrl } from './lib.js';

export default function () {
  return {
    name: 'vite-plugin-git',
    async load (id) {
      const { ref, filepath } = matchUrl(id);
      if (ref != null) {
        const file = await getFileFromGit(ref, filepath);
        if (file != null) {
          return file.bodyString;
        }
      }
    },
    configureServer (server) {

      server.middlewares.use(async (req, res, next) => {

        const { ref, filepath } = matchUrl(req.url);

        if (ref === '') {
          const listing = await getGitListing(filepath);
          return sendFile(res, listing);
        }

        // We don't serve JavaScript files,
        // they will be handled by the load plugin hook.
        if (ref != null && !filepath.endsWith('.js')) {
          const file = await getFileFromGit(ref, filepath);
          if (file != null) {
            return sendFile(res, file);
          }
        }

        next();
      });
    },
  };
}

function sendFile (res, file) {
  res.setHeader('content-type', file.type);
  res.end(file.body);
}
