
import path from 'path';
import { EzdArgs } from '../../parse-args/ezd-args';
import { generateDirstatTest } from '../scandir/generate-dirstat-test/generate-dirstat-test';
import { dirstatScan, DirstatScanResult } from './dirstat-scan';
import { PathTree } from './path-tree';

export async function executeDirstat(ezdArgs: EzdArgs) {
  let rootDir: string, doGenerate: boolean;

  rootDir = path.resolve(ezdArgs.DIRSTAT.argParams);
  doGenerate = ezdArgs.GENERATE_TEST_FILES !== undefined;
  if(doGenerate) {
    await generateDirstatTest(rootDir);
    return;
  }

  await dirstatScan(rootDir);
}
