import git from 'isomorphic-git';
import fs from 'fs';
import mime from 'mime-types';

const GIT_REF_REGEX = /^\/(?<ref>\S*)@git(?<filepath>\/.*)/;

export function matchUrl (url) {
  const pathname = new URL(url, 'http://example.com').pathname;
  const { ref, filepath } = pathname.match(GIT_REF_REGEX)?.groups ?? {};
  return { ref, filepath };
}

/**
 * @param ref
 * @param filepath
 * @returns {Promise<null|{body: string, fullOid: string, type: string}>}
 */
export async function getFileFromGit (ref, rawFilepath) {

  // Naive default to index.html
  const filepath = rawFilepath.replace(/\/$/, '/index.html');

  try {

    const fullOid = await resolveGitReference(ref);

    const localFilepath = filepath.replace(/^\//, '');
    const type = mime.lookup(localFilepath);

    const { blob } = await git.readBlob({ fs, dir: '.', oid: fullOid, filepath: localFilepath });
    const body = Buffer.from(blob);

    return {
      type,
      body,
      get bodyString () {
        return body.toString('utf8');
      },
    };
  }
  catch (e) {
    // This probably means the file doesn't exist
    return null;
  }
}

async function resolveGitReference (rawRef) {

  const [ref, parentDepth = 0] = rawRef.split('~');

  let fullOid = await Promise.any([
    git.resolveRef({ fs, dir: '.', ref }),
    git.expandOid({ fs, dir: '.', oid: ref }),
  ]);

  let depth = 0;
  while (depth < parentDepth) {
    const { commit } = await git.readCommit({ fs, dir: '.', oid: fullOid });
    fullOid = commit.parent[0];
    depth += 1;
  }

  return fullOid;
}

export async function getGitListing (filepath) {

  const commitListRaw = await git.log({ fs, dir: '.', ref: 'HEAD' });
  const commitList = commitListRaw.map((commit) => {
    const [date, time] = new Date(commit.commit.author.timestamp * 1000).toISOString().slice(0, 19).split('T');
    return {
      oid: commit.oid,
      sha1: commit.oid.substr(0, 8),
      message: commit.commit.message,
      date,
      time,
    };
  });

  const branchList = await git.listBranches({ fs, dir: '.' });
  const branchesByCommit = {};
  for (const branch of branchList) {
    const sha1 = await git.resolveRef({ fs, dir: '.', ref: branch });
    if (branchesByCommit[sha1] == null) {
      branchesByCommit[sha1] = [];
    }
    branchesByCommit[sha1].push(branch);
  }

  return {
    type: 'text/html',
    body: `
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Git index</title>
        <style>
          body {
            font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
          }
          h1 {
            text-align: center;
          }
          table {
            font-size: 1em;
            margin: 0 auto;
            border-collapse: collapse;
            border-radius: 0.25em;
          }
          th,
          td {
            border: 1px solid #ccc;
          }
          th {
            background-color: #eee;
            padding: 1em 0.5em;
            text-align: left;
          }
          td {
            padding: 0.35em 0.75em;
          }
          tr:hover td {
            background-color: #fafafa;
          }
          .fullwidth {
            text-align: center;
          }
          .sha1 {
            font-family: "SourceCodePro", "monaco", monospace;
          }
          .message {
            min-width: 20em;
          }
          .branch {
            background-color: #b6e0ff;
            border-radius: 0.25em;
            font-size: 0.9em;
            font-weight: bold;
            margin: 0 0.25em;
            padding: 0.15em 0.5em;
          }
        </style>
      </head>
      <body>
        <h1>Git index</h1>
        <table>
          <tr>
            <th>SHA1</th>
            <th>Message</th>
            <th>Date</th>
            <th>Time</th>
          </tr>
          <tr>
            <td class="fullwidth" colspan="4">
              <a href="${filepath}">current staging version</a>
            </td>
          </tr>
          ${commitList.map((commit) => `
            <tr>
              <td class="sha1"><a href="/${commit.sha1}@git${filepath}">${commit.sha1}</a></td>
              <td class="message">
                ${commit.message}
                ${getBranchesAsHtml(branchesByCommit, commit.oid)}
              </td>
              <td class="date">${commit.date}</td>
              <td class="time">${commit.time}</td>
            </tr>
          `).join('\n')}
        </table>
      </body>
      </html>
    `,
  };
}

function getBranchesAsHtml (branchesByCommit, sha1) {
  const branchList = branchesByCommit[sha1];
  if (branchList == null) {
    return '';
  }
  return branchList
    .map((branch) => `<span class="branch">${branch}</span>`)
    .join('');
}
