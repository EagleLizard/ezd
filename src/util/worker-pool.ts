
import { Stats } from 'fs';
import { stat } from 'fs/promises';
import workerpool from 'workerpool';
import os from 'os';

const NUM_CPUS = os.cpus().length;
const MAX_WORKERS = NUM_CPUS - 1;
// const MAX_WORKERS = NUM_CPUS * 4;
// const MAX_WORKERS = Math.ceil(NUM_CPUS / 2);
// const MAX_WORKERS = Math.ceil(NUM_CPUS / 4);

export {
  MAX_WORKERS,
};

console.log(`MAX_WORKERS: ${MAX_WORKERS}`);

let pool: workerpool.WorkerPool;

export function getPool() {
  if(pool === undefined) {
    initPool({
      maxWorkers: MAX_WORKERS,
      // minWorkers: MAX_WORKERS,
    });
  }
  return pool;
}

async function initPool(opts?: workerpool.WorkerPoolOptions) {
  opts = opts ?? {};
  pool = workerpool.pool(`${__dirname}${'/pool-worker.js'}`, opts);
}

export function terminatePool() {
  pool?.terminate();
  pool = undefined;
}
