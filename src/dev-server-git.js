import { getFileFromGit, getGitListing, matchUrl } from './lib.js';

export default function () {
  return {

    name: 'dev-server-git',

    serverStart ({ fileWatcher }) {
      // Changes on ".git/logs/HEAD" means something happened in git
      // TODO: figure out how to only reload the git index and the pages with updatable refs (HEAD~ or branch-name)
      fileWatcher.add('.git/logs/HEAD');
    },

    async serve (context) {

      const { ref, filepath } = matchUrl(context.request.url);

      if (ref === '') {
        const listing = await getGitListing(filepath);
        return listing;
      }

      if (ref != null) {
        const file = await getFileFromGit(ref, filepath);
        if (file != null) {
          return file;
        }
      }
    },
  };
}
