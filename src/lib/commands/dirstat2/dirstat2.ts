
import path from 'path';

import sizeof from 'object-sizeof';

import { EzdArgs } from '../../parse-args/ezd-args';
import { PathTree } from '../dirstat/path-tree';
import { DirTree } from './dir-tree';
import { getIntuitiveByteString } from '../../../util/print-util';

export async function executeDirstat2(ezdArgs: EzdArgs) {
  let rootDir: string, dirTree: DirTree;
  rootDir = path.resolve(ezdArgs.DIRSTAT2.argParams);
  console.log(`rootDir: ${rootDir}`);
  await treeSizeCompare(rootDir);
  // dirTree = await DirTree.initDirTree(rootDir);
  // dirTree.walk(walkParams => {
  //   let soFarPath: string, fullPath: string;
  //   if(walkParams.dirNode.isFile()) {
  //     soFarPath = walkParams.pathSoFar.map(dirNode => dirNode.name).join(path.sep);
  //     fullPath = [
  //       dirTree.rootPath,
  //       soFarPath,
  //       walkParams.dirNode.name,
  //     ].join(path.sep);
  //     console.log(fullPath);
  //   }
  // });
}

async function treeSizeCompare(rootPath: string) {
  let dirTree: DirTree, pathTree: PathTree;
  let dirTreeBytes: number, pathTreeBytes: number;

  dirTree = await DirTree.initDirTree(rootPath);
  dirTreeBytes = sizeof(dirTree);
  console.log(`DirTree size: ${getIntuitiveByteString(dirTreeBytes)}`);

  // pathTree = (await PathTree.getPathTree(rootPath)).pathTree;
  // pathTreeBytes = sizeof(pathTree);
  // console.log(`PathTree size: ${getIntuitiveByteString(pathTreeBytes)}`);
}
