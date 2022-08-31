
import path from 'path';

import { walkDir2, WalkDir2Result } from '../dirstat2/walk-dir2';

enum DIR_NODE_TYPE_ENUM {
  FILE = 'FILE',
  DIR = 'DIR',
};

type DirNodeFile = {
  name: string;
  size?: number;
};

type DirNodeWithChildren = {
  children: DirNode[];
};

type DirTreeWalkParams = {
  dirNode: DirNode;
  pathSoFar: DirNode[];
}

class DirNode implements DirNodeWithChildren {
  name: string;
  children: DirNode[];
  private _type: DIR_NODE_TYPE_ENUM;
  constructor(name: string, type: DIR_NODE_TYPE_ENUM) {
    this.name = name;
    this._type = type;
    this.children = [];
  }
  private get type(): DIR_NODE_TYPE_ENUM {
    return (this._type === undefined)
      ? DIR_NODE_TYPE_ENUM.DIR
      : this._type
    ;
  }
  isFile(): boolean {
    return this.type === DIR_NODE_TYPE_ENUM.FILE;
  }
}

export class DirTree implements DirNodeWithChildren {
  rootPath: string;
  children: DirNode[];
  private constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.children = [];
  }

  add(pathStr: string, dirNodeType: DIR_NODE_TYPE_ENUM) {
    let currPathStr: string, currPathParts: string[];
    let currNode: DirNodeWithChildren;
    
    currPathStr = trimRootPath(this.rootPath, pathStr);
    currPathParts = currPathStr.split(path.sep);
    // console.log(currPathStr);
    // console.log(currPathParts);
    currNode = this;
    for(let i = 0; i < currPathParts.length; ++i) {
      let currPathPart: string, foundPathNode: DirNodeWithChildren;
      let currDirNodeType: DIR_NODE_TYPE_ENUM;
      let nextNode: DirNodeWithChildren;
      currPathPart = currPathParts[i];
      foundPathNode = currNode.children.find(currChild => {
        return currChild.name === currPathPart;
      });
      currDirNodeType = (i === (currPathParts.length - 1))
        ? dirNodeType
        : DIR_NODE_TYPE_ENUM.DIR
      ;
      if(foundPathNode === undefined) {
        nextNode = new DirNode(currPathPart, currDirNodeType);
        currNode.children.push(nextNode as DirNode);
      } else {
        nextNode = foundPathNode;
      }
      currNode = nextNode;
    }
  }

  walk(cb: (walkParams: DirTreeWalkParams) => void) {
    for(let i = 0; i < this.children.length; ++i) {
      _walk(this.children[i]);
    }
    function _walk(dirNode: DirNode, pathSoFar?: DirNode[]) {
      pathSoFar = pathSoFar || [];
      cb({
        dirNode,
        pathSoFar,
      });
      pathSoFar.push(dirNode);
      if(dirNode.children.length > 0) {
        for(let k = 0; k < dirNode.children.length; ++k) {
          _walk(dirNode.children[k], pathSoFar);
        }
      }
      pathSoFar.pop();
    }
  }

  static async initDirTree(rootPath: string): Promise<DirTree> {
    let dirTree: DirTree, walkDirResult: WalkDir2Result;
    dirTree = new DirTree(rootPath);
    
    walkDirResult = await walkDir2(dirTree.rootPath);
    for(let i = 0; i < walkDirResult.paths.length; ++i) {
      dirTree.add(walkDirResult.paths[i], DIR_NODE_TYPE_ENUM.FILE);
    }

    // await walkDir2(dirTree.rootPath, (walkParams) => {
    //   let dirNodeType: DIR_NODE_TYPE_ENUM;
    //   dirNodeType = walkParams.isFile
    //     ? DIR_NODE_TYPE_ENUM.FILE
    //     : DIR_NODE_TYPE_ENUM.DIR
    //   ;
    //   dirTree.add(walkParams.fullPath, dirNodeType);
    // });

    return dirTree;
  }
}

function trimRootPath(rootPath: string, targetPath: string): string {
  let foundRootStartIdx: number;
  let resultPath: string;
  foundRootStartIdx = targetPath.indexOf(rootPath);
  if(foundRootStartIdx !== 0) {
    throw new Error(`rootPath not found at start of targetPath\nrootPath: ${rootPath}\ntargetPath: ${targetPath}`);
  }
  resultPath = targetPath.substring(rootPath.length + 1); // add one char to account for path seperator
  return resultPath;
}
