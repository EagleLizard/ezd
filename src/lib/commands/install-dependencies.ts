
import child_process, { ChildProcess } from 'child_process';
import path from 'path';
import { checkFile, getExecutionPath } from '../../util/files';
import { NODE_PACKAGE_FILENAME } from '../constants';
import { ParsedArg } from '../parse-args/parse-args';

export async function executeInstallDeps(parsedArg: ParsedArg) {
  let executionPath: string, hasPackageFile: boolean;
  executionPath = getExecutionPath(parsedArg);
  hasPackageFile = await checkHasPackageFile(executionPath);
  if(!hasPackageFile) {
    throw new Error(`No ${NODE_PACKAGE_FILENAME} file found at path ${executionPath}`);
  }
  await executeNpmInstall(executionPath);
}

async function checkHasPackageFile(executionPath: string): Promise<boolean> {
  let packageFilePath: string, hasPackageFile: boolean;
  packageFilePath = path.join(executionPath, NODE_PACKAGE_FILENAME);
  hasPackageFile = await checkFile(packageFilePath);
  return hasPackageFile;
}

function executeNpmInstall(executionPath: string) {
  return new Promise<void>((resolve, reject) => {
    let npmInstall: ChildProcess;
    npmInstall = child_process.spawn('npm', [ 'install' ], {
      cwd: executionPath,
      stdio: [ 'pipe', process.stdout, process.stderr ],
    });

    npmInstall.on('error', err => {
      reject(err);
    });
    npmInstall.on('close', (code) => {
      if(code === 0) {
        resolve();
      } else {
        reject(new Error(`npm install terminated with non-zero exit code: ${code}`));
      }
    });
  });
}
