
import path from 'path';
import { mkdir, rm, writeFile } from 'fs/promises';

import randomstring from 'randomstring';

import { checkDir, rmrf } from '../../../../util/files';
import { Timer } from '../../../../util/timer';
import { getIntuitiveTime, getIntuitiveTimeString } from '../../../../util/print-util';
import { sleep, sleepImmediate } from '../../../../util/sleep';
import { walkDir, WalkDirResult } from '../../dirstat/walk-dir';

const DIRSTAT_TEST_DIR = 'ezd-dirstat-test-dir';

const MAX_ASYNC_FILEWRITES = 100;

const DIRS_PER_LEVEL = 100;

const BYTES_PER_FILE = 4096;
// const BYTES_PER_FILE = 64;

const ENABLE_DISK_WRITES = true;
// const ENABLE_DISK_WRITES = false;

export async function generateDirstatTest(rootDir: string) {
  let totalDirs: number, totalFiles: number;
  totalDirs = 5e5;
  totalFiles = 1e4;
  // totalDirs = 20;
  // totalFiles = 100;
  console.log('');
  console.log(`DIRS_PER_LEVEL: ${DIRS_PER_LEVEL.toLocaleString()}`);
  console.log(`MAX_ASYNC_FILEWRITES: ${MAX_ASYNC_FILEWRITES}`);
  console.log('');
  await generateDirStatTestDeterministic(rootDir, totalDirs, totalFiles);
}

async function generateDirStatTestDeterministic(rootDir: string, totalDirs: number, totalFiles: number) {
  let testDirPath: string, dirPaths: string[], filePaths: string[];
  let timer: Timer, deltaMs: number, timeStr: string;
  let runningFileWrites: number;
  console.log(`dirs: ${totalDirs.toLocaleString()}`);
  console.log(`files: ${totalFiles.toLocaleString()}`);

  testDirPath = await createTestDirRoot(rootDir);
  timer = Timer.start();

  dirPaths = generateDirPaths(testDirPath, totalDirs);
  filePaths = generateFilePaths(dirPaths, totalFiles);

  await createTestDirs(dirPaths);
  // await createTestDirsSync(dirPaths);

  runningFileWrites = 0;
  const fileModBy = Math.ceil(filePaths.length / 70);
  for(let i = 0; i < filePaths.length; ++i) {
    let currFilePath: string, currFileData: string;
    let testFilePromise: Promise<void>;
    let currIdx: number;
    currIdx = i;
    while(runningFileWrites > MAX_ASYNC_FILEWRITES) {
      // await sleep(0);
      await sleepImmediate();
    }
    currFilePath = filePaths[i];
    currFileData = randomstring.generate(BYTES_PER_FILE);
    if(ENABLE_DISK_WRITES) {
      runningFileWrites++;
      testFilePromise = writeFile(currFilePath, currFileData);
      testFilePromise.then(() => {
        if((currIdx % fileModBy) === 0) {
          process.stdout.write('.');
        }
        runningFileWrites--;
      });
    }
  }
  while(runningFileWrites > 0) {
    await sleep(10);
  }
  process.stdout.write('\n');
  deltaMs = timer.stop();
  timeStr = getIntuitiveTimeString(deltaMs);
  console.log(`generate took ${timeStr}`);
  // console.log(dirPaths);
  // console.log(filePaths);
  console.log(dirPaths.length.toLocaleString());
  console.log(filePaths.length.toLocaleString());
}

async function createTestDirsSync(dirPaths: string[]) {
  let timer: Timer, deltaMs: number;
  const dirModBy = Math.ceil(dirPaths.length / 50);
  timer = Timer.start();
  for(let i = 0; i < dirPaths.length; ++i) {
    let currDirPath: string;
    currDirPath = dirPaths[i];
    // console.log(currDirPath);
    if(ENABLE_DISK_WRITES) {
      await mkdir(currDirPath);
    }
    if((i % dirModBy) === 0) {
      process.stdout.write('|');
    }
  }
  deltaMs = timer.stop();
  process.stdout.write('\n');
  console.log(`createTestDirsSync took: ${getIntuitiveTimeString(deltaMs)}`);
}

async function createTestDirs(dirPaths: string[]) {
  let timer: Timer, deltaMs: number;
  let groupedDirPathsMap: Record<number, string[]>, groupedDirPaths: [ number, string[] ][];
  let dirPathGroups: string[][];
  let doneCount: number;

  const dirModBy = Math.ceil(dirPaths.length / 50);
  timer = Timer.start();
  groupedDirPathsMap = groupDirsByDepth(dirPaths);
  groupedDirPaths = Object.keys(groupedDirPathsMap).reduce((acc, curr: string) => {
    let currLen: number;
    currLen = +curr;
    acc.push([
      +currLen,
      groupedDirPathsMap[currLen]
    ]);
    return acc;
  }, []);
  groupedDirPaths.sort((a, b) => {
    let aLen: number, bLen: number;
    aLen = a[0];
    bLen = b[0];
    if(aLen > bLen) {
      return 1;
    }
    if(aLen < bLen) {
      return -1;
    }
    return 0;
  });
  dirPathGroups = groupedDirPaths.map(groupedDirs => {
    return groupedDirs[1];
  });

  doneCount = 0;

  for(let i = 0; i < dirPathGroups.length; ++i) {
    let currDirPathGroup: string[], createDirPromises: Promise<void>[];
    currDirPathGroup = dirPathGroups[i];
    createDirPromises = [];
    for(let k = 0; k < currDirPathGroup.length; ++k) {
      let currPath: string, currCreateDirPromise: Promise<void>;
      currPath = currDirPathGroup[k];
      currCreateDirPromise = ENABLE_DISK_WRITES
        ? mkdir(currPath)
        : Promise.resolve()
      ;
      currCreateDirPromise.then(() => {
        doneCount++;
        if((doneCount % dirModBy) === 0) {
          process.stdout.write('|');
        }
      });
      createDirPromises.push(currCreateDirPromise);
    }
    await Promise.all(createDirPromises);
  }
  deltaMs = timer.stop();
  process.stdout.write('\n');
  console.log(`async createTestDirs took: ${getIntuitiveTimeString(deltaMs)}`);
}

function groupDirsByDepth(dirPaths: string[]): Record<number, string[]> {
  let groupedDirPaths: Record<number, string[]>;
  groupedDirPaths = dirPaths.reduce((acc, dirPath) => {
    let splat: string[];
    splat = dirPath.split(path.sep);
    if(acc[splat.length] === undefined) {
      acc[splat.length] = [];
    }
    acc[splat.length].push(dirPath);
    return acc;
  }, {} as Record<number, string[]>);
  return groupedDirPaths;
}

function generateFilePaths(dirPaths: string[], totalFiles: number): string[] {
  let filesPerDir: number, fileCount: number;
  let generatedFilePaths: string[];
  dirPaths = dirPaths.slice();
  dirPaths.reverse();
  filesPerDir = Math.ceil(totalFiles / dirPaths.length);
  console.log(`${filesPerDir}`);
  generatedFilePaths = [];
  fileCount = 0;
  for(let i = 0; i < dirPaths.length; ++i) {
    let currDirPath: string;
    if(fileCount >= totalFiles) {
      break;
    }
    currDirPath = dirPaths[i];
    for(let k = 0; k < filesPerDir; ++k) {
      let nextFileName: string, nextFilePath: string;
      if(fileCount >= totalFiles) {
        break;
      }
      nextFileName = `tf_${fileCount++}.txt`;
      nextFilePath = `${currDirPath}${path.sep}${nextFileName}`;
      generatedFilePaths.push(nextFilePath);
    }
  }
  generatedFilePaths.reverse();
  return generatedFilePaths;
}

function generateDirPaths(rootDir: string, totalDirs: number): string[] {
  let dirCount: number;
  let currLevel: string[], nextLevel;
  let generatedDirPaths: string[];

  currLevel = [ rootDir ];
  dirCount = 0;
  generatedDirPaths = [];
  while(dirCount < totalDirs) {
    nextLevel = [];
    for(let i = 0; i < currLevel.length; ++i) {
      let currPathPrefix: string;
      currPathPrefix = currLevel[i];
      for(let k = 0; k < DIRS_PER_LEVEL; ++k) {
        let nextDirName: string, nextDirPath: string;
        if(dirCount >= totalDirs) {
          break;
        }
        nextDirName = `td_${dirCount++}`;
        nextDirPath = `${currPathPrefix}${path.sep}${nextDirName}`;
        nextLevel.push(nextDirPath);
      }
    }
    for(let i = 0; i < nextLevel.length; ++i) {
      generatedDirPaths.push(nextLevel[i]);
    }
    currLevel = nextLevel;
  }
  return generatedDirPaths;
}

async function createTestDirRoot(rootDir: string): Promise<string> {
  let testDirPath: string, testDirExists: boolean;
  let timer: Timer, deltaMs: number,
    intuitiveTime: [ number, string ], timeStr: string;
  testDirPath = path.join(rootDir, DIRSTAT_TEST_DIR);
  if(ENABLE_DISK_WRITES) {
    testDirExists = await checkDir(testDirPath);
    if(testDirExists) {
      // delete
      console.log(`Deleting ${testDirPath} ...`);
      // await fastDeleteDir(testDirPath);
      timer = Timer.start();
      // await rmrf(testDirPath);
      await rm(testDirPath, {
        recursive: true,
        force: true,
      });
      deltaMs = timer.stop();
      intuitiveTime = getIntuitiveTime(deltaMs);
      timeStr = `${intuitiveTime[0].toFixed(4)} ${intuitiveTime[1]}`;
      console.log(`Deleted in ${timeStr}`);
    }
    await mkdir(testDirPath);
  }
  return testDirPath;
}

async function fastDeleteDir(rootDir: string): Promise<void> {
  let timer: Timer, deltaMs: number;
  let dirs: string[], filePaths: string[], runningFileRms: number;
  let walkDirResult: WalkDirResult;
  timer = Timer.start();

  walkDirResult = await walkDir(rootDir, () => undefined);
  dirs = walkDirResult.dirs;
  filePaths = walkDirResult.paths;
  runningFileRms = 0;
  for(let i = 0; i < filePaths.length; ++i) {
    let currFilePath: string, filePathRmPromise: Promise<void>;
    while(runningFileRms > MAX_ASYNC_FILEWRITES) {
      await sleep();
    }
    currFilePath = filePaths[i];
    runningFileRms++;
    filePathRmPromise = rm(currFilePath);
    filePathRmPromise.then(() => {
      runningFileRms--;
    }).catch(e => {
      console.error(e);
    });
  }
  while(runningFileRms > 0) {
    await sleep(10);
  }
  // for(let i = 0; i < dirs.length; ++i) {
  //   let currDirPath: string, dirPathRmPromise: Promise<void>;
  //   currDirPath = dirs[i];
  //   dirPathRmPromise = rm(currDirPath);
  // }
  
  deltaMs = timer.stop();
  console.log(`fastDeleteDir took: ${getIntuitiveTimeString(deltaMs)}`);

}
