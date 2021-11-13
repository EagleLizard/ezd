
import path from 'path';
import {
  readdir,
  stat,
} from 'fs/promises';
import { Dirent, Stats } from 'fs';
import { ParsedArg } from '../lib/parse-args/parse-args';

export function getPathRelativeToCwd(filePath: string) {
  let cwd: string;
  let absolutePath: string;
  cwd = process.cwd();
  absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(cwd, filePath)
  ;
  return absolutePath;
}

export async function checkDir(dirPath: string): Promise<boolean> {
  let stats: Stats;
  try {
    stats = await stat(dirPath);
  } catch(e) {
    if(e?.code === 'ENOENT') {
      return false;
    } else {
      throw e;
    }
  }
  return stats.isDirectory();
}

export async function checkFile(filePath: string): Promise<boolean> {
  let stats: Stats;
  try {
    stats = await stat(filePath);
  } catch(e) {
    if(e?.code === 'ENOENT') {
      return false;
    } else {
      throw e;
    }
  }
  return stats.isFile();
}

export async function getDirents(dirPath: string): Promise<Dirent[]> {
  let dirents: Dirent[];
  dirents = await readdir(dirPath, {
    withFileTypes: true,
  });
  return dirents;
}

export function getExecutionPath(parsedArg: ParsedArg): string {
  let filePath: string, dirPath: string;
  filePath = parsedArg.argParams[0] ?? './';
  dirPath = getPathRelativeToCwd(filePath);
  return dirPath;
}

