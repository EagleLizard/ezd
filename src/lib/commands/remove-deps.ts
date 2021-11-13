
import { Dirent, RmOptions } from 'fs';
import path from 'path';
import { rm, rmdir } from 'fs/promises';

import { checkDir, getDirents, getPathRelativeToCwd } from '../../util/files';
import { ParsedArg } from '../parse-args/parse-args';
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

export async function executeRemoveDeps(parsedArg: ParsedArg) {
  let dirPath: string, dependencyOperations: RmdOp[];
  let rmdOpResultPromises: Promise<unknown>[];
  dirPath = await getRemoveDepsDirectory(parsedArg);
  dependencyOperations = await getDependencyOperations(dirPath);
  rmdOpResultPromises = dependencyOperations.map(dependencyOperation => {
    console.log(`Deleting ${dependencyOperation.ftype} ${dependencyOperation.rmPath} ...`);
    return dependencyOperation.execute().then(res => {
      console.log(`Deleted ${dependencyOperation.ftype} ${dependencyOperation.rmPath}`);
      return res;
    });
  });
  await Promise.all(rmdOpResultPromises);
}

async function getRemoveDepsDirectory(parsedArg: ParsedArg): Promise<string> {
  let filePath: string, dirPath: string, isDir: boolean;
  filePath = parsedArg.argParams[0] ?? './';
  dirPath = getPathRelativeToCwd(filePath);
  isDir = await checkDir(dirPath);
  if(!isDir) {
    throw new Error(`Error executing '${parsedArg.flag}', the supplied path is not a directory:\n${dirPath}`);
  }
  return dirPath;
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
