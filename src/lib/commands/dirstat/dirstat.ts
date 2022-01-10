
import path from 'path';
import { EzdArgs } from '../../parse-args/ezd-args';
import { generateDirstatTest } from '../scandir/generate-dirstat-test/generate-dirstat-test';
import { dirstatScan, DirstatScanResult } from './dirstat-scan';
import { PathTree } from './path-tree';

export async function executeDirstat(ezdArgs: EzdArgs) {
  let rootDir: string, doGenerate: boolean;
  let dirstatScanResult: DirstatScanResult, pathTree: PathTree;
  rootDir = path.resolve(ezdArgs.DIRSTAT.argParams);
  doGenerate = ezdArgs.GENERATE_TEST_FILES !== undefined;
  if(doGenerate) {
    await generateDirstatTest(rootDir);
    return;
  }

  dirstatScanResult = await dirstatScan(rootDir);
  pathTree = dirstatScanResult.pathTree;
  pathTree.traverse((pathNode, soFar) => {
    let soFarDirNames: string[];
    soFarDirNames = soFar.map(pathNode => {
      return path.parse(pathNode.basePath).name;
    });
    // console.log(soFarDirNames.join(path.sep));
  });
}
