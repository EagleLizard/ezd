
import { Dirent, readdir } from 'fs';
import path from 'path';
import { getDirents } from '../../../util/files';

export interface WalkDirResult {
  paths: string[];
  dirs: string[];
}

export function walkDir2(dir: string, fileCb: (path: string) => void): Promise<WalkDirResult> {
  return new Promise((resolve, reject) => {
    let paths: string[], dirs: string[];
    let cursor: number, readCount: number;
    paths = [];
    dirs = [ dir ];
    cursor = 0;
    readCount = 0;

    walk();

    function walk() {
      let total: number;
      total = dirs.length;
      for(; cursor < total; ++cursor) {
        let currDir: string;
        currDir = dirs[cursor];
        readdir(currDir, {
          withFileTypes: true,
        }, (_, dirents) => {
          dirents = dirents ?? [];
          for(let i = 0; i < dirents.length; ++i) {
            let currDirent: Dirent, fullPath: string;
            currDirent = dirents[i];
            fullPath = `${currDir}${path.sep}${currDirent.name}`;
            if(currDirent.isDirectory()) {
              dirs.push(fullPath);
            } else {
              // paths.push(fullPath);
              fileCb(fullPath);
            }
          }

          if(++readCount === total) {
            if(dirs.length === cursor) {
              resolve({
                dirs,
                paths,
              });
            } else {
              walk();
            }
          }
        });
      }
    }
  });
}
