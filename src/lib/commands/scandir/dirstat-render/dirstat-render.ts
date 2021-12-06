
import { mkdir, writeFile } from 'fs/promises';
import path, { ParsedPath } from 'path';
import { BASE_DIR, checkDir } from '../../../../util/files';
import { getIntuitiveBytes } from '../../../../util/print-util';
import { DirNodeFile } from '../dir-node';
import { DirTree } from '../dir-tree';

interface NodeData {
  dirPath: string;
  parsedPath: ParsedPath;
  files: DirNodeFile[];
  size: number;
  sizeStr: string;
  children: NodeData[];
}

const OUTPUT_DIR = path.join(BASE_DIR, 'output');

export async function dirstatRender(dirTree: DirTree) {
  let outputDirExists: boolean, outputFileName: string, outputFilePath: string;
  let nodeData: NodeData, jsonData: string;
  outputDirExists = await checkDir(OUTPUT_DIR);
  if(!outputDirExists) {
    await mkdir(OUTPUT_DIR);
  }
  nodeData = getNodeData(dirTree);
  jsonData = JSON.stringify(nodeData);
  await writeFile(path.join(OUTPUT_DIR, 'data.json'), jsonData);
}

function getNodeData(dirTree: DirTree) {
  let nodeData: NodeData, byteSizeTuple: [number, string],
    sizeStr: string
  ;
  byteSizeTuple = getIntuitiveBytes(dirTree.getSize());
  sizeStr = `${(+byteSizeTuple[0].toFixed(2)).toLocaleString()} ${byteSizeTuple[1]}`;
  nodeData = {
    dirPath: dirTree.root.dirPath,
    parsedPath: dirTree.root.parsedPath,
    files: dirTree.root.files,
    size: dirTree.getSize(),
    sizeStr,
    // sizeStr: `${Math.round(dirTree.getSize() / (1024 ** 2)).toLocaleString()} mb`,
    children: [],
  };
  for(let i = 0; i < dirTree.children.length; ++i) {
    let currChildTree: DirTree, currNodeData: NodeData;
    currChildTree = dirTree.children[i];
    currNodeData = getNodeData(currChildTree);
    nodeData.children.push(currNodeData);
  }
  nodeData.children.sort((childA, childB) => {
    let sizeA: number, sizeB: number;
    sizeA = childA.size;
    sizeB = childB.size;
    if(sizeA > sizeB) {
      return -1;
    }
    if(sizeA < sizeB) {
      return 1;
    }
    return 0;
  });
  return nodeData;
}
