
import { mkdir } from 'fs/promises';
import path from 'path';
import { createWriteStream, WriteStream } from 'fs';

import { DateTime } from 'luxon';

import { LOG_DIRNAME } from '../lib/constants';
import { BASE_DIR, checkDir } from './files';
import { Timer } from './timer';
import { getIntuitiveByteString } from './print-util';

const LOG_DIR_PATH = `${BASE_DIR}${path.sep}${LOG_DIRNAME}`;
const MEM_LOG_FILE_NAME = 'mem.log';
const MEM_LOG_FILE_PATH = `${LOG_DIR_PATH}${path.sep}${MEM_LOG_FILE_NAME}`;

const LOG_INTERVAL_MS = 200;
const MEM_SAMPLE_INTERVAL_MS = 50;

interface MemSample {
  rss: number;
  heapUsed: number;
  heapTotal: number;
}

interface IntervalMemSamples {
  avg: MemSample[],
  min: MemSample[],
  max: MemSample[],
}

export class MemLogger {
  private memSamples: MemSample[];
  private intervalMemSamples: IntervalMemSamples[];

  private doLog: boolean;
  private writeStream: WriteStream;

  private constructor(writeStream: WriteStream) {
    this.doLog = true;
    this.memSamples = [];
    this.intervalMemSamples = [];
    this.writeStream = writeStream;
    this.writeLine('start');
    this.initLogger();
    this.initMemSample();
  }

  static async start(): Promise<MemLogger> {
    let logDirExists: boolean, writeStream: WriteStream;
    logDirExists = await checkDir(LOG_DIR_PATH);
    if(!logDirExists) {
      await mkdir(LOG_DIR_PATH);
    }
    writeStream = createWriteStream(MEM_LOG_FILE_PATH, {
      // flags: 'a',
    });
    await new Promise<void>((resolve, reject) => {
      writeStream.once('ready', () => {
        resolve();
      });
      writeStream.once('error', err => {
        reject(err);
      });
    });
    return new MemLogger(writeStream);
  }

  private writeLine(msg: string) {
    let lineToWrite: string, now: DateTime;
    now = DateTime.now();
    lineToWrite = `[${now.setZone('America/Denver').toISO()}] ${msg}\n`;
    this.writeStream.write(lineToWrite);
  }

  private initLogger() {
    const printMemSample = () => {
      let memSample: MemSample;
      let numSamples: number;

      let minRss: number, maxRss: number, rssSum: number;
      let minHeapUsed: number, maxHeapUsed: number, heapUsedSum: number;
      let minHeapTotal: number, maxHeapTotal: number, heapTotalSum: number;
      let rssAvg: number, heapUsedAvg: number, heapTotalAvg: number;

      minRss = minHeapUsed = minHeapTotal = Infinity;
      maxRss = maxHeapUsed = maxHeapTotal = -1;
      rssSum = heapUsedSum = heapTotalSum = 0;

      numSamples = this.memSamples.length;

      if(numSamples < 1) {
        return;
      }
      while(this.memSamples.length) {
        memSample = this.memSamples.pop();

        rssSum += memSample.rss;
        if(memSample.rss < minRss) {
          minRss = memSample.rss;
        }
        if(memSample.rss > maxRss) {
          maxRss = memSample.rss;
        }

        heapUsedSum += memSample.heapUsed;
        if(memSample.heapUsed < minHeapUsed) {
          minHeapUsed = memSample.heapUsed;
        }
        if(memSample.heapUsed > maxHeapUsed) {
          maxHeapUsed = memSample.heapUsed;
        }

        heapTotalSum += memSample.heapTotal;
        if(memSample.heapTotal < minHeapTotal) {
          minHeapTotal = memSample.heapTotal;
        }
        if(memSample.heapTotal > maxHeapTotal) {
          maxHeapTotal = memSample.heapTotal;
        }
      }
      rssAvg = Math.round(rssSum / numSamples);
      heapUsedAvg = Math.round(heapUsedSum / numSamples);
      heapTotalAvg = Math.round(heapTotalSum / numSamples);
      this.writeLine(`rss [avg]: ${getIntuitiveByteString(rssAvg)}`);
      this.writeLine(`heapUsed [avg]: ${getIntuitiveByteString(heapUsedAvg)}`);
      this.writeLine(`heapTotal [avg]: ${getIntuitiveByteString(heapTotalAvg)}`);

      this.writeLine(`rss [min, max]: [ ${getIntuitiveByteString(minRss)}, ${getIntuitiveByteString(maxRss)}]`);
      this.writeLine(`heapUsed [min, max]: [ ${getIntuitiveByteString(minHeapUsed)}, ${getIntuitiveByteString(maxHeapUsed)}]`);
      this.writeLine(`heapTotal [min, max]: [ ${getIntuitiveByteString(minHeapTotal)}, ${getIntuitiveByteString(maxHeapTotal)}]`);


      this.writeLine('');
    };
    const logLoop = () => {
      if(!this.doLog) {
        return;
      }
      setTimeout(() => {
        printMemSample();
        logLoop();
      }, LOG_INTERVAL_MS);
    };
    logLoop();

  }

  private initMemSample() {
    let memSampleTimer: Timer;
    memSampleTimer = Timer.start();
    const memSampleLoop = () => {
      let doSample: boolean;
      if(!this.doLog) {
        return;
      }
      doSample = memSampleTimer.currentMs() > MEM_SAMPLE_INTERVAL_MS;
      if(doSample) {
        const memSample = getMemSample();
        this.memSamples.push(memSample);
        memSampleTimer.reset();
      }
      setImmediate(() => {
        memSampleLoop();
      });
    };
    memSampleLoop();
  }

  stop() {
    this.doLog = false;
  }
}

function getMemSample(): MemSample {
  const memUsage = process.memoryUsage();
  return {
    rss: memUsage.rss,
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
  };
}
