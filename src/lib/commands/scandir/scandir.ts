
import path, { ParsedPath } from 'path';

import { DirNode, DirNodeFile } from './dir-node';
import { Timer } from '../../../util/timer';
import { stat } from 'fs/promises';

const INDENT_STR = ' ';

export async function executeScandir(rootDir: string) {
  let dirNode: DirNode, dirTree: DirNode;
  let timer: Timer, scanMs: number, fileSizeMs: number;
  let totalBytes: number, totalMb: number, totalGb: number;
  dirNode = await DirNode.create(rootDir);
  timer = Timer.start();
  dirTree = await getDirTree(dirNode);
  scanMs = timer.stop();

  timer = Timer.start();
  await populateFileStats(dirTree);
  fileSizeMs = timer.stop();
  totalBytes = 0;
  await traverseDirTree(dirTree, async (dirNode, parentDirs) => {
    const MIN_DEPTH = 0;
    let parsedPath: ParsedPath, depth: number, indentStr: string;
    let filesSize: number;
    parsedPath = path.parse(dirNode.dirPath);
    depth = parentDirs.length;
    if(depth < MIN_DEPTH) {
      return;
    }
    if(depth <= MIN_DEPTH) {
      indentStr = `${path.join(...parentDirs)}/`;
    } else {
      indentStr = `${INDENT_STR.repeat(depth)}`;
    }
    filesSize = 0;
    for(let i = 0; i < dirNode.files.length; ++i) {
      filesSize += dirNode.files[i]?.stats?.size ?? 0;
    }
    totalBytes += filesSize;
    console.log(`${indentStr}${parsedPath.name}`);
  });
  totalMb = totalBytes / (1024 ** 2);
  totalGb = totalBytes / (1024 ** 3);
  console.log(`scan took ${Math.round(scanMs)}ms`);
  console.log(`total size:\n ${(+totalMb.toFixed(3)).toLocaleString()}mb\n ${(+totalGb.toFixed(3)).toLocaleString()}gb`);
  console.log(`file size calc. took ${Math.round(fileSizeMs)}ms`);
}

async function populateFileStats(rootNode: DirNode) {
  let fileSizePromises: Promise<void>[];
  fileSizePromises = [];
  await traverseDirTree(rootNode, async (dirNode, parentDirs) => {
    if(dirNode.files.length === 0) {
      return;
    }
    for(let i = 0; i < dirNode.files.length; ++i) {
      let currDirNodeFile: DirNodeFile;
      currDirNodeFile = dirNode.files[i];
      if(currDirNodeFile.stats === undefined) {
        fileSizePromises.push(
          stat(currDirNodeFile.filePath)
            .catch(e => {
              if(e?.code === 'ENOENT') {
                console.error(e.message);
              } else {
                throw e;
              }
              return undefined;
            })
            .then(fileStats => {
              currDirNodeFile.stats = fileStats;
            })
        );
      }
    }
  });
  await Promise.all(fileSizePromises);
}

async function getDirTree(rootNode: DirNode) {
  let subDirNodePromises: Promise<DirNode>[], dirTreePromises: Promise<DirNode>[];
  let subDirNodes: DirNode[], childNodes: DirNode[];
  subDirNodePromises = [];
  while(rootNode.subDirs.length) {
    let subDirNodePromise: Promise<DirNode>;
    let subDir: string;
    subDir = rootNode.subDirs.pop();
    subDirNodePromise = DirNode.create(subDir);
    subDirNodePromises.push(subDirNodePromise);
  }
  subDirNodes = await Promise.all(subDirNodePromises);
  dirTreePromises = [];
  while(subDirNodes.length) {
    let childNode: DirNode, dirTreePromise: Promise<DirNode>;
    childNode = subDirNodes.pop();
    dirTreePromise = getDirTree(childNode);
    dirTreePromises.push(dirTreePromise);
  }
  childNodes = await Promise.all(dirTreePromises);
  while(childNodes.length) {
    rootNode.children.push(childNodes.pop());
  }
  return rootNode;
}

async function traverseDirTree(
  rootNode: DirNode,
  visitFn: (dirNode: DirNode, parentDirs: string[]) => Promise<void>,
  soFar?: string[],
) {
  let parsedPath: ParsedPath;
  if(soFar === undefined) {
    soFar = [];
  }
  parsedPath = path.parse(rootNode.dirPath);
  await visitFn(rootNode, soFar);
  for(let i = 0; i < rootNode.children.length; ++i) {
    let currChild: DirNode;
    currChild = rootNode.children[i];
    await traverseDirTree(currChild, visitFn, [
      ...soFar,
      parsedPath.name,
    ]);
  }
}
