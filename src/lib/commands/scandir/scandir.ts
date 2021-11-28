
import path, { ParsedPath } from 'path';

import { DirNode } from './dir-node';
import { DirTree } from './dir-tree';
import { Timer } from '../../../util/timer';

const INDENT_STR = ' ';

export async function executeScandir(rootDir: string) {
  let dirNode: DirNode, dirTree: DirTree;
  let timer: Timer, totalMsTimer: Timer,
    scanMs: number, fileSizeMs: number, traverseMs: number, totalMs: number;
  let totalBytes: number, totalMb: number, totalGb: number;
  let dirCount: number, fileCount: number;
  let showScanIndicator: boolean;

  totalMsTimer = Timer.start();

  timer = Timer.start();
  showScanIndicator = true;
  process.stdout.write('Scanning directory...');
  (function writeDotIndictor() {
    setTimeout(() => {
      if(showScanIndicator) {
        process.stdout.write('.');
        writeDotIndictor();
      }
    }, 100);
  })();
  dirTree = await DirTree.create(rootDir);
  showScanIndicator = false;
  process.stdout.write('\n');
  scanMs = timer.stop();
  console.log('!'.repeat(20));
  console.log(`scan took ${Math.round(scanMs).toLocaleString()}ms`);

  dirCount = 0;
  fileCount = 0;
  timer = Timer.start();
  dirCount = dirTree.getDirCount();
  fileCount = dirTree.getFileCount();
  traverseMs = timer.stop();
  console.log(`traverse took ${Math.round(traverseMs).toLocaleString()}ms`);
  console.log(`dirs: ${dirCount.toLocaleString()}`);
  console.log(`files: ${fileCount.toLocaleString()}`);

  const modBy = Math.floor(fileCount / 70);
  timer = Timer.start();
  await dirTree.addFileStats((doneCount) => {
    if((doneCount % modBy) === 0) {
      process.stdout.write('.');
    }
  });
  process.stdout.write('\n');
  fileSizeMs = timer.stop();
  totalBytes = dirTree.getSize();

  // ({
  //   totalBytes
  // } = await printTree(dirTree));

  totalMb = totalBytes / (1024 ** 2);
  totalGb = totalBytes / (1024 ** 3);

  totalMs = totalMsTimer.stop();
  console.log(`total size:\n ${(+totalMb.toFixed(3)).toLocaleString()}mb\n ${(+totalGb.toFixed(3)).toLocaleString()}gb`);

  console.log(`file size calc. took ${Math.round(fileSizeMs).toLocaleString()}ms`);
  console.log(`[total] dirscan took ${Math.round(totalMs).toLocaleString()}ms`);
}
