import { Dirent, Stats } from 'fs';
import path from 'path';
import { getDirents } from '../../../util/files';

export interface DirNodeFile {
  filePath: string;
  stats?: Stats;
}

export class DirNode {
  public dirPath: string;
  public children: DirNode[];
  public subDirs: string[];
  public files: DirNodeFile[];
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
