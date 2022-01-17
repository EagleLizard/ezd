
import { Dirent } from 'fs';
import { copyFile, mkdir, readdir } from 'fs/promises';
import path from 'path';
import { ParsedPath } from 'path/posix';
import { BASE_DIR, checkDir, getDirents  } from './src/util/files';
import * as tsConfig from './tsconfig.json';

const DIST_DIR = path.resolve(BASE_DIR, tsConfig.compilerOptions.outDir);
const TEMPLATE_SOURCE = path.resolve(BASE_DIR, './src/lib/commands/scandir/dirstat-render/templates');

(async () => {
  try {
    await copyTemplates();
  } catch(e) {
    console.error(e);
    throw e;
  }
})();

async function copyTemplates() {
  let pathParts: string[], targetDistDirPath: string;
  let dirExists: boolean;
  let templatePaths: string[][];
  pathParts = getRelativePathParts(BASE_DIR, TEMPLATE_SOURCE);
  targetDistDirPath = path.join(DIST_DIR, ...pathParts);
  console.log('targetDistDir');
  console.log(targetDistDirPath);
  console.log('');
  dirExists = await checkDir(targetDistDirPath);
  if(!dirExists) {
    await mkdir(targetDistDirPath);
  }
  templatePaths = await getTemplatePaths(TEMPLATE_SOURCE);
  for(let i = 0; i < templatePaths.length; ++i) {
    let currTemplatePathParts: string[];
    let templateFileName: string, templateDirPath: string;
    let templateFilePath: string, targetFilePath: string;
    let targetTemplatePath: string;
    currTemplatePathParts = templatePaths[i].slice();
    templateFileName = currTemplatePathParts.pop();
    templateDirPath = path.join(TEMPLATE_SOURCE, ...currTemplatePathParts);
    targetTemplatePath = path.join(targetDistDirPath, ...currTemplatePathParts);
    dirExists = await checkDir(targetTemplatePath);
    if(!dirExists) {
      await mkdir(targetTemplatePath);
    }
    templateFilePath = path.join(templateDirPath, templateFileName);
    targetFilePath = path.join(targetTemplatePath, templateFileName);
    // console.log('templateFilePath');
    // console.log(templateFilePath);
    // console.log('targetFilePath');
    // console.log(targetFilePath);
    await copyFile(templateFilePath, targetFilePath);
  }
}

async function getTemplatePaths(targetDir: string, pathSoFar?: string[]) {
  let templateDir: string, templatePaths: string[][];
  let dirents: Dirent[], subDirents: Dirent[];
  if(pathSoFar === undefined) {
    pathSoFar = [];
  }
  templateDir = path.join(targetDir, ...pathSoFar);
  dirents = await getDirents(templateDir);
  subDirents = [];
  templatePaths = [];
  for(let i = 0; i < dirents.length; ++i) {
    let currDirent: Dirent;
    let parsedFileName: ParsedPath;
    currDirent = dirents[i];
    if(currDirent.isDirectory()) {
      subDirents.push(currDirent);
    }
    if(currDirent.isFile()) {
      parsedFileName = path.parse(currDirent.name);
      if(parsedFileName.ext === '.ejs') {
        templatePaths.push([
          ...pathSoFar, currDirent.name
        ]);
      }
    }
  }
  for(let i = 0; i < subDirents.length; ++i) {
    let currDirent: Dirent;
    let subDirTemplates: string[][];
    currDirent = subDirents[i];
    subDirTemplates = await getTemplatePaths(targetDir, [
      ...pathSoFar,
      currDirent.name,
    ]);
    templatePaths = templatePaths.concat(subDirTemplates);
  }
  return templatePaths;
}

function getRelativePathParts(basePath: string, sourcePath: string) {
  let relativePathParts: string[];
  let baseSplat: string[], sourceSplat: string[];
  baseSplat = basePath.split(path.sep);
  sourceSplat = sourcePath.split(path.sep);
  sourceSplat.some((pathPart, idx) => {
    if(pathPart !== baseSplat[idx]) {
      relativePathParts = sourceSplat.slice(idx);
      return true;
    }
  });
  return relativePathParts;
}
