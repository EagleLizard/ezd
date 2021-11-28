
import { stat } from 'fs/promises';

import _chunk from 'lodash.chunk';

import { DirNode, DirNodeFile } from './dir-node';

const STAT_SKIP_ERR_CODES = [
  'ENOENT',
  'EPERM',
];

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

  async addFileStats(progressCb?: (doneCunt: number) => void) {
    let fileStatJobChunkSize: number;
    let addStatsPromises: Promise<void>[];
    let addStatsTuples: [ DirNode, number, string ][];
    let addStatsJobs: (() => Promise<void>)[];
    let addStatsJobChunks: (() => Promise<void>)[][];
    let doneCount: number;

    doneCount = 0;
    addStatsPromises = [];
    addStatsTuples = [];
    addStatsJobs = [];

    this.traverse(currNode => {
      for(let i = 0; i < currNode.root.files.length; ++i) {
        let currFile: DirNodeFile;
        currFile = currNode.root.files[i];
        let addStatsJob: () => Promise<void>;
        let filePath: string, fileIdx: number;
        fileIdx = i;
        filePath = currFile.filePath;
        addStatsJob = async () => {
          try {
            currNode.root.files[fileIdx].stats = await stat(filePath);
          } catch(e) {
            if(!STAT_SKIP_ERR_CODES.includes(e.code)) {
              throw e;
            }
          }
        };
        addStatsJobs.push(addStatsJob);
      }
    });


    fileStatJobChunkSize = 1e5;

    addStatsJobChunks = _chunk(addStatsJobs, fileStatJobChunkSize);

    for(let k = 0; k < addStatsJobChunks.length; ++k) {
      let currAddStatsJobChunk: (() => Promise<void>)[];
      currAddStatsJobChunk = addStatsJobChunks[k];
      for(let i = 0; i < currAddStatsJobChunk.length; ++i) {
        let addStatsPromise: Promise<void>;
        addStatsPromise = currAddStatsJobChunk[i]().then(() => {
          doneCount++;
          if(progressCb !== undefined) {
            progressCb(doneCount);
          }
        });
        addStatsPromises.push(addStatsPromise);
        // await addStatsPromise;
      }
      await Promise.all(addStatsPromises);
    }
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
