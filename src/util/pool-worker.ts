import { Stats } from 'fs';
import { stat } from 'fs/promises';

import workerpool from 'workerpool';

const STAT_SKIP_ERR_CODES = [
  'ENOENT',
  'EPERM',
];

workerpool.worker({
  getFileSizesBatched,
  getFileSizes,
  getFileSize,
});

async function getFileSizesBatched(filePathsArr: string[][]) {
  let fileStatsArr: Stats[][], fileStatsArrPromises: Promise<Stats[]>[];
  fileStatsArr = [];
  fileStatsArrPromises = [];

  // for(let i = 0; i < filePathsArr.length; ++i) {
  //   let fileStatsPromise: Promise<Stats[]>;
  //   let currFilePaths: string[];
  //   currFilePaths = filePathsArr[i];
  //   fileStatsPromise = getFileSizes(currFilePaths);
  //   fileStatsArrPromises.push(fileStatsPromise);
  // }
  // fileStatsArr = await Promise.all(fileStatsArrPromises);

  for(let i = 0; i < filePathsArr.length; ++i) {
    let fileStats: Stats[];
    let currFilePaths: string[];
    currFilePaths = filePathsArr[i];
    fileStats = await getFileSizes(currFilePaths);
    fileStatsArr.push(fileStats);
  }

  return fileStatsArr;
}

async function getFileSizes(filePaths: string[]): Promise<Stats[]> {
  let fileSizePromises: Promise<Stats>[], fileStats: Stats[];
  fileSizePromises = [];
  fileStats = [];

  for(let i = 0; i < filePaths.length; ++i) {
    let currFilePath: string, currStatsPromise: Promise<Stats>;
    currFilePath = filePaths[i];
    currStatsPromise = getFileSize(currFilePath);
    fileSizePromises.push(currStatsPromise);
  }
  fileStats = await Promise.all(fileSizePromises);

  // for(let i = 0; i < filePaths.length; ++i) {
  //   let currFilePath: string, currStats: Stats, currStatsPromise: Promise<Stats>;
  //   currFilePath = filePaths[i];
  //   currStats = await getFileSize(currFilePath);
  //   fileStats.push(currStats);
  // }

  return fileStats;
}

async function getFileSize(filePath: string): Promise<Stats> {
  let fileStats: Stats;
  try {
    fileStats = await stat(filePath);
  } catch(e) {
    if(!STAT_SKIP_ERR_CODES.includes(e.code)) {
      throw e;
    }
  }
  return fileStats;
}
