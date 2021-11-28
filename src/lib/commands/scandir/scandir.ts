
import path, { ParsedPath } from 'path';

import { DirNode } from './dir-node';
import { DirTree } from './dir-tree';
import { Timer } from '../../../util/timer';

const INDENT_STR = ' ';

export async function executeScandir(rootDir: string) {
  let dirNode: DirNode, dirTree: DirTree;
  let timer: Timer, scanMs: number, fileSizeMs: number, traverseMs: number;
  let totalBytes: number, totalMb: number, totalGb: number;
  let dirCount: number, fileCount: number;

  timer = Timer.start();
  // dirTree = await _getDirTree(dirNode);
  dirTree = await DirTree.create(rootDir);
  scanMs = timer.stop();
  console.log('!'.repeat(20));

  timer = Timer.start();
  await dirTree.addFileStats();
  fileSizeMs = timer.stop();
  totalBytes = dirTree.getSize();

  // ({
  //   totalBytes
  // } = await printTree(dirTree));

  dirCount = 0;
  fileCount = 0;
  timer = Timer.start();
  dirCount = dirTree.getDirCount();
  fileCount = dirTree.getFileCount();
  traverseMs = timer.stop();

  totalMb = totalBytes / (1024 ** 2);
  totalGb = totalBytes / (1024 ** 3);
  console.log(`total size:\n ${(+totalMb.toFixed(3)).toLocaleString()}mb\n ${(+totalGb.toFixed(3)).toLocaleString()}gb`);
  console.log(`dirs: ${dirCount.toLocaleString()}`);
  console.log(`files: ${fileCount.toLocaleString()}`);
  console.log(`scan took ${Math.round(scanMs).toLocaleString()}ms`);
  console.log(`traverse took ${Math.round(traverseMs).toLocaleString()}ms`);
  console.log(`file size calc. took ${Math.round(fileSizeMs).toLocaleString()}ms`);
}
