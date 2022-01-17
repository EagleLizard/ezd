
import path from 'path';

import _chunk from 'lodash.chunk';

import { WorkerPool } from 'workerpool';
import { getPool, terminatePool } from '../../../util/worker-pool';
import { PathNode, PathNodeFile, PathTree } from './path-tree';
import { WalkDirResult } from './walk-dir';
import { Stats } from 'fs';
import { sleep } from '../../../util/sleep';

const FILE_TUPLE_CHUNK_SIZE = 1e3;
console.log(`FILE_TUPLE_CHUNK_SIZE: ${FILE_TUPLE_CHUNK_SIZE.toLocaleString()}`);

enum DIR_SCANNER_STATES {
  DEFAULT = 'DEFAULT',
  SCANNING_DIRS = 'SCANNING_DIRS',
  SCANNED_DIRS = 'SCANNED_DIRS',
  SCANNING_FILES = 'SCANNING_FILES',
  SCANNED_FILES = 'SCANNED_FILES'
}

interface PathTreeResult {
  walkDirResult: WalkDirResult;
  pathTree: PathTree;
  fileCount: number;
  dirCount: number;
}

export class DirScanner {
  scanState: DIR_SCANNER_STATES;
  pathTree: PathTree;
  dirCount: number;
  fileCount: number;
  walkDirResult: WalkDirResult;

  totalBytes: number;

  private constructor(
    public rootDir: string,
  ) {
    this.scanState = DIR_SCANNER_STATES.DEFAULT;
  }

  get isScanning(): boolean {
    return this.scanState === DIR_SCANNER_STATES.SCANNING_DIRS;
  }

  async scanDir() {
    let pathTreeResult: PathTreeResult;
    if(this.scanState !== DIR_SCANNER_STATES.DEFAULT) {
      throw new Error(`Cannot run scanDir in state: ${this.scanState}, can only run in ${DIR_SCANNER_STATES.DEFAULT} state.`);
    }
    this.scanState = DIR_SCANNER_STATES.SCANNING_DIRS;
    pathTreeResult = await PathTree.getPathTree(this.rootDir);
    this.scanState = DIR_SCANNER_STATES.SCANNED_DIRS;

    this.pathTree = pathTreeResult.pathTree;
    this.dirCount = pathTreeResult.dirCount;
    this.fileCount = pathTreeResult.fileCount;
    this.walkDirResult = pathTreeResult.walkDirResult;
  }

  async addFileSizes(progressCb: (doneCount: number) => void) {
    if(this.scanState !== DIR_SCANNER_STATES.SCANNED_DIRS) {
      throw new Error(`Cannot run addFileSizes in state: ${this.scanState}, can only run in ${DIR_SCANNER_STATES.SCANNED_DIRS} state`);
    }
    this.scanState = DIR_SCANNER_STATES.SCANNING_FILES;

    await getFileSizes(this.pathTree, progressCb);

    this.totalBytes = 0;
    this.pathTree.walk(walkParams => {
      let pathNode: PathNode;
      pathNode = walkParams.pathNode;
      for(let i = 0; i < pathNode.files.length; ++i) {
        this.totalBytes += pathNode.files[i].size;
      }
    });

    this.scanState = DIR_SCANNER_STATES.SCANNED_FILES;
  }

  static init(rootDir: string): DirScanner {
    return new DirScanner(rootDir);
  }
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

  terminatePool();

}
