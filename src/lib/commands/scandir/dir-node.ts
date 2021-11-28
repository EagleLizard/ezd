import { Dirent, Stats } from 'fs';
import { stat } from 'fs/promises';
import path, { ParsedPath } from 'path';
import { getDirents } from '../../../util/files';

const STAT_SKIP_ERR_CODES = [
  'ENOENT',
];

export interface DirNodeFile {
  filePath: string;
  stats?: Stats;
}

export class DirNode {
  public dirPath: string;
  public children: DirNode[];
  public subDirs: string[];
  public files: DirNodeFile[];

  private _parsedPath: ParsedPath;
  private constructor(dirPath: string, childFiles: Dirent[]) {
    this.dirPath = dirPath;
    this.subDirs = [];
    this.files = [];
    this.children = [];
    for(let i = 0; i < childFiles.length; ++i) {
      let child: Dirent, subPath: string;
      child = childFiles[i];
      subPath = path.join(dirPath, child.name);
      if(child.isDirectory()) {
        this.subDirs.push(subPath);
      } else {
        this.files.push({
          filePath: subPath,
        });
      }
    }
  }

  async addFileStats() {
    let addStatPromises: Promise<void>[];
    addStatPromises = [];
    for(let i = 0; i < this.files.length; ++i) {
      let currFile: DirNodeFile;
      currFile = this.files[i];
      if(currFile.stats === undefined) {
        let addStatPromise: Promise<void>;
        addStatPromise = (async () => {
          try {
            currFile.stats = await stat(currFile.filePath);
          } catch(e) {
            if(!STAT_SKIP_ERR_CODES.includes(e.code)) {
              throw e;
            }
          }
        })();
        addStatPromises.push(addStatPromise);
      }
    }
    await Promise.all(addStatPromises);
  }

  get parsedPath(): ParsedPath {
    if(this._parsedPath !== undefined) {
      return this._parsedPath;
    }
    this._parsedPath = path.parse(this.dirPath);
    return this._parsedPath;
  }

  static async create(dirPath: string) {
    let dirents: Dirent[];
    try {
      dirents = await getDirents(dirPath);
    } catch(e) {
      if(e?.code === 'EPERM') {
        console.error(`EPERM - Cannot access directory: ${e?.path}`);
        dirents = [];
      } else {
        throw e;
      }
    }
    return new DirNode(dirPath, dirents);
  }
}