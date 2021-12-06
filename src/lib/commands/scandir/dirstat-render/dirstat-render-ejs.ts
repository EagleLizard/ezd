
import ejs, { IncluderResult } from 'ejs';
import { readFileSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path, { ParsedPath } from 'path';
import { BASE_DIR, checkDir } from '../../../../util/files';
import { DirNode, DirNodeFile } from '../dir-node';
import { getIntuitiveBytes } from '../../../../util/print-util';

import { DirTree } from '../dir-tree';

const TEMPLATE_ROOT = path.resolve(__dirname, 'templates');
const OUTPUT_DIR = path.join(BASE_DIR, 'output');
console.log('TEMPLATE_ROOT');
console.log(TEMPLATE_ROOT);
console.log('OUTPUT_DIR');
console.log(OUTPUT_DIR);

interface EjsNodeData {
  dirPath: string;
  parsedPath: ParsedPath;
  files: DirNodeFile[];
  size: number;
  sizeStr: string;
  children: EjsNodeData[];
}

console.log('TEMPLATE_ROOT');
console.log(TEMPLATE_ROOT);

export async function dirstatRenderEjs(dirTree: DirTree) {
  let templatePath: string, templateStr: string,
    templateHtml: string;
  let ejsRootNode: EjsNodeData;
  templatePath = path.join(TEMPLATE_ROOT, 'dir-stat.template.ejs');
  ejsRootNode = getEjsNodeData(dirTree);
  // console.log(ejsNodeData);
  templateStr = (await readFile(templatePath)).toString();
  templateHtml = ejs.compile(templateStr, {
    // root: templatePath,
    includer: ejsIncluder,
    views: [
      TEMPLATE_ROOT,
    ]
  })({
    rootNode: ejsRootNode,
    depth: 0,
  });
  await writeTemplate(OUTPUT_DIR, templateHtml);
  // console.log(templateHtml);
}

async function writeTemplate(outputDir: string, templateHtml: string) {
  let outputDirExists: boolean, outputFileName: string, outputFilePath: string;
  outputDirExists = await checkDir(outputDir);
  if(!outputDirExists) {
    await mkdir(outputDir);
  }
  outputFileName = 'index.html';
  outputFilePath = path.join(outputDir, outputFileName);
  await writeFile(outputFilePath, templateHtml);
}

function ejsIncluder(originalPath: string, parsedPath: string): IncluderResult {
  let templateStr: string, templateFilePath: string;
  templateFilePath = path.join(TEMPLATE_ROOT, `${originalPath}.ejs`);
  templateStr = readFileSync(templateFilePath).toString();
  return {
    template: templateStr,
  };
}

function getEjsNodeData(dirTree: DirTree) {
  let ejsDirNode: EjsNodeData, byteSizeTuple: [number, string],
    sizeStr: string
  ;
  byteSizeTuple = getIntuitiveBytes(dirTree.getSize());
  sizeStr = `${(+byteSizeTuple[0].toFixed(2)).toLocaleString()} ${byteSizeTuple[1]}`;
  ejsDirNode = {
    dirPath: dirTree.root.dirPath,
    parsedPath: dirTree.root.parsedPath,
    files: dirTree.root.files,
    size: dirTree.getSize(),
    sizeStr,
    // sizeStr: `${Math.round(dirTree.getSize() / (1024 ** 2)).toLocaleString()} mb`,
    children: [],
  };
  for(let i = 0; i < dirTree.children.length; ++i) {
    let currChildTree: DirTree, currEjsDirNode: EjsNodeData;
    currChildTree = dirTree.children[i];
    currEjsDirNode = getEjsNodeData(currChildTree);
    ejsDirNode.children.push(currEjsDirNode);
  }
  ejsDirNode.children.sort((childA, childB) => {
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
  return ejsDirNode;
}
