
import { Dirent, Stats } from 'fs';
import path from 'path';

import { WorkerPool } from 'workerpool';
import _chunk from 'lodash.chunk';

import { getDirents } from '../../../util/files';
import { getIntuitiveByteString, getIntuitiveTimeString } from '../../../util/print-util';
import { sleep } from '../../../util/sleep';
import { Timer } from '../../../util/timer';
import { getPool } from '../../../util/worker-pool';
import { EzdArgs } from '../../parse-args/ezd-args';
import { generateDirstatTest } from '../scandir/generate-dirstat-test/generate-dirstat-test';
import { PathNode, PathNodeFile, PathTree } from './path-tree';

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
  await dirstatScan(rootDir);
}

async function dirstatScan(rootDir: string) {
  let timer: Timer, deltaMs: number;
  let printTimer: Timer;
  let dirCount: number, fileCount: number;
  let totalBytes: number;
  let pathTree: PathTree;
  pathTree = new PathTree(rootDir);
  dirCount = 0;
  fileCount = 0;

  printTimer = Timer.start();
  timer = Timer.start();
  await walkDir(rootDir, async (walkDirParams) => {
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
  process.stdout.write('\n');
  console.log(`dirCount: ${dirCount.toLocaleString()}`);
  console.log(`fileCount: ${fileCount.toLocaleString()}`);

  const fileSizeModBy = Math.ceil(fileCount / 71);
  await getFileSizes(pathTree, doneCount => {
    if((doneCount % fileSizeModBy) === 0) {
      process.stdout.write('.');
    }
  });
  deltaMs = timer.stop();
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
  console.log(`walkDir took ${getIntuitiveTimeString(deltaMs)}`);
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
        pathNodeFiles[k].size = filesStats[k].size;
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

interface WalkDirCbParams {
  basePath: string;
  dirents: Dirent[];
  files: Dirent[];
  pathSoFar: string[];
}

type WalkDirCb = (params: WalkDirCbParams) => Promise<void>;

async function walkDir(dir: string, cb: WalkDirCb) {

  await _walkDir(dir, [ ]);

  async function _walkDir(currDir: string, pathSoFar: string[]) {
    let dirents: Dirent[], fileDirents: Dirent[];
    let walkDirPromises: Promise<void>[];
    walkDirPromises = [];
    dirents = await getDirents(currDir);
    fileDirents = dirents.filter(dirent => dirent.isFile());
    await cb({
      basePath: currDir,
      dirents,
      files: fileDirents,
      pathSoFar,
    });
    for(let i = 0; i < dirents.length; ++i) {
      let currDirent: Dirent, currPath: string, walkDirPromise: Promise<void>;
      currDirent = dirents[i];
      if(currDirent.isDirectory()) {
        currPath = `${currDir}${path.sep}${currDirent.name}`;
        walkDirPromise = _walkDir(currPath, [ ...pathSoFar, currDirent.name ]);
        walkDirPromises.push(walkDirPromise);
      }
    }
    await Promise.all(walkDirPromises);
  }
}
