
import path from 'path';
import { mkdir, rmdir, writeFile } from 'fs/promises';

import _Chance from 'chance';
const chance = new _Chance;
import randomstring from 'randomstring';

import { checkDir, rmrf } from '../../../../util/files';
import { Timer } from '../../../../util/timer';
import { getIntuitiveBytes, getIntuitiveTime } from '../../../../util/print-util';
import { sleep } from '../../../../util/sleep';

const DIRSTAT_TEST_DIR = 'ezd-dirstat-test-dir';

const SUBDIR_DEPTH = 14;
const DIRS_PER_LEVEL = 2;
const FILES_PER_DIR = 15;

// const BYTES_PER_FILE = 4096;
const BYTES_PER_FILE = 64;

const ENABLE_DISK_WRITES = true;
// const ENABLE_DISK_WRITES = false;

export async function generateDirstatTest(rootDir: string) {
  let testDirPath: string, timer: Timer, deltaMs: number;
  let intuitiveTime: [ number, string ], timeStr: string;
  let progressCb: (dirsComplete: number, filesComplete: number) => void,
    dirModBy: number, fileModBy: number, modBy: number;
  let totalDirs: number, totalFiles: number, totalDirsAndFiles: number,
    fileCount: number, dirCount: number;
  [ totalDirs, totalFiles ] = calcTotalDirsAndFiles(SUBDIR_DEPTH, DIRS_PER_LEVEL, FILES_PER_DIR);
  totalDirsAndFiles = totalDirs + totalFiles;
  console.log('');
  console.log(`SUBDIR_DEPTH: ${SUBDIR_DEPTH}`);
  console.log(`DIRS_PER_LEVEL: ${DIRS_PER_LEVEL}`);
  console.log(`FILES_PER_DIR: ${FILES_PER_DIR}`);
  console.log('');
  console.log(`totalDirs: ${totalDirs.toLocaleString()}`);
  console.log(`totalFiles: ${totalFiles.toLocaleString()}`);

  modBy = Math.floor(totalDirsAndFiles / 92);

  fileCount = 0;
  dirCount = 0;
  progressCb = (dirsComplete, filesComplete) => {
    let completeCount: number;
    fileCount += filesComplete;
    dirCount += dirsComplete;
    completeCount = fileCount + dirCount;
    if((completeCount % modBy) === 0) {
      let printChar: string;
      printChar = (dirsComplete > 0)
        ? '|'
        : (filesComplete > 0)
          ? '.'
          : 'X'
      ;
      process.stdout.write(printChar);
    }
  };
  testDirPath = await createTestDirRoot(rootDir);
  timer = Timer.start();
  await generateSubdirs({
    testDir: testDirPath,
    depth: SUBDIR_DEPTH
  }, progressCb);
  process.stdout.write('\n');
  deltaMs = timer.stop();
  console.log(`${dirCount.toLocaleString()} - ${fileCount.toLocaleString()}`);
  intuitiveTime = getIntuitiveTime(deltaMs);
  timeStr = `${intuitiveTime[0]} ${intuitiveTime[1]}`;
  console.log(`Generate Test Dirs took: ${timeStr}`);
}

interface _GenerateSubdirsOpts {
  testDir: string;
  depth: number;
  dirCounter: number;
  fileCounter: number;
}

type GenerateSubdirsOpts = Omit<_GenerateSubdirsOpts, 'dirCounter' | 'fileCounter'>;

function generateSubdirs(opts: GenerateSubdirsOpts, progressCb?: (dirsComplete: number, filesComplete: number) => void) {
  let _opts: _GenerateSubdirsOpts;
  _opts = {
    testDir: opts.testDir,
    depth: opts.depth,
    dirCounter: 0,
    fileCounter: 0,
  };

  return _generateSubdirs(_opts, progressCb);

  async function _generateSubdirs(opts: _GenerateSubdirsOpts, progressCb?: (dirsComplete: number, filesComplete: number) => void) {
    let testDir: string, depth: number, dirCounter: number, fileCounter: number;
    ({
      testDir,
      depth,
      dirCounter,
      fileCounter,
    } = opts);
    let generatedDirPaths: string[], fileDataToWrite: string[];
    let fileWritePromises: Promise<void>[], generateSubdirPromises: Promise<void>[];

    if(progressCb === undefined) {
      progressCb = (dirsComplete, filesComplete) => undefined;
    }

    fileDataToWrite = [];
    fileWritePromises = [];
    for(let k = 0; k < FILES_PER_DIR; ++k) {
      let currFileData: string;
      // currFileData = chance.string({
      //   length: BYTES_PER_FILE
      // });
      currFileData = randomstring.generate(BYTES_PER_FILE);
      fileWritePromises.push((async () => {
        let fileName: string, filePath: string;
        fileName = `tf_${fileCounter++}.txt`;
        filePath = path.join(testDir, fileName);
        if(ENABLE_DISK_WRITES) {
          await writeFile(filePath, currFileData);
        }

        progressCb(0, 1);
      })());
      fileDataToWrite.push(currFileData);
    }
    await Promise.all(fileWritePromises);

    if(depth < 1) {
      return;
    }

    generatedDirPaths = [];
    for(let i = 0; i < DIRS_PER_LEVEL; ++i) {
      let currDirName: string, currDirPath: string;
      currDirName = `td_${dirCounter++}`;
      currDirPath = path.join(testDir, currDirName);

      if(ENABLE_DISK_WRITES) {
        await mkdir(currDirPath);
      }

      progressCb(1, 0);
      generatedDirPaths.push(currDirPath);
    }
    generateSubdirPromises = [];
    for(let i = 0; i < generatedDirPaths.length; ++i) {
      let currGeneratedDirPath: string;
      let generateSubdirPromise: Promise<void>;
      currGeneratedDirPath = generatedDirPaths[i];
      generateSubdirPromise = _generateSubdirs({
        testDir: currGeneratedDirPath,
        depth: depth - 1,
        dirCounter,
        fileCounter
      }, progressCb);
      generateSubdirPromises.push(generateSubdirPromise);
      await generateSubdirPromise;
    }
    await Promise.all(generateSubdirPromises);
  }
  /*
    ***
  */
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

function calcTotalDirsAndFiles(depth: number, dirsPerLevel: number, filesPerDir: number): [ number, number ] {
  let countsTuple: [ number, number ];
  let dirCount: number, fileCount: number;
  let countCb: (dir: number, file: number) => void;
  dirCount = 0;
  fileCount = 0;
  countCb = (dir, files) => {
    dirCount += dir;
    fileCount += files;
  };

  _calcTotalDirsAndFiles(depth, countCb);

  countsTuple = [
    dirCount,
    fileCount,
  ];
  return countsTuple;

  function _calcTotalDirsAndFiles(depth: number, cb: (dir: number, files: number) => void) {
    cb(0, filesPerDir);
    if(depth < 1) {
      return;
    }
    for(let i = 0; i < dirsPerLevel; ++i) {
      cb(1, 0);
      _calcTotalDirsAndFiles(depth - 1, cb);
    }
  }
}
