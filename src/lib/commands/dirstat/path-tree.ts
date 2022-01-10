
import path from 'path';

export interface PathTreeWalkCbParams {
  pathNode: PathNode;
  pathSoFar: string[];
}

export interface PathNodeFile {
  name: string;
  size?: number;
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
      this._walk2(children[i], [ children[i].basePath ], cb);
    }
  }

  traverse(cb: (pathNode: PathNode, soFar: PathNode[]) => void) {
    let rootChildren: PathNode[];
    rootChildren = Array.from(this.children.values());
    for(let i = 0; i < rootChildren.length; ++i) {
      _traverse(rootChildren[i], []);
    }
    function _traverse(pathNode: PathNode, soFar: PathNode[]) {
      let children: PathNode[];
      children = Array.from(pathNode.children.values());
      // if(children.length < 1) {
        cb(pathNode, soFar);
      // }

      soFar.push(pathNode);
      for(let i = 0; i < children.length; ++i) {
        _traverse(children[i], soFar);
      }
      soFar.pop();
    }
  }
}
