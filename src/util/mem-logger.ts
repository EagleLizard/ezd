
import { mkdir } from 'fs/promises';
import path from 'path';
import { createWriteStream, WriteStream } from 'fs';

import { DateTime } from 'luxon';

import { LOG_DIRNAME } from '../lib/constants';
import { BASE_DIR, checkDir } from './files';
import { MAX_WORKERS } from './worker-pool';

import { Timer } from './timer';
import { getIntuitiveByteString } from './print-util';

const LOG_DIR_PATH = `${BASE_DIR}${path.sep}${LOG_DIRNAME}`;
const MEM_LOG_FILE_NAME = 'mem.log';
const MEM_LOG_FILE_PATH = `${LOG_DIR_PATH}${path.sep}${MEM_LOG_FILE_NAME}`;

const MEM_SAMPLE_INTERVAL_MS = 100;
const MEM_SAMPLE_MS = 10;

interface MemSample {
  rss: number;
  heapUsed: number;
  heapTotal: number;
}

interface IntervalMemSample {
  avg: number,
  min: number,
  max: number,
}

export class MemLogger {
  private memSamples: MemSample[];
  private intervalMemSamples: {
    rss: IntervalMemSample[],
    heapUsed: IntervalMemSample[],
    heapTotal: IntervalMemSample[],
  };
  private numMemSamples: number;

  private doLog: boolean;
  private writeStream: WriteStream;

  private constructor(writeStream: WriteStream) {
    this.doLog = true;
    this.memSamples = [];
    this.numMemSamples = 0;
    this.intervalMemSamples = {
      rss: [],
      heapUsed: [],
      heapTotal: [],
    };
    this.writeStream = writeStream;

    this.writeLine('');
    this.writeLine(process.argv.slice(2).join(' '));
    this.writeLine('start');
    this.writeLine(`MAX_WORKERS: ${MAX_WORKERS}`);
    this.writeLine('');
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
      flags: 'a',
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
    const collectMemSample = () => {
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
      this.intervalMemSamples.rss.push({
        avg: rssAvg,
        min: minRss,
        max: maxRss,
      });
      this.intervalMemSamples.heapUsed.push({
        avg: heapUsedAvg,
        min: minHeapUsed,
        max: maxHeapUsed,
      });
      this.intervalMemSamples.heapTotal.push({
        avg: heapTotalAvg,
        min: minHeapTotal,
        max: maxHeapTotal,
      });
    };
    const memIntervalLoop = () => {
      if(!this.doLog) {
        return;
      }
      setTimeout(() => {
        collectMemSample();
        memIntervalLoop();
      }, MEM_SAMPLE_INTERVAL_MS);
    };
    memIntervalLoop();

  }

  private initMemSample() {
    let memSampleTimer: Timer;
    memSampleTimer = Timer.start();
    const memSampleLoop = () => {
      let doSample: boolean;
      if(!this.doLog) {
        return;
      }
      doSample = memSampleTimer.currentMs() > MEM_SAMPLE_MS;
      if(doSample) {
        const memSample = getMemSample();
        this.memSamples.push(memSample);
        this.numMemSamples++;
        memSampleTimer.reset();
      }
      setImmediate(() => {
        memSampleLoop();
      });
    };
    memSampleLoop();
  }

  stop() {
    let rssStats: IntervalMemSample, heapUsedStats: IntervalMemSample,
      heapTotalStats: IntervalMemSample;
    rssStats = getIntervalMemSampleStats(this.intervalMemSamples.rss);
    heapUsedStats = getIntervalMemSampleStats(this.intervalMemSamples.heapUsed);
    heapTotalStats = getIntervalMemSampleStats(this.intervalMemSamples.heapTotal);
    this.writeLine('--rss--');
    this.writeLine(`rss [max] ${getIntuitiveByteString(rssStats.max)}`);
    // this.writeLine(`rss [min] ${getIntuitiveByteString(rssStats.min)}`);
    this.writeLine(`rss [avg] ${getIntuitiveByteString(rssStats.avg)}`);
    this.writeLine('--heapUsed--');
    this.writeLine(`heapUsed [max] ${getIntuitiveByteString(heapUsedStats.max)}`);
    // this.writeLine(`heapUsed [min] ${getIntuitiveByteString(heapUsedStats.min)}`);
    this.writeLine(`heapUsed [avg] ${getIntuitiveByteString(heapUsedStats.avg)}`);
    this.writeLine('--heapTotal--');
    this.writeLine(`heapTotal [max] ${getIntuitiveByteString(heapTotalStats.max)}`);
    // this.writeLine(`heapTotal [min] ${getIntuitiveByteString(heapTotalStats.min)}`);
    this.writeLine(`heapTotal [avg] ${getIntuitiveByteString(heapTotalStats.avg)}`);
    this.writeLine('');
    this.writeLine(`numMemSamples: ${this.numMemSamples.toLocaleString()}`);
    this.writeLine('stop');
    this.writeLine('');
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

function getIntervalMemSampleStats(intervalMemSamples: IntervalMemSample[]): IntervalMemSample {
  let memSampleStats: IntervalMemSample;
  let avgSum: number, avg: number, min: number, max: number;
  avgSum = 0;
  min = Infinity;
  max = -1;
  intervalMemSamples.forEach(intervalMemSample => {
    avgSum += intervalMemSample.avg;
    if(intervalMemSample.min < min) {
      min = intervalMemSample.min;
    }
    if(intervalMemSample.max > max) {
      max = intervalMemSample.max;
    }
  });
  avg = Math.round(avgSum / intervalMemSamples.length);
  memSampleStats = {
    avg,
    min,
    max,
  };
  return memSampleStats;
}
