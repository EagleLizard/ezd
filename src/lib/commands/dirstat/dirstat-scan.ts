
import { Stats } from 'fs';
import path from 'path';

import { WorkerPool } from 'workerpool';
import _chunk from 'lodash.chunk';

import { getIntuitiveByteString, getIntuitiveTimeString } from '../../../util/print-util';
import { sleep } from '../../../util/sleep';
import { Timer } from '../../../util/timer';
import { getPool } from '../../../util/worker-pool';
import { PathNode, PathNodeFile, PathTree } from './path-tree';
import {
  walkDir,
  WalkDirResult,
} from './walk-dir';

// const FILE_TUPLE_CHUNK_SIZE = 100;
const FILE_TUPLE_CHUNK_SIZE = 1e3;
// const FILE_TUPLE_CHUNK_SIZE = 2.5e3;
// const FILE_TUPLE_CHUNK_SIZE = 5e3;
// const FILE_TUPLE_CHUNK_SIZE = 1e4;
// const FILE_TUPLE_CHUNK_SIZE = 1e5;

console.log(`FILE_TUPLE_CHUNK_SIZE: ${FILE_TUPLE_CHUNK_SIZE.toLocaleString()}`);

export interface DirstatScanResult {
  pathTree: PathTree;
  dirs: string[];
}

export async function dirstatScan(rootDir: string): Promise<DirstatScanResult> {
  let totalTimer: Timer, totalDeltaMs: number;
  let walkTimer: Timer, walkDeltaMs: number;
  let fileSizeTimer: Timer, fileSizeDeltaMs: number;
  let printTimer: Timer, doPrintWalk: boolean;
  let dirCount: number, fileCount: number, totalBytes: number;
  let pathTreeResult: PathTreeResult, pathTree: PathTree;
  let dirstatScanResult: DirstatScanResult;

  doPrintWalk = true;

  printTimer = Timer.start();
  (function printWalkProgress() {
    if(doPrintWalk) {
      if(printTimer.currentMs() > 200) {
        process.stdout.write('.');
        printTimer.reset();
      }
      setTimeout(printWalkProgress, 0);
    }
  })();

  totalTimer = Timer.start();

  walkTimer = Timer.start();
  pathTreeResult = await getPathTree(rootDir);
  walkDeltaMs = walkTimer.stop();

  doPrintWalk = false;
  process.stdout.write('\n');

  pathTree = pathTreeResult.pathTree;
  dirCount = pathTreeResult.dirCount;
  fileCount = pathTreeResult.fileCount;
  console.log(`walk took: ${getIntuitiveTimeString(walkDeltaMs)}`);

  console.log(`\ndirCount: ${dirCount.toLocaleString()}`);
  console.log(`fileCount: ${fileCount.toLocaleString()}`);

  fileSizeTimer = Timer.start();
  totalBytes = await addFileSizeData(pathTree, fileCount, () => {
    process.stdout.write('.');
  });
  process.stdout.write('\n');
  fileSizeDeltaMs = fileSizeTimer.stop();

  totalDeltaMs = totalTimer.stop();

  console.log(`File size calc. took ${getIntuitiveTimeString(fileSizeDeltaMs)}`);
  console.log(getIntuitiveByteString(totalBytes));
  console.log(`dirstat took ${getIntuitiveTimeString(totalDeltaMs)}`);

  dirstatScanResult = {
    pathTree,
    dirs: pathTreeResult.walkDirResult.dirs,
  };
  return dirstatScanResult;
}

async function addFileSizeData(pathTree: PathTree, fileCount: number, progressCb: (doneCount: number) => void): Promise<number> {
  let totalBytes: number, fileSizeModBy: number;

  fileSizeModBy = Math.ceil(fileCount / 71);
  await getFileSizes(pathTree, doneCount => {
    if((doneCount % fileSizeModBy) === 0) {
      progressCb(doneCount);
    }
  });

  totalBytes = 0;
  pathTree.walk(walkParams => {
    let pathNode: PathNode;
    pathNode = walkParams.pathNode;
    for(let i = 0; i < pathNode.files.length; ++i) {
      totalBytes += pathNode.files[i].size;
    }
  });

  return totalBytes;
}

interface PathTreeResult {
  walkDirResult: WalkDirResult;
  pathTree: PathTree;
  fileCount: number;
  dirCount: number;
}

async function getPathTree(rootDir: string): Promise<PathTreeResult> {
  let pathTree: PathTree, walkDirResult: WalkDirResult;
  let fileCount: number, dirCount: number;
  let pathTreeResult: PathTreeResult;
  console.log(rootDir);
  pathTree = new PathTree(rootDir);
  fileCount = 0;

  walkDirResult = await walkDir(rootDir, (filePath) => {
    let pathNode: PathNode, pathParts: string[];
    let fileName: string;
    pathParts = filePath.split(path.sep);
    fileName = pathParts[pathParts.length - 1];
    pathNode = pathTree.getChild(pathParts.slice(0, -1));

    pathNode.files.push({
      name: fileName
    });
    fileCount++;
  });
  dirCount = walkDirResult.dirs.length;
  pathTreeResult = {
    walkDirResult,
    pathTree,
    fileCount,
    dirCount,
  };
  return pathTreeResult;
}

async function getFileSizes(pathTree: PathTree, progressCb: (doneCount: number) => void) {
  let pool: WorkerPool;
  let runningJobs: number, doneFiles: number;
  let pathNodeFileTuples: [ PathNodeFile, string[] ][],
    chunkedPathNodeFileTuples: [ PathNodeFile, string[] ][][];
  pool = getPool();
  runningJobs = 0;
  doneFiles = 0;
  pathNodeFileTuples = [];
  pathTree.walk(walkParams => {
    let pathNode: PathNode, pathSoFar: string[];
    pathNode = walkParams.pathNode;
    pathSoFar = walkParams.pathSoFar;
    for(let i = 0; i < pathNode.files.length; ++i) {
      pathNodeFileTuples.push([
        pathNode.files[i],
        pathSoFar,
      ]);
    }
  });
  chunkedPathNodeFileTuples = _chunk(pathNodeFileTuples, FILE_TUPLE_CHUNK_SIZE);
  for(let i = 0; i < chunkedPathNodeFileTuples.length; ++i) {
    let currChunk: [ PathNodeFile, string[] ][];
    let pathNodeFiles: PathNodeFile[], filePaths: string[], filesStats: Stats[];
    currChunk = chunkedPathNodeFileTuples[i];
    pathNodeFiles = currChunk.map(fileTuple => fileTuple[0]);
    filePaths = currChunk.map(fileTuple => fileTuple[1].concat(fileTuple[0].name).join(path.sep));
    runningJobs++;
    (async () => {
      filesStats = await pool.exec('getFileSizes', [ filePaths ]);
      for(let k = 0; k < pathNodeFiles.length; ++k) {
        pathNodeFiles[k].size = filesStats[k]?.size ?? 0;
        doneFiles++;
        progressCb(doneFiles);
      }
      runningJobs--;
    })();
  }
  while(runningJobs > 0) {
    await sleep(100);
  }
}
