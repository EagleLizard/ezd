
import { getIntuitiveByteString, getIntuitiveTimeString } from '../../../util/print-util';
import { Timer } from '../../../util/timer';
import { PathTree } from './path-tree';
import { DirScanner } from './dir-scanner';

export interface DirstatScanResult {
  pathTree: PathTree;
  dirs: string[];
}

export async function dirstatScan(rootDir: string): Promise<DirstatScanResult> {
  let totalTimer: Timer, totalDeltaMs: number;
  let walkTimer: Timer, walkDeltaMs: number;
  let fileSizeTimer: Timer, fileSizeDeltaMs: number;
  let printTimer: Timer;
  let dirCount: number, fileCount: number, totalBytes: number;
  let pathTree: PathTree;
  let dirstatScanResult: DirstatScanResult;

  let fileSizeModBy: number;
  let dirScanner: DirScanner;

  dirScanner = DirScanner.init(rootDir);

  (function printWalkProgress() {
    setTimeout(() => {
      if(dirScanner.isScanning) {
        if(printTimer.currentMs() > 200) {
          process.stdout.write('.');
          printTimer.reset();
        }
        printWalkProgress();
      }
    }, 0);
  })();

  printTimer = Timer.start();
  totalTimer = Timer.start();
  walkTimer = Timer.start();

  await dirScanner.scanDir();

  walkDeltaMs = walkTimer.stop();
  process.stdout.write('\n');

  pathTree = dirScanner.pathTree;
  dirCount = dirScanner.dirCount;
  fileCount = dirScanner.fileCount;

  console.log(`walk took: ${getIntuitiveTimeString(walkDeltaMs)}`);
  console.log(`\ndirCount: ${dirCount.toLocaleString()}`);
  console.log(`fileCount: ${fileCount.toLocaleString()}`);

  fileSizeModBy = Math.ceil(dirScanner.fileCount / 71);

  fileSizeTimer = Timer.start();

  await dirScanner.addFileSizes((doneCount) => {
    if((doneCount % fileSizeModBy) === 0) {
      process.stdout.write('.');
    }
  });
  totalBytes = dirScanner.totalBytes;

  process.stdout.write('\n');
  fileSizeDeltaMs = fileSizeTimer.stop();

  totalDeltaMs = totalTimer.stop();

  console.log(`File size calc. took ${getIntuitiveTimeString(fileSizeDeltaMs)}`);
  console.log(getIntuitiveByteString(totalBytes, 6));
  console.log(`dirstat took ${getIntuitiveTimeString(totalDeltaMs)}`);

  dirstatScanResult = {
    pathTree,
    dirs: dirScanner.walkDirResult.dirs,
  };
  return dirstatScanResult;
}
