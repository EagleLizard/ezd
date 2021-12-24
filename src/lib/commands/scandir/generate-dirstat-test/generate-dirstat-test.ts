
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';

import randomstring from 'randomstring';

import { checkDir, rmrf } from '../../../../util/files';
import { Timer } from '../../../../util/timer';
import { getIntuitiveTime, getIntuitiveTimeString } from '../../../../util/print-util';
import { sleep } from '../../../../util/sleep';

const DIRSTAT_TEST_DIR = 'ezd-dirstat-test-dir';

const MAX_ASYNC_FILEWRITES = 200;

const DIRS_PER_LEVEL = 4;

const BYTES_PER_FILE = 4096;
// const BYTES_PER_FILE = 64;

// const ENABLE_DISK_WRITES = true;
const ENABLE_DISK_WRITES = false;

export async function generateDirstatTest(rootDir: string) {
  let totalDirs: number, totalFiles: number;
  totalDirs = 1e6;
  totalFiles = 5e5;
  // totalDirs = 1e5;
  // totalFiles = 7e5;
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
  const dirModBy = Math.ceil(dirPaths.length / 50);
  for(let i = 0; i < dirPaths.length; ++i) {
    let currDirPath: string;
    currDirPath = dirPaths[i];
    if(ENABLE_DISK_WRITES) {
      await mkdir(currDirPath);
    }
    if((i % dirModBy) === 0) {
      process.stdout.write('|');
    }
  }
  process.stdout.write('\n');

  runningFileWrites = 0;
  const fileModBy = Math.ceil(filePaths.length / 70);
  for(let i = 0; i < filePaths.length; ++i) {
    let currFilePath: string, currFileData: string;
    let testFilePromise: Promise<void>;
    let currIdx: number;
    currIdx = i;
    while(runningFileWrites > MAX_ASYNC_FILEWRITES) {
      await sleep(0);
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
      timer = Timer.start();
      await rmrf(testDirPath);
      deltaMs = timer.stop();
      intuitiveTime = getIntuitiveTime(deltaMs);
      timeStr = `${intuitiveTime[0].toFixed(4)} ${intuitiveTime[1]}`;
      console.log(`Deleted in ${timeStr}`);
    }
    await mkdir(testDirPath);
  }
  return testDirPath;
}
