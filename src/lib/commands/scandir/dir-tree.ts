
import { Stats } from 'fs';
import { stat } from 'fs/promises';

import _chunk from 'lodash.chunk';
import { WorkerPool } from 'workerpool';
import { getPool, MAX_WORKERS } from '../../../util/worker-pool';

import { DirNode, DirNodeFile } from './dir-node';

const STAT_SKIP_ERR_CODES = [
  'ENOENT',
  'EPERM',
];

export interface TreeInfo {
  dirCount: number;
  fileCount: number;
  dirNodeTuples: [ DirNode, DirNodeFile[] ][];
}

export class DirTree {
  root: DirNode;
  children: DirTree[];
  private constructor(
    root: DirNode,
  ) {
    this.root = root;
    this.children = [];
  }

  traverse(
    visitFn: (currNode: DirTree, parentDirs: DirTree[]) => void,
    soFar?: DirTree[],
    rootNode?: DirTree,
  ) {
    if(rootNode === undefined) {
      rootNode = this;
    }
    if(soFar === undefined) {
      soFar = [];
    }
    visitFn(rootNode, soFar);
    for(let i = 0; i < rootNode.children.length; ++i) {
      let currChild: DirTree;
      currChild = rootNode.children[i];
      currChild.traverse(visitFn, [
        ...soFar,
        rootNode,
      ]);
    }
  }

  getTreeInfo(): TreeInfo {
    let dirCount: number, fileCount: number;
    let dirNodeTuples: [ DirNode, DirNodeFile[] ][];
    dirCount = 0;
    fileCount = 0;
    dirNodeTuples = [];
    this.traverse(currNode => {
      dirCount++;
      fileCount += currNode.root.files.length;
      dirNodeTuples.push([
        currNode.root,
        currNode.root.files,
      ]);
    });
    return {
      dirCount,
      fileCount,
      dirNodeTuples,
    };
  }

  getDirCount(): number {
    let dirCount: number;
    dirCount = 0;
    this.traverse(() => {
      dirCount++;
    });
    return dirCount;
  }

  getFileCount(): number {
    let fileCount: number;
    fileCount = 0;
    this.traverse((currNode) => {
      fileCount += currNode.root.files.length;
    });
    return fileCount;
  }

  getSize(): number {
    let totalBytes: number;
    totalBytes = 0;
    this.traverse((currNode) => {
      for(let i = 0; i < currNode.root.files.length; ++i) {
        let currFile: DirNodeFile;
        currFile = currNode.root.files[i];
        totalBytes += currFile.stats?.size ?? 0;
      }
    });
    return totalBytes;
  }

  static async create(rootPath: string): Promise<DirTree> {
    let dirNode: DirNode, childNodes: DirTree[];
    let dirTree: DirTree;
    let childNodeJobs: (() => Promise<void>)[];
    let childNodeJobPromises: Promise<void>[];

    childNodeJobs = [];
    dirNode = await DirNode.create(rootPath);
    dirTree = new DirTree(dirNode);
    childNodes = Array(dirNode.subDirs.length).fill(0).map(() => undefined);

    for(let i = 0; i < dirNode.subDirs.length; ++i) {
      let currIdx: number;
      let childNodeJob: () => Promise<void>;
      currIdx = i;
      childNodeJob = async () => {
        let childNode: DirTree;
        childNode = await DirTree.create(dirNode.subDirs[i]);
        childNodes[currIdx] = childNode;
      };
      childNodeJobs.push(childNodeJob);
    }
    childNodeJobPromises = [];
    for(let i = 0; i < childNodeJobs.length; ++i) {
      childNodeJobPromises.push(childNodeJobs[i]());
    }
    await Promise.all(childNodeJobPromises);
    dirTree.children = childNodes;
    return dirTree;
  }

  async addFileStats(
    progressCb?: (doneCount: number, totalJobCount?: number) => void,
    fileSizeTuples?: [ DirNode, DirNodeFile[] ][]
  ) {
    let fileSizeJobs: (() => Promise<void>)[];
    if(fileSizeTuples === undefined) {
      fileSizeTuples = [];

      this.traverse(currNode => {
        fileSizeTuples.push([
          currNode.root,
          currNode.root.files,
        ]);
      });
    }

    // fileSizeJobs = getFileSizeJobs(fileSizeTuples);
    fileSizeJobs = getBatchFileSizeJobs(fileSizeTuples);

    await executeFileSizeJobs(fileSizeJobs, progressCb);
  }
}

async function executeFileSizeJobs(
  fileSizeJobs: (() => Promise<void>)[],
  progressCb?: (doneCount: number, totalJobCount?: number) => void,
) {
  let doneCount: number;
  let fileSizeJobChunkSize: number;
  let fileSizeJobChunks: (() => Promise<void>)[][];

  doneCount = 0;
  // fileSizeJobChunkSize = 14;
  // fileSizeJobChunkSize = 100;
  // fileSizeJobChunkSize = 500;
  // fileSizeJobChunkSize = 1e3;
  fileSizeJobChunkSize = 1e4;
  // fileSizeJobChunkSize = 1e9;
  console.log(`fileSizeJobs: ${fileSizeJobs.length.toLocaleString()}`);
  console.log(`fileSizeJobChunkSize: ${fileSizeJobChunkSize.toLocaleString()}`);

  fileSizeJobChunks = _chunk(fileSizeJobs, fileSizeJobChunkSize);
  console.log(`num chunks: ${fileSizeJobChunks.length.toLocaleString()}`);
  for(let k = 0; k < fileSizeJobChunks.length; ++k) {
    let fileSizeJobPromises: Promise<void>[];
    let currFileSizeJobChunk: (() => Promise<void>)[];
    fileSizeJobPromises = [];
    currFileSizeJobChunk = fileSizeJobChunks[k];
    for(let i = 0; i < currFileSizeJobChunk.length; ++i) {
      let fileSizeJobPromise: Promise<void>;
      fileSizeJobPromise = currFileSizeJobChunk[i]().then(() => {
        doneCount++;
        if(progressCb !== undefined) {
          progressCb(doneCount, fileSizeJobs.length);
        }
      });
      fileSizeJobPromises.push(fileSizeJobPromise);
    }
    await Promise.all(fileSizeJobPromises);
  }
}

function getBatchFileSizeJobs(fileSizeTuples: [ DirNode, DirNodeFile[] ][]) {
  // const BATCH_SIZE = 20;
  // const BATCH_SIZE = 50;
  // const BATCH_SIZE = 500;
  // const BATCH_SIZE = 1e3;
  // const BATCH_SIZE = Math.ceil(fileSizeTuples.length / MAX_WORKERS);
  // const BATCH_SIZE = Math.ceil(fileSizeTuples.length / (MAX_WORKERS * 64));

  const BATCH_SIZE = 100;

  console.log('');
  console.log(`BATCH_SIZE: ${BATCH_SIZE.toLocaleString()}`);
  let fileSizeJobs: (() => Promise<void>)[];
  let tupleChunks: [ DirNode, DirNodeFile[] ][][];
  tupleChunks = _chunk(fileSizeTuples, BATCH_SIZE);
  fileSizeJobs = [];
  for(let k = 0; k < tupleChunks.length; ++k) {
    let currTupleChunk: [ DirNode, DirNodeFile[] ][];
    let dirNodeFiles: DirNodeFile[][];
    let fileSizeJob: () => Promise<void>;
    currTupleChunk = tupleChunks[k];
    dirNodeFiles = currTupleChunk.map(fileSizeTuple => {
      return fileSizeTuple[1];
    });
    fileSizeJob = getThreadedBatchFileSizeJob(dirNodeFiles);
    fileSizeJobs.push(fileSizeJob);
  }
  return fileSizeJobs;
}

function getFileSizeJobs(fileSizeTuples: [ DirNode, DirNodeFile[] ][]) {
  let fileSizeJobs: (() => Promise<void>)[];
  fileSizeJobs = [];
  for(let i = 0; i < fileSizeTuples.length; ++i) {
    let currDirNodeFiles: DirNodeFile[];
    let fileSizeJob: () => Promise<void>;
    [ , currDirNodeFiles ] = fileSizeTuples[i];

    fileSizeJob = getThreadedFileSizeJob(currDirNodeFiles);
    // fileSizeJob = getFileSizeJob(currDirNodeFiles);

    fileSizeJobs.push(fileSizeJob);
  }
  return fileSizeJobs;
}

function getFileSizeJob(dirNodeFiles: DirNodeFile[]) {
  return async () => {
    for(let k = 0; k < dirNodeFiles.length; ++k) {
      let currFile: DirNodeFile, fileStats: Stats;
      currFile = dirNodeFiles[k];
      // fileStats = await pool.exec('getFileSize', [ currFile.filePath ]);
      fileStats = await getFileSize(currFile.filePath);
      currFile.stats = fileStats;
    }
  };
}

function getThreadedBatchFileSizeJob(dirNodeFilesArr: DirNodeFile[][]) {
  let pool: WorkerPool;
  pool = getPool();
  return async () => {
    let filePathsArr: string[][], filesStatsArr: Stats[][];
    filePathsArr = dirNodeFilesArr.map(dirNodeFiles => {
      return dirNodeFiles.map(dirNodeFile => {
        return dirNodeFile.filePath;
      });
    });
    filesStatsArr = await pool.exec('getFileSizesBatched', [ filePathsArr ]);
    for(let i = 0; i < filesStatsArr.length; ++i) {
      let fileStats: Stats[], dirNodeFiles: DirNodeFile[];
      fileStats = filesStatsArr[i];
      dirNodeFiles = dirNodeFilesArr[i];
      for(let k = 0; k < fileStats.length; ++k) {
        let fileStat: Stats, dirNodeFile: DirNodeFile;
        fileStat = fileStats[k];
        dirNodeFile = dirNodeFiles[k];
        dirNodeFile.stats = fileStat;
      }
    }
  };
}
function getThreadedFileSizeJob(dirNodeFiles: DirNodeFile[]) {
  let pool: WorkerPool;
  pool = getPool();
  return async () => {
    let filePaths: string[], filesStats: Stats[];
    filePaths = dirNodeFiles.map(dirNodeFile => {
      return dirNodeFile.filePath;
    });
    filesStats = await pool.exec('getFileSizes', [ filePaths ]);
    for(let k = 0; k < filesStats.length; ++k) {
      dirNodeFiles[k].stats = filesStats[k];
    }
  };
}

async function getFileSize(filePath: string): Promise<Stats> {
  let fileStats: Stats;
  try {
    fileStats = await stat(filePath);
  } catch(e) {
    if(!STAT_SKIP_ERR_CODES.includes(e.code)) {
      throw e;
    }
  }
  return fileStats;
}
