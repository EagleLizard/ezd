
import { Dirent } from 'fs';
import path from 'path';

import { getDirents } from '../../../util/files';

interface WalkDirCbParams {
  basePath: string;
  dirents: Dirent[];
  files: Dirent[];
  pathSoFar: string[];
}

type WalkDirCb = (params: WalkDirCbParams) => void;

export async function walkDir(dir: string, cb: WalkDirCb) {

  await _walkDir(dir, [ ]);

  async function _walkDir(currDir: string, pathSoFar: string[]) {
    let dirents: Dirent[], fileDirents: Dirent[], dirDirents: Dirent[];
    let walkDirPromises: Promise<void>[];
    walkDirPromises = [];
    try {
      dirents = await getDirents(currDir);
    } catch(e) {
      if(e?.code !== 'EPERM') {
        throw e;
      }
      dirents = [];
    }

    fileDirents = [];
    dirDirents = [];
    for(let i = 0; i < dirents.length; ++i) {
      let currDirent: Dirent;
      currDirent = dirents[i];
      if(currDirent.isDirectory()) {
        dirDirents.push(currDirent);
      } else {
        fileDirents.push(currDirent);
      }
    }
    cb({
      basePath: currDir,
      dirents,
      files: fileDirents,
      pathSoFar,
    });
    for(let i = 0; i < dirDirents.length; ++i) {
      let currDirent: Dirent, currPath: string, walkDirPromise: Promise<void>;
      currDirent = dirDirents[i];
      currPath = `${currDir}${path.sep}${currDirent.name}`;
      walkDirPromise = _walkDir(currPath, [ ...pathSoFar, currDirent.name ]);
      walkDirPromises.push(walkDirPromise);
    }
    await Promise.all(walkDirPromises);
  }
}
