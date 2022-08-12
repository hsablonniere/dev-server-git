import { getFileFromGit, getGitListing, matchUrl } from './lib.js';

export default function () {
  return {
    name: 'dev-server-git',
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
