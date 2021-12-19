
import { mkdir, writeFile, unlink } from 'fs/promises';
import path, { ParsedPath } from 'path';

import _rimraf from 'rimraf';

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
  // await findCsvLogs(dirTree);
  // await findNodeModules(dirTree);
  // nodeData = getNodeData(dirTree);
  // jsonData = JSON.stringify(nodeData);
  // await writeFile(path.join(OUTPUT_DIR, 'data.json'), jsonData);
}

async function findNodeModules(dirTree: DirTree) {
  let nodeModulesFiles: DirNodeFile[], nodeModulesDirSet: Set<string>;
  let dirPaths: string[], outFileData: string, outFilePath: string;
  nodeModulesFiles = [];
  nodeModulesDirSet = new Set;
  dirTree.traverse((currNode, parentDirs) => {
    if(
      (currNode.root.parsedPath.name === 'node_modules')
      && (!currNode.root.parsedPath.dir.includes('/node_modules/'))
    ) {
      nodeModulesDirSet.add(currNode.root.dirPath);
    }
  });
  dirPaths = [ ...nodeModulesDirSet ];
  // dirPaths = dirPaths.slice(0, 1);
  outFileData = dirPaths.join('\n');
  outFilePath = path.join(OUTPUT_DIR, 'node_modules_dirs.txt');
  await writeFile(outFilePath, outFileData);
  for(let i = 0; i <  dirPaths.length; ++i) {
    let currDirPath: string;
    currDirPath = dirPaths[i];
    // console.log(`... deleting ${currDirPath}`);
    // await rimraf(currDirPath);
    // console.log(`deleted ${currDirPath}`);
  }
  // console.log(dirPaths);
}

async function rimraf(path: string) {
  return new Promise<void>((resolve, reject) => {
    _rimraf(path, {}, err => {
      if(err) {
        return reject(err);
      }
      resolve();
    });
  });
}

async function findCsvLogs(dirTree: DirTree) {
  let csvLogFiles: DirNodeFile[], csvLogDirSet: Set<string>;
  let dirPaths: string[], outFileData: string, outFilePath: string;
  csvLogFiles = [];
  dirTree.traverse((currNode, parentDirs) => {
    let currFiles: DirNodeFile[];
    currFiles = currNode.root.files;
    for(let i = 0; i < currFiles.length; ++i) {
      let currFile: DirNodeFile, isCsv: boolean, isRawCsvLog: boolean, isLogFile: boolean;
      currFile = currFiles[i];
      isCsv = currFile.parsedPath.ext === '.csv';
      isRawCsvLog = (currFile.parsedPath.ext === '.txt')
        && currFile.parsedPath.base.includes('ping-log')
        // && currFile.parsedPath.dir.includes('/logs')
      ;
      isLogFile = currFile.parsedPath.base.includes('ping-log')
        || currFile.parsedPath.dir.includes('converted-csv-logs')
        || currFile.parsedPath.dir.includes('csv-logs-coalesced')
      ;
      if(
        isRawCsvLog
        || (isCsv && isLogFile)
      ) {
        csvLogFiles.push(currFile);
      }
    }
  });
  csvLogDirSet = csvLogFiles.reduce((acc, curr) => {
    acc.add(curr.parsedPath.dir);
    return acc;
  }, new Set<string>());
  dirPaths = [ ...csvLogDirSet ];
  outFileData = dirPaths.join('\n');
  outFilePath = path.join(OUTPUT_DIR, 'csv_logs.txt');
  await writeFile(outFilePath, outFileData);
  for(let i = 0; i < csvLogFiles.length; ++i) {
    let currCsvLogFile: DirNodeFile;
    currCsvLogFile = csvLogFiles[i];
    // console.log(`... deleting ${currCsvLogFile.filePath}`);
    // await unlink(currCsvLogFile.filePath);
    // console.log(`deleted ${currCsvLogFile.filePath}`);
  }
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
