import { Stats } from 'fs';
import { stat } from 'fs/promises';

import workerpool from 'workerpool';

const STAT_SKIP_ERR_CODES = [
  'ENOENT',
  'EPERM',
  'EACCES',
];

workerpool.worker({
  getFileSizesBatched,
  getFileSizes,
  getFileSize,
});

async function getFileSizesBatched(filePathsArr: string[][]) {
  let fileStatsArr: Stats[][];
  fileStatsArr = [];

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
  let fileStats: Stats[];
  fileStats = [];

  for(let i = 0; i < filePaths.length; ++i) {
    let currFilePath: string, currStats: Stats;
    currFilePath = filePaths[i];
    currStats = await getFileSize(currFilePath);
    fileStats.push(currStats);
  }

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
