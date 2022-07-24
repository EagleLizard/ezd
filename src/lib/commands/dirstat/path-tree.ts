
import path from 'path';
import { walkDir, WalkDirResult } from './walk-dir';

export interface PathTreeWalkCbParams {
  pathNode: PathNode;
  pathSoFar: string[];
}

export interface PathNodeFile {
  name: string;
  size?: number;
}

export interface PathTreeResult {
  walkDirResult: WalkDirResult;
  pathTree: PathTree;
  fileCount: number;
  dirCount: number;
}

export class PathNode {
  constructor(
    public basePath: string,
    public children: Map<string, PathNode> = new Map,
    public files: PathNodeFile[] = [],
  ) {

  }
  has(key: string) {
    return this.children.has(key);
  }
  set(key: string, pathNode: PathNode) {
    return this.children.set(key, pathNode);
  }
  get(key: string) {
    return this.children.get(key);
  }
}

export class PathTree extends PathNode {
  private pathPartsMemo: Record<string, PathNode>;
  constructor(basePath: string) {
    super(basePath);
    this.pathPartsMemo = {};
  }
  getChild(pathParts: string[]): PathNode {
    let fullPath: string;
    let lastNode: PathNode;
    fullPath = pathParts.join(path.sep);
    if(this.pathPartsMemo[fullPath] !== undefined) {
      return this.pathPartsMemo[fullPath];
    }
    if(fullPath === this.basePath) {
      // root pathTree node is the current node
      return this;
    }
    lastNode = this;
    for(let i = 0; i < pathParts.length; ++i) {
      let currPathPart: string, pathNodeBase: string;
      currPathPart = pathParts[i];
      if(!lastNode.has(currPathPart)) {
        pathNodeBase = pathParts
          .slice(0, i)
          .concat(currPathPart)
          .join(path.sep)
        ;
        lastNode.set(currPathPart, new PathNode(pathNodeBase));
      }
      lastNode = lastNode.get(currPathPart);
    }
    this.pathPartsMemo[fullPath] = lastNode;
    return lastNode;
  }

  walk(cb: (walkParams: PathTreeWalkCbParams) => void) {
    let children: PathNode[];
    // this._walk2(this, [ this.basePath ], cb);
    children = Array.from(this.children.values());
    for(let i = 0; i < children.length; ++i) {
      this._walk2(children[i], [ ], cb);
    }
  }
  private _walk2(pathNode: PathNode, pathSoFar: string[], cb: (walkParams: PathTreeWalkCbParams) => void) {
    let children: PathNode[];
    cb({
      pathNode,
      pathSoFar,
    });
    children = Array.from(pathNode.children.values());
    for(let i = 0; i < children.length; ++i) {
      this._walk2(children[i], [
        children[i].basePath
      ], cb);
    }
  }

  static async getPathTree(rootDir: string): Promise<PathTreeResult> {
    let pathTree: PathTree, walkDirResult: WalkDirResult;
    let basePath: string;
    let fileCount: number, dirCount: number;
    let pathTreeResult: PathTreeResult;
    console.log(rootDir);
    pathTree = new PathTree(rootDir);
    fileCount = 0;

    const walkDirCb = (filePath: string) => {
      let pathNode: PathNode, pathParts: string[];
      let fileName: string;
      pathParts = filePath.split(path.sep);
      fileName = pathParts[pathParts.length - 1];
      pathNode = pathTree.getChild(pathParts.slice(0, -1));

      pathNode.files.push({
        name: fileName
      });
      fileCount++;
    };

    // walkDirResult = await walkDir(rootDir, walkDirCb);

    walkDirResult = await walkDir(rootDir);
    basePath = commonPathPrefix(walkDirResult.paths);
    console.log(`basePath: ${basePath}`);
    walkDirResult.paths.forEach(walkDirCb);

    dirCount = walkDirResult.dirs.length;
    pathTreeResult = {
      walkDirResult,
      pathTree,
      fileCount,
      dirCount,
    };
    return pathTreeResult;
  }
}

function commonPathPrefix(paths: string[]) {
  let firstParts: string[], lastParts: string[];
  let i: number;
  paths = paths.slice().sort();
  firstParts = paths[0].split(path.sep);
  lastParts = paths[paths.length - 1].split(path.sep);
  i = 0;
  while(
    (i < firstParts.length)
    && (firstParts[i] === lastParts[i])
  ) {
    ++i;
  }
  return firstParts.slice(0, i).join(path.sep);
}
