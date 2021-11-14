
import { Dirent, RmOptions } from 'fs';
import path from 'path';
import { rm } from 'fs/promises';

import { getDirents } from '../../util/files';
import { DirentError } from '../models/dirent-error';

type RmdOpFn = () => Promise<unknown>;

type FType = 'file' | 'directory';

interface RmdOp {
  rmPath: string;
  ftype: FType;
  execute: RmdOpFn;
}

const RMD_DIRS = [
  'node_modules',
];
const RMD_FILES = [
  'package-lock.json',
];

export async function executeRemoveDeps(executionPath: string) {
  let dependencyOperations: RmdOp[];
  let rmdOpResultPromises: Promise<unknown>[];
  dependencyOperations = await getDependencyOperations(executionPath);
  rmdOpResultPromises = dependencyOperations.map(dependencyOperation => {
    console.log(`Deleting ${dependencyOperation.ftype} ${dependencyOperation.rmPath} ...`);
    return dependencyOperation.execute().then(res => {
      console.log(`Deleted ${dependencyOperation.ftype} ${dependencyOperation.rmPath}`);
      return res;
    });
  });
  await Promise.all(rmdOpResultPromises);
}

async function getDependencyOperations(dirPath: string): Promise<RmdOp[]> {
  let dirents: Dirent[], rmdOps: RmdOp[];
  dirents = await getDirents(dirPath);
  rmdOps = dirents.reduce((acc, dirent) => {
    let rmPath: string, execute: RmdOpFn, ftype: FType;
    if(isRmdDir(dirent) || isRmdFile(dirent)) {
      rmPath = path.join(dirPath, dirent.name);
      try {
        ftype = getFType(dirent);
        execute = getRmdOpFn(rmPath, ftype);
      } catch(e) {
        if(e instanceof DirentError) {
          e.absolutePath = rmPath;
          e.dirent = dirent;
        }
        throw e;
      }
      acc.push({
        rmPath,
        ftype,
        execute,
      });
    }
    return acc;
  }, []);

  return rmdOps;
}

function isRmdDir(dirent: Dirent): boolean {
  let isDir: boolean, isRmdDir: boolean;
  isDir = dirent.isDirectory();
  isRmdDir = RMD_DIRS.some(rmdDir => rmdDir === dirent.name);
  return isDir && isRmdDir;
}
function isRmdFile(dirent: Dirent): boolean {
  let isFile: boolean, isRmdFile: boolean;
  isFile = dirent.isFile();
  isRmdFile = RMD_FILES.some(rmdFile => rmdFile === dirent.name);
  return isFile && isRmdFile;
}
function getFType(dirent: Dirent): FType {
  if(dirent.isDirectory()) {
    return 'directory';
  }
  if(dirent.isFile()) {
    return 'file';
  }
  throw new DirentError('invalid ftype');
}
function getRmdOpFn(rmPath: string, ftype: FType): RmdOpFn {
  let rmdOpFn: RmdOpFn, rmOpts: RmOptions;
  rmOpts = {};
  switch(ftype) {
    case 'directory':
      rmOpts.recursive = true;
      rmOpts.force = true;
      break;
    case 'file':
      break;
    default:
      throw new DirentError('Invalid ftype when constructing RmdOptFn');
  }
  rmdOpFn = () => rm(rmPath, rmOpts);
  return rmdOpFn;
}
