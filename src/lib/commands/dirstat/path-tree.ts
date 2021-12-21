
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
  public files: PathNodeFile[];
  constructor(
    public basePath: string,
    public children: Map<string, PathNode> = new Map,
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
  constructor(basePath: string) {
    super(basePath);
  }
  getChild(pathParts: string[]): PathNode {
    let lastNode: PathNode;
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
    return lastNode;
  }
  walk(cb: (walkParams: PathTreeWalkCbParams) => void) {
    this._walk(this, [ this.basePath ], cb);
  }
  private _walk(pathNode: PathNode, pathSoFar: string[], cb: (walkParams: PathTreeWalkCbParams) => void) {
    let children: PathNode[];
    cb({
      pathNode,
      pathSoFar,
    });
    children = Array.from(pathNode.children.values());
    for(let i = 0; i < children.length; ++i) {
      this._walk(children[i], [ this.basePath, children[i].basePath ], cb);
    }
  }
}
