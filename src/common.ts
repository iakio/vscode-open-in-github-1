import { window, workspace } from 'vscode';

const exec = require('child_process').exec;
const path = require('path');
const opn = require('opn');
const R = require('ramda');

const BRANCH_URL_SEP = '\t—\t';

/**
 * Returns raw list of remotes.
 *
 * @todo: Should work on windows too...
 *
 * @param {Function} exec
 * @param {String} projectPath
 *
 * @return {Promise<String[]>}
 */
export function getRemotes(exec, projectPath: string) : Promise<string[]> {
  const process = R.compose(
    R.uniq,
    R.map(R.head),
    R.map(R.split(' ')),
    R.reject(R.isEmpty),
    R.map(R.last),
    R.map(R.split(/\t/)),
    R.split('\n')
  );

  return new Promise((resolve, reject) => {
    exec('git remote -v', { cwd: projectPath }, (error, stdout, stderr) => {
      if (stderr || error) return reject(stderr || error);

      resolve(process(stdout));
    });
  });
}

/**
 * Returns formatted list of remotes.
 *
 * @param {String[]} remotes
 *
 * @return {String[]}
 */
export function formatRemotes(remotes: string[]) : string[] {
  const process = R.compose(
    R.map(R.replace(/\/$/, '')),
    R.reject(R.isEmpty),
    R.map(rem => {
      if (rem.match(/^https?:/)) {
        return rem;
      } else if (rem.match(/@/)) {
        return 'https://' +
          rem
            .replace(/^.+@/, '')
            .replace(/\.git$/, '')
            .replace(/:/g, '/');
      } else if (rem.match(/^ftps?:/)) {
        return rem.replace(/^ftp/, 'http');
      } else if (rem.match(/^ssh:/)) {
        return rem.replace(/^ssh/, 'https');
      } else if (rem.match(/^git:/)) {
        return rem.replace(/^git/, 'https');
      }
    })
  );

  return process(remotes);
}

/**
 * Returns current branch.
 *
 * @todo: Should work on windows too...
 *
 * @param {Function} exec
 * @param {String} filePath
 *
 * @return {Promise<String>}
 */
export function getCurrentBranch(exec, projectPath: string) : Promise<string> {
  return new Promise((resolve, reject) => {
    exec('git branch --no-color', { cwd: projectPath }, (error, stdout, stderr) => {
      if (stderr || error) return reject(stderr || error);

      const process = R.compose(
        R.trim,
        R.replace('*', ''),
        R.find(line => line.startsWith('*')),
        R.split('\n')
      );

      resolve(process(stdout));
    });
  });
}

/**
 * Builds quick pick items list.
 *
 * @param {String} relativeFilePath
 * @param {Number} line
 * @param {String} masterBranch
 *
 * @return {String[]}
 */
export function prepareQuickPickItems(formatter:Function, relativeFilePath: string, line: number, masterBranch: string, [remotes, branch]: [string[], string]) : string[] {
  // https://github.com/elm-lang/navigation/blob/master/src/Navigation.elm

  if (masterBranch === branch) {
    return formatter(relativeFilePath, line, remotes, branch);
  }

  const currentBranchQuickPickList = formatter(relativeFilePath, line, remotes, branch);
  const masterBranchQuickPickList = formatter(relativeFilePath, line, remotes, masterBranch);

  return R.flatten(R.zip(currentBranchQuickPickList, masterBranchQuickPickList));
}


/**
 * Shows quick pick window.
 *
 * @param {String[]} qucikPickList
 */
export function showQuickPickWindow(quickPickList: string[]) {
  if (quickPickList.length === 1) {
    openQuickPickItem(quickPickList[0]);
    return;
  }

  window
    .showQuickPick(quickPickList)
    .then(selected => openQuickPickItem(selected));
}

/**
 * Opens given quick pick item in browser.
 *
 * @todo: Should work on windows too...
 *
 * @param {String} item
 */
export function openQuickPickItem(item: string) {
  opn(item.split(BRANCH_URL_SEP)[1]);
}
