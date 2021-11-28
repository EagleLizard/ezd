
import { DirNode, DirNodeFile } from './dir-node';

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

  async addFileStats() {
    let allNodes: DirNode[], addStatsPromises: Promise<void>[];

    allNodes = [];
    addStatsPromises = [];

    this.traverse(currNode => {
      allNodes.push(currNode.root);
    });
    for(let i = 0; i < allNodes.length; ++i) {
      let currNode: DirNode;
      let addStatsPromise: Promise<void>;
      currNode = allNodes[i];
      addStatsPromise = currNode.addFileStats();
      addStatsPromises.push(addStatsPromise);
    }
    await Promise.all(addStatsPromises);
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
