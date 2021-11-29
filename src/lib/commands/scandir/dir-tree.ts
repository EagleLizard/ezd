
import { stat } from 'fs/promises';

import _chunk from 'lodash.chunk';

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

  async addFileStats(
    progressCb?: (doneCount: number) => void,
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

    fileSizeJobs = getFileSizeJobs(fileSizeTuples);

    await executeFileSizeJobs(fileSizeJobs, progressCb);
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
}

async function executeFileSizeJobs(
  fileSizeJobs: (() => Promise<void>)[],
  progressCb?: (doneCount: number) => void,
) {
  let doneCount: number;
  let fileSizeJobChunkSize: number;
  let fileSizeJobChunks: (() => Promise<void>)[][];

  doneCount = 0;
  fileSizeJobChunkSize = 1e4;
  console.log(`fileSizeJobChunkSize: ${fileSizeJobChunkSize.toLocaleString()}`);

  fileSizeJobChunks = _chunk(fileSizeJobs, fileSizeJobChunkSize);
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
          progressCb(doneCount);
        }
      });
      fileSizeJobPromises.push(fileSizeJobPromise);
    }
    await Promise.all(fileSizeJobPromises);
  }
}

function getFileSizeJobs(fileSizeTuples: [ DirNode, DirNodeFile[] ][]) {
  let fileSizeJobs: (() => Promise<void>)[];
  fileSizeJobs = [];
  for(let i = 0; i < fileSizeTuples.length; ++i) {
    let currDirNode: DirNode, currDirNodeFiles: DirNodeFile[];
    let fileSizeJob: () => Promise<void>;
    [ currDirNode, currDirNodeFiles ] = fileSizeTuples[i];
    fileSizeJob = async () => {
      for(let k = 0; k < currDirNodeFiles.length; ++k) {
        let currFile: DirNodeFile;
        currFile = currDirNode.files[k];
        try {
          currFile.stats = await stat(currFile.filePath);
        } catch(e) {
          if(!STAT_SKIP_ERR_CODES.includes(e.code)) {
            throw e;
          }
        }
      }
    };
    fileSizeJobs.push(fileSizeJob);
  }
  return fileSizeJobs;
}
