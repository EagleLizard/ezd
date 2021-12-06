
import { DirNode, DirNodeFile } from './dir-node';
import { DirTree, TreeInfo } from './dir-tree';
import { Timer } from '../../../util/timer';
import { dirstatRenderEjs } from './dirstat-render/dirstat-render-ejs';
import { dirstatRender } from './dirstat-render/dirstat-render';

const INDENT_STR = ' ';

export async function executeScandir(rootDir: string) {
  let dirNode: DirNode, dirTree: DirTree;
  let timer: Timer, totalMsTimer: Timer,
    scanMs: number, fileSizeMs: number, traverseMs: number, totalMs: number;
  let totalBytes: number, totalMb: number, totalGb: number;
  let dirCount: number, fileCount: number;
  let showScanIndicator: boolean;
  let treeInfo: TreeInfo, dirNodeTuples: [ DirNode, DirNodeFile[] ][];

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

  timer = Timer.start();
  treeInfo = dirTree.getTreeInfo();
  traverseMs = timer.stop();
  dirCount = treeInfo.dirCount;
  fileCount = treeInfo.fileCount;
  console.log(`traverse took ${Math.round(traverseMs).toLocaleString()}ms`);
  console.log(`dirs: ${dirCount.toLocaleString()}`);
  console.log(`files: ${fileCount.toLocaleString()}`);

  timer = Timer.start();
  const modBy = Math.floor(dirCount / 61);
  await dirTree.addFileStats((doneCount) => {
    if((doneCount % modBy) === 0) {
      process.stdout.write('.');
    }
  }, dirNodeTuples);
  process.stdout.write('\n');
  fileSizeMs = timer.stop();

  totalBytes = dirTree.getSize();

  totalMb = totalBytes / (1024 ** 2);
  totalGb = totalBytes / (1024 ** 3);

  await renderDirTree(dirTree, treeInfo);

  totalMs = totalMsTimer.stop();
  console.log(`total size:\n ${(+totalMb.toFixed(3)).toLocaleString()}mb\n ${(+totalGb.toFixed(3)).toLocaleString()}gb`);

  console.log(`file size calc. took ${Math.round(fileSizeMs).toLocaleString()}ms`);
  console.log(`[total] dirscan took ${Math.round(totalMs).toLocaleString()}ms`);
}

async function renderDirTree(dirTree: DirTree, treeInfo: TreeInfo) {
  await dirstatRenderEjs(dirTree);
  // await dirstatRender(dirTree);
}

async function getDirTree(rootDir: string): Promise<DirTree> {
  let dirTree: DirTree;
  let showScanIndicator: boolean;
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
  return dirTree;
}

async function addFileStats(dirTree: DirTree, treeInfo: TreeInfo) {
  const modBy = Math.floor(treeInfo.dirCount / 78);
  await dirTree.addFileStats((doneCount) => {
    if((doneCount % modBy) === 0) {
      process.stdout.write('.');
    }
  }, treeInfo.dirNodeTuples);
  process.stdout.write('\n');
}
