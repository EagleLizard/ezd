
import { Dirent, Stats } from 'fs';
import path from 'path';

import { WorkerPool } from 'workerpool';
import _chunk from 'lodash.chunk';

import { getIntuitiveByteString, getIntuitiveTimeString } from '../../../util/print-util';
import { sleep } from '../../../util/sleep';
import { Timer } from '../../../util/timer';
import { getPool } from '../../../util/worker-pool';
import { EzdArgs } from '../../parse-args/ezd-args';
import { generateDirstatTest } from '../scandir/generate-dirstat-test/generate-dirstat-test';
import { PathNode, PathNodeFile, PathTree } from './path-tree';
import { walkDir } from './walk-dir';
import {
  walkDir2,
  WalkDirResult,
} from './_walk-dir';

// const FILE_TUPLE_CHUNK_SIZE = 100;
// const FILE_TUPLE_CHUNK_SIZE = 1e3;
const FILE_TUPLE_CHUNK_SIZE = 2.5e3;
// const FILE_TUPLE_CHUNK_SIZE = 5e3;
// const FILE_TUPLE_CHUNK_SIZE = 1e4;
// const FILE_TUPLE_CHUNK_SIZE = 1e5;

console.log(`FILE_TUPLE_CHUNK_SIZE: ${FILE_TUPLE_CHUNK_SIZE.toLocaleString()}`);

export type ProgressCb = (doneCount: number, totalJobCount?: number) => void;

export async function executeDirstat(ezdArgs: EzdArgs) {
  let rootDir: string, doGenerate: boolean;
  rootDir = ezdArgs.DIRSTAT.argParams;
  doGenerate = ezdArgs.GENERATE_TEST_FILES !== undefined;
  if(doGenerate) {
    await generateDirstatTest(rootDir);
    return;
  }
  // await walkDirBench(rootDir);
  // await walkDir2Bench(rootDir);

  // await dirstatScan(rootDir);
  await dirstat2Scan(rootDir);
}

async function dirstat2Scan(rootDir: string) {
  let totalTimer: Timer, totalDeltaMs: number;
  let walkTimer: Timer, walkDeltaMs: number;
  let pathTreeTimer: Timer, pathTreeDeltaMs: number;
  let printTimer: Timer, doPrintWalk: boolean;
  let dirCount: number, fileCount: number;
  let walkDirResult: WalkDirResult, filePaths: string[];
  let totalBytes: number;
  let pathTree: PathTree;

  pathTree = new PathTree(rootDir);
  fileCount = 0;
  doPrintWalk = true;

  printTimer = Timer.start();
  (function printWalkProgress() {
    if(!doPrintWalk) {
      return;
    }
    if(printTimer.currentMs() > 200) {
      process.stdout.write('.');
      printTimer = Timer.start();
    }
    setTimeout(printWalkProgress);
  })();

  totalTimer = Timer.start();
  walkTimer = Timer.start();
  walkDirResult = await walkDir2(rootDir, (filePath) => {
    let pathNode: PathNode, pathParts: string[];
    let fileName: string;
    pathParts = filePath.split(path.sep);
    fileName = pathParts[pathParts.length - 1];
    // fileName = pathParts.pop();
    pathNode = pathTree.getChild(pathParts.slice(0, -1));
    pathNode.files.push({
      name: fileName
    });
    fileCount++;
  });
  walkDeltaMs = walkTimer.stop();

  doPrintWalk = false;
  dirCount = walkDirResult.dirs.length;
  process.stdout.write('\n');
  console.log(`walk took: ${getIntuitiveTimeString(walkDeltaMs)}`);

  // dirCount = walkDirResult.dirs.length;
  // for(let i = 0; i < walkDirResult.dirs.length; ++i) {
  //   let currDir: string, pathNode: PathNode;
  //   currDir = walkDirResult.dirs[i];
  //   pathNode = pathTree.getChild(currDir.split(path.sep));
  //   console.log('pathTree');
  //   console.log(pathTree);
  //   console.log('pathNode');
  //   console.log(pathNode);
  // }
  pathTreeTimer = Timer.start();
  // filePaths.forEach(currPath => {
  //   let pathNode: PathNode, pathParts: string[];
  //   let fileName: string;
  //   pathParts = currPath.split(path.sep);
  //   fileName = pathParts[pathParts.length - 1];
  //   // fileName = pathParts.pop();
  //   pathNode = pathTree.getChild(pathParts.slice(0, -1));
  //   pathNode.files.push({
  //     name: fileName
  //   });
  // });
  pathTreeDeltaMs = pathTreeTimer.stop();
  console.log(`pathTree took ${getIntuitiveTimeString(pathTreeDeltaMs)}`);
  console.log(`\ndirCount: ${dirCount.toLocaleString()}`);
  console.log(`fileCount: ${fileCount.toLocaleString()}`);

  const fileSizeModBy = Math.ceil(fileCount / 71);
  await getFileSizes2(pathTree, doneCount => {
    if((doneCount % fileSizeModBy) === 0) {
      process.stdout.write('.');
    }
  });
  totalDeltaMs = totalTimer.stop();
  process.stdout.write('\n');
  totalBytes = 0;
  pathTree.walk2(walkParams => {
    let pathNode: PathNode;
    pathNode = walkParams.pathNode;
    for(let i = 0; i < pathNode.files.length; ++i) {
      totalBytes += pathNode.files[i].size;
    }
  });
  console.log(getIntuitiveByteString(totalBytes));
  console.log(`dirstat took ${getIntuitiveTimeString(totalDeltaMs)}`);

  // pathTree.walk(walkParams => {
  //   let pathNode: PathNode;
  //   pathNode = walkParams.pathNode;
  //   console.log('pathNode.basePath');
  //   console.log(pathNode.basePath);
  //   console.log(pathNode.files);
  // });
}

async function dirstatScan(rootDir: string) {
  let totalTimer: Timer, totalDeltaMs: number;
  let walkTimer: Timer, walkDeltaMs: number;
  let printTimer: Timer;
  let dirCount: number, fileCount: number;
  let totalBytes: number;
  let pathTree: PathTree;
  pathTree = new PathTree(rootDir);
  dirCount = 0;
  fileCount = 0;

  printTimer = Timer.start();
  totalTimer = Timer.start();
  walkTimer = Timer.start();
  await walkDir(rootDir, (walkDirParams) => {
    let pathNode: PathNode;

    dirCount++;
    fileCount += walkDirParams.files.length;
    pathNode = pathTree.getChild(walkDirParams.pathSoFar);
    pathNode.files = Array(walkDirParams.files.length).fill(0).map(() => undefined);
    for(let i = 0; i < walkDirParams.files.length; ++i) {
      let currFileDirent: Dirent;
      currFileDirent = walkDirParams.files[i];
      pathNode.files[i] = {
        name: currFileDirent.name,
      };
    }

    if(printTimer.currentMs() > 200) {
      process.stdout.write('.');
      printTimer = Timer.start();
    }
  });
  walkDeltaMs = walkTimer.stop();
  process.stdout.write('\n');
  console.log(`walk took: ${getIntuitiveTimeString(walkDeltaMs)}`);
  console.log(`dirCount: ${dirCount.toLocaleString()}`);
  console.log(`fileCount: ${fileCount.toLocaleString()}`);

  const fileSizeModBy = Math.ceil(fileCount / 71);
  await getFileSizes(pathTree, doneCount => {
    if((doneCount % fileSizeModBy) === 0) {
      process.stdout.write('.');
    }
  });
  totalDeltaMs = totalTimer.stop();
  process.stdout.write('\n');
  totalBytes = 0;
  pathTree.walk(walkParams => {
    let pathNode: PathNode;
    pathNode = walkParams.pathNode;
    for(let i = 0; i < pathNode.files.length; ++i) {
      totalBytes += pathNode.files[i].size;
    }
  });
  console.log(getIntuitiveByteString(totalBytes));
  console.log(`dirstat took ${getIntuitiveTimeString(totalDeltaMs)}`);
}

async function getFileSizes2(pathTree: PathTree, progressCb: ProgressCb) {
  let pool: WorkerPool;
  let runningJobs: number, doneFiles: number;
  let pathNodeFileTuples: [ PathNodeFile, string[] ][],
    chunkedPathNodeFileTuples: [ PathNodeFile, string[] ][][];
  pool = getPool();
  runningJobs = 0;
  doneFiles = 0;
  pathNodeFileTuples = [];
  pathTree.walk2(walkParams => {
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

async function getFileSizes(pathTree: PathTree, progressCb: ProgressCb) {
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

async function walkDir2Bench(rootDir: string) {
  let printTimer: Timer;
  let walkTimer: Timer, walkMs: number, walkTimeStr: string;
  let walkDirResult: WalkDirResult;
  printTimer = Timer.start();
  walkTimer = Timer.start();
  walkDirResult = await walkDir2(rootDir, () => {
    if(printTimer.currentMs() > 200) {
      process.stdout.write('.');
      printTimer = Timer.start();
    }
  });
  walkMs = walkTimer.stop();
  process.stdout.write('\n');
  walkTimeStr = getIntuitiveTimeString(walkMs);
  console.log(`walkDir2 took ${walkTimeStr}`);
}
async function walkDirBench(rootDir: string) {
  let printTimer: Timer;
  let walkTimer: Timer, walkMs: number, walkTimeStr: string;
  printTimer = Timer.start();
  walkTimer = Timer.start();
  await walkDir(rootDir, () => {
    if(printTimer.currentMs() > 200) {
      process.stdout.write('.');
      printTimer = Timer.start();
    }
  });
  walkMs = walkTimer.stop();
  process.stdout.write('\n');
  walkTimeStr = getIntuitiveTimeString(walkMs);
  console.log(`walk took ${walkTimeStr}`);
}
